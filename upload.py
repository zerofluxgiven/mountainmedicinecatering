import streamlit as st
from auth import require_role, get_user, get_user_id
from utils import session_get, format_date, get_active_event_id
from file_storage import save_uploaded_file, file_manager_ui
from upload_integration import save_parsed_menu_ui, show_save_file_actions
from ui_components import render_tag_group, edit_metadata_ui
from events import get_all_events
from mobile_helpers import safe_file_uploader

# ----------------------------
# 📤 Desktop Upload UI
# ----------------------------
@require_role("user")
def upload_ui_desktop(event_id: str = None):
    st.subheader("📄 Upload a File")

    file = safe_file_uploader("Select file to upload", type=["pdf", "png", "jpg", "jpeg", "txt"])
    user = session_get("user")

    events = get_all_events()
    event_options = {
        f"{e.get('name', 'Unnamed')} ({format_date(e.get('start_date'))} - {e.get('status', 'planning')})": e['id']
        for e in events if not e.get("deleted", False)
    }

    eid_label = st.selectbox("Select Event (optional)", ["None"] + list(event_options.keys()), key="auto_key")
    eid = event_options.get(eid_label) if eid_label != "None" else None

    if file and user:
        uploaded_by = user["id"]
        if st.button("Upload"):
            file_id = save_uploaded_file(file, eid, uploaded_by)
            st.success(f"✅ File uploaded! File ID: {file_id}")

            if file.name.lower().endswith(".txt"):
                try:
                    file.seek(0)
                    contents = file.read().decode("utf-8")

                    from ai_parsing_engine import parse_file as parse_and_store_recipe_from_file
                    recipe_draft = parse_and_store_recipe_from_file(contents)

                    st.markdown("### 🧪 Auto-Detected Recipe Preview")
                    with st.form("confirm_recipe_from_upload"):
                        name = st.text_input("Recipe Name", recipe_draft["name"])
                        ingredients = st.text_area("Ingredients", recipe_draft["ingredients"])
                        instructions = st.text_area("Instructions", recipe_draft["instructions"])
                        notes = st.text_area("Notes", recipe_draft.get("notes", ""))
                        confirm = st.form_submit_button("Save Recipe")

                        if eid:
                            st.markdown("### 🍽️ Save as Menu Item for Event")
                            st.session_state["parsed_recipe_context"] = {
                                "title": name,
                                "instructions": instructions,
                                "notes": notes,
                                "tags": [],
                                "allergens": [],
                                "event_id": eid
                            }
                            save_parsed_menu_ui(st.session_state["parsed_recipe_context"])

                        if confirm:
                            recipe_draft.update({
                                "name": name,
                                "ingredients": ingredients,
                                "instructions": instructions,
                                "notes": notes,
                                "tags": [],
                                "author_name": user.get("name", uploaded_by)
                            })
                            from recipe_db import save_recipe_to_firestore
                            recipe_id = save_recipe_to_firestore(recipe_draft)
                            if recipe_id:
                                st.success(f"✅ Recipe saved! ID: {recipe_id}")
                            else:
                                st.error("❌ Failed to save recipe.")
                except Exception as e:
                    st.warning(f"⚠️ Could not parse recipe: {e}")

# ----------------------------
# 📱 Mobile Upload UI
# ----------------------------
def upload_ui_mobile():
    from mobile_layout import render_mobile_navigation
    st.title("📤 Upload Files")
    user_id = get_user_id()
    event_id = get_active_event_id()

    st.markdown("### Upload a new file")
    uploaded_file = st.file_uploader("Drop or select a file", type=["pdf", "txt", "jpg", "png", "jpeg", "csv", "docx"])

    if uploaded_file:
        with st.spinner("Parsing and uploading..."):
            result = save_uploaded_file(uploaded_file, event_id, user_id)
            st.session_state["last_uploaded_file"] = result

        st.success("✅ File uploaded and parsed.")

        if st.button("View / Edit Parsed Data"):
            parsed = result.get("parsed", {})
            parsed = edit_metadata_ui(parsed)
            render_tag_group("Recipe", [parsed.get("title", "")], color="green")
            render_tag_group("Allergens", parsed.get("allergens", []), color="red")
            render_tag_group("Tags", parsed.get("tags", []), color="purple")

        show_save_file_actions(st.session_state["last_uploaded_file"])

    st.markdown("---")
    st.markdown("## 📁 File Manager")
    file_manager_ui({"id": user_id})
