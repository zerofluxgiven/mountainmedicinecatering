# db_client.py

"""
Centralized Firebase Firestore client for the entire application.
This ensures Firebase is properly initialized before any database operations.
"""

from firebase_init import db
import streamlit as st

# Global database client - initialized after Firebase setup
_db = None

def get_db():
    """Get the Firestore database client, initializing if needed."""
    global _db
    if _db is None:
        try:
            from firebase_config import initialize_firebase
            initialize_firebase()
            _db = db
        except Exception as e:
            st.error(f"❌ Failed to initialize database: {e}")
            raise e
    return _db

# Convenience reference for backward compatibility
db = get_db()
