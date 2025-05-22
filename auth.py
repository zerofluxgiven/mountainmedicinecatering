# auth.py

import streamlit as st
from firebase_admin import firestore
from utils import session_get, session_set
import functools

db = firestore.client()
USER_COLLECTION = "users"

# ------------------------------
# 📥 Load User from Session
# ------------------------------

def load_user_session() -> dict | None:
    """Returns the user dict stored in session, or prompts login form if not logged in."""
    if "user" in st.session_state:
        return st.session_state["user"]

    user = session_get("user")
    if user:
        st.session_state["user"] = user
        return user

    with st.form("login_form"):
        st.subheader("🔐 Login Required")
        email = st.text_input("Email")
        name = st.text_input("Name")
        submitted = st.form_submit_button("Log in")

        if submitted and email and "@" in email:
            user_id = email.lower().replace("@", "_at_").replace(".", "_dot_")
            user_data = {
                "id": user_id,
                "email": email,
                "name": name or email.split("@")[0],
            }
            try:
                db.collection(USER_COLLECTION).document(user_id).set(user_data, merge=True)
                session_set("user", user_data)
                st.session_state["user"] = user_data
                st.success("Logged in.")
                st.experimental_rerun()
            except Exception as e:
                st.error(f"❌ Failed to log in: {e}")
    return None

def logout() -> None:
    """Logs out the current user."""
    st.session_state.pop("user", None)
    session_set("user", None)
    st.success("Logged out.")
    st.experimental_rerun()

# ------------------------------
# 🔐 Permission + Identity
# ------------------------------

def get_user_id(user: dict | None) -> str | None:
    return user.get("id") if user else None

def get_user_role(user: dict | None) -> str:
    """Returns user role or 'viewer' if not set."""
    if not user:
        return "viewer"
    try:
        doc = db.collection(USER_COLLECTION).document(user["id"]).get()
        if doc.exists:
            return doc.to_dict().get("role", "viewer")
    except Exception as e:
        st.error(f"⚠️ Could not fetch user role: {e}")
    return "viewer"

def check_role(user: dict | None, role_required: str) -> bool:
    roles = ["viewer", "manager", "admin"]
    try:
        return roles.index(get_user_role(user)) >= roles.index(role_required)
    except Exception:
        return False

def require_role(required_role: str):
    """Decorator that restricts function to users with given role or higher."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            user = st.session_state.get("user")
            if not check_role(user, required_role):
                st.warning(f"🔒 Access denied. Requires '{required_role}' role.")
                return
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def require_login(fn):
    """Decorator that blocks access to a function unless a user is logged in."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        user = st.session_state.get("user")
        if not user:
            st.warning("🔐 Please log in to continue.")
            return
        return fn(*args, **kwargs)
    return wrapper

# ------------------------------
# 📋 User Listing
# ------------------------------

def get_all_users() -> list[dict]:
    """Returns all users with their role and ID."""
    try:
        docs = db.collection(USER_COLLECTION).stream()
        return [doc.to_dict() | {"id": doc.id} for doc in docs]
    except Exception as e:
        st.error(f"⚠️ Could not fetch user list: {e}")
        return []
