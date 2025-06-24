import streamlit as st
from firebase_admin import storage
from utils import format_date, get_active_event_id, session_get, session_set, get_event_by_id, generate_id, delete_button
from recipe_viewer import render_recipe_preview
from recipes import find_recipe_by_name
from datetime import datetime
import uuid
import mimetypes
from ai_parsing_engine import parse_file, extract_text
from io import BytesIO



# ----------------------------
# 📁 File Manager UI
# ----------------------------

def file_manager_ui(user):
    from firebase_init import get_db
    db = get_db()

    st.subheader("📁 File Manager")
    user_id = user.get("id")
    query = db.collection("files").where("deleted", "==", False)
    files = list(query.stream())
    file_data = [doc.to_dict() | {"id": doc.id} for doc in files]

    if 'view_mode' not in st.session_state:
        st.session_state['view_mode'] = 'all'
    if 'search_term' not in st.session_state:
        st.session_state['search_term'] = ''

    view_col, search_col = st.columns([1, 3])
    with view_col:
        st.selectbox(
            "View Mode", 
            ["all", "linked", "unlinked"], 
            key="view_mode"
        )
    with search_col:
        st.text_input("Search files", key="search_term")

    filtered = []
    for file in file_data:
        matches_view = (
            st.session_state.view_mode == "all" or
            (st.session_state.view_mode == "linked" and file.get("event_id")) or
            (st.session_state.view_mode == "unlinked" and not file.get("event_id"))
        )
        matches_search = st.session_state.search_term.lower() in file.get("name", "").lower()
        if matches_view and matches_search:
            filtered.append(file)

    grouped = {}
    for file in filtered:
        event_id = file.get("event_id") or "No Event"
        grouped.setdefault(event_id, []).append(file)

    for group_id, files in grouped.items():
        with st.expander(f"📦 {group_id} ({len(files)} files)"):
            for file in files:
                file_name = file.get("name", "Unnamed")
                col_a, col_b, col_c, col_d = st.columns([3, 1, 1, 1])

                with col_a:
                    st.markdown(f"**{file_name}** ({file.get('type', '-')})")
                with col_b:
                    if st.button("View/Edit Data", key=f"view_{file['id']}"):
                        st.session_state["editing_parsed_file"] = file["id"]
                with col_c:
                    if st.button("Save As", key=f"saveas_{file['id']}"):
                        st.session_state["saveas_file"] = file["id"]
                with col_d:
                    if delete_button("Delete", key=f"delete_{file['id']}"):
                        db.collection("files").document(file["id"]).update({"deleted": True})
                        st.rerun()

    if "editing_file" in st.session_state:
        file = st.session_state["editing_file"]
        st.markdown(f"### ✏️ Editing File: {file.get('name', '')}")
        tags = st.text_input("Tags (comma-separated)", value=", ".join(file.get("tags", [])))
        event_id = st.text_input("Linked Event ID", value=file.get("event_id", ""))
        if st.button("Save Changes", key="save_changes"):
            db.collection("files").document(file["id"]).update({
                "tags": [tag.strip() for tag in tags.split(",") if tag.strip()],
                "event_id": event_id
            })
            st.success("✅ File updated.")
            del st.session_state["editing_file"]
            st.rerun()
        if st.button("Cancel", key="cancel_edit"):
            del st.session_state["editing_file"]
            st.rerun()

    if "editing_parsed_file" in st.session_state:
        file_id = st.session_state["editing_parsed_file"]
        doc = db.collection("files").document(file_id).get()
        if doc.exists:
            _render_parsed_data_editor(doc.to_dict() | {"id": file_id}, db)

    if "saveas_file" in st.session_state:
        file_id = st.session_state["saveas_file"]
        doc = db.collection("files").document(file_id).get()
        if doc.exists:
            _render_save_as_options(doc.to_dict() | {"id": file_id})

# ----------------------------
# 📊 File Analytics
# ----------------------------

