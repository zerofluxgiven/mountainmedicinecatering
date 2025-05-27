import streamlit as st
from auth import require_role
from file_storage import save_uploaded_file
from utils import session_get
from mobile_helpers import safe_file_uploader
from mobile_components import render_mobile_navigation
from events import get_all_events

@require_role("user")
def upload_ui(event_id: str = None):
    if st.session_state.get("mobile_mode"):
        render_mobile_navigation()

    st.subheader("\ud83d\udcc4 Upload a File")

    file = safe_file_uploader("Select file to upload", type=["pdf", "png", "jpg", "jpeg", "txt"])
    user = session_get("user")

    events = get_all_events()
    event_options = {
        f"{e['name']} ({e['start_date']}) - {e['status']}": e['id']
        for e in events if not e.get("deleted", False)
    }
    eid_label = st.selectbox("Select Event (optional)", ["None"] + list(event_options.keys()))
    eid = event_options.get(eid_label) if eid_label != "None" else None

    if file and user:
        uploaded_by = user["id"]
        if st.button("Upload"):
            file_id = save_uploaded_file(file, eid, uploaded_by)
            st.success(f"\u2705 File uploaded! File ID: {file_id}")
