import streamlit as st
from auth import require_role, get_user, get_user_id
from utils import session_get, format_date, get_active_event_id, value_to_text
from file_storage import save_uploaded_file, file_manager_ui
from upload_integration import save_parsed_menu_ui, show_save_file_actions
from ai_parsing_engine import is_meaningful_recipe
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
    st.subheader("📄 Upload Files")
    st.info("💡 Tip: You can select multiple files (e.g., front and back of a recipe)")

    files = st.file_uploader(
        "Select file(s) to upload",
        type=["pdf", "png", "jpg", "jpeg", "txt", "csv", "docx"],
        accept_multiple_files=True,
        key="desktop_multi_upload"
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

    if files and user and st.button("📄 Parse Files", type="primary"):
        uploaded_by = user["id"]
        with st.spinner(f"Processing {len(files)} file(s)..."):
            combined_recipe = {}
            all_results = []
            
            # Process each file
            for idx, file in enumerate(files):
                st.text(f"Processing {file.name}...")
                result = save_uploaded_file(file, eid, uploaded_by)
                all_results.append(result)
                
                # Extract and merge recipes
                parsed_recipe = result.get("parsed", {}).get("recipes", {})
                if parsed_recipe and isinstance(parsed_recipe, dict):
                    if idx == 0:
                        combined_recipe = parsed_recipe
                    else:
                        from recipes import merge_recipe_data
                        combined_recipe = merge_recipe_data(combined_recipe, parsed_recipe)

        st.success(f"✅ {len(files)} file(s) processed!")

        if combined_recipe:
            if len(files) > 1:
                st.success(f"✨ Merged {len(files)} pages into one recipe")
                
            # Open recipe editor automatically
            from recipes_editor import recipe_editor_ui
            st.info("📝 Opening recipe editor...")
            recipe_editor_ui(prefill_data=combined_recipe)
            return
            
        # If no recipe found, show file manager
        st.warning("No recipe found in uploaded files")

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

    st.markdown("### Upload Recipe Files")
    st.info("💡 You can select multiple files (e.g., front and back of a recipe card)")
    
    uploaded_files = st.file_uploader(
        "Select one or more files",
        type=["pdf", "txt", "jpg", "png", "jpeg", "csv", "docx"],
        accept_multiple_files=True,
        key="multi_upload_files"
    )

    if uploaded_files and st.button("📄 Parse Recipe", type="primary", use_container_width=True):
        with st.spinner(f"Parsing {len(uploaded_files)} file(s)..."):
            combined_recipe = {}
            all_results = []
            
            # Process each file
            for idx, uploaded_file in enumerate(uploaded_files):
                st.text(f"Processing {uploaded_file.name}...")
                result = save_uploaded_file(uploaded_file, event_id, user_id)
                all_results.append(result)
                
                # Extract recipe from this file
                parsed_recipe = result.get("parsed", {}).get("recipes", {})
                if parsed_recipe and isinstance(parsed_recipe, dict):
                    if idx == 0:
                        # First file becomes the base
                        combined_recipe = parsed_recipe
                    else:
                        # Merge subsequent files
                        from recipes import merge_recipe_data
                        combined_recipe = merge_recipe_data(combined_recipe, parsed_recipe)
            
            st.session_state["last_uploaded_files"] = all_results

        st.success(f"✅ {len(uploaded_files)} file(s) processed!")
        
        # Check if we got a recipe
        if combined_recipe:
            # Automatically open recipe editor with combined data
            from recipes_editor import recipe_editor_ui
            st.info("📝 Opening recipe editor with combined data...")
            
            if len(uploaded_files) > 1:
                st.success(f"✨ Merged {len(uploaded_files)} pages into one recipe")
            
            recipe_editor_ui(prefill_data=combined_recipe)
            return  # Don't show the rest of the upload UI
        
        # Only show these if not a recipe
        if st.button("View / Edit Data"):
            st.warning("No recipe found in uploaded files")
            # Show the first file's data
            if all_results:
                from file_storage import _render_parsed_data_editor
                _render_parsed_data_editor({
                    "id": all_results[0]["file_id"],
                    "name": uploaded_files[0].name,
                    "parsed_data": {"parsed": all_results[0].get("parsed", {})}
                }, db)

    st.markdown("---")
    st.markdown("## 📁 File Manager")
    file_manager_ui({"id": user_id})
