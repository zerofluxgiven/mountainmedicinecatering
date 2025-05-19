from events import get_active_event_id, get_active_event

# -------------------------------
# ✅ Is Event Mode Active?
# -------------------------------

def is_event_mode_active():
    """Returns True if Event Mode is active."""
    return get_active_event_id() is not None

# -------------------------------
# 🔒 Should This Item Be Locked?
# -------------------------------

def is_locked(item_event_id: str) -> bool:
    """Returns True if the item is outside the scope of the active event."""
    active_event_id = get_active_event_id()
    if not active_event_id:
        return False  # No event mode = nothing is locked
    return item_event_id != active_event_id

# -------------------------------
# 🧠 Get the Scoped Event ID
# -------------------------------

def get_scoped_event_id(default=None):
    """Returns the current active event ID, or fallback to a default."""
    return get_active_event_id() or default

# -------------------------------
# 📋 Current Event Info (If Any)
# -------------------------------

def get_event_context():
    """Returns the full active event object or None."""
    return get_active_event()
