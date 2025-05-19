import streamlit as st
from firebase_admin import firestore
from auth import require_role
from utils import format_date
from suggestions import approve_suggestion, reject_suggestion

db = firestore.client()
COLLECTION = "suggestions"

# ----------------------------
# 📥 Load Suggestions
# ----------------------------

def get_all_suggestions():
    docs = db.collection(COLLECTION)\
        .order_by("created_at", direction=firestore.Query.DESCENDING)\
        .stream()
    return [doc.to_dict() for doc in docs]

def filter_suggestions(suggestions, status=None, doc_type=None):
    results = suggestions
    if status:
        results = [s for s in results if s["status"] == status]
    if doc_type:
        results = [s for s in results if s["document_type"] == doc_type]
    return results

# ----------------------------
# 📋 Review Component
# ----------------------------

def suggestion_review_box(suggestion):
    st.write(f"📄 `{suggestion['document_type']}` → `{suggestion['document_id']}`")
    st.write(f"🔤 Field: `{suggestion['field']}`")
    st.write(f"✏️ Current: `{suggestion['current_value']}`")
    st.write(f"💡 Suggested: `{suggestion['suggested_value']}`")
    st.write(f"👤 By: {suggestion.get('user_name', 'unknown')}")
    st.write(f"📆 Submitted: {format_date(suggestion.get('created_at'))}")
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
        st.caption(f"✅ Already {suggestion['status']}")

# ----------------------------
# 🖥️ Main Review UI
# ----------------------------

def event_modifications_ui(user):
    st.subheader("🛠️ Suggested Changes Review")

    if not require_role(user, "manager"):
        st.warning("You must be a manager or admin to access this page.")
        return

    suggestions = get_all_suggestions()

    status_filter = st.selectbox("Filter by Status", ["", "pending", "approved", "rejected"])
    doc_type_filter = st.selectbox("Filter by Type", ["", "menu_item", "file", "event"])

    filtered = filter_suggestions(
        suggestions,
        status=status_filter if status_filter else None,
        doc_type=doc_type_filter if doc_type_filter else None
    )

    if not filtered:
        st.info("No suggestions match this filter.")
        return

    for s in filtered:
        with st.expander(f"{s['field']} change → {s['document_type']}"):
            suggestion_review_box(s)
