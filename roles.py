
import streamlit as st
from firebase_admin import firestore
from auth import get_user_id

db = firestore.client()
COLLECTION = "users"

# ----------------------------
# 🆔 Get User Role
# ----------------------------
def get_user_role(user_id):
    doc = db.collection(COLLECTION).document(user_id).get()
    if doc.exists:
        return doc.to_dict().get("role", "guest")
    return "guest"

# ----------------------------
# 🔐 Role Checks
# ----------------------------
def require_role(user, required_role):
    role_hierarchy = ["guest", "user", "manager", "admin"]
    user_role = user.get("role", "guest")
    return role_hierarchy.index(user_role) >= role_hierarchy.index(required_role)

def is_admin(user):
    return user.get("role") == "admin"

def is_manager(user):
    return user.get("role") == "manager"

# ----------------------------
# 🧑‍💼 Admin UI
# ----------------------------
def role_admin_ui():
    st.subheader("🔐 User Roles Management")

    users = db.collection(COLLECTION).order_by("name").stream()
    for doc in users:
        user_data = doc.to_dict()
        user_id = doc.id
        current_role = user_data.get("role", "guest")
        name = user_data.get("name", "Unnamed")

        col1, col2 = st.columns([3, 2])
        col1.write(f"**{name}** ({user_id})")
        new_role = col2.selectbox("Role", ["guest", "user", "manager", "admin"], index=["guest", "user", "manager", "admin"].index(current_role), key=f"role_{user_id}")

        if new_role != current_role:
            if st.button("Update", key=f"update_{user_id}"):
                db.collection(COLLECTION).document(user_id).update({"role": new_role})
                st.success(f"Updated {name}'s role to {new_role}")
