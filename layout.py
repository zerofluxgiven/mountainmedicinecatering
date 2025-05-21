import streamlit as st
from utils import session_get
from ai_chat import ai_chat_ui

# ----------------------------
# 🎨 Inject Custom CSS + JS
# ----------------------------
def inject_custom_css():
    try:
        with open("public/style.css") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
    except FileNotFoundError:
        st.warning("⚠️ style.css not found in /public.")

    # Inject floating assistant button via JS
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
# 💬 Assistant Floating Panel
# ----------------------------
def render_floating_assistant():
    user = session_get("user")
    if not user:
        return

    st.markdown("<div style='position: fixed; bottom: 5rem; right: 2rem; width: 400px; z-index: 999;'>", unsafe_allow_html=True)

    with st.expander("💬 Assistant", expanded=False):
        ai_chat_ui()

    # Hidden Streamlit button toggled by JS
    st.button("toggle", key="streamlit-assistant-toggle", on_click=toggle_assistant_visibility)
    st.markdown("</div>", unsafe_allow_html=True)

def toggle_assistant_visibility():
    current = st.session_state.get("show_assistant", False)
    st.session_state["show_assistant"] = not current

# ----------------------------
# 📢 Event Mode Banner
# ----------------------------
def show_event_mode_banner():
    from events import get_active_event
    from utils import format_date

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
# 🧭 Top Navigation Bar
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
