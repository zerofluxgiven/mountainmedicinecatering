import streamlit as st
from firebase_admin import firestore
from auth import get_user_id

db = firestore.client()
COLLECTION = "users"

# ----------------------------
# 📥 Fetch Roles
# ----------------------------
def get_user_role(user_id):
    doc = db.collection(COLLECTION).document(user_id).get()
    if doc.exists:
        return doc.to_dict().get("role", "user")
    return "user"

def require_role(user, role_required):
    if not user:
        return False

    role_hierarchy = {
        "user": 1,
        "manager": 2,
        "admin": 3
    }

    user_role = user.get("role", "user")
    return role_hierarchy.get(user_role, 0) >= role_hierarchy.get(role_required, 0)

# ----------------------------
# 👥 Admin UI for Role Management
# ----------------------------
def role_admin_ui():
    st.subheader("🔐 User Role Management")

    users = db.collection(COLLECTION).stream()
    all_users = [{"id": doc.id, **doc.to_dict()} for doc in users]

    for u in all_users:
        with st.expander(f"{u.get('name', 'Unnamed User')} ({u['id']})"):
            st.write(f"Email: {u.get('email', 'N/A')}")
            current_role = u.get("role", "user")
            new_role = st.selectbox(
                "Role", options=["user", "manager", "admin"],
                index=["user", "manager", "admin"].index(current_role),
                key=f"role_{u['id']}"
            )
            if new_role != current_role and st.button("Update Role", key=f"update_{u['id']}"):
                db.collection(COLLECTION).document(u["id"]).update({"role": new_role})
                st.success("Role updated.")
                st.experimental_rerun()
