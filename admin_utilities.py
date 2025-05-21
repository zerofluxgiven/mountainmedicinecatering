import streamlit as st
from firebase_admin import firestore
from auth import require_role
from utils import format_date

db = firestore.client()

# ----------------------------
# 🧹 System Cleanup Tools
# ----------------------------
def archive_old_events():
    events = db.collection("events").where("status", "!=", "complete").stream()
    for doc in events:
        data = doc.to_dict()
        if data.get("date") and data["date"] < firestore.SERVER_TIMESTAMP:
            db.collection("events").document(doc.id).update({"status": "complete"})

def list_stale_suggestions(days=14):
    import datetime
    from google.cloud.firestore_v1 import SERVER_TIMESTAMP

    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    docs = db.collection("suggestions").where("status", "==", "pending").stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs if doc.get("created_at") and doc.get("created_at").timestamp() < cutoff.timestamp()]

# ----------------------------
# 🛠 Admin Utility UI
# ----------------------------
def admin_utilities_ui(user):
    st.subheader("🛠 Admin Utilities")

    if not require_role(user, "admin"):
        st.warning("Admin access required.")
        return

    st.markdown("### 🧹 Archive Old Events")
    if st.button("Archive Completed Events"):
        archive_old_events()
        st.success("Old events archived.")

    st.markdown("### ⏱ Stale Suggestions")
    stale = list_stale_suggestions()
    if not stale:
        st.info("No stale suggestions.")
    else:
        for s in stale:
            st.markdown(f"- `{s['field']}` for `{s['document_id']}` — suggested by **{s['user']['name']}**")
