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

# Complete updated section for layout.py to replace the existing render_chat_bubble function

def render_chat_bubble():
    """Render the floating chat bubble with full drag functionality"""
    # Initialize position in session state if not exists
    if "chat_button_position" not in st.session_state:
        st.session_state.chat_button_position = {"bottom": 30, "right": 30}
    
    # Chat bubble with working toggle
    if st.button("💬", key="floating_chat_toggle", 
                 help="Toggle AI Assistant - Drag to move",
                 use_container_width=False):
        st.session_state.chat_window_open = not st.session_state.chat_window_open
        st.rerun()
    
    # Get current position from session state
    bottom = st.session_state.chat_button_position.get("bottom", 30)
    right = st.session_state.chat_button_position.get("right", 30)
    
    # Position the button using CSS and add draggable functionality
    st.markdown(f"""
    <style>
    /* Draggable chat button */
    .stButton:has([data-testid*="floating_chat_toggle"]) {{
        position: fixed !important;
        bottom: {bottom}px !important;
        right: {right}px !important;
        z-index: 1000 !important;
        width: 60px !important;
        height: 60px !important;
        transition: none !important;
    }}
    
    .stButton:has([data-testid*="floating_chat_toggle"]) button {{
        width: 60px !important;
        height: 60px !important;
        border-radius: 50% !important;
        font-size: 24px !important;
        background: var(--primary-purple, #6C4AB6) !important;
        box-shadow: 0 4px 12px rgba(108, 74, 182, 0.3) !important;
        cursor: move !important;
        position: relative !important;
        overflow: visible !important;
    }}
    
    .stButton:has([data-testid*="floating_chat_toggle"]) button:hover {{
        transform: scale(1.1) !important;
        background: var(--accent-purple, #563a9d) !important;
    }}
    
    .stButton:has([data-testid*="floating_chat_toggle"]).dragging button {{
        opacity: 0.8 !important;
        transform: scale(1.15) !important;
        cursor: grabbing !important;
    }}
    
    /* Drag handle indicator */
    .stButton:has([data-testid*="floating_chat_toggle"]) button::after {{
        content: '⋮⋮';
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        letter-spacing: -2px;
    }}
    
    /* Prevent text selection during drag */
    body.dragging {{
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
    }}
    </style>
    
    <script>
    (function() {{
        let dragButton = null;
        let isDragging = false;
        let startX, startY;
        let startBottom, startRight;
        let dragTimeout;
        
        // Wait for the button to be rendered
        const initDraggable = () => {{
            const button = document.querySelector('[data-testid*="floating_chat_toggle"]');
            if (button && button !== dragButton) {{
                dragButton = button;
                const container = button.closest('.stButton');
                if (container) {{
                    setupDraggable(container, button);
                }}
            }}
        }};
        
        // Check periodically for the button
        setInterval(initDraggable, 500);
        
        function setupDraggable(container, button) {{
            // Remove any existing listeners
            button.removeEventListener('mousedown', handleMouseDown);
            button.removeEventListener('touchstart', handleTouchStart);
            
            // Add new listeners
            button.addEventListener('mousedown', handleMouseDown);
            button.addEventListener('touchstart', handleTouchStart, {{ passive: false }});
            
            function handleMouseDown(e) {{
                // Only drag on direct button click, not on any child elements
                if (e.target !== button && !button.contains(e.target)) return;
                
                startDrag(e.clientX, e.clientY);
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
                
                // Prevent click event after drag
                dragTimeout = setTimeout(() => {{
                    e.preventDefault();
                    e.stopPropagation();
                }}, 150);
            }}
            
            function handleTouchStart(e) {{
                if (e.touches.length !== 1) return;
                
                const touch = e.touches[0];
                startDrag(touch.clientX, touch.clientY);
                
                document.addEventListener('touchmove', handleTouchMove, {{ passive: false }});
                document.addEventListener('touchend', handleTouchEnd);
                
                // Prevent default touch behavior
                e.preventDefault();
            }}
            
            function startDrag(clientX, clientY) {{
                isDragging = true;
                startX = clientX;
                startY = clientY;
                
                const rect = container.getBoundingClientRect();
                startBottom = window.innerHeight - rect.bottom;
                startRight = window.innerWidth - rect.right;
                
                container.classList.add('dragging');
                document.body.classList.add('dragging');
            }}
            
            function handleMouseMove(e) {{
                if (!isDragging) return;
                performDrag(e.clientX, e.clientY);
            }}
            
            function handleTouchMove(e) {{
                if (!isDragging || e.touches.length !== 1) return;
                const touch = e.touches[0];
                performDrag(touch.clientX, touch.clientY);
                e.preventDefault();
            }}
            
            function performDrag(clientX, clientY) {{
                const deltaX = clientX - startX;
                const deltaY = clientY - startY;
                
                let newRight = startRight - deltaX;
                let newBottom = startBottom - deltaY;
                
                // Keep button on screen with padding
                const padding = 10;
                const buttonSize = 60;
                
                newRight = Math.max(padding, Math.min(window.innerWidth - buttonSize - padding, newRight));
                newBottom = Math.max(padding, Math.min(window.innerHeight - buttonSize - padding, newBottom));
                
                // Apply new position
                container.style.right = newRight + 'px';
                container.style.bottom = newBottom + 'px';
                container.style.left = 'auto';
                container.style.top = 'auto';
            }}
            
            function handleMouseUp(e) {{
                endDrag();
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                
                // Clear drag timeout
                if (dragTimeout) {{
                    clearTimeout(dragTimeout);
                    dragTimeout = null;
                }}
            }}
            
            function handleTouchEnd(e) {{
                endDrag();
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
            }}
            
            function endDrag() {{
                if (!isDragging) return;
                
                isDragging = false;
                container.classList.remove('dragging');
                document.body.classList.remove('dragging');
                
                // Get final position
                const rect = container.getBoundingClientRect();
                const finalBottom = window.innerHeight - rect.bottom;
                const finalRight = window.innerWidth - rect.right;
                
                // Save position to Streamlit
                const positionData = {{
                    bottom: Math.round(finalBottom),
                    right: Math.round(finalRight)
                }};
                
                // Try to update Streamlit session state
                if (window.parent && window.parent.postMessage) {{
                    window.parent.postMessage({{
                        isStreamlitMessage: true,
                        type: 'streamlit:componentMessage',
                        args: {{
                            key: 'chat_position_update',
                            value: positionData
                        }}
                    }}, '*');
                }}
                
                // Also try direct update (for some Streamlit versions)
                try {{
                    window.parent.streamlit.setComponentValue(positionData);
                }} catch (e) {{
                    console.log('Position update via direct method failed, using postMessage');
                }}
            }}
        }}
    }})();
    </script>
    """, unsafe_allow_html=True)
    
    # Hidden component to receive position updates
    # This is a workaround since Streamlit doesn't directly support postMessage updates
    position_receiver = st.empty()
    with position_receiver:
        position_update = st.text_input(
            "position_update", 
            value="", 
            key="chat_position_receiver",
            label_visibility="hidden"
        )
        
        if position_update:
            try:
                import json
                new_pos = json.loads(position_update)
                if isinstance(new_pos, dict) and "bottom" in new_pos and "right" in new_pos:
                    st.session_state.chat_button_position = new_pos
                    st.rerun()
            except:
                pass


