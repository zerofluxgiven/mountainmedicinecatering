import streamlit as st
from src.auth import is_authenticated, get_user_role
from src.firestore_utils import get_active_event
from datetime import datetime

def show():
    st.title("Team Dashboard")

    active_event = get_active_event()

    if active_event:
        st.subheader("Live Event Overview")
        st.info(f"Now running: **{active_event.get('name', 'Unnamed Event')}**")
        st.write(f"Dates: {active_event.get('start_date', '')} → {active_event.get('end_date', '')}")
        
        st.markdown("### Current Status")
        st.checkbox("Kitchen ready?")
        st.checkbox("Transport confirmed?")
        st.checkbox("Team briefed?")
    else:
        st.subheader("Planning Mode")
        st.write("No active event. You're in planning mode.")
        st.markdown("### Upcoming Events")
        st.success("You can preview upcoming events here...")

    # Optional: admin-only insights
    if get_user_role() == "admin":
        st.markdown("### Admin Insights")
        st.json({
            "current_user": st.session_state.user,
            "session_time": str(datetime.now())
        })
