# files.py (temporary compatibility layer)

import streamlit as st
from auth import get_user_role
from file_storage import list_files, soft_delete_file

def file_manager_ui(user):
    st.subheader("📁 File Manager")

    role = get_user_role(user)
    files = list_files(include_deleted=(role in ["admin", "manager"]))

    for f in files:
        with st.expander(f.get("filename", "Unnamed File")):
            st.markdown(f"- **Event ID:** `{f.get('event_id', 'N/A')}`")
            st.markdown(f"- **Uploaded by:** `{f.get('uploaded_by', 'N/A')}`")
            st.markdown(f"- **Tags:** `{', '.join(f.get('tags', []))}`")
            st.markdown(f"- **Date:** {f.get('uploaded_at')}")

            if not f.get("deleted") and role in ["admin", "manager"]:
                if st.button(f"🗑️ Delete {f.get('filename')}", key=f"del_{f['id']}"):
                    soft_delete_file(f["id"])
                    st.success("File deleted.")