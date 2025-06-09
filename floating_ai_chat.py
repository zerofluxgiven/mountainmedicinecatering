# floating_ai_chat.py (Refactored)

import streamlit as st
from datetime import datetime
from ai_chat import get_openai_response, log_conversation
from auth import get_user_role

# ----------------------------
# 💬 Floating Chat - Refactored to use real AI backend only
# ----------------------------

def render_floating_ai_chat():
    """Render a floating AI chat interface in the sidebar using real OpenAI logic."""
    user = st.session_state.get("firebase_user")
    if not user:
        return

    if "chat_open" not in st.session_state:
        st.session_state.chat_open = False
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    with st.sidebar:
        if st.button("💬 Toggle Assistant"):
            st.session_state.chat_open = not st.session_state.chat_open
            st.rerun()

    if not st.session_state.chat_open:
        return

    st.markdown("### 🤖 Assistant Chat")
    st.caption("Your AI assistant for planning, shopping, and coordination.")

    for msg in st.session_state.chat_history[-10:]:
        sender = "🧑 You" if msg["sender"] == "user" else "🤖 AI"
        st.markdown(f"**{sender}:** {msg['content']}")

    with st.form("floating_chat_form", clear_on_submit=True):
        query = st.text_input("Ask anything:", key="floating_chat_input")
        submitted = st.form_submit_button("Send")

        if submitted and query.strip():
            st.session_state.chat_history.append({
                "sender": "user",
                "content": query.strip(),
                "timestamp": datetime.utcnow()
            })

            with st.spinner("🤖 Thinking..."):
                role = get_user_role(user)
                response = get_openai_response(query.strip(), role, user)
                st.session_state.chat_history.append({
                    "sender": "ai",
                    "content": response["content"],
                    "timestamp": datetime.utcnow()
                })
                log_conversation(user["id"], query.strip(), response["content"], role)
            st.rerun()

    if st.button("🗑️ Clear Chat"):
        st.session_state.chat_history = []
        st.rerun()
