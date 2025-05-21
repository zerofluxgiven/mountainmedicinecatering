import streamlit as st
from firebase_admin import firestore

db = firestore.client()

# ----------------------------
# 🔔 Fetch User Notifications
# ----------------------------
def get_user_notifications(user_id):
    docs = db.collection("notifications").where("user_id", "==", user_id).order_by("timestamp", direction=firestore.Query.DESCENDING).limit(10).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_suggestion_count():
    docs = db.collection("suggestions").where("status", "==", "pending").stream()
    return sum(1 for _ in docs)

# ----------------------------
# 🧭 Sidebar Notifications
# ----------------------------
def notifications_sidebar(user):
    if not user:
        return

    suggestion_count = get_suggestion_count()
    if suggestion_count > 0:
        st.sidebar.markdown(f"🔴 **{suggestion_count} suggestion(s) pending**")

    with st.sidebar.expander("🔔 Recent Notifications", expanded=False):
        notes = get_user_notifications(user["id"])
        if not notes:
            st.write("No notifications.")
        for n in notes:
            st.markdown(f"• {n.get('message', 'No content')}")

# ----------------------------
# 🚀 Add Notification
# ----------------------------
def create_notification(user_id, message):
    db.collection("notifications").add({
        "user_id": user_id,
        "message": message,
        "timestamp": firestore.SERVER_TIMESTAMP
    })
