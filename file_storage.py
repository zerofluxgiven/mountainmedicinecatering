import streamlit as st
from firebase_admin import firestore
from auth import get_user_role
from utils import generate_id
from datetime import datetime

db = firestore.client()

# ----------------------------
# 🔍 List Uploaded Files
# ----------------------------

def list_files(include_deleted=False):
    ref = db.collection("files").order_by("created_at", direction=firestore.Query.DESCENDING)
    if not include_deleted:
        ref = ref.where("deleted", "==", False)
    docs = ref.stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

# ----------------------------
# 🗑️ Soft Delete a File
# ----------------------------

def soft_delete_file(file_id):
    db.collection("files").document(file_id).update({
        "deleted": True,
        "deleted_at": firestore.SERVER_TIMESTAMP
    })

# ----------------------------
# 🖼️ UI Entry Point
# ----------------------------

def file_manager_ui(user):
    st.subheader("📁 File Manager")

    role = get_user_role(user)
    files = list_files()

    st.markdown("### Upload New File")
    uploaded = st.file_uploader("Upload a file (PDF, image, doc, etc.)", type=["pdf", "png", "jpg", "jpeg", "txt"])
    tags = st.text_input("Tags (comma-separated)")

    if uploaded:
        file_id = generate_id("file")
        file_data = uploaded.read()
        metadata = {
            "id": file_id,
            "name": uploaded.name,
            "tags": [tag.strip() for tag in tags.split(",") if tag.strip()],
            "deleted": False,
            "created_at": firestore.SERVER_TIMESTAMP,
            "uploaded_by": user["name"],
        }
        db.collection("files").document(file_id).set(metadata)
        st.success(f"Uploaded: {uploaded.name}")
        st.experimental_rerun()

    st.markdown("---")
    st.markdown("### Uploaded Files")

    for file in files:
        with st.container():
            st.write(f"**{file['name']}** — uploaded by `{file.get('uploaded_by', 'unknown')}`")
            if 'tags' in file:
                for tag in file['tags']:
                    st.markdown(f"<span class='tag'>{tag}</span>", unsafe_allow_html=True)
            if role == "admin":
                if st.button(f"🗑 Delete {file['name']}", key=f"del_{file['id']}"):
                    soft_delete_file(file['id'])
                    st.success("File marked as deleted")
                    st.experimental_rerun()

    st.markdown("""
    <style>
    .tag {
        background: #edeafa;
        color: #6C4AB6;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        font-size: 0.85rem;
        display: inline-block;
        margin-right: 0.5rem;
    }
    </style>
    """, unsafe_allow_html=True)
