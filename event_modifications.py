import streamlit as st
from firebase_admin import firestore
from auth import require_role
from utils import format_date
from suggestions import approve_suggestion, reject_suggestion

db = firestore.client()
COLLECTION = "suggestions"

# -------------------------------
# 📥 Load Suggestions by Status
# -------------------------------

def get_all_suggestions():
    docs = db.collection(COLLECTION).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    return [doc.to_dict() for doc in docs]

def filter_suggestions(suggestions, status=None, doc_type=None):
    filtered = suggestions
    if status:
        filtered = [s for s in filtered if s["status"] == status]
    if doc_type:
        filtered = [s for s in filtered if s["document_type"] == doc_type]
    return filtered

# -------------------------------
# 🧾 Review UI for Suggestions
# -------------------------------

def suggestion_review_box(suggestion):
    st.markdown(f"**Field:** `{suggestion['field']}`")
    st.write(f"🧾 On: `{suggestion['document_type']}` → `{suggestion['document_id']}`")
    st.write(f"👤 Suggested by: `{suggestion['user_name']}`")
    st.write(f"📆 Submitted: {format_date(suggestion.get('created_at'))}")
    st.write(f"✏️ Old Value: `{suggestion['current_value']}`")
    st.write(f"💡 Suggested: `{suggestion['suggested_value']}`")
    st.write(f"📌 Status: `{suggestion['status']}`")

    if suggestion["status"] == "pending":
        col1, col2 = st.columns(2)
        if col1.button("✅ Approve", key=f"approve_{suggestion['id']}"):
            approve_suggestion(suggestion["id"])
            st.experimental_rerun()
        if col2.button("❌ Reject", key=f"reject_{suggestion['id']}"):
            reject_suggestion(suggestion["id"])
            st.experimental_rerun()
    else:
        st.caption(f"Already {suggestion['status']}")

# -------------------------------
# 🖥️ UI Entry Point
# -------------------------------

def event_modifications_ui(user):
    st.subheader("🛠️ Review Suggested Changes")

    if not require_role(user, "manager"):
        st.warning("You need manager or admin access to view this panel.")
        return

    suggestions = get_all_suggestions()

    status_filter = st.selectbox("Filter by status", ["", "pending", "approved", "rejected"])
    type_filter = st.selectbox("Filter by document type", ["", "menu_item", "file", "event"])

    filtered = filter_suggestions(suggestions, status=status_filter or None, doc_type=type_filter or None)

    if not filtered:
        st.info("No suggestions match the filter.")
        return

    for suggestion in filtered:
        with st.expander(f"{suggestion['field']} change on {suggestion['document_type']}"):
            suggestion_review_box(suggestion)
