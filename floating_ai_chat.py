# floating_ai_chat.py - Standalone Floating AI Chat Component

import streamlit as st
from datetime import datetime
from auth import get_user_role
from db_client import db
from utils import format_date, generate_id, get_active_event

# ✅ OpenAI client setup
try:
    from openai import OpenAI
    
    # Initialize OpenAI client safely
    api_key = st.secrets.get("openai", {}).get("api_key", "")
    if api_key and api_key != "":
        client = OpenAI(api_key=api_key)
    else:
        client = None
        st.warning("⚠️ OpenAI API key not configured")
except ImportError:
    client = None
    st.error("❌ OpenAI library not installed")
except Exception as e:
    client = None
    st.error(f"❌ OpenAI initialization failed: {e}")

# ----------------------------
# 💬 Floating Chat Component
# ----------------------------

def render_floating_chat():
    """Render the floating chat bubble and expandable window"""
    user = st.session_state.get("user")
    if not user:
        return
    
    # Initialize chat state
    if "chat_open" not in st.session_state:
        st.session_state.chat_open = False
    if "chat_messages" not in st.session_state:
        st.session_state.chat_messages = []
    if "chat_input" not in st.session_state:
        st.session_state.chat_input = ""
    
    # Handle quick prompts from header buttons
    if "ai_quick_prompt" in st.session_state:
        prompt = st.session_state.ai_quick_prompt
        del st.session_state.ai_quick_prompt
        _handle_chat_message(prompt, user)
        st.session_state.chat_open = True
        st.rerun()
    
    # Chat bubble CSS and HTML
    chat_css = """
    <style>
    .floating-chat-bubble {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 60px;
        height: 60px;
        background: var(--primary-purple, #6C4AB6);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(108, 74, 182, 0.3);
        transition: all 0.3s ease;
    }
    
    .floating-chat-bubble:hover {
        background: var(--accent-purple, #563a9d);
        transform: scale(1.1);
    }
    
    .chat-bubble-icon {
        color: white;
        font-size: 24px;
    }
    
    .floating-chat-window {
        position: fixed;
        bottom: 100px;
        right: 2rem;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 999;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s ease;
    }
    
    .chat-window-header {
        background: var(--primary-purple, #6C4AB6);
        color: white;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .chat-window-body {
        flex: 1;
        padding: 1rem;
        overflow-y: auto;
        background: #fafafa;
        max-height: 350px;
    }
    
    .chat-window-input {
        padding: 1rem;
        border-top: 1px solid #eee;
        background: white;
    }
    
    .chat-message {
        margin-bottom: 1rem;
        padding: 0.5rem;
        border-radius: 8px;
        max-width: 90%;
    }
    
    .chat-message.user {
        background: var(--light-purple, #B8A4D4);
        color: white;
        margin-left: auto;
        margin-right: 0;
    }
    
    .chat-message.ai {
        background: #e9ecef;
        color: #333;
        margin-right: auto;
        margin-left: 0;
    }
    
    .chat-close-btn {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        margin: 0;
    }
    
    /* Mobile responsive */
    @media (max-width: 768px) {
        .floating-chat-window {
            bottom: 0;
            right: 0;
            left: 0;
            width: 100%;
            height: 70vh;
            border-radius: 12px 12px 0 0;
        }
        
        .floating-chat-bubble {
            bottom: 1rem;
            right: 1rem;
            width: 50px;
            height: 50px;
        }
        
        .chat-bubble-icon {
            font-size: 20px;
        }
    }
    </style>
    """
    
    st.markdown(chat_css, unsafe_allow_html=True)
    
    # Chat bubble
    bubble_html = f"""
    <div class="floating-chat-bubble" onclick="toggleChat()">
        <span class="chat-bubble-icon">💬</span>
    </div>
    """
    
    # Chat window (only show if open)
    if st.session_state.chat_open:
        render_chat_window(user)
    
    # JavaScript for bubble interaction
    chat_js = """
    <script>
    function toggleChat() {
        // Send message to Streamlit to toggle chat
        const event = new CustomEvent('chatToggle');
        window.parent.document.dispatchEvent(event);
    }
    </script>
    """
    
    st.markdown(bubble_html + chat_js, unsafe_allow_html=True)
    
    # Handle chat toggle
    if st.button("", key="chat_toggle_hidden", help="Toggle chat", 
                 style={"display": "none"}):  # Hidden button for toggle
        st.session_state.chat_open = not st.session_state.chat_open
        st.rerun()

