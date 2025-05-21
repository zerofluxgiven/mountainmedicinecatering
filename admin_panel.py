import streamlit as st
from firebase_admin import firestore
from auth import is_admin, session_get

# ----------------------------
# 🔧 Firestore Setup
# ----------------------------
db = firestore.client()
CONFIG_DOC = "assistant_config"
CONFIG_COLLECTION = "system"

# ----------------------------
# 🔐 Admin Panel Entry
# ----------------------------
def admin_panel_ui():
    user = session_get("user")
    if not is_admin(user):
        st.warning("Admin access only.")
        return

    st.title("🛠️ Admin Panel")

    tab = st.selectbox("Admin Sections", ["AI Assistant Config", "Other Admin Tools (Coming Soon)"])

    if tab == "AI Assistant Config":
        render_ai_config_panel()

# ----------------------------
# 🧠 AI Assistant Config Panel
# ----------------------------
def render_ai_config_panel():
    st.subheader("🤖 Assistant Configuration")

    config_ref = db.collection(CONFIG_COLLECTION).document(CONFIG_DOC)
    config = config_ref.get().to_dict() if config_ref.get().exists else {}

    if "instructions" not in config:
        config["instructions"] = {
            "event": "You are helping with a catering event.",
            "app": "You are the internal assistant for the catering app.",
            "global": "You are a helpful AI assistant."
        }

    if "smart_prompts" not in config:
        config["smart_prompts"] = {
            "event": ["Generate shopping list"],
            "app": ["List all staff roles"],
            "global": ["Convert cups to ounces"]
        }

    with st.form("ai_config_form"):
        st.write("### 🔧 Instructions per Mode")
        config["instructions"]["event"] = st.text_area("Event Mode Instruction", config["instructions"].get("event", ""))
        config["instructions"]["app"] = st.text_area("App Mode Instruction", config["instructions"].get("app", ""))
        config["instructions"]["global"] = st.text_area("Global Mode Instruction", config["instructions"].get("global", ""))

        st.write("### 💡 Smart Prompts")
        for mode in ["event", "app", "global"]:
            st.write(f"**{mode.capitalize()} Prompts**")
            prompts = config["smart_prompts"].get(mode, [])
            new_prompts = []
            for i, p in enumerate(prompts):
                new_val = st.text_input(f"{mode}_{i}", value=p)
                if new_val:
                    new_prompts.append(new_val)
            config["smart_prompts"][mode] = new_prompts

        st.write("### 🎛️ Behavior Tuning")
        config["temperature"] = st.slider("Response Temperature", 0.0, 1.0, config.get("temperature", 0.6), 0.05)
        config["max_tokens"] = st.number_input("Max Tokens", value=int(config.get("max_tokens", 500)), min_value=100, max_value=2000)

        if st.form_submit_button("💾 Save Settings"):
            config_ref.set(config, merge=True)
            st.success("Assistant configuration updated.")