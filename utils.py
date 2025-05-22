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

# ----------------------------
# ✍️ Suggestion Box for Locked Fields
# ----------------------------

def suggest_edit_box(
    field_name: str,
    current_value: str,
    user: dict,
    target_id: str,
    doc_type: str = "event_field"
) -> str:
    """
    Renders a locked field with a suggestion input box.
    Submits suggestion if changed and confirmed.
    """
    from auth import get_user_id  # needed for accessing user ID at runtime
    st.markdown(f"🔒 **{field_name}** (locked)")
    suggested_value = st.text_input(f"💡 Suggest a new value for {field_name}:", value=current_value, key=f"suggest_{field_name}")

    if suggested_value != current_value:
        if st.button(f"💬 Submit Suggestion for {field_name}", key=f"submit_{field_name}"):
            # 🔁 Delayed import to avoid circular dependency
            from suggestions import create_suggestion

            create_suggestion(
                document_type=doc_type,
                document_id=target_id,
                field=field_name,
                current_value=current_value,
                suggested_value=suggested_value,
                user=user,
                edited_by="user",  # or "ai_assistant"
            )
            st.success("✅ Suggestion submitted for review.")
    return current_value  # return original value, not suggested
