import firebase_admin
from firebase_admin import credentials, firestore, storage
import streamlit as st

# Initialize Firebase app
if not firebase_admin._apps:
    cred = credentials.Certificate(dict(st.secrets["firebase_admin"]))
    firebase_admin.initialize_app(cred, {
        "storageBucket": st.secrets["firebase"]["storageBucket"]
    })

# Firestore client

# Storage bucket
bucket = storage.bucket()