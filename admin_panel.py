import streamlit as st
from auth import require_role
from admin_utilities import admin_utilities_ui
from tag_merging import tag_merging_ui
from user_admin import user_admin_ui  # ✅ Fixed: was 'from roles import user_admin_ui'

# ----------------------------
# 🔐 Admin Panel UI
# ----------------------------
@require_role("admin")
def admin_panel_ui():
    st.title("🔐 Admin Panel")
    st.caption("Manage users, tags, logs, and system-wide settings.")

    tab = st.selectbox("Choose a section:", [
        "🛠️ Utilities",
        "🏷️ Tag Merging",
        "👥 User Management"
    ])

    if tab == "🛠️ Utilities":
        admin_utilities_ui()
    elif tab == "🏷️ Tag Merging":
        tag_merging_ui()
    elif tab == "👥 User Management":
        user_admin_ui()
