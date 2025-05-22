# layout.py - Fixed version with unique keys and working floating chat

import streamlit as st
from utils import session_get, format_date, get_event_by_id, get_active_event
from auth import get_user_role

# ----------------------------
# 🎨 Inject Custom CSS + JS
# ----------------------------
def inject_custom_css():
    """Inject custom CSS styling for the application"""
    # Load the updated CSS file
    try:
        with open("style.css", "r") as f:
            css_content = f.read()
        st.markdown(f"<style>{css_content}</style>", unsafe_allow_html=True)
    except FileNotFoundError:
        # Fallback to inline CSS if file not found
        css_content = """
        <style>
        /* Fallback styling - use the CSS from the artifact above */
        :root {
            --primary-purple: #6C4AB6;
            --light-purple: #B8A4D4;
            --accent-purple: #563a9d;
            --border-radius: 8px;
        }
        
        button, .stButton > button {
            background-color: var(--primary-purple) !important;
            color: white !important;
            border: none !important;
            border-radius: var(--border-radius) !important;
            padding: 0.5rem 1rem !important;
            font-weight: 500 !important;
            transition: all 0.2s ease !important;
            min-height: 44px !important;
        }
        
        button:hover, .stButton > button:hover {
            background-color: var(--accent-purple) !important;
        }
        </style>
        """
        st.markdown(css_content, unsafe_allow_html=True)

# ----------------------------
# 👤 Header User Display
# ----------------------------
def render_user_header():
    """Render user info in the top-right corner"""
    user = session_get("user")
    if not user:
        return
    
    user_name = user.get("name", "User")
    user_role = get_user_role(user)
    
    # Add the header with user info
    header_html = f"""
    <div class="user-header">
        <div class="user-info">
            <span class="user-name">{user_name}</span>
            <span class="user-role">{user_role}</span>
        </div>
    </div>
    """
    st.markdown(header_html, unsafe_allow_html=True)

# ----------------------------
# 🎛️ Fixed Global Event Mode Controls
# ----------------------------
def render_global_event_controls():
    """Render global Event Mode controls in header with unique keys"""
    from utils import get_active_event_id, get_active_event
    
    active_event_id = get_active_event_id()
    user = session_get("user")
    
    if not user:
        return
    
    # Check if we have a recent event stored in session
    recent_event_id = st.session_state.get("recent_event_id")
    
    # Create a unique key based on location in the app
    location_key = st.session_state.get("current_location", "header")
    
    if active_event_id:
        # Get event info
        active_event = get_active_event()
        event_name = active_event.get("name", "Unknown Event") if active_event else "Unknown"
        location = active_event.get("location", "Unknown")
        status = active_event.get("status", "planning")
        
        # Compact banner with exit button
        col1, col2 = st.columns([3, 1])
        
        with col1:
            # Compact banner
            banner_html = f"""
            <div style="background-color:#fff8e1; padding:8px 12px; border-radius:6px; 
                      border:1px solid #ffecb3;">
                <span style="font-weight:bold;">📅 Event Mode: {event_name}</span>
                <span style="color:#555; margin-left:10px;">📍 {location}</span>
                <span style="display:inline-block; padding:2px 6px; margin-left:10px;
                     border-radius:12px; font-size:0.7rem; background-color:#e3f2fd;">
                    {status.title()}
                </span>
            </div>
            """
            st.markdown(banner_html, unsafe_allow_html=True)
        
        with col2:
            # Exit button
            unique_key = f"{location_key}_exit_event_mode_{hash(str(active_event_id))}"
            if st.button("🚪 Exit Event Mode", key=unique_key, use_container_width=True):
                # Store current event as recent before deactivating
                st.session_state["recent_event_id"] = active_event_id
                
                # Deactivate Event Mode
                from events import deactivate_event_mode, update_event
                
                # Force status update
                update_event(active_event_id, {"status": "planning"})
                deactivate_event_mode()
                st.rerun()
    
    elif recent_event_id:
        # Show Resume button (existing code - keep as is)
        recent_event = get_event_by_id(recent_event_id)
        if recent_event:
            event_name = recent_event.get("name", "Recent Event")
            col1, col2 = st.columns([3, 1])
            with col2:
                unique_key = f"{location_key}_resume_event_{hash(str(recent_event_id))}"
                if st.button(f"Resume {event_name[:15]}...", key=unique_key, 
                           help=f"Resume working on {event_name}"):
                    from events import activate_event
                    activate_event(recent_event_id)
                    # Clear recent event since we're now active
                    if "recent_event_id" in st.session_state:
                        del st.session_state["recent_event_id"]
                    st.rerun()
    
    elif recent_event_id:
        # Show Resume button
        recent_event = get_event_by_id(recent_event_id)
        if recent_event:
            event_name = recent_event.get("name", "Recent Event")
            col1, col2 = st.columns([3, 1])
            with col2:
                unique_key = f"{location_key}_resume_event_{hash(str(recent_event_id))}"
                if st.button(f"Resume {event_name[:15]}...", key=unique_key, 
                           help=f"Resume working on {event_name}"):
                    from events import activate_event
                    activate_event(recent_event_id)
                    # Clear recent event since we're now active
                    if "recent_event_id" in st.session_state:
                        del st.session_state["recent_event_id"]
                    st.rerun()

