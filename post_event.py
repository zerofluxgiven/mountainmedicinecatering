import streamlit as st
from firebase_admin import firestore
from auth import require_role
from events import get_all_events
from utils import format_date
from datetime import datetime

db = firestore.client()
COLLECTION = "event_feedback"

# -------------------------------
# 🔍 Feedback Retrieval
# -------------------------------

def get_event_feedback(event_id):
    doc = db.collection(COLLECTION).document(event_id).get()
    return doc.to_dict() if doc.exists else {}

def save_event_feedback(event_id, feedback):
    db.collection(COLLECTION).document(event_id).set(feedback, merge=True)
    st.success("Feedback saved.")

# -------------------------------
# 🧾 Feedback Form
# -------------------------------

def feedback_form(event):
    st.markdown(f"### ✏️ Post-Event Review: **{event['name']}**")
    st.write(f"📍 {event['location']} on {format_date(event['date'])}")
    st.write(f"👥 Guests: {event['guest_count']}")

    existing = get_event_feedback(event["id"])

    with st.form(f"feedback_{event['id']}"):
        menu_notes = st.text_area("🍽️ Popular Menu Items", value=existing.get("menu_notes", ""))
        leftovers = st.text_area("📦 Leftovers / Overages", value=existing.get("leftovers", ""))
        timing = st.text_area("⏱️ Timing Accuracy (what ran late or early?)", value=existing.get("timing", ""))
        forgotten = st.text_area("📝 Forgotten Items or Misses", value=existing.get("forgotten", ""))
        improvements = st.text_area("💡 Improvements for Future Events", value=existing.get("improvements", ""))
        submitted = st.form_submit_button("💾 Save Feedback")

        if submitted:
            feedback = {
                "menu_notes": menu_notes,
                "leftovers": leftovers,
                "timing": timing,
                "forgotten": forgotten,
                "improvements": improvements,
                "submitted_at": datetime.now(),
            }
            save_event_feedback(event["id"], feedback)

# -------------------------------
# 🖥️ Main UI
# -------------------------------

def post_event_ui(user):
    st.subheader("📋 Post-Event Feedback")

    if not require_role(user, "manager"):
        st.warning("You must be a manager or admin to submit feedback.")
        return

    completed_events = [e for e in get_all_events() if e["status"] == "complete"]
    if not completed_events:
        st.info("No completed events found.")
        return

    selected = st.selectbox("Select a Completed Event", completed_events, format_func=lambda e: e["name"])

    if selected:
        feedback_form(selected)
