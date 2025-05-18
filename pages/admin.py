import streamlit as st
from src.auth import require_login, require_role
from src.firestore_utils import restore_file
from google.cloud import firestore

db = firestore.Client()

def show():
    require_login()
    require_role("admin")
    st.title("Admin Tools")

    tab = st.radio("Admin Sections", ["Recycle Bin", "Tags", "System Logs"])

    if tab == "Recycle Bin":
        st.subheader("Soft-Deleted Files")
        deleted = db.collection("files").where("deleted", "==", True).stream()
        for doc in deleted:
            f = doc.to_dict()
            st.write(f"**{f['name']}** — Tags: {', '.join(f.get('tags', []))}")
            if st.button(f"Restore {f['name']}", key=f"admin_restore_{doc.id}"):
                restore_file(doc.id)
                st.success("File restored.")

    elif tab == "Tags":
        st.subheader("Tag Manager")
        tag_docs = db.collection("tags").stream()
        tags = sorted([doc.id for doc in tag_docs])
        selected = st.selectbox("Select tag to rename/merge", tags)
        new_tag = st.text_input("New tag name", key="merge_tag")

        if st.button("Merge & Rename"):
            # This is a simulation — actual tag reassignment requires cross-doc updates
            st.info(f"Simulated renaming {selected} → {new_tag}")
            db.collection("tags").document(new_tag.lower()).set({
                "name": new_tag.lower(),
                "count": firestore.Increment(1)
            })
            db.collection("tags").document(selected).delete()
            st.success("Tag merged.")

    elif tab == "System Logs":
        st.subheader("Recent Actions")
        logs = db.collection("logs").order_by("action").limit(20).stream()
        for doc in logs:
            entry = doc.to_dict()
            st.write(f"[{entry['action']}] by {entry['user_id']} → {entry.get('meta', {})}")
