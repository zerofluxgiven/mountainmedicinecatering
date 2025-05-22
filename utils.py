# utils.py

import streamlit as st
import uuid
from datetime import datetime
from firestore import db  # Needed for Firestore queries

# ----------------------------
# 💾 Session Helpers
# ----------------------------

def session_get(key, default=None):
    return st.session_state.get(key, default)

def session_set(key, value):
    st.session_state[key] = value

# ----------------------------
# 🔑 Unique ID Generator
# ----------------------------

def generate_id(prefix=None):
    uid = str(uuid.uuid4())[:8]
    return f"{prefix}_{uid}" if prefix else uid

# ----------------------------
# 📆 Timestamp Formatter
# ----------------------------

def format_date(ts):
    if not ts:
        return "Unknown"
    if isinstance(ts, datetime):
        return ts.strftime("%b %d, %Y %H:%M")
    try:
        return ts.to_datetime().strftime("%b %d, %Y %H:%M")  # Firestore timestamps
    except Exception:
        return str(ts)

# ----------------------------
# 🧬 Safe Dict Merge
# ----------------------------

def safe_dict_merge(base, update):
    """Merge update into base, skipping None values."""
    for key, val in update.items():
        if val is not None:
            base[key] = val
    return base

# ----------------------------
# 🔍 Deep Get Utility
# ----------------------------

def deep_get(dictionary, keys, default=None):
    """Safely get nested dict values like deep_get(data, ['a', 'b'])"""
    for key in keys:
        try:
            dictionary = dictionary[key]
        except (KeyError, TypeError):
            return default
    return dictionary

# ----------------------------
# 🧠 Active Event Utilities
# ----------------------------

def get_active_event_id():
    doc = db.collection("config").document("global").get()
    if doc.exists:
        return doc.to_dict().get("active_event")
    return None

def get_active_event():
    event_id = get_active_event_id()
    if not event_id:
        return None
    doc = db.collection("events").document(event_id).get()
    return doc.to_dict() if doc.exists else None

def get_event_by_id(event_id):
    doc = db.collection("events").document(event_id).get()
    return doc.to_dict() if doc.exists else None
