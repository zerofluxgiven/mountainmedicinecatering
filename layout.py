import streamlit as st
from utils import session_get, format_date, get_event_by_id, get_active_event

# ----------------------------
# 🎨 Inject Custom CSS + JS
# ----------------------------
def inject_custom_css():
    """Inject custom CSS styling for the application"""
    css_content = """
    <style>
    /* Base Styling */
    .stApp {
        font-family: 'Inter', sans-serif;
    }
    
    /* Button Styling */
    .stButton > button {
        background-color: #6C4AB6 !important;
        color: white !important;
        border: none !important;
        border-radius: 8px !important;
        padding: 0.5rem 1rem !important;
        font-weight: 500 !important;
        transition: background-color 0.2s ease !important;
    }
    
    .stButton > button:hover {
        background-color: #563a9d !important;
    }
    
    /* Input Styling */
    .stTextInput input, .stTextArea textarea {
        border: 1px solid #ccc !important;
        border-radius: 6px !important;
        font-size: 1rem !important;
    }
    
    /* Card Styling */
    .card {
        background: #ffffff;
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.05);
        margin-bottom: 1rem;
    }
    
    /* Tag Styling */
    .tag {
        background: #edeafa;
        color: #6C4AB6;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        font-size: 0.85rem;
        display: inline-block;
        margin-right: 0.5rem;
        margin-bottom: 0.3rem;
    }
    
    /* Event Mode Banner */
    .event-mode-banner {
        background-color: #fff8e1;
        padding: 12px;
        border-radius: 10px;
        margin: 12px 0;
        border: 1px solid #ffecb3;
    }
    
    /* Event Toolbar */
    .event-toolbar {
        position: sticky;
        top: 0;
        background: white;
        padding: 1rem;
        border-bottom: 1px solid #eee;
        z-index: 100;
        margin-bottom: 1rem;
    }
    
    /* Notification Badge */
    .sidebar-badge {
        margin-top: 10px;
        color: #B00020;
        font-weight: bold;
        font-size: 0.9rem;
    }
    
    /* Assistant Styling */
    .assistant-box {
        background-color: #f5f5f5;
        padding: 12px;
        border-radius: 12px;
        margin-bottom: 1rem;
    }
    
    .assistant-suggestion {
        background: #eae3f9;
        color: #4B0082;
        padding: 0.3rem 0.8rem;
        border-radius: 6px;
        margin: 0 0.25rem 0.5rem 0;
        display: inline-block;
        font-size: 0.85rem;
        cursor: pointer;
        transition: background 0.2s;
    }
    
    .assistant-suggestion:hover {
        background: #d4c4f4;
    }
    
    /* Tab Styling */
    .stTabs [role="tab"] {
        background-color: #6C4AB6;
        color: white;
        margin-right: 8px;
        border-radius: 8px 8px 0 0;
        padding: 0.5rem 1rem;
        transition: background 0.2s ease;
        font-weight: 500;
    }
    
    .stTabs [role="tab"][aria-selected="true"] {
        background-color: #563a9d;
        font-weight: bold;
    }
    
    /* Scrollbar Styling */
    ::-webkit-scrollbar {
        width: 8px;
    }
    ::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 4px;
    }
    
    /* Modal Styling */
    .stModalContent {
        padding: 1.5rem;
        background: #ffffff;
        border-radius: 1rem;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    
    /* Color Utility Classes */
    .accent-purple { color: #6C4AB6; }
    .accent-grey { color: #666666; }
    .accent-black { color: #000000; }
    
    /* Status Indicators */
    .status-planning { 
        background: #ffd54f; 
        color: #f57f17; 
        padding: 0.2rem 0.5rem; 
        border-radius: 12px; 
        font-size: 0.8rem; 
    }
    .status-active { 
        background: #81c784; 
        color: #2e7d32; 
        padding: 0.2rem 0.5rem; 
        border-radius: 12px; 
        font-size: 0.8rem; 
    }
    .status-complete { 
        background: #90a4ae; 
        color: #37474f; 
        padding: 0.2rem 0.5rem; 
        border-radius: 12px; 
        font-size: 0.8rem; 
    }
    </style>
    """
    st.markdown(css_content, unsafe_allow_html=True)

# ----------------------------
# 💬 Floating Assistant (Simplified)
# ----------------------------
def render_floating_assistant():
    """Render a simplified floating assistant using sidebar"""
    user = session_get("user")
    if not user:
        return

    # Use sidebar for assistant instead of floating window
    with st.sidebar:
        st.markdown("---")
        if st.button("💬 AI Assistant", help="Toggle AI Assistant"):
            current_state = st.session_state.get("show_assistant", False)
            st.session_state["show_assistant"] = not current_state
        
        # Show assistant in sidebar if toggled
        if st.session_state.get("show_assistant", False):
            st.markdown("### 🤖 AI Assistant")
            
            # Quick actions
            quick_actions = [
                ("🛒 Shopping List", "Generate a shopping list for the active event"),
                ("📋 Menu Ideas", "Suggest menu items for the active event"),
                ("⏰ Timeline", "Help me create an event timeline"),
            ]
            
            st.markdown("**Quick Actions:**")
            for label, prompt in quick_actions:
                if st.button(label, key=f"quick_{label}"):
                    # Store the prompt for the main AI chat
                    st.session_state["ai_quick_prompt"] = prompt
                    st.session_state["top_nav"] = "Assistant"  # Switch to assistant tab
                    st.rerun()

