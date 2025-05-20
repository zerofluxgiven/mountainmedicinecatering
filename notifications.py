import streamlit as st
from firebase_admin import firestore
from datetime import datetime, timedelta
from auth import get_user_id, get_user_role
from utils import session_get

db = firestore.client()
COLLECTION = "notifications"

# ----------------------------
# 📩 Notification Actions
# ----------------------------

def send_notification(to_user_id, message, level="info", link=None, system=False):
    try:
        ref = db.collection(COLLECTION).document()
        ref.set({
            "id": ref.id,
            "to_user_id": to_user_id,
            "message": message,
            "level": level,
            "link": link,
            "is_read": False,
            "created_at": firestore.SERVER_TIMESTAMP,
            "system": system,
        })
    except Exception as e:
        st.warning(f"❌ Failed to send notification: {e}")

def broadcast_notification(message, level="info", link=None):
    send_notification("global", message, level=level, link=link, system=True)

def mark_all_read(user_id):
    try:
        notifs = db.collection(COLLECTION)\
            .where("to_user_id", "==", user_id)\
            .where("is_read", "==", False)\
            .stream()
        for doc in notifs:
            doc.reference.update({"is_read": True})
    except Exception as e:
        st.warning(f"❌ Failed to mark notifications read: {e}")

def get_unread_count(user_id):
    try:
        return len(list(
            db.collection(COLLECTION)
              .where("to_user_id", "==", user_id)
              .where("is_read", "==", False)
              .stream()
        ))
    except Exception:
        return 0

# ----------------------------
# 📬 Notification Retrieval
# ----------------------------

def get_user_notifications(user_id):
    try:
        docs = db.collection(COLLECTION)\
            .where("to_user_id", "==", user_id)\
            .order_by("created_at", direction=firestore.Query.DESCENDING)\
            .limit(30)\
            .stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        st.warning(f"⚠️ Could not load notifications: {e}")
        return []

def get_global_notifications():
    try:
        docs = db.collection(COLLECTION)\
            .where("to_user_id", "==", "global")\
            .order_by("created_at", direction=firestore.Query.DESCENDING)\
            .limit(10)\
            .stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        st.warning(f"⚠️ Could not load global notifications: {e}")
        return []

# ----------------------------
# 🔔 Sidebar UI Display
# ----------------------------

def notifications_sidebar(user):
    if not user:
        return

    user_id = get_user_id(user)
    unread = get_unread_count(user_id)

    # Bell icon + badge
    st.sidebar.markdown(f"""
        <style>
        .notif-badge {{
            background-color: #d32f2f;
            color: white;
            border-radius: 999px;
            padding: 2px 8px;
            font-size: 0.75rem;
            margin-left: 6px;
        }}
        </style>
        <div style='margin-top: -5px; margin-bottom: 10px;'>
            🔔 <strong>Notifications</strong>
            {"<span class='notif-badge'>" + str(unread) + "</span>" if unread else ""}
        </div>
    """, unsafe_allow_html=True)

    with st.sidebar.expander("📬 View Messages", expanded=False):
        notifs = get_user_notifications(user_id) + get_global_notifications()
        notifs = sorted(notifs, key=lambda x: x.get("created_at", datetime.min), reverse=True)

        if not notifs:
            st.caption("No new notifications.")
        else:
            for n in notifs:
                level = n.get("level", "info")
                prefix = "ℹ️" if level == "info" else "⚠️" if level == "warn" else "❗"
                st.markdown(f"{prefix} {n['message']}")
                if n.get("link"):
                    st.markdown(f"[Open →]({n['link']})")

        if notifs:
            st.button("Mark all as read", on_click=mark_all_read, args=(user_id,))

# ----------------------------
# 🧪 Admin Test Sender
# ----------------------------

def test_notification_button(user):
    if get_user_role(user) != "admin":
        return

    st.subheader("📨 Send Test Notification")
    msg = st.text_input("Message")
    target = st.text_input("Target user ID", value=get_user_id(user))
    if st.button("Send Test"):
        send_notification(to_user_id=target, message=msg, level="info")
        st.success("✅ Notification sent.")

# ----------------------------
# 🧹 Cleanup Old Notifications
# ----------------------------

def clean_old_notifications(days=30):
    """Deletes notifications older than X days."""
    try:
        cutoff = datetime.now() - timedelta(days=days)
        docs = db.collection(COLLECTION)\
            .where("created_at", "<", cutoff)\
            .stream()
        for doc in docs:
            doc.reference.delete()
    except Exception as e:
        st.warning(f"❌ Failed to clean notifications: {e}")
