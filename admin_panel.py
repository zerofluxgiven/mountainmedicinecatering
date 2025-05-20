import streamlit as st
from roles import role_admin_ui
from suggestions import suggestions_ui
from audit import audit_log_ui
from tags import tag_merge_ui
from auth import get_user_role
from utils import session_get

# ----------------------------
# ⚙️ Admin Panel
# ----------------------------

def admin_panel_ui():
    user = session_get("user")
    role = get_user_role(user)

    if role != "admin":
        st.warning("🔒 Admin access required.")
        return

    st.title("🛠 Admin Panel")

    tabs = st.tabs(["Roles", "Suggestions", "Tag Merge", "Audit Logs", "AI Controls"])

    with tabs[0]:
        role_admin_ui()

    with tabs[1]:
        suggestions_ui()

    with tabs[2]:
        tag_merge_ui()

    with tabs[3]:
        audit_log_ui()

    with tabs[4]:
        ai_instruction_editor()
        
# ----------------------------
# 🤖 Admin-Controlled AI Prompt Boundaries
# ----------------------------

def ai_instruction_editor():
    st.subheader("🧠 AI Assistant Instructions")

    st.caption("Configure system-wide instructions or scoped hints for AI modes.")

    default_prompts = {
        "event": "You are helping manage a catering event. Answer only using data from the current event.",
        "app": "You are an assistant for Mountain Medicine Catering. Use only internal app data.",
        "global": "You are a general assistant. Answer freely."
    }

    for mode in ["event", "app", "global"]:
        prompt = st.text_area(f"{mode.title()} Mode Instruction", value=default_prompts[mode])
        if st.button(f"Save for {mode.title()} Mode"):
            st.success(f"✅ Instruction saved for {mode.title()} Mode (demo only).")
