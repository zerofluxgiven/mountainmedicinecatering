import streamlit as st
import uuid
from datetime import datetime

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
