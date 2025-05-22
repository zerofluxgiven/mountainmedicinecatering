import streamlit as st
from datetime import timedelta
from utils import format_timestamp
import streamlit as st
from firebase_admin import firestore
from auth import require_role
from datetime import datetime, timedelta
from utils import format_timestamp

# Firestore init
db = firestore.client()

# ----------------------------
# 🛠️ Admin Tools
# ----------------------------
@require_role("admin")
def admin_utilities_ui(user):
    st.title("🛠️ Admin Utilities")

    tab1, tab2, tab3, tab4 = st.tabs(["📊 Dashboard", "📜 Audit Logs", "🧹 Cleanup", "📦 Archive Events"])

    with tab1:
        _admin_dashboard()
    with tab2:
        _audit_log_viewer()
    with tab3:
        _cleanup_tools()
    with tab4:
        _archive_event_tool()

# ----------------------------
# 📊 Dashboard Snapshot
# ----------------------------
def _admin_dashboard():
    st.subheader("📈 App Snapshot")
    col1, col2, col3 = st.columns(3)

    with col1:
        events = db.collection("events").stream()
        st.metric("Total Events", sum(1 for _ in events))

    with col2:
        suggestions = db.collection("suggestions").where("status", "==", "pending").stream()
        st.metric("Pending Suggestions", sum(1 for _ in suggestions))

    with col3:
        recipes = db.collection("recipes").stream()
        st.metric("Total Recipes", sum(1 for _ in recipes))

    st.divider()

    col4, col5, col6 = st.columns(3)
    with col4:
        tags = db.collection("tags").stream()
        st.metric("Tag Variants", sum(1 for _ in tags))
    with col5:
        files = db.collection("files").where("deleted", "==", True).stream()
        st.metric("Soft-Deleted Files", sum(1 for _ in files))
    with col6:
        now = datetime.utcnow()
        month_ago = now - timedelta(days=30)
        users = db.collection("logs").where("timestamp", ">=", month_ago).stream()
        st.metric("Active Users (30d)", len({log.get("user_id") for log in map(lambda l: l.to_dict(), users)}))

# ----------------------------
# 📜 Audit Log Viewer
# ----------------------------
def _audit_log_viewer():
    st.subheader("📜 Audit Logs")
    logs = db.collection("logs").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(100).stream()

    for log in logs:
        entry = log.to_dict()
        st.markdown(f"**{entry.get('action')}** by `{entry.get('user_id')}` at {format_timestamp(entry.get('timestamp'))}")
        if details := entry.get("details"):
            st.code(str(details), language="json")

# ----------------------------
# 🧹 Cleanup Tools
# ----------------------------
def _cleanup_tools():
    st.subheader("🧹 Stale Suggestions")
    cutoff = datetime.utcnow() - timedelta(days=14)
    stale_suggestions = db.collection("suggestions").where("status", "==", "pending").where("created_at", "<", cutoff).stream()

    count = 0
    for s in stale_suggestions:
        db.collection("suggestions").document(s.id).update({
            "status": "rejected",
            "reviewed_by": "system",
            "reviewed_at": datetime.utcnow()
        })
        count += 1

    if count:
        st.success(f"✅ Rejected {count} stale suggestions older than 14 days.")
    else:
        st.info("No stale suggestions found.")

# ----------------------------
# 📦 Archive Events
# ----------------------------
def _archive_event_tool():
    st.subheader("📦 Archive Completed Events")
    events = db.collection("events").where("status", "==", "complete").stream()

    archived = 0
    for e in events:
        doc = e.to_dict()
        if not doc.get("archived"):
            db.collection("events").document(doc["id"]).update({"archived": True})
            archived += 1

    if archived:
        st.success(f"Archived {archived} completed events.")
    else:
        st.info("No events ready to archive.")
