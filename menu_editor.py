import streamlit as st
from firebase_admin import firestore
from auth import require_login, get_user_role
from utils import format_date, suggest_edit_box
from datetime import datetime

# Firestore init
db = firestore.client()

# ----------------------------
# 🍽️ Menu Editor UI
# ----------------------------
@require_login
def menu_editor_ui(user):
    st.title("🍽️ Menu Editor")

    role = get_user_role(user)
    active_event = st.session_state.get("active_event")

    query = db.collection("menus")
    if active_event:
        query = query.where("event_id", "==", active_event)
        st.info(f"Viewing menu for event: `{active_event}`")
    else:
        st.warning("No active event selected. Showing all menus.")

    menus = [doc.to_dict() for doc in query.stream()]

    if not menus:
        st.info("No menu items found.")
        return

    for m in menus:
        with st.expander(f"{m.get('name', 'Unnamed')} ({m.get('category', 'No Category')})"):
            locked = _is_locked()

            st.markdown(f"**Description:**")
            suggest_edit_box(
                user=user,
                doc_type="menu_item",
                doc_id=m["id"],
                field="description",
                current_value=m.get("description", ""),
                locked=locked
            )

            st.markdown(f"**Ingredients:**")
            suggest_edit_box(
                user=user,
                doc_type="menu_item",
                doc_id=m["id"],
                field="ingredients",
                current_value=m.get("ingredients", ""),
                locked=locked
            )

            st.markdown(f"**Tags:**")
            suggest_edit_box(
                user=user,
                doc_type="menu_item",
                doc_id=m["id"],
                field="tags",
                current_value=", ".join(m.get("tags", [])),
                locked=locked
            )

            if m.get("event_id") and _event_is_complete(m.get("event_id")):
                _render_feedback(m)

# ----------------------------
# 🔒 Lock Logic
# ----------------------------
def _is_locked():
    event_id = st.session_state.get("active_event")
    if not event_id:
        return False
    doc = db.collection("events").document(event_id).get().to_dict()
    return doc and doc.get("status") != "planning"

# ----------------------------
# ✅ Completed Event Feedback
# ----------------------------
def _render_feedback(menu):
    st.markdown("---")
    st.subheader("📊 Post-Event Feedback")

    feedback = menu.get("feedback", {})
    popularity = feedback.get("popularity")
    comments = feedback.get("comments")

    if popularity:
        st.markdown(f"**Popularity Score:** {popularity}/5")
    if comments:
        st.markdown(f"**Comments:** {comments}")
    else:
        st.markdown("_No feedback submitted._")
