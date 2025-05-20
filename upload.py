import streamlit as st
from firebase_admin import firestore
from auth import require_role, get_user_role
from utils import generate_id
from datetime import datetime

db = firestore.client()

# ----------------------------
# 📁 Upload UI
# ----------------------------

def file_manager_ui(user):
    if not user:
        st.warning("Please log in to upload or view files.")
        return

    user_role = get_user_role(user)

    st.title("📤 Uploads")

    uploaded = st.file_uploader("Upload a file (PDF, image, receipt, etc.)", type=["pdf", "png", "jpg", "jpeg", "txt"])
    tags = st.text_input("Tags (comma-separated)")

    if uploaded:
        file_id = generate_id("file")
        file_name = uploaded.name
        file_data = uploaded.read()

        file_doc = {
            "id": file_id,
            "name": file_name,
            "uploaded_by": user["id"],
            "tags": [t.strip().lower() for t in tags.split(",") if t.strip()],
            "created_at": firestore.SERVER_TIMESTAMP,
            "deleted": False,
        }

        db.collection("files").document(file_id).set(file_doc)
        st.success(f"Uploaded: {file_name}")

    # File list
    st.markdown("### 📄 Uploaded Files")

    try:
        files = db.collection("files").where("deleted", "==", False).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
        files = [doc.to_dict() for doc in files]
    except Exception as e:
        st.error(f"Could not load files: {e}")
        return

    for f in files:
        with st.container():
            st.write(f"**{f['name']}** — uploaded by `{f['uploaded_by']}`")
            if f.get("tags"):
                st.caption("Tags: " + ", ".join(f"`{t}`" for t in f["tags"]))

            if user_role == "admin":
                if st.button(f"🗑 Delete {f['name']}", key=f"del_{f['id']}"):
                    db.collection("files").document(f["id"]).update({"deleted": True})
                    st.success("File marked as deleted.")
