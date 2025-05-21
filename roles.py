import streamlit as st
from firebase_admin import firestore
from auth import require_role

db = firestore.client()

# ----------------------------
# 🔐 Admin Role Manager UI
# ----------------------------
def role_admin_ui():
    st.subheader("🛡 User Role Management")

    users = db.collection("users").stream()
    user_list = [doc.to_dict() | {"id": doc.id} for doc in users]

    for user in user_list:
        col1, col2 = st.columns([3, 2])
        with col1:
            st.markdown(f"**{user.get('name', 'Unknown')}**")
            st.caption(user.get("email", ""))
        with col2:
            current_role = user.get("role", "user")
            new_role = st.selectbox(
                "Role",
                options=["user", "manager", "admin"],
                index=["user", "manager", "admin"].index(current_role),
                key=f"role_select_{user['id']}"
            )

            if new_role != current_role:
                if st.button("💾 Update", key=f"update_{user['id']}"):
                    db.collection("users").document(user["id"]).update({"role": new_role})
                    st.success(f"Updated {user['name']} to {new_role}")
                    st.experimental_rerun()
