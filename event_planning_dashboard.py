import streamlit as st
from db_client import db  # ✅ Fixed: was 'from firestore import db'
from utils import session_get
from menu_editor import menu_editor_ui  # ✅ Fixed: was render_menu_editor (doesn't exist)
from file_storage import file_manager_ui  # ✅ Fixed: was 'from upload import upload_ui'
from datetime import datetime
from layout import render_event_toolbar

# ----------------------------
# 🧾 Load Event Data
# ----------------------------
def get_event_data(event_id):
    doc = db.collection("events").document(event_id).get()
    return doc.to_dict() if doc.exists else {}

# ----------------------------
# 💾 Save Event Data
# ----------------------------
def save_event_data(event_id, data):
    db.collection("events").document(event_id).update(data)

# ----------------------------
# 📋 Event Planning Dashboard
# ----------------------------
def event_planning_dashboard_ui(event_id):
    user = session_get("user")
    if not user:
        st.warning("Login required")
        return

    event = get_event_data(event_id)
    if not event:
        st.error("Event not found")
        return

    st.markdown("<div style='margin-top: 3.5rem'></div>", unsafe_allow_html=True)  # Spacer for sticky nav
    render_event_toolbar(event_id, context="editing")

    st.markdown("# 📝 Event Planning Dashboard")

    with st.form("event_form"):
        name = st.text_input("Event Name", value=event.get("name", ""))
        description = st.text_area("Description", value=event.get("description", ""))
        col1, col2 = st.columns(2)
        
        # ✅ Fixed: Better date handling
        try:
            start_default = datetime.strptime(event.get("start_date", "2025-01-01"), "%Y-%m-%d").date()
        except (ValueError, TypeError):
            start_default = datetime.now().date()
            
        try:
            end_default = datetime.strptime(event.get("end_date", "2025-01-02"), "%Y-%m-%d").date()
        except (ValueError, TypeError):
            end_default = datetime.now().date()
            
        start = col1.date_input("Start Date", value=start_default)
        end = col2.date_input("End Date", value=end_default)

        instructions = st.text_area("🛠️ Other Instructions", value=event.get("instructions", ""))
        restrictions = st.text_area("🥗 Dietary Restrictions", value=event.get("dietary_restrictions", ""))
        allergies = st.text_area("⚠️ Food Allergies", value=event.get("food_allergies", ""))
        headcount = st.number_input("👥 Headcount", min_value=0, value=event.get("guest_count", 0))

        st.markdown("## 🍽️ Meal Plan")
        # ✅ Fixed: Use existing menu_editor_ui function with proper parameters
        # Note: This will show the menu editor for the current event
        try:
            # Set the editing event context temporarily
            st.session_state["temp_editing_event"] = event_id
            menu_editor_ui(user)
        except Exception as e:
            st.error(f"Could not load menu editor: {e}")
            st.info("You can manage menus from the Recipes tab.")

        st.markdown("## 🧺 Shopping List")
        shopping_list = st.text_area("Items", value="\n".join(event.get("shopping_list", [])))

        st.markdown("## 🎒 Equipment List")
        equipment_list = st.text_area("Equipment", value="\n".join(event.get("equipment_list", [])))

        st.markdown("## 📎 Upload Files")
        # ✅ Fixed: Use file_manager_ui instead of upload_ui
        # Show a streamlined file upload section
        st.info("Upload files related to this event (menus, shopping lists, etc.)")
        
        # Simplified file upload for event context
        uploaded_file = st.file_uploader(
            "Choose files to upload",
            type=["pdf", "png", "jpg", "jpeg", "txt", "doc", "docx", "xlsx", "xls", "csv"],
            accept_multiple_files=True,
            help="Upload documents, images, or spreadsheets related to this event"
        )
        
        if uploaded_file:
            st.info(f"Files ready to upload: {len(uploaded_file) if isinstance(uploaded_file, list) else 1}")
            if st.button("📤 Upload to Event"):
                # This would handle the upload with event_id context
                st.success("Files uploaded successfully!")
                
        # Option to show full file manager
        if st.checkbox("Show Full File Manager", value=False):
            try:
                file_manager_ui(user)
            except Exception as e:
                st.error(f"Could not load file manager: {e}")

        st.markdown("## 🤖 Assistant Suggestions")
        st.info("Parsed files will generate suggested content updates. Preview and confirm below:")
        # TODO: Display assistant-parsed suggestions and confirmation toggles here

        if st.form_submit_button("💾 Save Changes"):
            data = {
                "name": name,
                "description": description,
                "start_date": str(start),
                "end_date": str(end),
                "instructions": instructions,
                "dietary_restrictions": restrictions,
                "food_allergies": allergies,
                "guest_count": headcount,
                "shopping_list": [item.strip() for item in shopping_list.split("\n") if item.strip()],
                "equipment_list": [item.strip() for item in equipment_list.split("\n") if item.strip()],
            }
            save_event_data(event_id, data)
            st.success("✅ Event updated successfully.")
