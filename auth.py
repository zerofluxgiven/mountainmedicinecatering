import streamlit as st
from firebase_admin import auth as admin_auth
from firebase_init import db
from utils import session_get, session_set
from datetime import datetime

# ----------------------------
# 🔐 Session Helpers
# ----------------------------

def is_logged_in():
    return "firebase_user" in st.session_state

def get_user():
    return st.session_state.get("firebase_user")

def get_user_id():
    user = get_user()
    return user.get("id") if user else None

def get_user_role():
    user = get_user()
    return user.get("role", "viewer") if user else "viewer"

def get_current_user():
    return get_user()

# ----------------------------
# 🚫 Access Control Decorators
# ----------------------------

def require_login():
    if not is_logged_in():
        st.warning("You must be logged in to access this page.")
        st.stop()

def require_role(required_role):
    def decorator(func):
        def wrapper(*args, **kwargs):
            user = get_user()
            if not user:
                st.warning("You must be logged in.")
                st.stop()
            role = user.get("role", "viewer")
            hierarchy = ["viewer", "user", "manager", "admin"]
            if hierarchy.index(role) < hierarchy.index(required_role):
                st.error(f"Access denied. Requires role: {required_role}")
                st.stop()
            return func(*args, **kwargs)
        return wrapper
    return decorator

# ----------------------------
# 🔑 Firebase Web Auth Handler
# ----------------------------

def authenticate_user():
    if "firebase_user" in st.session_state:
        return

    token = st.experimental_get_query_params().get("token")
    if token:
        try:
            decoded = admin_auth.verify_id_token(token[0])
            user_id = decoded.get("uid")
            email = decoded.get("email")
            name = decoded.get("name", "")
            picture = decoded.get("picture", "")
            email_verified = decoded.get("email_verified", False)

            login_time = datetime.utcnow().isoformat()
            user_ref = db.collection("users").document(user_id)
            doc = user_ref.get()

            if not doc.exists:
                user_ref.set({
                    "id": user_id,
                    "email": email,
                    "name": name,
                    "role": "viewer",
                    "email_verified": email_verified,
                    "active": True,
                    "created_at": login_time,
                })
            else:
                user_ref.update({
                    "email_verified": email_verified,
                    "last_login": login_time
                })

            # 🔐 Auto-admin logic from secrets.toml
            admin_email = st.secrets.get("default_admin_email")
            if admin_email and email == admin_email:
                user_ref.set({"role": "admin"}, merge=True)

            user_data = user_ref.get().to_dict()
            session_set("firebase_user", user_data)
            st.experimental_set_query_params()  # Clean up token from URL

        except Exception as e:
            st.error(f"Authentication failed: {e}")
            st.stop()

# ----------------------------
# 🔁 Firebase User Sync Tool
# ----------------------------

def sync_firebase_users():
    synced = 0
    page = admin_auth.list_users()
    while page:
        for user in page.users:
            doc_ref = db.collection("users").document(user.uid)
            if not doc_ref.get().exists:
                doc_ref.set({
                    "id": user.uid,
                    "email": user.email,
                    "name": user.display_name or "",
                    "role": "viewer",
                    "email_verified": user.email_verified,
                    "active": True,
                    "created_at": user.user_metadata.creation_timestamp,
                })
                synced += 1
        page = page.get_next_page()
    return synced

# ----------------------------
# ❌ User Deletion
# ----------------------------

def delete_firebase_user(uid):
    try:
        admin_auth.delete_user(uid)
        db.collection("users").document(uid).delete()
        return True
    except Exception as e:
        st.error(f"Failed to delete user: {e}")
        return False