import streamlit as st
from src.auth import require_login
from src.firestore_utils import get_active_event
from google.cloud import firestore
import datetime

db = firestore.Client()

def show():
    require_login()
    st.title("Post-Event Interview")

    event = get_active_event()
    if not event:
        st.warning("No active event selected.")
        return

    event_id = event["event_id"]
    event_name = event.get("name", "Unnamed")
    st.subheader(f"Post-Event Summary for: {event_name}")

    interview_ref = db.collection("events").document(event_id).collection("post_event").document("interview")
    existing = interview_ref.get()
    if existing.exists:
        st.info("Existing responses loaded.")
        data = existing.to_dict()
    else:
        data = {}

    # Form fields
    popularity = st.text_area("Which menu items were most popular?", value=data.get("popularity", ""))
    leftovers = st.text_area("Were there any leftovers or shortages?", value=data.get("leftovers", ""))
    timeline = st.text_area("Did anything take longer/less time than expected?", value=data.get("timing", ""))
    issues = st.text_area("Any issues that came up?", value=data.get("issues", ""))
    improvements = st.text_area("What would you improve next time?", value=data.get("improvements", ""))
    equipment = st.text_area("Anything you wished you had (missing gear, tools, supplies)?", value=data.get("equipment_notes", ""))

    if st.button("Save Summary"):
        interview_ref.set({
            "popularity": popularity,
            "leftovers": leftovers,
            "timing": timeline,
            "issues": issues,
            "improvements": improvements,
            "equipment_notes": equipment,
            "timestamp": datetime.datetime.utcnow()
        })
        st.success("Post-event summary saved.")
