import streamlit as st
import openai
from utils import session_get
from event_mode import get_event_context
from firebase_admin import firestore

# ----------------------------
# 🔧 Modes and Colors
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

# Firestore config ref
CONFIG_COLLECTION = "system"
CONFIG_DOC = "assistant_config"

db = firestore.client()

# ----------------------------
# 🤖 Assistant UI
# ----------------------------
def ai_chat_ui():
    user = session_get("user")
    if not user:
        st.info("🔒 Log in to use the assistant.")
        return

    st.subheader("🤖 Assistant")

    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    mode = st.radio("Context Mode", list(MODES.keys()), format_func=lambda m: MODES[m], horizontal=True, key="chat_mode")
    bg_color = COLOR_MAP.get(mode, "#f5f5f5")

    config = get_assistant_config()
    smart_prompts = config.get("smart_prompts", {}).get(mode, [])

    with st.container():
        st.markdown(f"<div style='background-color:{bg_color};padding:12px;border-radius:12px;'>", unsafe_allow_html=True)

        # Smart Prompt Buttons
        st.caption("💡 Suggestions:")
        cols = st.columns(len(smart_prompts))
        for i, suggestion in enumerate(smart_prompts):
            if cols[i].button(suggestion):
                st.session_state["ai_input"] = suggestion

        # Input Area
        prompt = st.text_area("Ask a question", key="ai_input", placeholder="e.g. Generate shopping list for current event")
        submit = st.button("Send")

        if submit and prompt:
            with st.spinner("Thinking..."):
                response = handle_chat(prompt, mode, config)
                st.session_state.chat_history.append({"mode": mode, "q": prompt, "a": response})
                st.success(response)

        st.markdown("</div>", unsafe_allow_html=True)

    # Show History
    with st.expander("🕘 Previous Questions"):
        for entry in reversed(st.session_state.chat_history):
            st.markdown(f"**[{MODES[entry['mode']]}]** ❓ {entry['q']}")
            st.markdown(f"> 💬 {entry['a']}")

# ----------------------------
# 🧠 AI Handler
# ----------------------------
def handle_chat(prompt, mode, config):
    instructions = config.get("instructions", {})
    temperature = config.get("temperature", 0.6)
    max_tokens = config.get("max_tokens", 500)

    context = instructions.get(mode, "You are a helpful assistant.")

    if mode == "event":
        event = get_event_context()
        if not event:
            return "⚠️ No active event. Enter Event Mode first."
        if is_out_of_scope(prompt):
            return "⚠️ That question seems outside the scope of Event Mode. Switch modes below?"

        context += (
            f"\nEvent: '{event['name']}' on {event['date']}, "
            f"Location: {event.get('location', 'unknown')}, "
            f"Guests: {event.get('guest_count', '?')}\n"
            f"Menu: {', '.join(event.get('menu', [])) or 'not listed'}"
        )

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            temperature=temperature,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": context},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message["content"].strip()
    except Exception as e:
        return f"❌ AI Error: {e}"

# ----------------------------
# 🔍 Scope Guard
# ----------------------------
def is_out_of_scope(prompt: str) -> bool:
    keywords = ["moon", "gpt", "president", "weather", "galaxy", "math class", "history of"]
    return any(k in prompt.lower() for k in keywords)

# ----------------------------
# 🔧 Firestore Loader
# ----------------------------
def get_assistant_config():
    ref = db.collection(CONFIG_COLLECTION).document(CONFIG_DOC)
    doc = ref.get()
    if doc.exists:
        return doc.to_dict()
    return {}