import streamlit as st
from event_mode import get_event_context
from utils import format_date
from mobile_helpers import safe_columns
from mobile_components import mobile_card, render_mobile_navigation

def render_dashboard(user=None):
    st.title("📊 Dashboard")

    if st.session_state.get("mobile_mode"):
        render_mobile_navigation()

    event = get_event_context()

    if event:
        mobile_card("🗕️ Active Event", f"**{event.get('name', 'Unnamed')}**")
        st.markdown(f"📍 Location: *{event.get('location', 'Unknown')}*")
        st.markdown(f"🗓️ Date: *{format_date(event.get('start_datetime'))} → {format_date(event.get('end_datetime'))}*")

        st.markdown("### 📈 Quick Stats")
        col1, col2, col3 = safe_columns(3)
        col1.metric("👥 Guests", event.get("guest_count", "-"))
        col2.metric("🦑 Staff", event.get("staff_count", "-"))
        col3.metric("🍽️ Menu Items", len(event.get("menu", [])))

        st.markdown("### ✅ Today's Checklist")
        st.checkbox("Prep station setup complete")
        st.checkbox("Reviewed schedule with staff")
        st.checkbox("Checked inventory and supplies")
        st.checkbox("Load equipment into transport")
        st.checkbox("Set up dishwashing station")

    else:
        st.info("No active event selected.")
        st.markdown("Navigate to the **Events** tab to activate or create one.")
