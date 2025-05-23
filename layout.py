# layout.py - Complete redesign with all requested features

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
        /* Fallback styling */
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
# 🎛️ Simple Event Mode Indicator
# ----------------------------
def render_event_mode_indicator():
    """Render simple event mode indicator in top right"""
    from utils import get_active_event_id, get_active_event
    
    active_event_id = get_active_event_id()
    
    if active_event_id:
        active_event = get_active_event()
        event_name = active_event.get("name", "Unknown Event") if active_event else "Unknown"
        
        indicator_html = f"""
        <div class="event-mode-simple-indicator">
            EVENT MODE ON: <strong>{event_name}</strong>
        </div>
        """
        st.markdown(indicator_html, unsafe_allow_html=True)

# ----------------------------
# 💬 Fixed Floating AI Assistant (Bottom Right)
# ----------------------------
def render_floating_ai_chat():
    """Render working floating AI chat bubble in bottom right"""
    user = session_get("user")
    if not user:
        return
    
    # Initialize chat state properly
    if "chat_window_open" not in st.session_state:
        st.session_state.chat_window_open = False
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []
    
    # Render the chat interface
    render_chat_bubble()
    
    if st.session_state.chat_window_open:
        render_chat_window()

def render_chat_bubble():
    """Render the floating chat bubble in bottom right"""
    # Create a placeholder for the button
    placeholder = st.empty()
    
    # Use custom HTML/CSS to position the button
    st.markdown("""
    <style>
    /* Hide the duplicate chat button in top left */
    .stButton:has(button[title="Toggle AI Assistant"]):first-of-type {
        display: none !important;
    }
    
    /* Style the chat button in bottom right */
    div[data-testid="stMarkdownContainer"]:has(.floating-chat-button-container) + div .stButton {
        position: fixed !important;
        bottom: 2rem !important;
        right: 2rem !important;
        z-index: 999 !important;
        width: 60px !important;
        height: 60px !important;
    }
    
    div[data-testid="stMarkdownContainer"]:has(.floating-chat-button-container) + div .stButton button {
        width: 60px !important;
        height: 60px !important;
        border-radius: 50% !important;
        font-size: 24px !important;
        background: var(--primary-purple, #6C4AB6) !important;
        box-shadow: 0 4px 12px rgba(108, 74, 182, 0.3) !important;
        padding: 0 !important;
    }
    
    div[data-testid="stMarkdownContainer"]:has(.floating-chat-button-container) + div .stButton button:hover {
        transform: scale(1.1) !important;
        background: var(--accent-purple, #563a9d) !important;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Marker for CSS targeting
    st.markdown('<div class="floating-chat-button-container"></div>', unsafe_allow_html=True)
    
    # The actual button
    if st.button("💬", key="floating_chat_toggle", help="Toggle AI Assistant"):
        st.session_state.chat_window_open = not st.session_state.chat_window_open
        st.rerun()

def render_chat_window():
    """Render the chat window when open"""
    # Create chat window with better styling
    chat_html = f"""
    <div class="ai-chat-window">
        <div class="chat-header">
            <h3>🤖 AI Assistant</h3>
            <button class="close-button" onclick="
                const event = new CustomEvent('streamlit:setComponentValue', {{
                    detail: {{key: 'close_chat', value: true}}
                }});
                window.parent.dispatchEvent(event);
            ">✕</button>
        </div>
        <div class="chat-body" id="chatBody">
            {"".join(render_chat_messages())}
        </div>
        <div class="chat-footer">
            <div class="quick-actions">
                <button class="quick-action" onclick="sendQuickMessage('shopping')">🛒 Shopping</button>
                <button class="quick-action" onclick="sendQuickMessage('menu')">📋 Menu</button>
                <button class="quick-action" onclick="sendQuickMessage('timeline')">⏰ Timeline</button>
            </div>
        </div>
    </div>
    """
    
    st.markdown(chat_html, unsafe_allow_html=True)
    
    # Handle close button
    if st.session_state.get("close_chat"):
        st.session_state.chat_window_open = False
        st.session_state.close_chat = False
        st.rerun()
    
    # Chat input
    with st.form("chat_input_form", clear_on_submit=True):
        user_input = st.text_input("Ask me anything...", placeholder="Type your message here", key="chat_input")
        col1, col2 = st.columns([4, 1])
        with col2:
            send_button = st.form_submit_button("Send", use_container_width=True)
        
        if send_button and user_input.strip():
            _add_message("user", user_input.strip())
            _get_ai_response(user_input.strip())
            st.rerun()

def render_chat_messages():
    """Render chat messages as HTML"""
    messages = []
    if not st.session_state.chat_history:
        messages.append('<div class="chat-message-center">👋 Hi! How can I help with your event?</div>')
    else:
        for msg in st.session_state.chat_history[-10:]:
            sender_class = "user" if msg.get("sender") == "user" else "ai"
            sender_label = "You" if msg.get("sender") == "user" else "AI"
            content = msg.get("content", "").replace("\n", "<br>")
            messages.append(f'''
                <div class="chat-message {sender_class}">
                    <strong>{sender_label}:</strong> {content}
                </div>
            ''')
    return messages

def _add_message(sender: str, content: str):
    """Add a message to chat history"""
    st.session_state.chat_history.append({
        "sender": sender,
        "content": content,
        "timestamp": st.session_state.get("current_time", "now")
    })

def _get_ai_response(message: str):
    """Get AI response (simplified for this fix)"""
    responses = {
        "shopping": "Here's a shopping list for your event:\n• Fresh vegetables\n• Proteins (chicken, fish)\n• Grains (rice, pasta)\n• Seasonings and spices",
        "menu": "Menu suggestions:\n• Grilled chicken with herbs\n• Seasonal vegetable medley\n• Wild rice pilaf\n• Fresh fruit dessert",
        "timeline": "Event timeline:\n• 2 days before: Shop for ingredients\n• 1 day before: Prep vegetables\n• Day of: Start cooking 4 hours before\n• 1 hour before: Final plating"
    }
    
    # Simple keyword matching
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
# 🧭 Purple Tab Navigation
# ----------------------------
def render_top_navbar(tabs):
    """Render clean purple-themed navigation tabs"""
    current_tab = st.session_state.get("top_nav", tabs[0])
    
    if current_tab not in tabs:
        current_tab = tabs[0]
        st.session_state["top_nav"] = current_tab
    
    # Create clean navigation without radio buttons
    nav_html = f"""
    <div class="nav-container">
        <div class="nav-tabs">
    """
    
    for i, tab in enumerate(tabs):
        active_class = "active" if tab == current_tab else ""
        nav_html += f'''
            <button class="nav-tab {active_class}" onclick="
                const event = new CustomEvent('streamlit:setComponentValue', {{
                    detail: {{key: 'nav_selection', value: '{tab}'}}
                }});
                window.parent.dispatchEvent(event);
            ">{tab}</button>
        '''
    
    nav_html += """
        </div>
    </div>
    """
    
    st.markdown(nav_html, unsafe_allow_html=True)
    
    # Handle navigation selection
    if st.session_state.get("nav_selection"):
        st.session_state["top_nav"] = st.session_state["nav_selection"]
        st.session_state["nav_selection"] = None
        st.rerun()
    
    # Use streamlit's native tabs as fallback
    selected = st.radio(
        "Navigation",
        tabs,
        index=tabs.index(current_tab),
        key="top_nav",
        horizontal=True,
        label_visibility="collapsed"
    )
    
    return selected

# ----------------------------
# 🎯 Leave Event Mode Button
# ----------------------------
def render_leave_event_button(location="main"):
    """Render leave event mode button"""
    from utils import get_active_event_id
    from events import deactivate_event_mode, update_event
    
    active_event_id = get_active_event_id()
    
    if active_event_id:
        button_key = f"leave_event_{location}_{active_event_id}"
        
        if location == "sidebar":
            if st.sidebar.button("🚪 Leave Event Mode", key=button_key):
                update_event(active_event_id, {"status": "planning"})
                deactivate_event_mode()
                st.rerun()
        else:
            if st.button("🚪 Leave Event Mode", key=button_key, help="Exit event mode"):
                update_event(active_event_id, {"status": "planning"})
                deactivate_event_mode()
                st.rerun()

# ----------------------------
# 📊 Status Indicator
# ----------------------------
def render_status_indicator(status):
    """Render enhanced status indicator badge - NO BUTTON"""
    # Skip rendering planning status indicators
    if status.lower() == "planning":
        return
    
    status_lower = status.lower()
    st.markdown(f'<span class="status-{status_lower}">{status.title()}</span>', unsafe_allow_html=True)

# ----------------------------
# 🎨 Apply Theme
# ----------------------------
def apply_theme():
    """Apply the complete Mountain Medicine theme"""
    import time
    st.session_state["current_location"] = f"main_header_{int(time.time())}"
    
    inject_custom_css()
    render_event_mode_indicator()
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
            padding-top: 1rem;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }
        
        /* Mobile navigation */
        .nav-tabs {
            flex-direction: column !important;
            gap: 0.5rem !important;
        }
        
        .nav-tab {
            width: 100% !important;
        }
        
        /* Mobile event indicator */
        .event-mode-simple-indicator {
            position: relative !important;
            margin: 0.5rem 0 !important;
            font-size: 0.8rem !important;
        }
        
        /* Mobile chat window */
        .ai-chat-window {
            width: 100% !important;
            height: 80vh !important;
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
            border-radius: 12px 12px 0 0 !important;
        }
    }
    </style>
    """, unsafe_allow_html=True)
    
    return container

