import streamlit as st
from firestore import db
from utils import session_get
from menu_editor import render_menu_editor
from files import upload_ui
from datetime import datetime

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

    st.markdown("# 📝 Event Planning Dashboard")
    event = get_event_data(event_id)
    if not event:
        st.error("Event not found")
        return

    st.markdown("""
        <div style='position:fixed; top:0; right:0; background:#6C4AB6; color:white; padding:0.5rem 1rem; border-bottom-left-radius:8px; z-index:1000;'>
            <b>Editing:</b> {name} &nbsp;&nbsp;
            <a href='?mode=leave' style='color:white; text-decoration:underline;'>🚪 Leave</a> &nbsp;&nbsp;
            <a href='?mode=pause' style='color:white; text-decoration:underline;'>⏸️ Pause</a> &nbsp;&nbsp;
            <a href='?mode=switch' style='color:white; text-decoration:underline;'>🔁 Switch</a>
        </div>
    """, unsafe_allow_html=True)

    with st.form("event_form"):
        name = st.text_input("Event Name", value=event.get("name", ""))
        description = st.text_area("Description", value=event.get("description", ""))
        col1, col2 = st.columns(2)
        start = col1.date_input("Start Date", value=datetime.strptime(event.get("start_date", "2025-01-01"), "%Y-%m-%d"))
        end = col2.date_input("End Date", value=datetime.strptime(event.get("end_date", "2025-01-02"), "%Y-%m-%d"))

        instructions = st.text_area("🛠️ Other Instructions", value=event.get("instructions", ""))
        restrictions = st.text_area("🥗 Dietary Restrictions", value=event.get("dietary_restrictions", ""))
        allergies = st.text_area("⚠️ Food Allergies", value=event.get("food_allergies", ""))
        headcount = st.number_input("👥 Headcount", min_value=0, value=event.get("guest_count", 0))

        st.markdown("## 🍽️ Meal Plan")
        render_menu_editor(event_id)

        st.markdown("## 🧺 Shopping List")
        shopping_list = st.text_area("Items", value="\n".join(event.get("shopping_list", [])))

        st.markdown("## 🎒 Equipment List")
        equipment_list = st.text_area("Equipment", value="\n".join(event.get("equipment_list", [])))

        st.markdown("## 📎 Upload Files")
        upload_ui(event_id)

        st.markdown("## 🤖 Assistant Suggestions")
        st.info("Parsed files will generate suggested content updates. Preview and confirm below:")
        # Placeholder: Show assistant-parsed data preview here

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