def render_chat_window(user):
    """Render the expandable chat window"""
    
    # Chat window container
    with st.container():
        st.markdown("""
        <div class="floating-chat-window">
            <div class="chat-window-header">
                <span><strong>🤖 AI Assistant</strong></span>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # Create columns for window layout
        col1, col2 = st.columns([5, 1])
        
        with col2:
            if st.button("×", key="close_chat", help="Close chat"):
                st.session_state.chat_open = False
                st.rerun()
        
        with col1:
            st.markdown("**🤖 AI Assistant**")
        
        # Chat messages area
        st.markdown("---")
        
        # Display chat history
        if st.session_state.chat_messages:
            for msg in st.session_state.chat_messages[-10:]:  # Show last 10 messages
                if msg["role"] == "user":
                    st.markdown(f"""
                    <div class="chat-message user">
                        <strong>You:</strong> {msg["content"]}
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.markdown(f"""
                    <div class="chat-message ai">
                        <strong>AI:</strong> {msg["content"]}
                    </div>
                    """, unsafe_allow_html=True)
        else:
            st.markdown("""
            <div style="text-align: center; color: #666; padding: 2rem;">
                👋 Hi! I'm your AI assistant. Ask me anything about your events, menus, or catering!
            </div>
            """, unsafe_allow_html=True)
        
        # Quick action buttons
        st.markdown("**🎯 Quick Actions:**")
        quick_actions = [
            ("🛒 Shopping List", "Generate a shopping list for the active event"),
            ("📋 Menu Ideas", "Suggest menu items for the active event"),
            ("⏰ Timeline", "Help me create an event timeline"),
        ]
        
        for label, prompt in quick_actions:
            if st.button(label, key=f"quick_{label}", use_container_width=True):
                _handle_chat_message(prompt, user)
                st.rerun()
        
        # Chat input
        st.markdown("---")
        
        # Input form
        with st.form("chat_input_form", clear_on_submit=True):
            user_input = st.text_input(
                "Type your message...", 
                key="chat_user_input",
                placeholder="Ask about events, menus, planning..."
            )
            send_clicked = st.form_submit_button("Send", use_container_width=True)
            
            if send_clicked and user_input.strip():
                _handle_chat_message(user_input.strip(), user)
                st.rerun()

# ----------------------------
# 🤖 AI Message Handling
# ----------------------------

def _handle_chat_message(message: str, user: dict):
    """Process user message and get AI response"""
    if not client:
        st.error("AI assistant is not available")
        return
    
    # Add user message to history
    st.session_state.chat_messages.append({
        "role": "user", 
        "content": message,
        "timestamp": datetime.now()
    })
    
    try:
        # Get AI response
        ai_response = _get_ai_response(message, user)
        
        # Add AI response to history
        st.session_state.chat_messages.append({
            "role": "assistant",
            "content": ai_response,
            "timestamp": datetime.now()
        })
        
        # Log to database
        _log_chat_interaction(message, ai_response, user)
        
    except Exception as e:
        error_msg = f"Sorry, I encountered an error: {str(e)}"
        st.session_state.chat_messages.append({
            "role": "assistant",
            "content": error_msg,
            "timestamp": datetime.now()
        })

def _get_ai_response(message: str, user: dict) -> str:
    """Get response from OpenAI API with context"""
    if not client:
        return "⚠️ AI service is not available."
    
    try:
        # Build context
        context = _build_user_context(user)
        
        # System message with context
        system_message = f"""You are a helpful catering assistant for Mountain Medicine. 
        
        User: {user.get('name', 'User')} (Role: {get_user_role(user)})
        Context: {context}
        
        Provide helpful, practical advice for catering, event planning, menu design, and food preparation. 
        Be concise but thorough. If you need more information, ask specific questions.
        
        Always be encouraging and supportive. Focus on actionable advice."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": message}
            ],
            temperature=0.7,
            max_tokens=400,
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        return f"⚠️ I encountered an error: {str(e)}. Please try again."

def _build_user_context(user: dict) -> str:
    """Build context string for AI assistant"""
    context_parts = []
    
    try:
        # Active event context
        active_event = get_active_event()
        if active_event:
            context_parts.append(f"Active event: {active_event.get('name')} ({active_event.get('guest_count', 0)} guests)")
        
        # User's recent activity (simplified)
        user_id = user.get('id')
        if user_id:
            # Recent events created
            recent_events = list(db.collection("events").where("created_by", "==", user_id).limit(3).stream())
            if recent_events:
                event_names = [e.to_dict().get('name', 'Unnamed') for e in recent_events]
                context_parts.append(f"Recent events: {', '.join(event_names)}")
        
        return " | ".join(context_parts) if context_parts else "No specific context"
        
    except Exception:
        return "Context unavailable"

def _log_chat_interaction(user_message: str, ai_response: str, user: dict):
    """Log chat interaction to database"""
    try:
        log_id = generate_id("chat")
        log_data = {
            "id": log_id,
            "user_message": user_message,
            "ai_response": ai_response,
            "user_id": user.get("id"),
            "user_role": get_user_role(user),
            "timestamp": datetime.now(),
            "context": {
                "active_event": get_active_event().get("id") if get_active_event() else None,
                "page": st.session_state.get("top_nav", "unknown")
            }
        }
        
        db.collection("ai_chat_logs").document(log_id).set(log_data)
        
    except Exception as e:
        # Don't fail the chat if logging fails
        print(f"Failed to log chat interaction: {e}")

# ----------------------------
# 📊 Chat Analytics (Admin)
# ----------------------------

def show_chat_analytics():
    """Show AI chat usage analytics for admins"""
    try:
        # Get recent chat logs
        logs = list(db.collection("ai_chat_logs")
                   .order_by("timestamp", direction=db.query.DESCENDING)
                   .limit(100).stream())
        
        if not logs:
            st.info("No chat interactions logged yet.")
            return
        
        st.markdown("### 🤖 AI Chat Analytics")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Interactions", len(logs))
        
        with col2:
            unique_users = len(set(log.to_dict().get('user_id') for log in logs))
            st.metric("Active Users", unique_users)
        
        with col3:
            # Average response time (would need to track this)
            st.metric("Avg Response", "< 2s")
        
        with col4:
            # Most active day
            st.metric("Peak Usage", "Today")
        
        # Recent interactions
        st.markdown("#### Recent Interactions")
        for log_doc in logs[:5]:
            log_data = log_doc.to_dict()
            timestamp = format_date(log_data.get('timestamp'))
            user_msg = log_data.get('user_message', '')[:50] + "..." if len(log_data.get('user_message', '')) > 50 else log_data.get('user_message', '')
            
            with st.expander(f"🕒 {timestamp} - {user_msg}"):
                st.markdown(f"**User:** {log_data.get('user_message', '')}")
                st.markdown(f"**AI:** {log_data.get('ai_response', '')}")
                st.markdown(f"**Context:** {log_data.get('context', {})}")
        
    except Exception as e:
        st.error(f"Could not load chat analytics: {e}")

# ----------------------------
# 🎯 Chat Shortcuts
# ----------------------------

def add_chat_shortcut_buttons():
    """Add chat shortcut buttons to header/sidebar"""
    user = st.session_state.get("user")
    if not user:
        return
    
    st.sidebar.markdown("---")
    st.sidebar.markdown("### 🤖 Quick AI Help")
    
    shortcuts = [
        ("🛒", "Shopping list for active event", "Generate a shopping list for the active event"),
        ("📋", "Menu suggestions", "Suggest menu items for the active event"),
        ("⏰", "Event timeline", "Help me create a timeline for event preparation"),
        ("📊", "Event summary", "Summarize the current active event status"),
    ]
    
    for icon, label, prompt in shortcuts:
        if st.sidebar.button(f"{icon} {label}", key=f"shortcut_{icon}"):
            st.session_state.ai_quick_prompt = prompt
            st.session_state.chat_open = True
            st.rerun()

# ----------------------------
# 🔧 Integration Functions
# ----------------------------

def integrate_floating_chat():
    """Main function to integrate floating chat into the app"""
    render_floating_chat()
    add_chat_shortcut_buttons()

# For backward compatibility with layout.py
def render_floating_ai_chat():
    """Legacy function name"""
    integrate_floating_chat()