# ----------------------------
# 🎯 Enhanced Sidebar Content
# ----------------------------
def render_enhanced_sidebar():
    """Render enhanced sidebar with admin tools"""
    user = session_get("user")
    if not user:
        return
    
    user_role = get_user_role(user)
    
    with st.sidebar:
        st.markdown("### 🛠️ Tools & Admin")
        
        # Leave Event Mode button in sidebar
        render_leave_event_button("sidebar")
        
        # Admin tools
        if user_role in ["admin", "manager"]:
            st.markdown("---")
            if st.button("🔐 Admin Panel", key="sidebar_admin"):
                st.session_state["top_nav"] = "Admin Panel"
                st.rerun()
            
            if st.button("📝 Suggestions", key="sidebar_suggestions"):
                st.session_state["top_nav"] = "Suggestions"
                st.rerun()
            
            if st.button("🧠 Bulk Suggestions", key="sidebar_bulk"):
                st.session_state["top_nav"] = "Bulk Suggestions"
                st.rerun()
            
            if st.button("📜 Audit Logs", key="sidebar_audit"):
                st.session_state["top_nav"] = "Audit Logs"
                st.rerun()
            
            if st.button("📄 PDF Export", key="sidebar_pdf"):
                st.session_state["top_nav"] = "PDF Export"
                st.rerun()
        
        # User info at bottom
        st.markdown("---")
        st.markdown(f"**User:** {user.get('name', 'Unknown')}")
        st.markdown(f"**Role:** {user_role}")