# ----------------------------
# 💬 Fixed Floating AI Assistant
# ----------------------------
def render_floating_ai_chat():
    """Render working floating AI chat bubble and window"""
    user = session_get("user")
    if not user:
        return
    
    # Initialize chat state properly
    if "chat_window_open" not in st.session_state:
        st.session_state.chat_window_open = False
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []
    
    # Render the chat interface based on state
    if st.session_state.chat_window_open:
        render_chat_window()
    
    render_chat_bubble()

def render_chat_bubble():
    """Render the floating chat bubble"""
    # Chat bubble with working toggle
    if st.button("💬", key="floating_chat_toggle", 
                 help="Toggle AI Assistant",
                 use_container_width=False):
        st.session_state.chat_window_open = not st.session_state.chat_window_open
        st.rerun()
    
    # Position the button using CSS
    st.markdown("""
    <style>
    .stButton:has([data-testid*="floating_chat_toggle"]) {
        position: fixed !important;
        bottom: 2rem !important;
        right: 2rem !important;
        z-index: 1000 !important;
        width: 60px !important;
        height: 60px !important;
    }
    
    .stButton:has([data-testid*="floating_chat_toggle"]) button {
        width: 60px !important;
        height: 60px !important;
        border-radius: 50% !important;
        font-size: 24px !important;
        background: var(--primary-purple, #6C4AB6) !important;
        box-shadow: 0 4px 12px rgba(108, 74, 182, 0.3) !important;
    }
    
    .stButton:has([data-testid*="floating_chat_toggle"]) button:hover {
        transform: scale(1.1) !important;
        background: var(--accent-purple, #563a9d) !important;
    }
    </style>
    """, unsafe_allow_html=True)

def render_chat_window():
    """Render the chat window when open"""
    # Create a container for the chat window
    with st.container():
        # Chat window header
        col1, col2 = st.columns([4, 1])
        with col1:
            st.markdown("### 🤖 AI Assistant")
        with col2:
            if st.button("×", key="close_chat_window", help="Close chat"):
                st.session_state.chat_window_open = False
                st.rerun()
        
        # Chat messages area
        st.markdown("---")
        
        # Display recent chat messages
        if st.session_state.chat_history:
            with st.container(height=300):
                for i, msg in enumerate(st.session_state.chat_history[-10:]):
                    if msg.get("sender") == "user":
                        st.markdown(f"""
                        <div style="background: var(--light-purple, #B8A4D4); color: white; 
                                    padding: 0.5rem; border-radius: 8px; margin: 0.5rem 0; 
                                    margin-left: 2rem;">
                            <strong>You:</strong> {msg.get("content", "")}
                        </div>
                        """, unsafe_allow_html=True)
                    else:
                        st.markdown(f"""
                        <div style="background: #e9ecef; color: #333; 
                                    padding: 0.5rem; border-radius: 8px; margin: 0.5rem 0; 
                                    margin-right: 2rem;">
                            <strong>AI:</strong> {msg.get("content", "")}
                        </div>
                        """, unsafe_allow_html=True)
        else:
            st.info("👋 Hi! I'm your AI assistant. Ask me anything about your events!")
        
        # Quick action buttons
        st.markdown("**🎯 Quick Actions:**")
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("🛒 Shopping List", key="quick_shopping"):
                _add_message("user", "Generate a shopping list for the active event")
                _get_ai_response("Generate a shopping list for the active event")
                st.rerun()
        
        with col2:
            if st.button("📋 Menu Ideas", key="quick_menu"):
                _add_message("user", "Suggest menu items for the active event")
                _get_ai_response("Suggest menu items for the active event")
                st.rerun()
        
        with col3:
            if st.button("⏰ Timeline", key="quick_timeline"):
                _add_message("user", "Help me create an event timeline")
                _get_ai_response("Help me create an event timeline")
                st.rerun()
        
        # Chat input
        st.markdown("---")
        with st.form("chat_input_form", clear_on_submit=True):
            user_input = st.text_input("Ask me anything...", placeholder="Type your message here")
            send_button = st.form_submit_button("Send", use_container_width=True)
            
            if send_button and user_input.strip():
                _add_message("user", user_input.strip())
                _get_ai_response(user_input.strip())
                st.rerun()
    
    # Position the chat window with CSS
    st.markdown("""
    <style>
    .stContainer:has([data-testid*="close_chat_window"]) {
        position: fixed !important;
        bottom: 100px !important;
        right: 2rem !important;
        width: 350px !important;
        max-height: 500px !important;
        background: white !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
        z-index: 999 !important;
        padding: 1rem !important;
        border: 1px solid #ddd !important;
    }
    
    @media (max-width: 768px) {
        .stContainer:has([data-testid*="close_chat_window"]) {
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 70vh !important;
            border-radius: 12px 12px 0 0 !important;
        }
    }
    </style>
    """, unsafe_allow_html=True)

