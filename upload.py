import streamlit as st
from auth import require_role
from file_storage import save_uploaded_file, suggest_tags_for_file
from utils import session_get
from datetime import datetime

@require_role("user")
def upload_ui(event_id: str = None):
    st.subheader("📤 Upload a File")

    file = st.file_uploader("Select file to upload", type=["pdf", "png", "jpg", "jpeg", "txt"])
    user = session_get("user")

    if file and user:
        uploaded_by = user["id"]
        eid = event_id or st.text_input("Event ID (optional)")
        if st.button("Upload"):
            file_id = save_uploaded_file(file, eid, uploaded_by)
            st.success(f"✅ File uploaded! File ID: {file_id}")
