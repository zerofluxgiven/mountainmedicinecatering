import streamlit as st
from firebase_admin import firestore
from auth import require_role
from typing import List

db = firestore.client()
COLLECTION = "users"
ROLES = ["viewer", "manager", "admin"]

# ----------------------------
# 🔍 Fetch Roles
# ----------------------------

def get_all_users() -> List[dict]:
    """Return all users with their document ID."""
    try:
        docs = db.collection(COLLECTION).stream()
        return [doc.to_dict() | {"id": doc.id} for doc in docs]
    except Exception as e:
        st.error(f"⚠️ Could not fetch user list: {e}")
        return []

def get_user_role(user_id: str) -> str:
    """Return role for a user ID."""
    try:
        doc = db.collection(COLLECTION).document(user_id).get()
        if doc.exists:
            return doc.to_dict().get("role", "viewer")
    except Exception as e:
        st.error(f"⚠️ Could not fetch role for {user_id}: {e}")
    return "viewer"

# ----------------------------
# 🔄 Update Role
# ----------------------------

def update_user_role(user_id: str, role: str) -> None:
    """Update the user's role in Firestore."""
    try:
        db.collection(COLLECTION).document(user_id).update({"role": role})
        st.success(f"✅ Role updated to {role}")
        st.experimental_rerun()
    except Exception as e:
        st.error(f"❌ Failed to update role: {e}")

# ----------------------------
# ⚙️ Admin UI
# ----------------------------

def role_admin_ui():
    """Admin view to manage user roles."""
    st.subheader("👥 User Roles Management")

    session_user = st.session_state.get("user")
    if not require_role(session_user, "admin"):
        st.warning("⚠️ Only admins can view or change user roles.")
        return

    users = get_all_users()
    for user in users:
        with st.expander(f"{user.get('name', 'Unnamed User')} ({user['email']})"):
            current_role = user.get("role", "viewer")
            new_role = st.selectbox(
                "Role",
                ROLES,
                index=ROLES.index(current_role),
                key=f"role_{user['id']}"
            )
            if new_role != current_role and st.button("Save", key=f"save_{user['id']}"):
                update_user_role(user["id"], new_role)