def _add_message(sender: str, content: str):
    """Add a message to chat history"""
    st.session_state.chat_history.append({
        "sender": sender,
        "content": content,
        "timestamp": st.session_state.get("current_time", "now")
    })

def _get_ai_response(message: str):
    """Get AI response (simplified for this fix)"""
    # This is a simplified version - you can integrate with your existing AI system
    responses = {
        "shopping": "Here's a sample shopping list for your event: \n• Fresh vegetables\n• Proteins (chicken, fish)\n• Grains (rice, pasta)\n• Seasonings and spices",
        "menu": "Here are some menu suggestions:\n• Grilled chicken with herbs\n• Seasonal vegetable medley\n• Wild rice pilaf\n• Fresh fruit dessert",
        "timeline": "Here's a basic event timeline:\n• 2 days before: Shop for ingredients\n• 1 day before: Prep vegetables\n• Day of: Start cooking 4 hours before service\n• 1 hour before: Final plating and setup"
    }
    
    # Simple keyword matching for demo
    if "shopping" in message.lower():
        response = responses["shopping"]
    elif "menu" in message.lower():
        response = responses["menu"]
    elif "timeline" in message.lower():
        response = responses["timeline"]
    else:
        response = "I'd be happy to help with your catering needs! Ask me about shopping lists, menu planning, or event timelines."
    
    _add_message("ai", response)

# ----------------------------
# 📢 Enhanced Event Mode Banner
# ----------------------------
def show_event_mode_banner():
    """This function is now empty to avoid duplicate banners"""
    # Intentionally empty - functionality moved to render_global_event_controls
    pass

# ----------------------------
# 🧭 Purple Tab Navigation
# ----------------------------
def render_top_navbar(tabs):
    """Render purple-themed navigation tabs"""
    # Get current selection from session state
    current_tab = st.session_state.get("top_nav", tabs[0])
    
    # Ensure current tab is valid
    if current_tab not in tabs:
        current_tab = tabs[0]
        st.session_state["top_nav"] = current_tab
    
    # Create purple button-style navigation
    st.markdown('<div class="nav-container">', unsafe_allow_html=True)
    
    # Use Streamlit radio but styled as purple buttons
    selected = st.radio(
        "Navigation",
        tabs,
        index=tabs.index(current_tab),
        key="top_nav",
        horizontal=True,
        label_visibility="collapsed"
    )
    
    st.markdown('</div>', unsafe_allow_html=True)
    return selected

