# pages/files.py
import streamlit as st
from firestore_utils import list_files, soft_delete_file
from auth import require_login, get_user_role

def show():
    require_login()
    st.title("Files")

    user_role = get_user_role()
    files = list_files(active_only=True)

    st.markdown("### Upload New File")
    uploaded = st.file_uploader("Upload a file (PDF, image, doc, etc.)", type=["pdf", "png", "jpg", "jpeg", "txt"])
    tags = st.text_input("Tags (comma separated)")

    if uploaded:
        file_name = uploaded.name
        file_data = uploaded.read()
        st.success(f"Simulated upload of: {file_name} with tags: {tags}")
        # Simulated upload to Firestore/Storage

    st.markdown("---")
    st.markdown("### Uploaded Files")

    for file in files:
        with st.container():
            st.write(f"**{file['name']}**")
            if 'tags' in file:
                for tag in file['tags']:
                    st.markdown(f"<span class='tag'>{tag}</span>", unsafe_allow_html=True)
            if user_role == "admin":
                if st.button(f"🗑 Delete {file['name']}", key=file['id']):
                    soft_delete_file(file['id'])
                    st.success("File marked as deleted")

    st.markdown("<style>.tag { background: #edeafa; color: #6C4AB6; padding: 0.3rem 0.7rem; border-radius: 999px; font-size: 0.85rem; display: inline-block; margin-right: 0.5rem; }</style>", unsafe_allow_html=True)
