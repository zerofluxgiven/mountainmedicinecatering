import streamlit as st
from auth import require_role, get_user, get_user_id
from utils import session_get, format_date, get_active_event_id, value_to_text
from file_storage import save_uploaded_file, file_manager_ui
from upload_integration import save_parsed_menu_ui, show_save_file_actions
from ui_components import render_tag_group, edit_metadata_ui
from firebase_init import get_db
from events import get_all_events
from mobile_helpers import safe_file_uploader
from recipes import save_recipe_to_firestore

# ----------------------------
# 📤 Desktop Upload UI
# ----------------------------
@require_role("user")
def upload_ui_desktop(event_id: str = None):
    st.subheader("📄 Upload a File")

    file = safe_file_uploader(
        "Select file to upload",
        type=["pdf", "png", "jpg", "jpeg", "txt", "csv", "docx"],
    )
    user = session_get("user")

    events = get_all_events()
    event_options = {
        f"{e.get('name', 'Unnamed')} ({format_date(e.get('start_date'))} - {e.get('status', 'planning')})": e['id']
        for e in events if not e.get("deleted", False)
    }

    eid_label = st.selectbox(
        "Select Event (optional)",
        ["None"] + list(event_options.keys()),
        key="upload_event_select",
    )
    eid = event_options.get(eid_label) if eid_label != "None" else None

    if file and user:
        uploaded_by = user["id"]
        with st.spinner("Parsing and uploading..."):
            result = save_uploaded_file(file, eid, uploaded_by)

        st.success(f"✅ File uploaded! File ID: {result['file_id']}")

        recipes = result.get("parsed", {}).get("recipes")
        if recipes:
            recipe_draft = recipes if isinstance(recipes, dict) else recipes[0]

            st.markdown("### 🧪 Auto-Detected Recipe Preview")
            with st.form("confirm_recipe_from_upload"):
                name = st.text_input(
                    "Recipe Name",
                    recipe_draft.get("name") or recipe_draft.get("title", ""),
                )
                
                ingredients = st.text_area(
                    "Ingredients",
                    value=value_to_text(recipe_draft.get("ingredients")),
                )
                instructions = st.text_area(
                    "Instructions",
                    value=value_to_text(recipe_draft.get("instructions")),
                )
                notes = st.text_area(
                    "Notes",
                    value=value_to_text(recipe_draft.get("notes")),
                )
      
                confirm = st.form_submit_button("Save Recipe")

                if eid:
                    st.markdown("### 🍽️ Save as Menu Item for Event")
                    st.session_state["parsed_recipe_context"] = {
                        "title": name,
                        "instructions": instructions,
                        "notes": notes,
                        "tags": [],
                        "allergens": [],
                        "event_id": eid,
                    }
                    save_parsed_menu_ui(st.session_state["parsed_recipe_context"])

                if confirm:
                    recipe_draft.update({
                        "name": name,
                        "ingredients": ingredients,
                        "instructions": instructions,
                        "notes": notes,
                        "tags": [],
                        "author_name": user.get("name", uploaded_by),
                    })
                    recipe_id = save_recipe_to_firestore(recipe_draft)
                    if recipe_id:
                        st.success(f"✅ Recipe saved! ID: {recipe_id}")
                    else:
                        st.error("❌ Failed to save recipe.")

    st.markdown("---")
    st.markdown("## 📁 File Manager")
    if user:
        file_manager_ui({"id": user["id"]})

# ----------------------------
# 📱 Mobile Upload UI
# ----------------------------
def upload_ui_mobile():
    from mobile_layout import render_mobile_navigation
    st.title("📤 Upload Files")
    user_id = get_user_id()
    event_id = get_active_event_id()
    db = get_db()

    st.markdown("### Upload a new file")
    uploaded_file = st.file_uploader("Drop or select a file", type=["pdf", "txt", "jpg", "png", "jpeg", "csv", "docx"])

    if uploaded_file:
        with st.spinner("Parsing and uploading..."):
            result = save_uploaded_file(uploaded_file, event_id, user_id)
            st.session_state["last_uploaded_file"] = result

        st.success("✅ File uploaded and parsed.")

        if st.button("View / Edit Data"):
            from file_storage import _render_parsed_data_editor
            _render_parsed_data_editor({
                "id": result["file_id"],
                "name": uploaded_file.name,
                "parsed_data": {"parsed": result.get("parsed", {})}
            }, db)

        show_save_file_actions(st.session_state["last_uploaded_file"])

    st.markdown("---")
    st.markdown("## 📁 File Manager")
    file_manager_ui({"id": user_id})
