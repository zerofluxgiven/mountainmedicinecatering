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
    
    # Add the header with user info and Event Mode controls
    header_html = f"""
    <div class="user-header">
        <div class="user-info">
            <span class="user-name">{user_name}</span>
            <span class="user-role">{user_role}</span>
        </div>
        <div id="event-mode-controls">
            <!-- Event Mode controls will be added here -->
        </div>
    </div>
    """
    st.markdown(header_html, unsafe_allow_html=True)

# ----------------------------
# 🎛️ Global Event Mode Controls
# ----------------------------
def render_global_event_controls():
    """Render global Event Mode controls in header"""
    from utils import get_active_event_id, get_active_event
    
    active_event_id = get_active_event_id()
    user = session_get("user")
    
    if not user:
        return
    
    # Check if we have a recent event stored in session
    recent_event_id = st.session_state.get("recent_event_id")
    
    if active_event_id:
        # Show Exit Event Mode button
        active_event = get_active_event()
        event_name = active_event.get("name", "Unknown Event") if active_event else "Unknown"
        
        col1, col2 = st.columns([3, 1])
        with col2:
            if st.button("Exit Event Mode", key="global_exit_event", help=f"Exit {event_name}"):
                # Store current event as recent before deactivating
                st.session_state["recent_event_id"] = active_event_id
                
                # Deactivate Event Mode
                from events import deactivate_event_mode
                deactivate_event_mode()
                st.rerun()
    
    elif recent_event_id:
        # Show Resume button
        recent_event = get_event_by_id(recent_event_id)
        if recent_event:
            event_name = recent_event.get("name", "Recent Event")
            col1, col2 = st.columns([3, 1])
            with col2:
                if st.button(f"Resume {event_name[:15]}...", key="global_resume_event", 
                           help=f"Resume working on {event_name}"):
                    from events import activate_event
                    activate_event(recent_event_id)
                    # Clear recent event since we're now active
                    if "recent_event_id" in st.session_state:
                        del st.session_state["recent_event_id"]
                    st.rerun()

# ----------------------------
# 💬 Floating AI Assistant
# ----------------------------
def render_floating_ai_chat():
    """Render floating AI chat bubble and window"""
    user = session_get("user")
    if not user:
        return
    
    # Initialize chat state
    if "chat_window_open" not in st.session_state:
        st.session_state.chat_window_open = False
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []
    
    # Chat bubble (always visible)
    chat_bubble_html = """
    <div class="chat-bubble" onclick="toggleChatWindow()">
        <span class="chat-bubble-icon">💬</span>
    </div>
    """
    
    # Chat window (conditionally visible)
    chat_window_style = "display: block;" if st.session_state.chat_window_open else "display: none;"
    
    # Get recent chat messages for display
    recent_messages = st.session_state.chat_history[-5:] if st.session_state.chat_history else []
    messages_html = ""
    
    for msg in recent_messages:
        msg_class = "user" if msg.get("sender") == "user" else "ai"
        messages_html += f"""
        <div class="chat-message {msg_class}">
            <strong>{"You" if msg_class == "user" else "AI"}:</strong> {msg.get("content", "")}
        </div>
        """
    
    chat_window_html = f"""
    <div class="chat-window" style="{chat_window_style}" id="chatWindow">
        <div class="chat-header">
            <span>AI Assistant</span>
            <button onclick="toggleChatWindow()" style="background: none; border: none; color: white; cursor: pointer;">×</button>
        </div>
        <div class="chat-body" id="chatBody">
            {messages_html if messages_html else '<p style="color: #666; text-align: center; margin-top: 2rem;">Ask me anything about your events!</p>'}
        </div>
        <div class="chat-input-area">
            <input type="text" class="chat-input" id="chatInput" placeholder="Type your message..." 
                   onkeypress="if(event.key==='Enter') sendMessage()">
            <button class="chat-send-btn" onclick="sendMessage()">Send</button>
        </div>
    </div>
    """
    
    # JavaScript for chat functionality
    chat_js = """
    <script>
    function toggleChatWindow() {
        const chatWindow = document.getElementById('chatWindow');
        const isOpen = chatWindow.style.display === 'block';
        chatWindow.style.display = isOpen ? 'none' : 'block';
        
        // Update Streamlit session state
        window.parent.postMessage({
            type: 'streamlit:setComponentValue',
            value: !isOpen
        }, '*');
    }
    
    function sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message) return;
        
        // Add user message to chat
        addMessageToChat('user', message);
        input.value = '';
        
        // Send to backend for AI response
        window.parent.postMessage({
            type: 'streamlit:aiMessage',
            value: message
        }, '*');
    }
    
    function addMessageToChat(sender, content) {
        const chatBody = document.getElementById('chatBody');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        messageDiv.innerHTML = `<strong>${sender === 'user' ? 'You' : 'AI'}:</strong> ${content}`;
        chatBody.appendChild(messageDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }
    
    // Listen for AI responses
    window.addEventListener('message', function(event) {
        if (event.data.type === 'streamlit:aiResponse') {
            addMessageToChat('ai', event.data.value);
        }
    });
    </script>
    """
    
    # Render all components
    st.markdown(chat_bubble_html + chat_window_html + chat_js, unsafe_allow_html=True)
    
    # Handle chat toggle state
    if st.session_state.get("chat_toggle_trigger"):
        st.session_state.chat_window_open = not st.session_state.chat_window_open
        st.session_state.chat_toggle_trigger = False

