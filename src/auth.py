import streamlit as st
from google.cloud import firestore

# Load from secrets.toml
PUBLIC_MODE = st.secrets.get("public_mode", True)

# Internal cache for roles
if "user" not in st.session_state:
    st.session_state.user = {
        "is_authenticated": False,
        "email": None,
        "uid": None,
        "role": "viewer"
    }

def load_user_session():
    # This should eventually check Firebase auth
    if PUBLIC_MODE:
        st.session_state.user.update({
            "is_authenticated": False,
            "role": "viewer"
        })
    else:
        # Placeholder: replace with Firebase logic
        st.session_state.user.update({
            "is_authenticated": True,
            "email": "admin@example.com",
            "uid": "demo-admin",
            "role": "admin"
        })

def get_user():
    return st.session_state.user

def is_authenticated():
    return PUBLIC_MODE or st.session_state.user["is_authenticated"]

def get_user_role():
    return st.session_state.user.get("role", "viewer")

def require_login():
    if not is_authenticated():
        st.error("You must be logged in to access this feature.")
        st.stop()

def require_role(*roles):
    if get_user_role() not in roles:
        st.error(f"This section is restricted to: {', '.join(roles)}.")
        st.stop()

def is_admin():
    return get_user_role() == "admin"

def is_manager():
    return get_user_role() == "manager"

def is_event_staff():
    return get_user_role() in ["admin", "manager", "staff"]
