import streamlit as st
from utils import session_get
from ai_chat import ai_chat_ui
from events import get_active_event
from utils import format_date

# ----------------------------
# 🎨 Inject Custom CSS + JS
# ----------------------------
def inject_custom_css():
    try:
        with open("style.css") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
    except FileNotFoundError:
        st.warning("⚠️ style.css not found in root directory.")

    st.markdown("""
    <script>
    const fab = window.parent.document.querySelector('#ai-fab');
    if (!fab) {
        const btn = document.createElement('button');
        btn.id = 'ai-fab';
        btn.innerHTML = '💬';
        btn.style.position = 'fixed';
        btn.style.bottom = '1.5rem';
        btn.style.right = '1.5rem';
        btn.style.background = '#6C4AB6';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '50%';
        btn.style.width = '3.5rem';
        btn.style.height = '3.5rem';
        btn.style.fontSize = '1.4rem';
        btn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.15)';
        btn.style.cursor = 'pointer';
        btn.style.zIndex = 1000;
        btn.onclick = function() {
            const el = window.parent.document.getElementById('streamlit-assistant-toggle');
            if (el) el.click();
        };
        document.body.appendChild(btn);
    }
    </script>
    """, unsafe_allow_html=True)

# ----------------------------
# 💬 Floating Assistant
# ----------------------------
def render_floating_assistant():
    user = session_get("user")
    if not user:
        return

    if st.session_state.get("show_assistant", False):
        st.markdown("<div style='position: fixed; bottom: 5rem; right: 2rem; width: 400px; z-index: 999;'>", unsafe_allow_html=True)
        with st.expander("💬 Assistant", expanded=True):
            ai_chat_ui()
        st.markdown("</div>", unsafe_allow_html=True)

    st.button("toggle", key="streamlit-assistant-toggle", on_click=toggle_assistant_visibility)

def toggle_assistant_visibility():
    show = st.session_state.get("show_assistant", False)
    st.session_state["show_assistant"] = not show

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
    <div class='sticky-banner'>
        <strong>📅 Event Mode Active:</strong> {name}
        <br>📍 <i>{location}</i> on <b>{date}</b>
        <br>✏️ Only content tagged to this event is editable.
    </div>
    """, unsafe_allow_html=True)

# ----------------------------
# 🔒 Lock Notice
# ----------------------------
def show_locked_notice():
    st.info("✏️ This item is locked due to Event Mode. You can suggest changes, but editing is disabled.", icon="🔒")

# ----------------------------
# 🏷️ Event Tag Label
# ----------------------------
def show_event_tag_label(event_id):
    from events import get_event_by_id
    event = get_event_by_id(event_id)
    if not event:
        return
    name = event.get("name", "Unnamed Event")
    st.markdown(f"<div style='margin-top: -0.5rem; color: gray;'>🏷️ <i>Tagged to:</i> <b>{name}</b></div>", unsafe_allow_html=True)

# ----------------------------
# 🧭 Top Navigation Tabs
# ----------------------------
def render_top_navbar(tabs):
    st.markdown("<div class='nav-tabs'>", unsafe_allow_html=True)
    selected = st.radio(
        "Navigation",
        tabs,
        key="top_nav",
        horizontal=True,
        label_visibility="collapsed"
    )
    st.markdown("</div>", unsafe_allow_html=True)
    return selected

# ----------------------------
# 🧰 Event Toolbar (Leave/Pause/Switch)
# ----------------------------
def render_event_toolbar(event_id, context="active"):
    from streamlit.runtime.scriptrunner import get_script_run_ctx
    st.markdown("""
    <div class="event-toolbar">
        <span style="float: right;">
            <a href="#" onclick="window.location.reload(); return false;">🔁 Switch</a> &nbsp;
            <a href="#" onclick="alert('Event Paused!'); return false;">⏸ Pause</a> &nbsp;
            <a href="#" onclick="window.location.href='/?leave_event=true'; return false;">🚪 Leave</a>
        </span>
    </div>
    """, unsafe_allow_html=True)
    st.markdown("<div style='margin-top: 2.5rem'></div>", unsafe_allow_html=True)
