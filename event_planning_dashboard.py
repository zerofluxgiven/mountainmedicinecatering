import streamlit as st
from firestore import db
from utils import session_get
from menu_editor import render_menu_editor
from upload import upload_ui
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
