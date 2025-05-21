import streamlit as st
import openai
from auth import get_user_role
from utils import format_date, generate_id
from firebase_admin import firestore
from datetime import datetime

# Firestore
openai.api_key = st.secrets["OPENAI_API_KEY"]
db = firestore.client()

# ----------------------------
# 💬 AI Chat Panel
# ----------------------------
@require_login
def ai_chat_ui(user):
    st.title("💬 AI Assistant")

    context_mode = st.radio("Context Mode", ["Event", "App", "Global"], horizontal=True)
    prompt = st.text_area("Ask the Assistant:", placeholder="e.g. Generate a shopping list for current event")

    if st.button("▶️ Submit") and prompt:
        with st.spinner("Thinking..."):
            context = _build_context(user, context_mode)
            messages = [
                {"role": "system", "content": context},
                {"role": "user", "content": prompt}
            ]

            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=messages,
                temperature=0.4
            )

            reply = response.choices[0].message.content
            st.markdown("---")
            st.markdown(f"**Assistant:**\n{reply}")

            # Confirm edit suggestion if detected
            if any(kw in reply.lower() for kw in ["suggest", "change", "edit", "update"]):
                if st.checkbox("Submit this as a suggestion?"):
                    _submit_ai_suggestion(user, prompt, reply, context_mode)
                    st.success("AI suggestion submitted for approval.")

# ----------------------------
# 🧠 Context Builder
# ----------------------------
def _build_context(user, mode):
    if mode == "Event":
        event_id = st.session_state.get("active_event")
        if not event_id:
            return "User is not in event mode."
        event = db.collection("events").document(event_id).get().to_dict()
        return f"You are an assistant helping plan an event named '{event.get('name')}' on {format_date(event.get('date'))} at {event.get('location')}. Guest count is {event.get('guests', 'unknown')}. Use this context for any answers."
    elif mode == "App":
        return "You are an assistant for a catering management application. Help users with planning, logistics, menus, staffing, and tasks."
    else:
        return "You are a general assistant."

# ----------------------------
# 📝 Suggestion Submission
# ----------------------------
def _submit_ai_suggestion(user, prompt, reply, mode):
    suggestion = {
        "id": generate_id("sugg"),
        "created_at": datetime.utcnow(),
        "created_by": "ai_assistant",
        "type": "general",
        "prompt": prompt,
        "response": reply,
        "status": "pending",
        "event_id": st.session_state.get("active_event") if mode == "Event" else None
    }
    db.collection("suggestions").document(suggestion["id"]).set(suggestion)

    # Notify admins
    from notifications import send_notification
    send_notification(f"AI suggestion submitted for review", role="admin")