# ----------------------------
# 📢 Enhanced Event Mode Banner
# ----------------------------
def show_event_mode_banner():
    """Displays enhanced Event Mode banner with controls"""
    active_event = get_active_event()
    if not active_event:
        return

    name = active_event.get("name", "Unnamed Event")
    date = format_date(active_event.get("date"))
    location = active_event.get("location", "Unknown")

    banner_html = f"""
    <div class="event-mode-banner fade-in">
        <div class="banner-content">
            <strong>📅 Event Mode Active:</strong> {name}<br>
            <small>📍 {location} | 🗓 {date}</small>
        </div>
        <div class="banner-controls">
            <!-- Exit button will be handled by Streamlit component -->
        </div>
    </div>
    """
    
    # Render banner with exit button
    col1, col2 = st.columns([4, 1])
    with col1:
        st.markdown(banner_html, unsafe_allow_html=True)
    with col2:
        if st.button("Exit Event Mode", key="banner_exit_event"):
            # Store current event as recent
            st.session_state["recent_event_id"] = active_event["id"]
            from events import deactivate_event_mode
            deactivate_event_mode()
            st.rerun()

# ----------------------------
# 🧭 Purple Tab Navigation
# ----------------------------
def render_top_navbar(tabs):
    """Render purple-themed navigation tabs"""
    # Custom CSS for purple tabs (already in main CSS)
    
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
    """Render context-aware event button"""
    from utils import get_active_event_id
    from events import activate_event, deactivate_event_mode
    
    active_event_id = get_active_event_id()
    event_id = event["id"]
    
    # Determine button text and action based on context
    if active_event_id == event_id:
        # This event is currently active
        button_text = "Deactivate Event Mode"
        button_type = "secondary"
        action = "deactivate"
    elif active_event_id and active_event_id != event_id:
        # Another event is active
        button_text = "Switch to This Event"
        button_type = "secondary"
        action = "switch"
    else:
        # No event is active
        button_text = "Activate Event"
        button_type = "primary"
        action = "activate"
    
    if st.button(button_text, key=f"smart_btn_{event_id}", type=button_type):
        if action == "activate":
            # Update event status to active and set Event Mode
            from events import update_event
            update_event(event_id, {"status": "active"})
            activate_event(event_id)
            st.success(f"Event activated: {event.get('name', 'Unknown')}")
        elif action == "deactivate":
            # Store as recent and deactivate
            st.session_state["recent_event_id"] = event_id
            deactivate_event_mode()
            st.success("Event Mode deactivated")
        elif action == "switch":
            # Store current as recent and switch
            if active_event_id:
                st.session_state["recent_event_id"] = active_event_id
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
    inject_custom_css()
    render_user_header()
    render_global_event_controls()
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
