import streamlit as st
from firebase_admin import firestore
from auth import require_role

db = firestore.client()

# ----------------------------
# 🔐 Role Assignment UI
# ----------------------------
def role_admin_ui():
    st.subheader("🛡 User Role Management")

    users = db.collection("users").stream()
    user_list = [doc.to_dict() | {"id": doc.id} for doc in users]

    for user in user_list:
        col1, col2 = st.columns([2, 1])
        with col1:
            st.markdown(f"**{user.get('name', 'Unknown')}** ({user.get('email', '')})")
        with col2:
            new_role = st.selectbox(
                "Role",
                options=["user", "manager", "admin"],
                index=["user", "manager", "admin"].index(user.get("role", "user")),
                key=f"role_{user['id']}"
            )
            if st.button("💾 Save", key=f"save_{user['id']}"):
                db.collection("users").document(user["id"]).update({"role": new_role})
                st.success(f"{user['name']} updated to {new_role}.")
                st.experimental_rerun()