def show_file_analytics():
    from firebase_init import get_db
    db = get_db()

    st.subheader("📊 File Analytics")
    query = db.collection("files").where("deleted", "==", False)
    files = list(query.stream())
    file_data = [doc.to_dict() | {"id": doc.id} for doc in files]

    total_files = len(file_data)
    linked = len([f for f in file_data if f.get("event_id")])
    unlinked = total_files - linked
    types = {}
    contributors = set()

    for file in file_data:
        contributors.add(file.get("uploaded_by", "Unknown"))
        ftype = file.get("type", "other")
        types[ftype] = types.get(ftype, 0) + 1

    st.metric("📁 Total Files", total_files)
    st.metric("🔗 Linked to Events", linked)
    st.metric("❌ Unlinked", unlinked)
    st.metric("🙋 Contributors", len(contributors))

    st.markdown("### 📂 File Type Breakdown")
    for ftype, count in types.items():
        st.markdown(f"- **{ftype}**: {count}")

# ----------------------------
# ⬆️ Save Uploaded File
# ----------------------------

def save_uploaded_file(file, event_id: str, uploaded_by: str):
    from firebase_init import get_db, get_bucket
    db = get_db()
    bucket = get_bucket()

    file_id = generate_id("file")
    content = file.getvalue()
    filename = file.name
    mimetype, _ = mimetypes.guess_type(filename)
    mimetype = mimetype or "application/octet-stream"

    folder = event_id or "unlinked"
    storage_path = f"uploads/{folder}/{file_id}_{filename}"
    blob = bucket.blob(storage_path)
    blob.upload_from_string(content, content_type=mimetype)
    blob.make_public()

    raw_text = None
    parsed = {}
    try:
        fcopy = BytesIO(content)
        fcopy.name = filename
        fcopy.type = mimetype
        raw_text = extract_text(fcopy)
        parsed = parse_file(fcopy, target_type="all", user_id=uploaded_by, file_id=file_id)
    except Exception as e:
        print(f"AI parsing failed: {e}")

    metadata = {
        "name": filename,
        "size": len(content),
        "type": mimetype,
        "uploaded_by": uploaded_by,
        "event_id": event_id,
        "created_at": datetime.utcnow(),
        "storage_path": storage_path,
        "public_url": blob.public_url,
        "deleted": False,
        "raw_text": raw_text,
        "parsed_data": {
            "parsed": parsed,
            "version": 1,
            "status": "pending_review",
            "last_updated": datetime.utcnow(),
            "user_id": uploaded_by
        } if parsed else {},
    }

    db.collection("files").document(file_id).set(metadata)
    return {
        "file_id": file_id,
        "parsed": parsed,
        "raw_text": raw_text
    }

# ----------------------------
# 🔗 Link File to Entity
# ----------------------------

def link_file_to_entity(file_id: str, entity_type: str, entity_id: str):
    from firebase_init import get_db
    db = get_db()

    assert entity_type in {"recipes", "events", "menus", "ingredients"}, "Invalid entity type"
    file_ref = db.collection("files").document(file_id)
    file_doc = file_ref.get()
    if not file_doc.exists:
        raise ValueError("File does not exist")
    data = file_doc.to_dict()
    linked_to = data.get("linked_to", {})
    current_links = linked_to.get(entity_type, [])
    if entity_id not in current_links:
        current_links.append(entity_id)
    linked_to[entity_type] = current_links
    file_ref.update({"linked_to": linked_to})

# ----------------------------
# 🧩 Link Editor UI
# ----------------------------

def show_link_editor_ui(file_id: str):
    import streamlit as st
    from firebase_init import get_db
    from utils import get_all_docs_as_options
    from file_storage import link_file_to_entity

    db = get_db()
    st.markdown("### 🔗 Link this file to a record")
    link_targets = ["event", "recipe", "menu", "ingredient"]
    selected_type = st.selectbox("View", ["all", "linked", "unlinked"], key="view_mode")
    collection_map = {
        "event": "events", "recipe": "recipes",
        "menu": "menus", "ingredient": "ingredients"
    }
    options = get_all_docs_as_options(collection_map[selected_type])
    selected_id = st.selectbox(
        f"Select {selected_type} to link",
        options,
        format_func=lambda o: o.get('name', o.get('title', o['id'])),
        key=f"{file_id}_{selected_type}"
    )
    if st.button(f"🔗 Link to selected {selected_type}", key=f"link_btn_{file_id}"):
        link_file_to_entity(file_id, collection_map[selected_type], selected_id["id"])
        st.success(f"✅ Linked to {selected_type.capitalize()}")

