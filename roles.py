import streamlit as st
from firebase_admin import firestore
from datetime import datetime, timedelta
from auth import get_user_id

db = firestore.client()
COLLECTION = "notifications"

# ----------------------------
# 🔧 Notification Data
# ----------------------------

def send_notification(to_user_id, message, level="info", link=None, system=False):
    notif_ref = db.collection(COLLECTION).document()
    notif_ref.set({
        "id": notif_ref.id,
        "to_user_id": to_user_id,
        "message": message,
        "level": level,
        "link": link,
        "is_read": False,
        "created_at": firestore.SERVER_TIMESTAMP,
        "system": system,
    })

def mark_all_read(user_id):
    notifs = db.collection(COLLECTION)\
        .where("to_user_id", "==", user_id)\
        .where("is_read", "==", False)\
        .stream()
    for doc in notifs:
        doc.reference.update({"is_read": True})

def get_unread_count(user_id):
    return len(list(
        db.collection(COLLECTION)
        .where("to_user_id", "==", user_id)
        .where("is_read", "==", False)
        .stream()
    ))

def get_user_notifications(user_id):
    docs = db.collection(COLLECTION)\
        .where("to_user_id", "==", user_id)\
        .order_by("created_at", direction=firestore.Query.DESCENDING)\
        .limit(30)\
        .stream()
    return [doc.to_dict() for doc in docs]

# ----------------------------
# 🧠 System-Wide Broadcast
# ----------------------------

def broadcast_notification(message, level="info", link=None):
    # Mark as visible to all users
    ref = db.collection(COLLECTION).document()
    ref.set({
        "id": ref.id,
        "to_user_id": "global",
        "message": message,
        "level": level,
        "link": link,
        "is_read": False,
        "created_at": firestore.SERVER_TIMESTAMP,
        "system": True,
    })

def get_global_notifications():
    return list(db.collection(COLLECTION)
        .where("to_user_id", "==", "global")
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(10)
        .stream()
    )

# ----------------------------
# 🔔 UI Sidebar Display
# ----------------------------

def notifications_sidebar(user):
    if not user:
        return

    user_id = get_user_id(user)
    unread = get_unread_count(user_id)

    with st.sidebar.expander(f"🔔 Notifications ({unread})", expanded=False):
        notifs = get_user_notifications(user_id)

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
# 🧹 Expiration (Optional Cleanup)
# ----------------------------

def clean_old_notifications(days=30):
    """Admin cleanup function: call manually or via scheduler."""
    cutoff = datetime.now() - timedelta(days=days)
    docs = db.collection(COLLECTION)\
        .where("created_at", "<", cutoff)\
        .stream()
    for doc in docs:
        doc.reference.delete()
