import streamlit as st
from datetime import datetime
from auth import get_user_role
from db_client import db
from utils import format_date, generate_id

# ✅ Fixed: Use new OpenAI client
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
# 💬 AI Chat Assistant UI
# ----------------------------
def ai_chat_ui():
    st.title("💬 Assistant")
    st.caption("Ask the AI for help with event planning, shopping, recipes, or coordination.")

    user = st.session_state.get("user")
    if not user:
        st.warning("You must be signed in to use the assistant.")
        return

    # Check if OpenAI is available
    if not client:
        st.error("🤖 AI Assistant is currently unavailable. Please check the configuration.")
        return

    role = get_user_role(user)

    # Chat interface
    query = st.text_input("Ask something...", key="ai_chat_input")
    
    col1, col2 = st.columns([1, 4])
    with col1:
        submit_button = st.button("Submit", type="primary")
    with col2:
        clear_button = st.button("Clear Chat")

    # Clear chat history
    if clear_button:
        if "chat_history" in st.session_state:
            del st.session_state["chat_history"]
        st.rerun()

    # Initialize chat history
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    # Process query
    if submit_button and query:
        with st.spinner("🤖 Thinking..."):
            try:
                response = get_openai_response(query, role, user)
                
                # Add to chat history
                st.session_state.chat_history.append({
                    "query": query,
                    "response": response,
                    "timestamp": datetime.now()
                })
                
                # Log to database
                try:
                    db.collection("ai_logs").add({
                        "query": query,
                        "response": response,
                        "user_id": user["id"],
                        "user_role": role,
                        "created_at": datetime.now()
                    })
                except Exception as e:
                    st.warning(f"⚠️ Could not log conversation: {e}")
                
                # Clear input
                st.session_state.ai_chat_input = ""
                st.rerun()
                
            except Exception as e:
                st.error(f"❌ Failed to get AI response: {e}")

    # Display chat history
    if st.session_state.get("chat_history"):
        st.markdown("---")
        st.subheader("💬 Conversation")
        
        for i, chat in enumerate(reversed(st.session_state.chat_history[-10:])):  # Show last 10
            with st.expander(f"💭 {chat['query'][:50]}..." if len(chat['query']) > 50 else f"💭 {chat['query']}", expanded=(i == 0)):
                st.markdown(f"**You:** {chat['query']}")
                st.markdown(f"**AI:** {chat['response']}")
                st.caption(f"🕒 {format_date(chat['timestamp'])}")

# ----------------------------
# 🤖 AI Completion Logic
# ----------------------------
def get_openai_response(prompt, role, user):
    """Get response from OpenAI API with proper error handling"""
    if not client:
        return "⚠️ AI service is not available. Please check the configuration."
    
    try:
        # Get current context for better responses
        context = get_user_context(user)
        
        # Build system message with context
        system_message = f"""You are a helpful catering assistant for Mountain Medicine. 
        User role: {role}
        Context: {context}
        
        Provide helpful, practical advice for catering, event planning, menu design, and food preparation. 
        Be concise but thorough. If you need more information, ask specific questions."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",  # ✅ Use more cost-effective model
            messages=[
                {
                    "role": "system",
                    "content": system_message
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=500,
        )
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        return f"⚠️ I encountered an error: {str(e)}. Please try again or rephrase your question."

def get_user_context(user):
    """Get relevant context for the AI assistant"""
    try:
        context_parts = []
        
        # Add active event context
        from utils import get_active_event
        active_event = get_active_event()
        if active_event:
            context_parts.append(f"Active event: {active_event.get('name')} ({active_event.get('guest_count', 0)} guests)")
        
        # Add user's recent activity context
        # This could be expanded to include recent events, recipes, etc.
        
        return " | ".join(context_parts) if context_parts else "No specific event context"
        
    except Exception:
        return "Context unavailable"

# ----------------------------
# 🎯 Quick Action Buttons
# ----------------------------
def render_ai_quick_actions():
    """Render quick action buttons for common AI requests"""
    st.markdown("### 🎯 Quick Actions")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("🛒 Generate Shopping List"):
            st.session_state.ai_chat_input = "Generate a shopping list for the active event"
    
    with col2:
        if st.button("📋 Menu Suggestions"):
            st.session_state.ai_chat_input = "Suggest menu items for the active event"
    
    with col3:
        if st.button("⏰ Timeline Help"):
            st.session_state.ai_chat_input = "Help me create a timeline for event preparation"

# Enhanced AI chat UI with quick actions
def enhanced_ai_chat_ui():
    """Enhanced version of AI chat with quick actions"""
    render_ai_quick_actions()
    ai_chat_ui()
