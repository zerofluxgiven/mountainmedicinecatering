import streamlit as st
from utils import format_date, get_active_event

def show_event_mode_banner():
    active_event = get_active_event()
    if not active_event:
        return

    name = active_event.get("name", "Unnamed Event")
    date = format_date(active_event.get("date"))
    location = active_event.get("location", "Unknown")

    st.markdown(f"""
        <div style="background-color:#fff8e1;padding:12px;border-radius:10px;margin:12px 0;border:1px solid #ffecb3;">
            <strong>📅 Event Mode Active:</strong> {name}<br>
            📍 {location} | 🗓 {date}
        </div>
    """, unsafe_allow_html=True)

def render_event_toolbar(*args, **kwargs):
    st.markdown("<!-- Event toolbar placeholder -->", unsafe_allow_html=True)
