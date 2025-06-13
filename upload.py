    with st.expander("🧾 Parsed Metadata Editor", expanded=True):
        parsed_data['type'] = st.text_input("Type", parsed_data.get('type', ''))
        parsed_data['meal_time'] = st.text_input("Meal Time", parsed_data.get('meal_time', ''))
        parsed_data['diet'] = st.text_input("Diet", parsed_data.get('diet', ''))
        parsed_data['notes'] = st.text_area("Notes", parsed_data.get('notes', ''))
        parsed_data['allergens'] = st.text_input("Allergens (comma-separated)", 
                                              ', '.join(parsed_data.get('allergens', []))).split(',')
import streamlit as st
from auth import require_role
from file_storage import save_uploaded_file
from utils import session_get, format_date
from mobile_helpers import safe_file_uploader
from mobile_components import render_mobile_navigation
from events import get_all_events
from recipes import parse_and_store_recipe_from_file, save_recipe_to_firestore  # ✅ ADD THIS

@require_role("user")
def upload_ui(event_id: str = None):
    if st.session_state.get("mobile_mode"):
        render_mobile_navigation()

    st.subheader("📄 Upload a File")

    file = safe_file_uploader("Select file to upload", type=["pdf", "png", "jpg", "jpeg", "txt"])
    user = session_get("user")

    events = get_all_events()
    event_options = {
        f"{e.get('name', 'Unnamed')} ({format_date(e.get('start_date'))}) - {e.get('status', 'planning')}": e['id']
        for e in events if not e.get("deleted", False)
    }
    eid_label = st.selectbox("Select Event (optional)", ["None"] + list(event_options.keys()))
    eid = event_options.get(eid_label) if eid_label != "None" else None

    if file and user:
        uploaded_by = user["id"]
        if st.button("Upload"):

            file_id = save_uploaded_file(file, eid, uploaded_by)
            st.success(f"✅ File uploaded! File ID: {file_id}")

            # Attempt smart recipe parsing if .txt
            if file.name.lower().endswith(".txt"):
                try:
                    file.seek(0)
                    contents = file.read().decode("utf-8")
                    recipe_draft = parse_and_store_recipe_from_file(contents, uploaded_by)

                    st.markdown("### 🧪 Auto-Detected Recipe Preview")
                    with st.form("confirm_recipe_from_upload"):
                        name = st.text_input("Recipe Name", recipe_draft["name"])
                        ingredients = st.text_area("Ingredients", recipe_draft["ingredients"])
                        instructions = st.text_area("Instructions", recipe_draft["instructions"])
                        notes = st.text_area("Notes", recipe_draft.get("notes", ""))
                        confirm = st.form_submit_button("Save Recipe")
                        # Offer to save as event menu item if in event context
                        if eid:
                            from upload_integration import save_parsed_menu_ui
                            st.markdown("### 🍽️ Save as Menu Item for Event")
                            st.session_state["parsed_recipe_context"] = {
                                "title": name,  # <-- was \"name\"; must be \"title\"
                                "instructions": instructions,
                                "notes": notes,
                                "tags": [],
                                "allergens": [],
                                "event_id": eid
                            }
                            save_parsed_menu_ui(st.session_state["parsed_recipe_context"])


                        if confirm:
                            recipe_draft["name"] = name
                            recipe_draft["ingredients"] = ingredients
                            recipe_draft["instructions"] = instructions
                            recipe_draft["notes"] = notes
                            recipe_draft["tags"] = []
                            recipe_draft["author_name"] = user.get("name", uploaded_by)
                            recipe_id = save_recipe_to_firestore(recipe_draft)
                            if recipe_id:
                                st.success(f"✅ Recipe saved from upload! ID: {recipe_id}")
                            else:
                                st.error("❌ Failed to save parsed recipe.")
                except Exception as e:
                    st.warning(f"⚠️ Could not parse recipe: {e}")