# ----------------------------
# 📝 Parsed Data Editor
# ----------------------------

def _render_parsed_data_editor(file: dict, db):
    import json
    st.markdown(f"### 📝 Parsed Data: {file.get('name', '')}")
    parsed = file.get("parsed_data", {}).get("parsed", {})
    if st.session_state.get("_last_inline_file") != file["id"]:
        st.session_state.pop("inline_editor_type", None)
        st.session_state.pop("inline_editor_data", None)
    st.session_state["_last_inline_file"] = file["id"]

    if not parsed:
        st.info("No parsed data available for this file.")
        if st.button("Close", key=f"close_edit_{file['id']}"):
            del st.session_state["editing_parsed_file"]
        return

    # Determine inline editor type based on parsed content
    if "recipes" in parsed and parsed["recipes"]:
        st.session_state["inline_editor_type"] = "recipe"
        st.session_state["inline_editor_data"] = (
            parsed["recipes"][0] if isinstance(parsed["recipes"], list) else parsed["recipes"]
        )
    elif "menus" in parsed and parsed["menus"]:
        st.session_state["inline_editor_type"] = "menu"
        st.session_state["inline_editor_data"] = (
            parsed["menus"][0] if isinstance(parsed["menus"], list) else parsed["menus"]
        )
    elif "ingredients" in parsed and parsed["ingredients"]:
        st.session_state["inline_editor_type"] = "ingredient"
        st.session_state["inline_editor_data"] = (
            parsed["ingredients"][0]
            if isinstance(parsed["ingredients"], list)
            else parsed["ingredients"]
        )

    render_recipe_preview(parsed)

    if "inline_editor_type" not in st.session_state:
        edit_key = f"edit_json_{file['id']}"
        if st.session_state.get(f"edit_mode_{file['id']}"):
            json_text = st.text_area(
                "JSON",
                st.session_state.get(edit_key, json.dumps(parsed, indent=2)),
                height=300,
                key=edit_key,
            )
            col1, col2 = st.columns(2)
            with col1:
                if st.button("Save", key=f"save_json_{file['id']}"):
                    try:
                        new_data = json.loads(json_text)
                        db.collection("files").document(file["id"]).update(
                            {
                                "parsed_data.parsed": new_data,
                                "parsed_data.last_updated": datetime.utcnow(),
                            }
                        )
                        st.success("✅ Data saved")
                        st.session_state[f"edit_mode_{file['id']}"] = False
                        del st.session_state["editing_parsed_file"]
                        st.rerun()
                    except json.JSONDecodeError:
                        st.error("Invalid JSON")
            with col2:
                if st.button("Cancel", key=f"cancel_json_{file['id']}"):
                    st.session_state[f"edit_mode_{file['id']}"] = False
        else:
            st.json(parsed)
            if st.button("Edit", key=f"start_edit_{file['id']}"):
                st.session_state[f"edit_mode_{file['id']}"] = True

    if st.session_state.get("inline_editor_type") == "recipe":
        st.markdown("### ✏️ Edit This Recipe")
        from recipes_editor import recipe_editor_ui
        recipe_editor_ui(prefill_data=st.session_state["inline_editor_data"])
    elif st.session_state.get("inline_editor_type") == "menu":
        st.markdown("### ✏️ Edit This Menu")
        from menu_editor import menu_editor_ui
        menu_editor_ui(prefill_data=st.session_state["inline_editor_data"])
    elif st.session_state.get("inline_editor_type") == "ingredient":
        st.markdown("### ✏️ Edit This Ingredient")
        from ingredients_editor import ingredients_editor_ui
        ingredients_editor_ui(prefill_data=st.session_state["inline_editor_data"])
    if st.button("Close", key=f"close_view_{file['id']}"):
        if f"edit_mode_{file['id']}" in st.session_state:
            del st.session_state[f"edit_mode_{file['id']}"]
        del st.session_state["editing_parsed_file"]
        st.rerun()

