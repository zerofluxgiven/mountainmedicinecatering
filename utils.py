import streamlit as st
import uuid
from datetime import datetime
from fractions import Fraction

# ✅ Fixed: Avoid circular import by lazy loading db when needed
def get_db():
    """Get database client lazily to avoid circular imports"""
    try:
        from firebase_init import db, firestore
        return db
    except ImportError:
        st.error("❌ Database client not available")
        return None

# ----------------------------
# 💾 Session Helpers
# ----------------------------

# Add these helper functions to your utils.py or create a new event_scoping.py file

def get_scoped_query(collection_name: str, base_query=None):
    """
    Returns a Firestore query that's scoped to the active event if event mode is on.
    If no event mode is active, returns all data.
    """
    from firebase_init import db, firestore
    
    # Start with base query or create new one
    if base_query is None:
        query = db.collection(collection_name)
    else:
        query = base_query
    
    # Check if event mode is active
    active_event_id = get_active_event_id()
    
    if active_event_id:
        # Event mode is ON - scope to active event
        query = query.where("event_id", "==", active_event_id)
    
    # If event mode is OFF, return unscoped query (all data)
    return query

def is_event_scoped():
    """Check if event mode is currently active"""
    return get_active_event_id() is not None

def get_event_scope_message():
    """Get a message about current event scope for UI display"""
    active_event_id = get_active_event_id()
    
    if active_event_id:
        event = get_event_by_id(active_event_id)
        if event:
            return f"🔍 Viewing data for: **{event.get('name', 'Unknown Event')}**"
        return "🔍 Event mode active (unknown event)"
    
    return "👁️ Viewing all data (no event filter)"

# Example usage in your components:

# In menu_editor_ui function:
def menu_editor_ui_scoped(user: dict) -> None:
    """Example of how to update menu_editor_ui with proper scoping"""
    st.title("🍽️ Menu Editor")
    
    # Show current scope
    st.info(get_event_scope_message())
    
   # role = get_user_role(user)
    
    # Use scoped query
    query = get_scoped_query("menus")
    
    try:
        menus = [doc.to_dict() for doc in query.stream()]
    except Exception as e:
        st.error(f"⚠️ Failed to load menus: {e}")
        return
    
    if not menus:
        if is_event_scoped():
            st.info("No menu items found for this event.")
            if st.button("Create Menu Item"):
                # Add menu item creation for this event
                pass
        else:
            st.info("No menu items found. Create your first menu item!")
        return
    
    # Rest of the function continues as normal...

# In file_manager_ui function:
def file_manager_ui_scoped(user):
    """Example of how to update file_manager_ui with proper scoping"""
    st.subheader("📁 File Manager")
    
    # Show current scope
    st.info(get_event_scope_message())
    
    if not user:
        st.warning("Please log in to manage files.")
        return
    
    role = get_user_role(user)
    user_id = get_user_id(user)
    
    # File upload section (always available)
    st.markdown("### Upload New File")
    # ... upload code ...
    
    # Show existing files with proper scoping
    st.markdown("### Uploaded Files")
    
    # Get files based on current scope
    if is_event_scoped():
        # Show only files for active event
        files = list_files_for_event(get_active_event_id(), include_deleted=show_deleted)
    else:
        # Show all files
        files = list_files(include_deleted=show_deleted)
    
    # ... rest of file display code ...

def session_get(key, default=None):
    return st.session_state.get(key, default)

def session_set(key, value):
    st.session_state[key] = value

# ----------------------------
# ❓ Delete Confirmation Button
# ----------------------------

def delete_button(label: str, key: str, **kwargs) -> bool:
    """Button that asks for confirmation before returning True.

    Previously the confirmation prompt would only appear on the next
    interaction, forcing the user to click the delete button twice.
    This implementation shows the prompt immediately after the first
    click so the user can confirm or cancel in one flow.
    """

    confirm_key = f"{key}_confirm"

    # Check if the delete button itself was clicked
    clicked = st.button(label, key=key, **kwargs)

    # Show confirmation prompt if either the button was just clicked or a
    # previous click requested confirmation.
    if clicked or st.session_state.get(confirm_key):
        # Remember that we are awaiting confirmation so it persists across reruns
        st.session_state[confirm_key] = True

        # Create a container for the confirmation
        st.markdown(
            "<div style='background:white;color:black;padding:0.5rem;border-radius:4px;margin-bottom:0.5rem;'>Are you sure?</div>",
            unsafe_allow_html=True,
        )
        
        # Stack buttons horizontally, aligned to the left
        col1, col2, col3 = st.columns([0.8, 0.8, 3])
        yes_clicked = col1.button("Yes", key=f"{confirm_key}_yes", use_container_width=True)
        no_clicked = col2.button("No", key=f"{confirm_key}_no", use_container_width=True)

        if yes_clicked:
            st.session_state.pop(confirm_key, None)
            return True
        if no_clicked:
            st.session_state.pop(confirm_key, None)
        return False

    return False

# ----------------------------
# 🧂 Normalize Ingredient Name
# ----------------------------

def normalize_ingredient(name: str) -> str:
    """Normalize ingredient names for consistency (lowercase, trimmed)"""
    return name.strip().lower()

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
        return ts.strftime("%m/%d/%y")
    try:
        return ts.to_datetime().strftime("%m/%d/%y")
    except (AttributeError, Exception):
        return str(ts)


