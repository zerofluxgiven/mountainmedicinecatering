# event_file.py

from firebase_init import db, firestore
from datetime import datetime
from utils import generate_id

# ----------------------------
# 📦 Default Event File Schema
# ----------------------------

def get_default_event_file():
    return {
        "menu": [],
        "notes": "",
        "last_updated": datetime.utcnow(),
        "updated_by": None
    }

# ----------------------------
# 📥 Create or Overwrite Event File
# ----------------------------

def initialize_event_file(event_id: str, user_id: str):
    """Create a new event_file doc if it doesn't exist."""
    ref = db.collection("events").document(event_id).collection("meta").document("event_file")
    if not ref.get().exists:
        ref.set(get_default_event_file() | {
            "updated_by": user_id
        })

# ----------------------------
# 🔄 Update Specific Section
# ----------------------------

def update_event_file_field(event_id: str, field: str, value, user_id: str):
    """Update a specific field in the event file."""
    ref = db.collection("events").document(event_id).collection("meta").document("event_file")
    ref.set({
        field: value,
        "last_updated": datetime.utcnow(),
        "updated_by": user_id
    }, merge=True)

# ----------------------------
# 📤 Full Overwrite (Admin only)
# ----------------------------

def overwrite_event_file(event_id: str, new_data: dict, user_id: str):
    """Replace entire event_file contents (dangerous)."""
    ref = db.collection("events").document(event_id).collection("meta").document("event_file")
    new_data["last_updated"] = datetime.utcnow()
    new_data["updated_by"] = user_id
    ref.set(new_data)

# ----------------------------
# 📄 Get Event File
# ----------------------------

def get_event_file(event_id: str) -> dict:
    """Returns full event_file dict, or default if not found."""
    ref = db.collection("events").document(event_id).collection("meta").document("event_file")
    doc = ref.get()
    return doc.to_dict() if doc.exists else get_default_event_file()
