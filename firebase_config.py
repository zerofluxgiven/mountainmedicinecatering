# firebase_config.py

import firebase_admin
from firebase_admin import credentials
import streamlit as st

def initialize_firebase() -> None:
    """Initializes Firebase using credentials from Streamlit secrets."""
    if firebase_admin._apps:
        return  # Firebase already initialized

    try:
        config = st.secrets["firebase_admin"]
        cred = credentials.Certificate({
            "type": config["type"],
            "project_id": config["project_id"],
            "private_key_id": config["private_key_id"],
            "private_key": config["private_key"].replace("\\n", "\n"),
            "client_email": config["client_email"],
            "client_id": config["client_id"],
            "auth_uri": config["auth_uri"],
            "token_uri": config["token_uri"],
            "auth_provider_x509_cert_url": config["auth_provider_x509_cert_url"],
            "client_x509_cert_url": config["client_x509_cert_url"],
            "universe_domain": config.get("universe_domain", "googleapis.com")
        })

        firebase_admin.initialize_app(cred)
        print("✅ Firebase initialized.")

    except Exception as e:
        st.error("❌ Firebase initialization failed. Check your `secrets.toml` and service account.")
        raise e
