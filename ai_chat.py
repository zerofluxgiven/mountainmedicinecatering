import streamlit as st
from utils import session_get
from event_mode import get_event_context
from openai import OpenAI

# ----------------------------
# 🧠 Chat Mode Definitions
# ----------------------------

MODES = {
    "event": "Event Mode",
    "app": "App Data Mode",
    "global": "Freeform Global Mode"
}

COLOR_MAP = {
    "event": "#eae3f9",
    "app": "#f0f0f0",
    "global": "#fffcee"
}

# ----------------------------
# 🤖 Chat Assistant UI
# ----------------------------

def ai_chat_ui():
    user = session_get("user")
    if not user:
        st.info("🔒 Log in to use the assistant.")
        return

    st.subheader("🤖 Assistant")

    mode = st.radio("Context Mode", options=list(MODES.keys()), format_func=lambda m: MODES[m], horizontal=True)
    bg_color = COLOR_MAP.get(mode, "#f5f5f5")

    with st.container():
        st.markdown(f"<div style='background-color:{bg_color};padding:10px;border-radius:10px;'>", unsafe_allow_html=True)

        prompt = st.text_area("Ask a question", key="ai_input", placeholder="e.g. Generate shopping list for current event")
        submit = st.button("Send")

        if submit and prompt:
            response = handle_chat(prompt, mode)
            st.success(response)

        st.markdown("</div>", unsafe_allow_html=True)

# ----------------------------
# 🧠 AI Handler Function
# ----------------------------

def handle_chat(prompt, mode):
    context = {}

    if mode == "event":
        context = get_event_context()
        if not context:
            return "⚠️ You're not currently in an active event."
        if is_out_of_scope(prompt):
            return "This question seems outside the scope of Event Mode. Switch to another mode?"

    elif mode == "app":
        context = {"app_scope": "mountainmedicine"}

    # For now, simulate response
    return f"🧠 Responding in **{MODES[mode]}**: *{prompt}*"

# ----------------------------
# 🔍 Scope Filter (stub for now)
# ----------------------------

def is_out_of_scope(prompt: str) -> bool:
    keywords = ["moon", "weather", "president", "gpt"]
    return any(k in prompt.lower() for k in keywords)
