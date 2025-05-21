import streamlit as st
from firebase_admin import firestore
from auth import require_role
from utils import format_date

db = firestore.client()
SUGGESTIONS = "suggestions"

# ----------------------------
# 📥 Fetch Suggestions
# ----------------------------
def get_pending_suggestions():
    docs = db.collection(SUGGESTIONS).where("status", "==", "pending").stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def approve_suggestion(suggestion):
    ref = db.collection(SUGGESTIONS).document(suggestion["id"])
    ref.update({"status": "approved"})

    # Apply to original doc
    doc_ref = db.collection(suggestion["collection"]).document(suggestion["document_id"])
    doc_ref.update({suggestion["field"]: suggestion["new_value"]})

def reject_suggestion(suggestion):
    ref = db.collection(SUGGESTIONS).document(suggestion["id"])
    ref.update({"status": "rejected"})

# ----------------------------
# 🔍 Review UI
# ----------------------------
def event_modifications_ui(user):
    st.subheader("✏️ Suggested Changes")

    if not require_role(user, "manager"):
        st.warning("You need manager or admin access to approve suggestions.")
        return

    suggestions = get_pending_suggestions()
    if not suggestions:
        st.info("No pending suggestions.")
        return

    for s in suggestions:
        with st.expander(f"{s['field'].capitalize()} for {s['document_id']}"):
            st.markdown(f"**Suggested by**: {s['user']['name']}")
            st.markdown(f"**Old:** `{s['old_value']}`")
            st.markdown(f"**New:** `{s['new_value']}`")
            st.markdown(f"🕓 Submitted: {format_date(s['created_at'])}")

            col1, col2 = st.columns(2)
            with col1:
                if st.button("✅ Approve", key=f"approve_{s['id']}"):
                    approve_suggestion(s)
                    st.success("Approved.")
                    st.experimental_rerun()
            with col2:
                if st.button("❌ Reject", key=f"reject_{s['id']}"):
                    reject_suggestion(s)
                    st.warning("Rejected.")
                    st.experimental_rerun()