# ----------------------------
# 💾 Save-As Options
# ----------------------------

def _render_save_as_options(file: dict):
    from auth import get_user_id
    from shopping_lists import create_shopping_list
    from recipes import (
        save_recipe_to_firestore,
        save_event_to_firestore,
        save_menu_to_firestore,
        save_ingredient_to_firestore,
    )

    file_id = file["id"]
    parsed = file.get("parsed_data", {}).get("parsed", {})
    uploaded_name = parsed.get("title") or parsed.get("name") or file.get("name", "Unnamed File")

    dup_key = f"dup_saveas_{file_id}"
    dup_state = st.session_state.get(dup_key)
    if dup_state:
        st.warning("A recipe with this name already exists.")
        option = st.selectbox(
            "Choose how to proceed:",
            ["Add Version", "Save under Different Name", "Cancel"],
            key=f"dup_saveas_choice_{file_id}",
        )
        new_name = None
        if option == "Save under Different Name":
            new_name = st.text_input(
                "New Recipe Name",
                value=dup_state["data"].get("name"),
                key=f"dup_saveas_newname_{file_id}",
            )
        if st.button("Continue", key=f"dup_saveas_continue_{file_id}"):
            if option == "Add Version":
                doc_ref = db.collection("recipes").document(dup_state["existing_id"])
                doc_ref.collection("versions").document(generate_id("ver")).set(
                    dup_state["data"] | {
                        "timestamp": datetime.utcnow(),
                        "edited_by": dup_state.get("user_id"),
                    }
                )
                st.success("✅ Added as new version")
            elif option == "Save under Different Name":
                dup_state["data"]["name"] = new_name or dup_state["data"].get("name")
                save_recipe_to_firestore(
                    dup_state["data"], user_id=dup_state.get("user_id"), file_id=file_id
                )
                st.success("✅ Recipe saved")
            st.session_state.pop(dup_key)
            del st.session_state["saveas_file"]
            st.rerun()
        if st.button("Cancel", key=f"dup_saveas_cancel_{file_id}"):
            st.session_state.pop(dup_key)
            st.rerun()
        return

    st.markdown(f"### 💾 Save '{uploaded_name}' As...")
    option = st.selectbox(
        "Select type",
        ["Recipe", "Menu", "Shopping List", "Event", "Ingredient"],
        key=f"saveas_option_{file_id}"
    )

    if st.button("Create", key=f"create_{file_id}"):
        user_id = get_user_id()
        if option == "Recipe":
            existing = find_recipe_by_name(uploaded_name)
            if existing:
                st.session_state[dup_key] = {
                    "existing_id": existing["id"],
                    "data": parsed,
                    "user_id": user_id,
                }
                st.rerun()
            else:
                save_recipe_to_firestore(parsed, user_id=user_id, file_id=file_id)
                st.success("✅ Saved as Recipe")
        elif option == "Menu":
            save_menu_to_firestore(parsed, user_id=user_id, file_id=file_id)
            st.success("✅ Saved as Menu")
        elif option == "Event":
            save_event_to_firestore(parsed, user_id=user_id, file_id=file_id)
            st.success("✅ Saved as Event")
        elif option == "Ingredient":
            save_ingredient_to_firestore(parsed, user_id=user_id, file_id=file_id)
            st.success("✅ Saved as Ingredient")
        elif option == "Shopping List":
            create_shopping_list({
                "name": uploaded_name,
                "items": parsed.get("items", []),
                "source_file": file_id,
                "parsed_data": parsed,
            }, user_id=user_id)
            st.success("✅ Saved as Shopping List")
        del st.session_state["saveas_file"]
        st.rerun()
    if st.button("Cancel", key=f"cancel_saveas_{file_id}"):
        del st.session_state["saveas_file"]
        st.rerun()
