# firebase_init.py

import firebase_admin
from firebase_admin import credentials, firestore, storage
import streamlit as st

# Ensure app is initialized once
if not firebase_admin._apps:
    cred = credentials.Certificate(dict(st.secrets["firebase_admin"]))
    firebase_admin.initialize_app(cred, {
        "storageBucket": st.secrets["firebase"]["storageBucket"]
    })

# Global access points
db = firestore.client()
bucket = storage.bucket()

def get_db():
    return db

def get_bucket():
    return bucket
