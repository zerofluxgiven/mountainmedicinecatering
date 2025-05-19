import streamlit as st
from firebase_admin import firestore
from datetime import datetime, timedelta

db = firestore.client()
COLLECTION = "audit_logs"

# ------------------------------
# 📦 Logging Actions
# ------------------------------

def log_action(user, action: str, target_type: str, target_id: str, details: str = ""):
    log_ref = db.collection(COLLECTION).document()
    log_ref.set({
        "id": log_ref.id,
        "timestamp": firestore.SERVER_TIMESTAMP,
        "user_id": user.get("id"),
        "user_name": user.get("name", "Unknown"),
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "details": details,
    })

# ------------------------------
# 🔍 Retrieve Logs
# ------------------------------

def get_recent_logs(limit=1000):
    logs = db.collection(COLLECTION)\
        .order_by("timestamp", direction=firestore.Query.DESCENDING)\
        .limit(limit).stream()
    return [doc.to_dict() for doc in logs]

def filter_logs(logs, user_filter=None, action_filter=None, date_range=None):
    if user_filter:
        logs = [l for l in logs if user_filter.lower() in l["user_name"].lower()]
    if action_filter:
        logs = [l for l in logs if l["action"] == action_filter]
    if date_range:
        start, end = date_range
        logs = [
            l for l in logs
            if "timestamp" in l and start <= l["timestamp"].replace(tzinfo=None) <= end
        ]
    return logs

# ------------------------------
# 📋 Viewer UI
# ------------------------------

def audit_log_ui(user):
    st.subheader("📜 Audit Logs")

    logs = get_recent_logs()

    user_search = st.text_input("🔍 Filter by user name")
    action_filter = st.selectbox("Action Type", ["", "upload", "delete", "edit", "suggestion", "role_change", "event_change"])
    date_range = st.date_input("Date Range", [])

    start = datetime.min
    end = datetime.max
    if len(date_range) == 2:
        start = datetime.combine(date_range[0], datetime.min.time())
        end = datetime.combine(date_range[1], datetime.max.time())

    logs_filtered = filter_logs(logs, user_filter=user_search, action_filter=action_filter or None, date_range=(start, end))

    if not logs_filtered:
        st.info("No logs match this filter.")
        return

    for log in logs_filtered:
        ts = log.get("timestamp")
        st.markdown(f"""
        **{log['user_name']}** performed `{log['action']}` on `{log['target_type']}` (ID: `{log['target_id']}`)
        <br><small>{ts.strftime('%b %d, %Y %H:%M') if ts else 'Unknown Time'}</small>
        <br><small>{log.get('details')}</small>
        <hr>
        """, unsafe_allow_html=True)
