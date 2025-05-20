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
    try:
        doc = db.collection(USER_COLLECTION).document(user_id).get()
        if doc.exists:
            return doc.to_dict().get("role", "viewer")
    except Exception as e:
        st.warning(f"⚠️ Could not fetch user role: {e}")
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
        current_role = get_user_role(user)

        with st.expander(f"{name} ({email})"):
            st.write(f"🧾 Current Role: **{current_role}**")
            new_role = st.selectbox(
                "Change Role",
                options=["viewer", "manager", "admin"],
                index=["viewer", "manager", "admin"].index(current_role),
                key=f"role_{user_id}"
            )

            if new_role != current_role:
                if st.button("Update Role", key=f"update_{user_id}"):
                    try:
                        db.collection(USER_COLLECTION).document(user_id).set(
                            {"role": new_role}, merge=True
                        )
                        st.success(f"✅ Updated {name}'s role to `{new_role}`.")
                    except Exception as e:
                        st.error(f"❌ Failed to update role: {e}")

# -------------------------------
# 🔧 Utility: Promote on Demand
# -------------------------------

def promote_user(user_id: str, role: str):
    try:
        db.collection(USER_COLLECTION).document(user_id).set({"role": role}, merge=True)
    except Exception as e:
        st.error(f"❌ Failed to promote user {user_id} to {role}: {e}")
