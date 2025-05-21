
import streamlit as st
from firebase_admin import firestore
from auth import require_role

db = firestore.client()
COLLECTION = "users"

# ----------------------------
# 🔍 Fetch Roles
# ----------------------------
def get_all_users():
    docs = db.collection(COLLECTION).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_user_role(user_id):
    doc = db.collection(COLLECTION).document(user_id).get()
    if doc.exists:
        return doc.to_dict().get("role", "viewer")
    return "viewer"

# ----------------------------
# 🔄 Update Role
# ----------------------------
def update_user_role(user_id, role):
    db.collection(COLLECTION).document(user_id).update({"role": role})
    st.success(f"✅ Role updated to {role}")

# ----------------------------
# ⚙️ Admin UI
# ----------------------------
def role_admin_ui():
    st.subheader("👥 User Roles Management")

    if not require_role(session_user := st.session_state.get("user"), "admin"):
        st.warning("Only admins can view or change user roles.")
        return

    users = get_all_users()
    for user in users:
        with st.expander(f"{user.get('name', 'Unnamed User')} ({user['email']})"):
            current_role = user.get("role", "viewer")
            new_role = st.selectbox(
                "Role",
                ["admin", "manager", "viewer"],
                index=["admin", "manager", "viewer"].index(current_role),
                key=f"role_{user['id']}"
            )
            if new_role != current_role and st.button("Save", key=f"save_{user['id']}"):
                update_user_role(user["id"], new_role)
