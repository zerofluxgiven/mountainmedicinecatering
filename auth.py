import streamlit as st
from firebase_admin import firestore
from utils import session_get, session_set

db = firestore.client()
USER_COLLECTION = "users"

# ------------------------------
# 📥 Load User from Session
# ------------------------------

def load_user_session():
    """Returns the user dict stored in session, or None if not logged in."""
    user = session_get("user")
    if user:
        return user

    # Simulate login prompt (replace with actual OAuth if needed)
    if "auth_pending" not in st.session_state:
        st.session_state["auth_pending"] = True
        with st.form("login_form"):
            email = st.text_input("Email")
            name = st.text_input("Name")
            submitted = st.form_submit_button("Log in")
            if submitted and email:
                user_id = email.lower().replace("@", "_at_").replace(".", "_dot_")
                user_data = {
                    "id": user_id,
                    "email": email,
                    "name": name or email.split("@")[0],
                }
                db.collection(USER_COLLECTION).document(user_id).set(user_data, merge=True)
                session_set("user", user_data)
                st.success("Logged in.")
                st.experimental_rerun()
        return None

    return None

# ------------------------------
# 🔐 Permission + Identity
# ------------------------------

def get_user_id(user):
    return user.get("id") if user else None

def get_user_role(user):
    if not user:
        return "viewer"
    doc = db.collection(USER_COLLECTION).document(user["id"]).get()
    if doc.exists:
        return doc.to_dict().get("role", "viewer")
    return "viewer"

def require_role(user, role_required):
    roles = ["viewer", "manager", "admin"]
    user_role = get_user_role(user)
    return roles.index(user_role) >= roles.index(role_required)

# ------------------------------
# 📋 User Listing
# ------------------------------

def get_all_users():
    docs = db.collection(USER_COLLECTION).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]