# ----------------------------
# 🎯 Smart Context Buttons
# ----------------------------
def render_smart_event_button(event, user):
    """Render context-aware event button with unique keys"""
    from utils import get_active_event_id
    from events import activate_event, deactivate_event_mode, update_event
    
    active_event_id = get_active_event_id()
    event_id = event["id"]
    
    # Create unique key for this button
    button_key = f"smart_event_btn_{event_id}"
    
    # Determine button text and action based on context
    if active_event_id == event_id:
        # This event is currently active
        button_text = "🚪 Deactivate Event Mode"
        button_type = "secondary"
        action = "deactivate"
    elif active_event_id and active_event_id != event_id:
        # Another event is active
        button_text = "⚡ Switch to This Event"
        button_type = "secondary"
        action = "switch"
    else:
        # No event is active
        button_text = "🔘 Activate Event Mode"
        button_type = "primary"
        action = "activate"
    
    if st.button(button_text, key=button_key, type=button_type, use_container_width=True):
        if action == "activate":
            # Update event status to active and set Event Mode
            update_event(event_id, {"status": "active"})
            activate_event(event_id)
            st.success(f"Event activated: {event.get('name', 'Unknown')}")
        elif action == "deactivate":
            # Store as recent and deactivate
            st.session_state["recent_event_id"] = event_id
            # Update status before deactivating
            update_event(event_id, {"status": "planning"})
            deactivate_event_mode()
            st.success("Event Mode deactivated")
        elif action == "switch":
            # Store current as recent and switch
            if active_event_id:
                st.session_state["recent_event_id"] = active_event_id
                # Update old event status
                update_event(active_event_id, {"status": "planning"})
            # Update new event status
            update_event(event_id, {"status": "active"})
            activate_event(event_id)
            st.success(f"Switched to: {event.get('name', 'Unknown')}")
        
        st.rerun()

# ----------------------------
# 📊 Status Indicator
# ----------------------------
def render_status_indicator(status):
    """Render enhanced status indicator badge"""
    status_lower = status.lower()
    st.markdown(f'<span class="status-{status_lower}">{status.title()}</span>', unsafe_allow_html=True)

# ----------------------------
# 🎨 Apply Theme
# ----------------------------
def apply_theme():
    """Apply the complete Mountain Medicine theme"""
    # Set location context for unique keys with timestamp to ensure uniqueness
    import time
    st.session_state["current_location"] = f"main_header_{int(time.time())}"
    
    inject_custom_css()
    render_user_header()
    render_floating_ai_chat()

# ----------------------------
# 📱 Mobile Responsive Container
# ----------------------------
def responsive_container():
    """Create a responsive container with mobile considerations"""
    container = st.container()
    
    # Add mobile-specific styling
    st.markdown("""
    <style>
    @media (max-width: 768px) {
        .main .block-container {
            padding-top: 2rem;
            padding-left: 1rem;
            padding-right: 1rem;
        }
    }
    </style>
    """, unsafe_allow_html=True)
    
    return container

# ----------------------------
# 🎯 Action Button Group
# ----------------------------
def render_action_buttons(actions):
    """Render a group of purple-themed action buttons"""
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
# 📋 Enhanced Info Cards
# ----------------------------
def render_info_card(title, content, icon="ℹ️", card_type="info"):
    """Render styled information card"""
    card_colors = {
        "info": "#e3f2fd",
        "success": "#e8f5e8", 
        "warning": "#fff3e0",
        "error": "#ffebee"
    }
    
    bg_color = card_colors.get(card_type, card_colors["info"])
    
    st.markdown(f"""
    <div class="card" style="background-color: {bg_color};">
        <h4>{icon} {title}</h4>
        <p>{content}</p>
    </div>
    """, unsafe_allow_html=True)

# ----------------------------
# 🔧 Event Toolbar Enhanced
# ----------------------------
def render_event_toolbar(event_id, context="active"):
    """Render enhanced event management toolbar"""
    if not event_id:
        return
        
    event = get_event_by_id(event_id)
    if not event:
        return
    
    status = event.get('status', 'planning')
    
    toolbar_html = f"""
    <div class="event-toolbar slide-up">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
                <strong>🎪 {event.get('name', 'Unnamed Event')}</strong><br>
                <small style="color: gray;">
                    📍 {event.get('location', 'Unknown')} | 
                    📅 {event.get('start_date', 'Unknown')}
                </small>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem;">
                <span class="status-{status}">{status.title()}</span>
            </div>
        </div>
    </div>
    """
    
    st.markdown(toolbar_html, unsafe_allow_html=True)

# For backward compatibility
def render_floating_assistant():
    """Legacy function name - redirects to new floating chat"""
    render_floating_ai_chat()