# ----------------------------
# 🎯 Smart Context Buttons
# ----------------------------
def render_smart_event_button(event, user):
    """Render context-aware event button with unique keys"""
    from utils import get_active_event_id
    from events import activate_event, deactivate_event_mode, update_event
    
    active_event_id = get_active_event_id()
    event_id = event["id"]
    
    button_key = f"smart_event_btn_{event_id}"
    
    if active_event_id == event_id:
        button_text = "🚪 Deactivate Event Mode"
        button_type = "secondary"
        action = "deactivate"
    elif active_event_id and active_event_id != event_id:
        button_text = "⚡ Switch to This Event"
        button_type = "secondary"
        action = "switch"
    else:
        button_text = "🔘 Activate Event Mode"
        button_type = "primary"
        action = "activate"
    
    if st.button(button_text, key=button_key, type=button_type, use_container_width=True):
        if action == "activate":
            update_event(event_id, {"status": "active"})
            activate_event(event_id)
            st.success(f"Event activated: {event.get('name', 'Unknown')}")
        elif action == "deactivate":
            st.session_state["recent_event_id"] = event_id
            update_event(event_id, {"status": "planning"})
            deactivate_event_mode()
            st.success("Event Mode deactivated")
        elif action == "switch":
            if active_event_id:
                st.session_state["recent_event_id"] = active_event_id
                update_event(active_event_id, {"status": "planning"})
            update_event(event_id, {"status": "active"})
            activate_event(event_id)
            st.success(f"Switched to: {event.get('name', 'Unknown')}")
        
        st.rerun()

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

# For backward compatibility
def render_floating_assistant():
    """Legacy function name"""
    render_floating_ai_chat()

def show_event_mode_banner():
    """Empty function for compatibility"""
    pass

def render_event_toolbar(event_id, context="active"):
    """Render event toolbar"""
    event = get_event_by_id(event_id)
    if not event:
        return
    
    st.markdown(f"""
    <div class="event-toolbar">
        <strong>🎪 {event.get('name', 'Unnamed Event')}</strong>
        <small>{event.get('location', 'Unknown')} | {event.get('start_date', 'Unknown')}</small>
    </div>
    """, unsafe_allow_html=True)