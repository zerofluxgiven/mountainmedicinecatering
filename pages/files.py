import streamlit as st
from src.auth import require_login, get_user_role, is_admin
from src.firestore_utils import get_active_event, normalize_tags, soft_delete_file, restore_file
from google.cloud import firestore
import datetime

db = firestore.Client()

def show():
    require_login()
    st.title("Files")

    active_event = get_active_event()
    scoped_only = True

    if active_event:
        scoped_only = st.toggle("View All Files", value=False)

    st.markdown("## Upload New File")
    uploaded = st.file_uploader("Choose file")
    tag_input = st.text_input("Tags (comma-separated)")

    if uploaded and st.button("Upload"):
        tag_list = normalize_tags([t.strip() for t in tag_input.split(",") if t.strip()])
        file_ref = db.collection("files").document()
        file_ref.set({
            "name": uploaded.name,
            "tags": tag_list,
            "uploaded_by": st.session_state.user["uid"],
            "timestamp": datetime.datetime.utcnow(),
            "event_id": active_event["event_id"] if active_event else None,
            "deleted": False
        })
        st.success("File metadata uploaded. (Stub: connect to Firebase Storage manually.)")

    st.markdown("## Files")
    files_ref = db.collection("files").where("deleted", "==", False)
    if active_event and scoped_only:
        files_ref = files_ref.where("event_id", "==", active_event["event_id"])

    files = files_ref.stream()
    for doc in files:
        f = doc.to_dict()
        st.write(f"**{f['name']}** — Tags: {', '.join(f['tags'])}")
        st.caption(f"Uploaded by {f['uploaded_by']} on {f['timestamp']}")
        if is_admin() or f["uploaded_by"] == st.session_state.user["uid"]:
            if st.button(f"Delete {f['name']}", key=doc.id):
                soft_delete_file(doc.id)
                st.success("Moved to Recycle Bin.")

    if is_admin():
        st.markdown("## Recycle Bin")
        deleted_files = db.collection("files").where("deleted", "==", True).stream()
        for doc in deleted_files:
            f = doc.to_dict()
            st.write(f"**{f['name']}** — Tags: {', '.join(f['tags'])}")
            if st.button(f"Restore {f['name']}", key=f"restore_{doc.id}"):
                restore_file(doc.id)
                st.success("File restored.")
