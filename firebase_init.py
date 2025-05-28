# firebase_init.py

import firebase_admin
from firebase_admin import credentials, firestore, storage
import streamlit as st

_db = None
_storage_bucket = None

def get_db():
    global _db
    if _db is None:
        if not firebase_admin._apps:
            cred = credentials.Certificate(dict(st.secrets["firebase_admin"]))
            firebase_admin.initialize_app(cred, {
                "storageBucket": st.secrets["firebase"]["storageBucket"]
            })
        _db = firestore.client()
    return _db

def get_bucket():
    global _storage_bucket
    if _storage_bucket is None:
        if not firebase_admin._apps:
            cred = credentials.Certificate(dict(st.secrets["firebase_admin"]))
            firebase_admin.initialize_app(cred, {
                "storageBucket": st.secrets["firebase"]["storageBucket"]
            })
        _storage_bucket = storage.bucket()
    return _storage_bucket
