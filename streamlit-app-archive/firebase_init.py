import firebase_admin
from firebase_admin import credentials, firestore, storage
import streamlit as st

# Initialize Firebase app (only once)
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(dict(st.secrets["firebase_admin"]))
        storage_bucket = st.secrets.get("firebase", {}).get("storageBucket")
        if not storage_bucket:
            raise ValueError("Missing firebase.storageBucket in secrets")
        firebase_admin.initialize_app(cred, {
            "storageBucket": storage_bucket
        })
    except Exception as e:
        st.error(f"Firebase initialization failed: {str(e)}")
        raise

# Export Firestore + Storage
db = firestore.client()
bucket = storage.bucket()
firestore = firestore  # expose firestore for Increment, etc.
__all__ = ["db", "bucket", "firestore"]

# Optional accessors for backward compatibility
def get_db():
    return db

def get_bucket():
    return bucket
