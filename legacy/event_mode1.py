# event_mode.py

from utils import get_active_event_id, get_active_event

# -------------------------------
# ✅ Is Event Mode Active?
# -------------------------------

def is_event_mode_active() -> bool:
    """Returns True if Event Mode is active (i.e., an event is selected)."""
    return get_active_event_id() is not None

# -------------------------------
# 🔒 Should This Item Be Locked?
# -------------------------------

def is_locked(item_event_id: str) -> bool:
    """
    Returns True if the item is locked due to being outside the active event.
    If Event Mode is off, all items are editable.
    """
    active_event_id = get_active_event_id()
    if not active_event_id:
        return False
    return item_event_id != active_event_id

# -------------------------------
# 🧠 Get the Scoped Event ID
# -------------------------------

def get_scoped_event_id(default=None) -> str | None:
    """Returns the active event ID, or a provided default fallback."""
    return get_active_event_id() or default

# -------------------------------
# 📋 Current Event Info (If Any)
# -------------------------------

def get_event_context() -> dict | None:
    """Returns the full active event document, or None if not set."""
    return get_active_event()