def format_day_label(date_str: str) -> str:
    """Return a short label like 'Mon 01 Jan' for a YYYY-MM-DD date string."""
    if not date_str:
        return "Unknown"
    try:
        d = datetime.fromisoformat(date_str).date()
        return d.strftime("%a %d %b")
    except Exception:
        return date_str

def format_timestamp(ts):
    """Alias for format_date for backward compatibility"""
    return format_date(ts)

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
# 📑 Normalize Dict Keys
# ----------------------------

def normalize_keys(obj):
    """Recursively lowercase dictionary keys for consistent access."""
    if isinstance(obj, dict):
        return {str(k).lower(): normalize_keys(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [normalize_keys(v) for v in obj]
    return obj

# ----------------------------
# 🥄 Quantity Formatting
# ----------------------------

def format_fraction(value, max_denominator: int = 8) -> str:
    """Convert numeric values like 0.5 into nice cooking fractions."""
    if value is None:
        return ""

    # Preserve existing fraction strings
    if isinstance(value, str):
        stripped = value.strip()
        if "/" in stripped:
            return stripped
        try:
            value = float(stripped)
        except ValueError:
            return stripped

    try:
        frac = Fraction(value).limit_denominator(max_denominator)
    except Exception:
        return str(value)

    numerator, denominator = frac.numerator, frac.denominator
    whole = numerator // denominator
    remainder = numerator % denominator

    if remainder == 0:
        return str(whole)
    if whole == 0:
        return f"{remainder}/{denominator}"
    return f"{whole} {remainder}/{denominator}"

def normalize_recipe_quantities(data):
    """Recursively apply fraction formatting to recipe ingredient quantities."""
    if isinstance(data, dict):
        ingredients = data.get("ingredients")
        if isinstance(ingredients, list):
            for ing in ingredients:
                if isinstance(ing, dict):
                    qty_key = "quantity" if "quantity" in ing else "qty" if "qty" in ing else None
                    if qty_key and ing.get(qty_key) is not None:
                        ing[qty_key] = format_fraction(ing[qty_key])
    elif isinstance(data, list):
        for item in data:
            normalize_recipe_quantities(item)
    return data

# ----------------------------
# 📝 Convert Parsed Values
# ----------------------------

def value_to_text(value):
    """Convert parsed lists or dicts into a newline-separated string."""
    if isinstance(value, list):
        lines = []
        for item in value:
            if isinstance(item, dict):
                parts = []
                qty = item.get("quantity") or item.get("qty")
                if qty:
                    parts.append(format_fraction(qty))
                unit = item.get("unit")
                if unit:
                    parts.append(str(unit))
                name = item.get("item") or item.get("name")
                if name:
                    parts.append(str(name))
                else:
                    parts.append(" ".join(str(v) for v in item.values()))
                lines.append(" ".join(parts).strip())
            else:
                lines.append(str(item))
        return "\n".join(lines)
    if isinstance(value, dict):
        return "\n".join(f"{k}: {v}" for k, v in value.items())
    return str(value or "")

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
    """Get the currently active event ID from global config"""
    db = get_db()
    if not db:
        return None
        
    try:
        doc = db.collection("config").document("global").get()
        if doc.exists:
            return doc.to_dict().get("active_event")
        return None
    except Exception as e:
        st.error(f"⚠️ Could not fetch active event: {e}")
        return None

def get_active_event():
    """Get the full active event document"""
    event_id = get_active_event_id()
    if not event_id:
        return None
        
    db = get_db()
    if not db:
        return None
        
    try:
        doc = db.collection("events").document(event_id).get()
        return doc.to_dict() if doc.exists else None
    except Exception as e:
        st.error(f"⚠️ Could not fetch active event data: {e}")
        return None

def get_event_by_id(event_id):
    """Get a specific event by ID"""
    if not event_id:
        return None
        
    db = get_db()
    if not db:
        return None
        
    try:
        doc = db.collection("events").document(event_id).get()
        return doc.to_dict() if doc.exists else None
    except Exception as e:
        st.error(f"⚠️ Could not fetch event {event_id}: {e}")
        return None

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
    st.markdown(f"🔒 **{field_name}** (locked)")
    suggested_value = st.text_input(
        f"💡 Suggest a new value for {field_name}:", 
        value=current_value, 
        key=f"suggest_{field_name}_{target_id}"  # ✅ Added unique key
    )

    if suggested_value != current_value and suggested_value:
        if st.button(f"💬 Submit Suggestion for {field_name}", key=f"submit_{field_name}_{target_id}"):
            # Import here to avoid circular dependency
            try:
                from suggestions import create_suggestion
                create_suggestion(
                    document_type=doc_type,
                    document_id=target_id,
                    field=field_name,
                    current_value=current_value,
                    suggested_value=suggested_value,
                    user=user,
                    edited_by="user",
                )
                st.success("✅ Suggestion submitted for review.")
            except ImportError:
                st.error("❌ Suggestion system not available")
            except Exception as e:
                st.error(f"❌ Failed to submit suggestion: {e}")
    
    return current_value  # return original value, not suggested

# ----------------------------
# 📜 Role-Based Action Logger
# ----------------------------

def log_user_action(user_id: str, role: str, action_type: str, context: dict = None):
    """Log an action performed by a user for audit trail."""
    try:
        db = get_db()
        if not db:
            return

        from datetime import datetime
        log_entry = {
            "user_id": user_id,
            "role": role,
            "action_type": action_type,
            "timestamp": datetime.utcnow(),
            "context": context or {}
        }
        db.collection("logs").document().set(log_entry)
    except Exception as e:
        st.warning(f"Failed to log user action: {e}")

