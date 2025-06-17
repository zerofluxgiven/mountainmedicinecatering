import streamlit as st
from firebase_admin import firestore
from utils import format_date
from firebase_admin import firestore

db = firestore.client()

# ----------------------------
# 📜 Fetch Recent Logs
# ----------------------------
def get_audit_logs(limit=50):
    docs = db.collection("audit_logs").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

# ----------------------------
# 🕵️ Audit Log UI
# ----------------------------
def audit_log_ui(user=None):
    st.subheader("🕵️ Audit Logs")

    logs = get_audit_logs()
    if not logs:
        st.info("No logs found.")
        return

    for log in logs:
        ts = format_date(log.get("timestamp"))
        st.markdown(f"**{ts}** — {log.get('user', {}).get('name', 'Unknown')} → `{log.get('action')}`")
        st.caption(f"Target: `{log.get('target_type')}` / ID: `{log.get('target_id')}`")
