
import streamlit as st
from firebase_admin import firestore, storage
from auth import require_role
from utils import format_date, generate_id, session_get
from suggestions import create_suggestion
from datetime import datetime
import mimetypes
import os

db = firestore.client()
bucket = storage.bucket()
COLLECTION = "files"

# ----------------------------
# 📦 File Upload Logic
# ----------------------------
def save_uploaded_file(file, event_id, uploaded_by):
    if not file:
        return

    file_id = generate_id("file")
    file_path = f"uploads/{file_id}_{file.name}"
    blob = bucket.blob(file_path)
    blob.upload_from_file(file, content_type=file.type)

    tags = suggest_tags_for_file(file)

    db.collection(COLLECTION).document(file_id).set({
        "id": file_id,
        "filename": file.name,
        "uploaded_at": datetime.utcnow(),
        "event_id": event_id,
        "uploaded_by": uploaded_by,
        "path": file_path,
        "tags": tags,
        "deleted": False
    })

    st.success("File uploaded.")
    return file_id

# ----------------------------
# 🧠 AI Smart Tagging Stub
# ----------------------------
def suggest_tags_for_file(file):
    # Placeholder for AI logic. Extend with actual file parsing & tagging.
    if file.type.startswith("image"):
        return ["photo"]
    elif file.type in ("application/pdf", "application/msword"):
        return ["document"]
    else:
        return ["other"]

# ----------------------------
# 📥 Upload UI
# ----------------------------
def upload_ui(event_id):
    user = session_get("user")
    if not user:
        st.warning("Login required.")
        return

    st.markdown("### 📎 Upload Files")

    uploaded = st.file_uploader("Choose a file")
    if uploaded and st.button("Upload"):
        save_uploaded_file(uploaded, event_id, user["name"])
        st.experimental_rerun()

# ----------------------------
# 📂 List Uploaded Files
# ----------------------------
def list_files(event_id=None, include_deleted=False):
    query = db.collection(COLLECTION)
    if event_id:
        query = query.where("event_id", "==", event_id)
    if not include_deleted:
        query = query.where("deleted", "==", False)
    docs = query.stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

# ----------------------------
# 🗑 Soft Delete
# ----------------------------
def soft_delete_file(file_id):
    db.collection(COLLECTION).document(file_id).update({"deleted": True})

# ----------------------------
# ♻️ Restore Deleted File
# ----------------------------
def restore_file(file_id):
    db.collection(COLLECTION).document(file_id).update({"deleted": False})

# ----------------------------
# 🔍 File Manager UI
# ----------------------------
def file_manager_ui(user):
    st.subheader("📁 Uploaded Files")

    scoped_event_id = session_get("active_event_id")
    files = list_files(scoped_event_id)

    for file in files:
        with st.expander(file["filename"]):
            st.markdown(f"**Uploaded by:** {file.get('uploaded_by', 'Unknown')}")
            st.markdown(f"**Tags:** {', '.join(file.get('tags', []))}")
            st.markdown(f"**Uploaded:** {format_date(file.get('uploaded_at'))}")
            st.markdown(f"[📥 Download File](https://storage.googleapis.com/{bucket.name}/{file['path']})")

            if require_role(user, "manager"):
                if st.button("🗑 Delete", key=f"del_{file['id']}"):
                    soft_delete_file(file["id"])
                    st.experimental_rerun()

# ----------------------------
# 🔐 Admin Restore Panel
# ----------------------------
def admin_restore_ui():
    st.subheader("🗂 Restore Deleted Files")

    deleted_files = list_files(include_deleted=True)
    deleted_files = [f for f in deleted_files if f["deleted"]]

    for file in deleted_files:
        with st.expander(file["filename"]):
            st.markdown(f"**Uploaded by:** {file.get('uploaded_by', 'Unknown')}")
            st.markdown(f"**Uploaded:** {format_date(file.get('uploaded_at'))}")
            if st.button("♻️ Restore", key=f"restore_{file['id']}"):
                restore_file(file["id"])
                st.success("File restored.")
                st.experimental_rerun()
