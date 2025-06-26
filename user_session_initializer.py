# ✅ PATCHED user_session_initializer.py
import streamlit as st
from firebase_admin import auth as firebase_auth
from firebase_init import db
import logging


def enrich_session_from_token(token: str) -> dict:
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        user_id = decoded_token.get("uid")
        user_doc = db.collection("users").document(user_id).get()

        if user_doc.exists:
            user_data = user_doc.to_dict()
        else:
            user_data = {
                "id": user_id,
                "email": decoded_token.get("email", ""),
                "name": decoded_token.get("name", ""),
                "role": "viewer",
                "email_verified": decoded_token.get("email_verified", False),
                "active": True,
                "created_at": decoded_token.get("auth_time"),
            }
            db.collection("users").document(user_id).set(user_data)

        st.session_state["user"] = user_data  # ✅ Persist user in session
        exp = decoded_token.get("exp")
        if exp:
            st.session_state["token_expiry"] = exp
        return user_data

    except Exception as e:
        logging.warning(f"[Auth] Silent token failure: {e}")
        return None