def toggle_assistant_visibility():
    """Toggle assistant visibility"""
    show = st.session_state.get("show_assistant", False)
    st.session_state["show_assistant"] = not show

# ----------------------------
# 🔒 Lock Notice
# ----------------------------
def show_locked_notice():
    """Show notice when content is locked due to Event Mode"""
    st.info("✏️ This item is locked due to Event Mode. You can suggest changes, but editing is disabled.", icon="🔒")

# ----------------------------
# 🏷️ Event Tag Label
# ----------------------------
def show_event_tag_label(event_id):
    """Show which event an item is tagged to"""
    if not event_id:
        return
        
    event = get_event_by_id(event_id)
    if not event:
        st.markdown(f"<div style='margin-top: -0.5rem; color: gray;'>🏷️ <i>Tagged to:</i> <b>Unknown Event ({event_id})</b></div>", unsafe_allow_html=True)
        return
        
    name = event.get("name", "Unnamed Event")
    st.markdown(f"<div style='margin-top: -0.5rem; color: gray;'>🏷️ <i>Tagged to:</i> <b>{name}</b></div>", unsafe_allow_html=True)

# ----------------------------
# 🧭 Top Navigation Tabs
# ----------------------------
def render_top_navbar(tabs):
    """Render the top navigation bar with tabs"""
    # Add custom styling for navigation
    st.markdown("""
    <style>
    .nav-container {
        position: sticky;
        top: 0;
        background: white;
        z-index: 100;
        padding: 0.5rem 0;
        margin-bottom: 1rem;
        border-bottom: 1px solid #eee;
    }
    </style>
    """, unsafe_allow_html=True)
    
    st.markdown("<div class='nav-container'>", unsafe_allow_html=True)
    
    # Get current selection from session state
    current_tab = st.session_state.get("top_nav", tabs[0])
    
    # Ensure current tab is valid
    if current_tab not in tabs:
        current_tab = tabs[0]
        st.session_state["top_nav"] = current_tab
    
    selected = st.radio(
        "Navigation",
        tabs,
        index=tabs.index(current_tab),
        key="top_nav",
        horizontal=True,
        label_visibility="collapsed"
    )
    
    st.markdown("</div>", unsafe_allow_html=True)
    return selected

# ----------------------------
# 🧰 Event Toolbar
# ----------------------------
def render_event_toolbar(event_id, context="active"):
    """Render event management toolbar"""
    if not event_id:
        return
        
    event = get_event_by_id(event_id)
    if not event:
        return
    
    st.markdown(f"""
    <div class="event-toolbar">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>🎪 {event.get('name', 'Unnamed Event')}</strong>
                <span style="margin-left: 1rem; color: gray;">
                    📍 {event.get('location', 'Unknown')} | 
                    📅 {event.get('start_date', 'Unknown')}
                </span>
            </div>
            <div>
                <span class="status-{event.get('status', 'planning')}">{event.get('status', 'planning').title()}</span>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

# ----------------------------
# 📊 Status Indicator
# ----------------------------
def render_status_indicator(status):
    """Render a status indicator badge"""
    status_colors = {
        "planning": ("#ffd54f", "#f57f17"),
        "active": ("#81c784", "#2e7d32"),
        "complete": ("#90a4ae", "#37474f"),
        "cancelled": ("#ef5350", "#c62828")
    }
    
    bg_color, text_color = status_colors.get(status.lower(), ("#e0e0e0", "#424242"))
    
    st.markdown(f"""
    <span style="
        background: {bg_color}; 
        color: {text_color}; 
        padding: 0.2rem 0.5rem; 
        border-radius: 12px; 
        font-size: 0.8rem;
        font-weight: 500;
    ">{status.title()}</span>
    """, unsafe_allow_html=True)

# ----------------------------
# 🎯 Action Button Group
# ----------------------------
def render_action_buttons(actions):
    """Render a group of action buttons"""
    if not actions:
        return
    
    cols = st.columns(len(actions))
    results = {}
    
    for i, (key, label, button_type) in enumerate(actions):
        with cols[i]:
            button_args = {"label": label, "key": key}
            if button_type == "primary":
                button_args["type"] = "primary"
            
            results[key] = st.button(**button_args)
    
    return results

# ----------------------------
# 📱 Responsive Container
# ----------------------------
def responsive_container():
    """Create a responsive container that adapts to screen size"""
    return st.container()

# ----------------------------
# 🎨 Theme Helper
# ----------------------------
def apply_theme():
    """Apply the Mountain Medicine theme"""
    inject_custom_css()

# ----------------------------
# 📋 Info Cards
# ----------------------------
def render_info_card(title, content, icon="ℹ️"):
    """Render an information card"""
    st.markdown(f"""
    <div class="card">
        <h4>{icon} {title}</h4>
        <p>{content}</p>
    </div>
    """, unsafe_allow_html=True)

# ----------------------------
# ⚠️ Alert Messages
# ----------------------------
def render_alert(message, alert_type="info"):
    """Render styled alert messages"""
    colors = {
        "info": ("#e3f2fd", "#1976d2"),
        "success": ("#e8f5e8", "#2e7d32"),
        "warning": ("#fff3e0", "#f57c00"),
        "error": ("#ffebee", "#d32f2f")
    }
    
    bg_color, text_color = colors.get(alert_type, colors["info"])
    
    st.markdown(f"""
    <div style="
        background: {bg_color};
        color: {text_color};
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        border-left: 4px solid {text_color};
    ">
        {message}
    </div>
    """, unsafe_allow_html=True)
