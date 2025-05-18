import streamlit as st
from src.auth import require_login, get_user_role, is_admin
from src.firestore_utils import get_active_event
from google.cloud import firestore

db = firestore.Client()

def show():
    require_login()
    st.title("Event Mode")

    active = get_active_event()
    if not active:
        st.warning("No active event.")
        return

    event_id = active["event_id"]
    event_ref = db.collection("events").document(event_id)
    event = event_ref.get().to_dict()
    status = event.get("status", "paused")

    st.markdown(f"### Current Event: **{event.get('name', 'Unnamed')}**")
    st.write(f"Status: `{status}`")

    # Toggle button
    if st.button("Pause Event" if status == "running" else "Resume Event"):
        new_status = "paused" if status == "running" else "running"
        event_ref.update({"status": new_status})
        st.success(f"Event status updated to: {new_status}")

    # Checklist
    st.markdown("### Live Checklist")
    st.checkbox("Prep Station Ready", key="prep")
    st.checkbox("Staff Briefed", key="briefed")
    st.checkbox("Transport Confirmed", key="transport")

    # Admin Controls
    if is_admin():
        st.markdown("### Admin Controls")
        if st.button("Mark Event Complete"):
            event_ref.update({"status": "complete"})
            st.success("Event marked complete. Post-event interview triggered.")

        if st.button("Exit Event Mode"):
            db.collection("state").document("active_event").delete()
            st.success("Exited Event Mode. All pages now in planning mode.")