# Alternative approach using Streamlit Components (if you have streamlit-components installed)
def render_fully_draggable_chat():
    """Alternative implementation using custom component approach"""
    # This would be even more robust but requires additional setup
    
    chat_html = f"""
    <div id="draggable-chat-container">
        <button id="chat-bubble" class="chat-bubble">
            💬
        </button>
    </div>
    
    <style>
    #draggable-chat-container {{
        position: fixed;
        bottom: {st.session_state.get('chat_bottom', 30)}px;
        right: {st.session_state.get('chat_right', 30)}px;
        z-index: 1000;
    }}
    
    .chat-bubble {{
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: #6C4AB6;
        color: white;
        border: none;
        font-size: 24px;
        cursor: move;
        box-shadow: 0 4px 12px rgba(108, 74, 182, 0.3);
        transition: transform 0.2s ease;
    }}
    
    .chat-bubble:hover {{
        transform: scale(1.1);
        background: #563a9d;
    }}
    
    .chat-bubble:active {{
        cursor: grabbing;
        transform: scale(1.15);
        opacity: 0.8;
    }}
    </style>
    
    <script>
    // Make the chat bubble draggable
    const makeDraggable = (element) => {{
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        element.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {{
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }}
        
        function elementDrag(e) {{
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            const container = element.parentElement;
            const newTop = container.offsetTop - pos2;
            const newLeft = container.offsetLeft - pos1;
            
            // Constrain to viewport
            const maxTop = window.innerHeight - element.offsetHeight - 10;
            const maxLeft = window.innerWidth - element.offsetWidth - 10;
            
            container.style.top = Math.max(10, Math.min(maxTop, newTop)) + "px";
            container.style.left = Math.max(10, Math.min(maxLeft, newLeft)) + "px";
            container.style.bottom = "auto";
            container.style.right = "auto";
        }}
        
        function closeDragElement() {{
            document.onmouseup = null;
            document.onmousemove = null;
            
            // Send final position to Streamlit
            const container = element.parentElement;
            const bottom = window.innerHeight - container.offsetTop - element.offsetHeight;
            const right = window.innerWidth - container.offsetLeft - element.offsetWidth;
            
            // Update position
            window.parent.postMessage({{
                type: 'streamlit:chat_position',
                bottom: bottom,
                right: right
            }}, '*');
        }}
    }};
    
    // Initialize draggable
    document.addEventListener('DOMContentLoaded', () => {{
        const chatBubble = document.getElementById('chat-bubble');
        if (chatBubble) {{
            makeDraggable(chatBubble);
            
            // Handle click to toggle chat
            chatBubble.addEventListener('click', (e) => {{
                if (!e.defaultPrevented) {{
                    window.parent.postMessage({{
                        type: 'streamlit:toggle_chat'
                    }}, '*');
                }}
            }});
        }}
    }});
    </script>
    """
    
    st.components.v1.html(chat_html, height=0)

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
# Updated render_top_navbar function for layout.py
# Replace the existing render_top_navbar function with this:

def render_top_navbar(tabs):
    """Render clean purple-themed navigation tabs using Streamlit native components"""
    current_tab = st.session_state.get("top_nav", tabs[0])
    
    if current_tab not in tabs:
        current_tab = tabs[0]
        st.session_state["top_nav"] = current_tab
    
    # Filter out admin tabs if they're in the main navigation
    main_tabs = [tab for tab in tabs if tab not in ["Admin Panel", "Suggestions", "Bulk Suggestions", "Audit Logs", "PDF Export"]]
    
    # Use Streamlit's native tab component styled with CSS
    selected = st.radio(
        "Navigation",
        main_tabs,
        index=main_tabs.index(current_tab) if current_tab in main_tabs else 0,
        key="top_nav",
        horizontal=True,
        label_visibility="collapsed"
    )
    
    # Apply custom styling to make tabs look like purple buttons
    st.markdown("""
    <style>
    /* Style the radio buttons as navigation tabs */
    .stRadio > div {
        display: flex !important;
        gap: 0.5rem !important;
        flex-wrap: wrap !important;
        background: none !important;
    }
    
    .stRadio > div > label {
        background: white !important;
        color: var(--primary-purple, #6C4AB6) !important;
        border: 2px solid var(--primary-purple, #6C4AB6) !important;
        border-radius: 8px !important;
        padding: 0.5rem 1rem !important;
        font-weight: 500 !important;
        font-size: 0.9rem !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        min-height: 40px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin-right: 0 !important;
    }
    
    .stRadio > div > label:hover {
        background: var(--light-purple, #B8A4D4) !important;
        color: white !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
    }
    
    .stRadio > div > label[data-baseweb="radio"] > div:first-child {
        display: none !important;
    }
    
    .stRadio > div > label[aria-checked="true"] {
        background: var(--primary-purple, #6C4AB6) !important;
        color: white !important;
    }
    
    /* Hide the circle indicators */
    .stRadio input[type="radio"] {
        display: none !important;
    }
    
    .stRadio label div:first-of-type {
        display: none !important;
    }
    </style>
    """, unsafe_allow_html=True)
    
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
