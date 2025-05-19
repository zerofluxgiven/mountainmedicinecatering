import streamlit as st
from firebase_admin import firestore
from auth import get_user_id, get_all_users
from utils import session_get

db = firestore.client()
USER_COLLECTION = "users"

# -------------------------------
# 🔐 Role-Based Access Checks
# -------------------------------

def get_user_role(user):
    if not user:
        return "viewer"
    user_id = get_user_id(user)
    doc = db.collection(USER_COLLECTION).document(user_id).get()
    if doc.exists:
        return doc.to_dict().get("role", "viewer")
    return "viewer"

def require_role(user, role_required):
    roles = ["viewer", "manager", "admin"]
    user_role = get_user_role(user)
    return roles.index(user_role) >= roles.index(role_required)

def is_admin(user):
    return get_user_role(user) == "admin"

def is_manager(user):
    return get_user_role(user) in ["manager", "admin"]

# -------------------------------
# ⚙️ Admin UI: Role Assignment
# -------------------------------

def role_admin_ui():
    st.subheader("🔐 Role Management (Admins Only)")

    current_user = session_get("user")
    if not is_admin(current_user):
        st.warning("You do not have permission to manage roles.")
        return

    users = get_all_users()
    if not users:
        st.info("No users found.")
        return

    st.write("### Current Users and Roles")
    for user in users:
        user_id = user.get("id")
        email = user.get("email", "unknown")
        name = user.get("name", "Unnamed")
        role = get_user_role(user)

        with st.expander(f"{name} ({email})"):
            st.write(f"🧾 Current Role: **{role}**")
            new_role = st.selectbox(
                "Change Role", ["viewer", "manager", "admin"], index=["viewer", "manager", "admin"].index(role),
                key=f"role_{user_id}"
            )
            if st.button("Update Role", key=f"update_{user_id}"):
                db.collection(USER_COLLECTION).document(user_id).set(
                    {"role": new_role}, merge=True
                )
                st.success(f"Updated {name}'s role to {new_role}.")

# -------------------------------
# 🔧 Utility: Promote on demand
# -------------------------------

def promote_user(user_id: str, role: str):
    db.collection(USER_COLLECTION).document(user_id).set({"role": role}, merge=True)
