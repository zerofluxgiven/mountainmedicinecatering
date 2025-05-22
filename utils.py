import streamlit as st
import uuid
from datetime import datetime
from typing import Any, Optional, Union
from firestore import db

# ----------------------------
# 💾 Session Helpers
# ----------------------------

def session_get(key: str, default: Any = None) -> Any:
    return st.session_state.get(key, default)

def session_set(key: str, value: Any) -> None:
    st.session_state[key] = value

# ----------------------------
# 🔑 Unique ID Generator
# ----------------------------

def generate_id(prefix: Optional[str] = None) -> str:
    uid = str(uuid.uuid4())[:8]
    return f"{prefix}_{uid}" if prefix else uid

# ----------------------------
# 📆 Timestamp Formatter
# ----------------------------

def format_date(ts: Any) -> str:
    if not ts:
        return "Unknown"
    if isinstance(ts, datetime):
        return ts.strftime("%b %d, %Y %H:%M")
    try:
        return ts.to_datetime().strftime("%b %d, %Y %H:%M")
    except Exception:
        return str(ts)

# ----------------------------
# 🧬 Safe Dict Merge
# ----------------------------

def safe_dict_merge(base: dict, update: dict) -> dict:
    """Merge update into base, skipping None values."""
    for key, val in update.items():
        if val is not None:
            base[key] = val
    return base

# ----------------------------
# 🔍 Deep Get Utility
# ----------------------------

def deep_get(dictionary: dict, keys: list[str], default: Any = None) -> Any:
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

def get_active_event_id() -> Optional[str]:
    try:
        doc = db.collection("config").document("global").get()
        return doc.to_dict().get("active_event") if doc.exists else None
    except Exception as e:
        st.error(f"⚠️ Failed to fetch active event ID: {e}")
        return None

def get_active_event() -> Optional[dict]:
    event_id = get_active_event_id()
    if not event_id:
        return None
    return get_event_by_id(event_id)

def get_event_by_id(event_id: str) -> Optional[dict]:
    try:
        doc = db.collection("events").document(event_id).get()
        return doc.to_dict() if doc.exists else None
    except Exception as e:
        st.error(f"⚠️ Failed to fetch event '{event_id}': {e}")
        return None
