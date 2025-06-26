# ✅ Final Auth Module — Safe, Debuggable, Circular-Free
import streamlit as st
from firebase_admin import auth as admin_auth
from firebase_init import db
from utils import session_get, session_set
from datetime import datetime
import logging

# ----------------------------
# 🔐 Session Helpers
# ----------------------------

def is_logged_in():
    return "user" in st.session_state

def get_user():
    print("🔎 get_user called; session keys:", list(st.session_state.keys()))
    return st.session_state.get("user")

def get_user_id(user=None):
    if user is None:
        user = st.session_state.get("user", {})
    return user.get("id") if user else None

def get_user_role(user=None):
    if user is None:
        user = st.session_state.get("user", {})
    return user.get("role", "viewer")

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

def authenticate_user(token: str):
    import firebase_admin.auth as auth
    import logging

    if not token or not isinstance(token, str):
        logging.error(f"Invalid token input: {token} (type: {type(token)})")
        raise ValueError("Token must be a non-empty string")

    try:
        decoded = auth.verify_id_token(token)
        logging.info(f"Token decoded successfully: {decoded}")
        return decoded
    except Exception as e:
        logging.exception(f"Failed to verify token: {e}")
        raise

# ----------------------------
# ✅ ENRICH AND REGISTER SESSION USER
# ----------------------------

def enrich_session_from_token(token: str) -> dict | None:
    try:
        decoded_token = admin_auth.verify_id_token(token)
        user_id = decoded_token["uid"]
        email = decoded_token.get("email", "").lower()
        email_verified = decoded_token.get("email_verified", False)

        st.session_state["_auth_debug"] = {
            "decoded_uid": user_id,
            "email": email,
            "verified": email_verified,
            "timestamp": str(datetime.utcnow())
        }

        doc_ref = db.collection("users").document(user_id)
        doc = doc_ref.get()

        if doc.exists:
            user_data = doc.to_dict()
            st.session_state["_auth_debug"]["found_in_firestore"] = True
            st.session_state["_auth_debug"]["role"] = user_data.get("role", "none")
            exp = decoded_token.get("exp")
            if exp:
                st.session_state["token_expiry"] = exp
            return user_data

        # Not in DB → create new user
        admin_email = st.secrets.get("admin", {}).get("email", "").lower()
        is_admin = email == admin_email
        user_data = {
            "id": user_id,
            "email": email,
            "created_at": datetime.utcnow(),
            "role": "admin" if is_admin else "viewer",
            "active": True,
            "email_verified": email_verified
        }
        doc_ref.set(user_data)

        st.session_state["_auth_debug"]["created_new_user"] = True
        st.session_state["_auth_debug"]["assigned_role"] = user_data["role"]
        exp = decoded_token.get("exp")
        if exp:
            st.session_state["token_expiry"] = exp
        return user_data

    except Exception as e:
        st.session_state["_auth_debug"] = {
            "error": str(e),
            "timestamp": str(datetime.utcnow())
        }
        logging.warning(f"[Auth] Token enrichment failed silently: {e}")
        return None

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
