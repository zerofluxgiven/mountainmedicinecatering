import streamlit as st
import openai
from datetime import datetime
from firebase_admin import firestore
from utils import format_date, generate_id
from auth import get_user_role

# 🔐 Graceful key loading
openai.api_key = st.secrets.get("openai", {}).get("api_key", "")

db = firestore.client()

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

    role = get_user_role(user)

    # Chat input
    query = st.text_input("Ask something...")
    if st.button("Submit") and query:
        with st.spinner("Thinking..."):
            response = get_openai_response(query, role, user)
            st.success("AI Response:")
            st.write(response)

            # Optional: Save to Firestore log
            db.collection("ai_logs").add({
                "query": query,
                "response": response,
                "user_id": user["id"],
                "created_at": firestore.SERVER_TIMESTAMP
            })

# ----------------------------
# 🤖 AI Completion Logic
# ----------------------------
def get_openai_response(prompt, role, user):
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": f"You are a helpful catering assistant. User role: {role}."
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
        return f"⚠️ Failed to get a response: {e}"
