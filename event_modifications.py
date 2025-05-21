import streamlit as st
from firebase_admin import firestore
from auth import require_role, get_user_info
from utils import format_timestamp
from notifications import send_notification
from datetime import datetime

# Firestore init
db = firestore.client()

# ----------------------------
# 🔧 Suggestion Moderation UI
# ----------------------------
@require_role("manager")
def event_modifications_ui(user):
    st.title("📝 Review Suggestions")
    st.caption("Approve or reject pending edits submitted by users or the AI assistant.")

    suggestions_ref = db.collection("suggestions")
    query = suggestions_ref.where("status", "==", "pending")

    # Optional: Filter to current event if in Event Mode
    active_event_id = st.session_state.get("active_event")
    if active_event_id:
        query = query.where("event_id", "==", active_event_id)
        st.info(f"Filtering by active event: `{active_event_id}`")

    results = query.stream()
    suggestions = [s.to_dict() for s in results]

    if not suggestions:
        st.success("✅ No pending suggestions to review.")
        return

    for s in suggestions:
        with st.expander(f"🗂️ {s.get('type', 'Unknown Type')} | Field: {s.get('field', 'Unknown')}"):
            st.markdown(f"**Submitted by:** {s.get('created_by', 'unknown')} | **Time:** {format_timestamp(s.get('created_at'))}")
            st.markdown(f"**Target ID:** `{s.get('target_id')}`")
            st.markdown(f"**Original Value:**\n```
{s.get('original_value')}```")

            new_val = st.text_area("Suggested Value:", value=s.get("suggested_value"), key=s['id'])
            col1, col2 = st.columns([1, 1])

            with col1:
                if st.button("✅ Approve", key=f"approve_{s['id']}"):
                    _apply_suggestion(s, new_val, user)
                    st.success("Approved and applied.")

            with col2:
                if st.button("❌ Reject", key=f"reject_{s['id']}"):
                    _reject_suggestion(s, user)
                    st.warning("Rejected.")

# ----------------------------
# ✅ Apply Suggestion Logic
# ----------------------------
def _apply_suggestion(s, new_value, reviewer):
    target_type = s.get("type")
    target_id = s.get("target_id")
    field = s.get("field")

    # Lookup document based on type
    target_ref = None
    if target_type == "event_field":
        target_ref = db.collection("events").document(target_id)
    elif target_type == "menu_item":
        target_ref = db.collection("menus").document(target_id)
    elif target_type == "file_tag":
        target_ref = db.collection("files").document(target_id)
    elif target_type == "recipe_note":
        target_ref = db.collection("recipes").document(target_id)
    # More types can be added here

    if target_ref:
        target_ref.update({field: new_value})

    # Update suggestion status
    db.collection("suggestions").document(s['id']).update({
        "status": "approved",
        "reviewed_by": reviewer["id"],
        "reviewed_at": datetime.utcnow()
    })

    send_notification(f"Suggestion approved and applied to {target_type}: {target_id}", role="admin")

# ----------------------------
# ❌ Reject Suggestion Logic
# ----------------------------
def _reject_suggestion(s, reviewer):
    db.collection("suggestions").document(s['id']).update({
        "status": "rejected",
        "reviewed_by": reviewer["id"],
        "reviewed_at": datetime.utcnow()
    })

    send_notification(f"Suggestion rejected for {s.get('type')} {s.get('target_id')}", role="admin")
