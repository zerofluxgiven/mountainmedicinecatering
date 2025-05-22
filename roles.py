# roles.py

import streamlit as st
from firebase_admin import firestore
from auth import require_role

db = firestore.client()
COLLECTION = "users"

# ----------------------------
# 🔍 Fetch Roles
# ----------------------------

def get_all_users() -> list[dict]:
    """Returns all user documents from Firestore."""
    docs = db.collection(COLLECTION).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_user_role(user_id: str) -> str:
    """Returns a user's role by ID, defaulting to 'viewer'."""
    doc = db.collection(COLLECTION).document(user_id).get()
    if doc.exists:
        return doc.to_dict().get("role", "viewer")
    return "viewer"

# ----------------------------
# 🔄 Update Role
# ----------------------------

def update_user_role(user_id: str, role: str) -> None:
    """Updates a user's role in Firestore."""
    db.collection(COLLECTION).document(user_id).update({"role": role})
    st.success(f"✅ Role updated to **{role}**")

# ----------------------------
# ⚙️ Admin UI
# ----------------------------

def role_admin_ui() -> None:
    """Displays the role management panel (admin-only)."""
    st.subheader("👥 User Role Management")

    if not require_role(st.session_state.get("user"), "admin"):
        st.warning("Only admins can view or change user roles.")
        return

    users = get_all_users()
    for user in users:
        with st.expander(f"{user.get('name', 'Unnamed')} ({user['email']})"):
            current_role = user.get("role", "viewer")
            new_role = st.selectbox(
                "Assign Role",
                ["admin", "manager", "viewer"],
                index=["admin", "manager", "viewer"].index(current_role),
                key=f"role_{user['id']}"
            )
            if new_role != current_role and st.button("Save", key=f"save_{user['id']}"):
                update_user_role(user["id"], new_role)
