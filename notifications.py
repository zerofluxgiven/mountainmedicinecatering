# notifications.py

import streamlit as st
from typing import List

# Don't create the client at import time - use a function instead
def get_db():
    """Get the Firestore database client"""
    try:
        return firestore.client()
    except Exception:
        # Firebase not initialized yet
        return None

# ----------------------------
# 🔔 Fetch User Notifications
# ----------------------------

def get_user_notifications(user_id: str) -> List[dict]:
    """Returns up to 10 recent notifications for a given user ID."""
    db = get_db()
    if not db:
        return []
        
    try:
        docs = db.collection("notifications") \
            .where("user_id", "==", user_id) \
            .order_by("timestamp", direction=firestore.Query.DESCENDING) \
            .limit(10) \
            .stream()
        return [doc.to_dict() | {"id": doc.id} for doc in docs]
    except Exception as e:
        st.error(f"⚠️ Failed to load notifications: {e}")
        return []

def get_suggestion_count() -> int:
    """Returns the count of pending suggestions."""
    db = get_db()
    if not db:
        return 0
        
    try:
        docs = db.collection("suggestions").where("status", "==", "pending").stream()
        return sum(1 for _ in docs)
    except Exception as e:
        st.error(f"⚠️ Could not count suggestions: {e}")
        return 0

# ----------------------------
# 🧭 Sidebar Notifications
# ----------------------------

def notifications_sidebar(user: dict) -> None:
    """Displays suggestion badge and recent notifications in sidebar."""
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

def send_notification(message: str, user_id: str = None, role: str = None) -> None:
    """
    Sends a notification to a specific user or broadcast to all users of a role.

    Args:
        message: Message content
        user_id: Optional direct recipient
        role: Optional role filter (e.g., "admin")
    """
    db = get_db()
    if not db:
        st.error("❌ Database not available for notifications")
        return
        
    try:
        if user_id:
            db.collection("notifications").add({
                "user_id": user_id,
                "message": message,
                "timestamp": firestore.SERVER_TIMESTAMP
            })
        elif role:
            users = db.collection("users").where("role", "==", role).stream()
            for doc in users:
                db.collection("notifications").add({
                    "user_id": doc.id,
                    "message": message,
                    "timestamp": firestore.SERVER_TIMESTAMP
                })
    except Exception as e:
        st.error(f"❌ Could not send notification: {e}")
