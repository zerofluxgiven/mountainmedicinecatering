import streamlit as st
import firebase_admin
from firebase_admin import credentials

def initialize_firebase():
    if not firebase_admin._apps:
        cred = credentials.Certificate({
            "type": st.secrets["firebase_admin"]["type"],
            "project_id": st.secrets["firebase_admin"]["project_id"],
            "private_key_id": st.secrets["firebase_admin"]["private_key_id"],
            "private_key": st.secrets["firebase_admin"]["private_key"].replace("\\n", "\n"),
            "client_email": st.secrets["firebase_admin"]["client_email"],
            "client_id": st.secrets["firebase_admin"]["client_id"],
            "auth_uri": st.secrets["firebase_admin"]["auth_uri"],
            "token_uri": st.secrets["firebase_admin"]["token_uri"],
            "auth_provider_x509_cert_url": st.secrets["firebase_admin"]["auth_provider_x509_cert_url"],
            "client_x509_cert_url": st.secrets["firebase_admin"]["client_x509_cert_url"],
            "universe_domain": st.secrets["firebase_admin"].get("universe_domain", "googleapis.com")
        })
        firebase_admin.initialize_app(cred)
