import streamlit as st
from auth import require_role
from file_storage import save_uploaded_file
from utils import session_get
from mobile_helpers import safe_file_uploader
from mobile_components import render_mobile_navigation

@require_role("user")
def upload_ui(event_id: str = None):
    if st.session_state.get("mobile_mode"):
        render_mobile_navigation()

    st.subheader("📤 Upload a File")

    file = safe_file_uploader("Select file to upload", type=["pdf", "png", "jpg", "jpeg", "txt"])
    user = session_get("user")

    if file and user:
        uploaded_by = user["id"]
        eid = event_id or st.text_input("Event ID (optional)")
        if st.button("Upload"):
            file_id = save_uploaded_file(file, eid, uploaded_by)
            st.success(f"✅ File uploaded! File ID: {file_id}")