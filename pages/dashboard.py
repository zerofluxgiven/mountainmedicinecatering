# pages/dashboard.py
import streamlit as st
from firestore_utils import get_active_event
from auth import is_authenticated

def show():
    st.title("Dashboard")

    event = get_active_event()
    if event:
        st.success(f"Active Event: {event.get('name', 'Unnamed')}")

        st.markdown("### Quick Status")
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Guests", event.get("guest_count", "-"))
        with col2:
            st.metric("Staff", event.get("staff_count", "-"))
        with col3:
            st.metric("Menu Items", len(event.get("menu", [])))

        st.markdown("### Today's Checklist")
        st.checkbox("Confirm prep station setup")
        st.checkbox("Review schedule with staff")
        st.checkbox("Inventory checked")

    else:
        st.info("No active event.")
        st.markdown("### Planning Overview")
        st.write("You can view and edit upcoming events under the 'Events' tab.")
