# user_session_initializer.py

from firebase_admin import auth as firebase_auth
from firebase_init import db
from datetime import datetime
import streamlit as st
from utils import session_set

def enrich_session_from_token(token: str):
    """
    Verifies the Firebase token and enriches Streamlit session with Firestore user info.
    Sets st.session_state['firebase_user'] with full user profile.
    """
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        if not uid:
            st.error("Invalid token: UID missing.")
            return None

        # Start session dict with token payload
        session_user = {
            "id": uid,
            "email": decoded_token.get("email"),
            "email_verified": decoded_token.get("email_verified", False),
            "name": decoded_token.get("name", decoded_token.get("email", "Unknown")),
            "picture": decoded_token.get("picture", None),
            "provider": decoded_token.get("firebase", {}).get("sign_in_provider", "password")
        }

        # Try to enrich with Firestore doc
        doc_ref = db.collection("users").document(uid)
        doc = doc_ref.get()

        if doc.exists:
            user_data = doc.to_dict()
            session_user |= {
                "role": user_data.get("role", "viewer"),
                "active": user_data.get("active", True),
                "created_at": user_data.get("created_at"),
                "last_login": datetime.utcnow()
            }

            # Optionally: update login timestamp
            doc_ref.update({"last_login": datetime.utcnow()})
        else:
            # Auto-create Firestore record for new user
            session_user["role"] = "viewer"
            now = datetime.utcnow()
            session_user["created_at"] = now
            session_user["active"] = True
            session_user["last_login"] = now

            doc_ref.set({
                "id": uid,
                "email": session_user["email"],
                "name": session_user["name"],
                "email_verified": session_user["email_verified"],
                "role": "viewer",
                "active": True,
                "created_at": now,
                "last_login": now
            })

        # Store in session
        st.session_state["firebase_user"] = session_user
        session_set("user", session_user)  # for compatibility with older calls

        return session_user

    except Exception as e:
        st.error(f"Authentication failed: {e}")
        return None
