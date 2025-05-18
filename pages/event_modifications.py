import streamlit as st
from src.auth import require_login, require_role
from src.firestore_utils import resolve_suggestion
from google.cloud import firestore

db = firestore.Client()

def show():
    require_login()
    require_role("admin", "manager")
    st.title("Pending Suggestions")

    suggestions = db.collection("suggestions").where("status", "==", "pending").stream()
    has_items = False

    for doc in suggestions:
        has_items = True
        s = doc.to_dict()
        st.markdown("---")
        st.write(f"**Field:** {s['field']}")
        st.write(f"**Context:** {s.get('context', 'unknown')}")
        st.write(f"**Submitted by:** {s.get('submitted_by', 'N/A')}")
        st.write(f"**Original:** `{s['original_value']}`")
        st.text_input("Proposed Change", value=s["suggested_value"], key=f"edit_{doc.id}")

        col1, col2 = st.columns(2)
        with col1:
            if st.button("Approve", key=f"approve_{doc.id}"):
                resolve_suggestion(doc.id, approve=True)
                st.success("Approved.")
        with col2:
            if st.button("Reject", key=f"reject_{doc.id}"):
                resolve_suggestion(doc.id, approve=False)
                st.info("Rejected.")

    if not has_items:
        st.success("No pending suggestions at the moment.")
