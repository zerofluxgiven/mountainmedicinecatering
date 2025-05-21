import streamlit as st
from events import get_active_event_id, get_active_event
from suggestions import get_suggestion_count
from utils import format_date, session_get
from ai_chat import ai_chat_ui

# ----------------------------
# 🎨 Custom CSS Injection
# ----------------------------
def inject_custom_css():
    try:
        with open("public/style.css") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
    except FileNotFoundError:
        st.warning("⚠️ style.css not found in /public.")

# ----------------------------
# 📢 Event Mode Banner
# ----------------------------
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
        📍 <i>{location}</i> on <b>{date}</b><br>
        ✏️ Only content tagged to this event is editable.
    </div>
    """, unsafe_allow_html=True)

# ----------------------------
# 🔒 Lock Indicator
# ----------------------------
def is_locked_for_editing(item_event_id: str):
    active_event_id = get_active_event_id()
    return active_event_id and (item_event_id != active_event_id)

def show_locked_notice():
    st.warning("🔒 This item is locked for editing due to Event Mode.")

# ----------------------------
# 🔔 Sidebar Badge
# ----------------------------
def show_notification_badge(user):
    if not user:
        return
    count = get_suggestion_count()
    if count > 0:
        st.sidebar.markdown(
            f"<div style='margin-top:10px;color:#B00020;font-weight:bold;'>🔔 {count} pending suggestion(s)</div>",
            unsafe_allow_html=True
        )

# ----------------------------
# 🔖 Event Tag Label
# ----------------------------
def show_event_tag_label(event_id):
    active_event = get_active_event()
    if active_event and event_id == active_event.get("id"):
        st.markdown("🔖 *Tagged to current active event*", unsafe_allow_html=True)
    else:
        st.markdown("🔒 *Not part of the active event*", unsafe_allow_html=True)

# ----------------------------
# 🧱 Page Wrapper
# ----------------------------
def render_page(user, content_func):
    if user:
        show_notification_badge(user)
    show_event_mode_banner()
    content_func()
    show_floating_assistant()

# ----------------------------
# 🧠 Floating Assistant (Always Visible)
# ----------------------------
def show_floating_assistant():
    user = session_get("user")
    if not user:
        return

    with st.sidebar:
        show = st.toggle("🧠 Open Assistant Panel", key="open_floating_ai")

    if st.session_state.get("open_floating_ai"):
        with st.container():
            st.markdown("""
                <div style="position:fixed; bottom:2rem; right:2rem; background:white; border:1px solid #ccc; 
                            padding:1rem; border-radius:1rem; box-shadow:0 2px 12px rgba(0,0,0,0.1); z-index:1000; 
                            width:min(400px, 90%); max-height:80vh; overflow-y:auto;">
            """, unsafe_allow_html=True)
            ai_chat_ui()
            st.markdown("</div>", unsafe_allow_html=True)