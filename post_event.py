import streamlit as st
from firebase_admin import firestore
from auth import require_role
from event_mode import get_scoped_event_id

db = firestore.client()

# ----------------------------
# 🧾 Submit Post-Event Notes
# ----------------------------
def submit_post_event_feedback(event_id, feedback):
    db.collection("events").document(event_id).update({
        "post_event_feedback": feedback
    })
    st.success("✅ Post-event feedback saved.")

# ----------------------------
# 📝 UI for Post-Event Summary
# ----------------------------
def post_event_ui(user):
    st.subheader("📦 Post-Event Interview")

    if not require_role(user, "manager"):
        st.warning("Manager access required to fill out post-event interviews.")
        return

    event_id = get_scoped_event_id()
    if not event_id:
        st.info("No active event selected.")
        return

    doc = db.collection("events").document(event_id).get()
    if not doc.exists:
        st.error("Event not found.")
        return

    event = doc.to_dict()
    st.markdown(f"### {event.get('name', 'Unnamed Event')} — Feedback Form")

    existing = event.get("post_event_feedback", {})

    with st.form("post_event_feedback"):
        popularity = st.text_area("🍽️ Popular Menu Items", value=existing.get("popularity", ""))
        leftovers = st.text_area("📦 Leftovers or Overages", value=existing.get("leftovers", ""))
        issues = st.text_area("🚫 Problems / Issues", value=existing.get("issues", ""))
        improvements = st.text_area("💡 Future Improvements", value=existing.get("improvements", ""))
        missing = st.text_area("❗ Forgotten / Missing Items", value=existing.get("missing", ""))
        submitted = st.form_submit_button("💾 Save Feedback")

        if submitted:
            submit_post_event_feedback(event_id, {
                "popularity": popularity,
                "leftovers": leftovers,
                "issues": issues,
                "improvements": improvements,
                "missing": missing,
            })
