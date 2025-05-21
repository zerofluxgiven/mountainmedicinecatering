import streamlit as st
import openai
from utils import session_get
from event_mode import get_event_context
from firebase_admin import firestore

# ✅ Fixed key access for OpenAI secret
openai.api_key = st.secrets["openai"]["api_key"]

db = firestore.client()

db = firestore.client()

# ----------------------------
# 🧠 Chat Context Modes
# ----------------------------
def get_context_options():
    return ["Event", "App", "Global"]

def build_prompt(user_input, context_mode, user):
    base = f"User: {user_input}\n\n"

    if context_mode == "Global":
        return base

    elif context_mode == "App":
        return f"""
You are an assistant for a catering management app.

{base}
"""

    elif context_mode == "Event":
        event = get_event_context()
        if not event:
            return f"(No active event found)\n\n{base}"

        context = f"""
Event Name: {event.get('name')}
Date: {event.get('date')}
Location: {event.get('location')}
Guests: {event.get('guest_count')}
Menu Items: {', '.join(event.get('menu', []))}

"""
        return context + base

# ----------------------------
# 💬 Assistant Panel
# ----------------------------
def ai_chat_ui():
    user = session_get("user")
    if not user:
        st.info("🔒 Assistant is only available to logged-in users.")
        return

    st.markdown("### 💬 AI Assistant")

    context_mode = st.selectbox("Context Mode", get_context_options())
    user_input = st.text_input("Ask a question", key="chat_input")
    if st.button("Send", key="chat_send") and user_input:
        with st.spinner("Thinking..."):
            prompt = build_prompt(user_input, context_mode, user)
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5
            )
            st.markdown("#### Response")
            st.markdown(response.choices[0].message["content"])
