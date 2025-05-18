import streamlit as st
from src.firestore_utils import get_pending_suggestion_count

def load_css():
    """Inject global style overrides."""
    with open("public/style.css") as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

def show_event_header(event_data):
    """Display a persistent banner when Event Mode is active."""
    event_name = event_data.get("name", "Unnamed Event")
    event_dates = f"{event_data.get('start_date', '')} → {event_data.get('end_date', '')}"
    st.markdown(f"""
    <div style='background-color:#6C4AB6; padding: 1rem; color:white; border-radius: 0.5rem; margin-bottom: 1rem;'>
        <strong>Event Mode Active:</strong> {event_name} <br>
        <small>{event_dates}</small>
    </div>
    """, unsafe_allow_html=True)

def show_notification_badge():
    """Show a red badge if there are pending suggestions."""
    count = get_pending_suggestion_count()
    if count > 0:
        st.markdown(f"""
        <div style="position: fixed; top: 1rem; right: 1rem; background-color: red;
                    color: white; padding: 0.4rem 0.75rem; border-radius: 999px; font-size: 0.85rem;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2); z-index: 1000;">
            {count} suggestion{'s' if count > 1 else ''} pending
        </div>
        """, unsafe_allow_html=True)
