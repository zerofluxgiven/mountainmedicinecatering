import streamlit as st
from firebase_admin import firestore
from auth import require_login, get_user_role
from utils import format_date, suggest_edit_box, get_scoped_query, is_event_scoped, get_event_scope_message, get_active_event_id, generate_id
from datetime import datetime

db = firestore.client()

# ----------------------------
# 🍽️ Menu Editor UI
# ----------------------------

@require_login
def menu_editor_ui(user: dict) -> None:
    """Editable menu UI with proper event scoping."""
    st.title("🍽️ Menu Editor")
    
    # Show current scope
    st.info(get_event_scope_message())
    
    role = get_user_role(user)
    
    # Create Menu button (with event context if active)
    if st.button("➕ Create New Menu Item"):
        _show_create_menu_form(user)
    
    # Use scoped query
    query = get_scoped_query("menus")
    
    try:
        menus = [doc.to_dict() for doc in query.stream()]
    except Exception as e:
        st.error(f"⚠️ Failed to load menus: {e}")
        return

    if not menus:
        if is_event_scoped():
            st.info("No menu items found for this event. Click 'Create New Menu Item' to add one.")
        else:
            st.info("No menu items found across all events. Create your first menu item!")
        return
    
    # Group menus by event if not in event mode
    if not is_event_scoped():
        st.markdown(f"### All Menu Items ({len(menus)} total)")
        
        # Group by event for better organization
        menus_by_event = {}
        for menu in menus:
            event_id = menu.get("event_id", "No Event")
            if event_id not in menus_by_event:
                menus_by_event[event_id] = []
            menus_by_event[event_id].append(menu)
        
        # Display grouped menus
        for event_id, event_menus in menus_by_event.items():
            if event_id != "No Event":
                # Get event name
                try:
                    event_doc = db.collection("events").document(event_id).get()
                    event_name = event_doc.to_dict().get("name", "Unknown Event") if event_doc.exists else "Unknown Event"
                    st.markdown(f"#### 🎪 {event_name}")
                except:
                    st.markdown(f"#### 🎪 Event ID: {event_id}")
            else:
                st.markdown("#### 📋 Unassigned Menu Items")
            
            _display_menu_items(event_menus, user, role)
    else:
        # In event mode, just show the menus
        st.markdown(f"### Menu Items ({len(menus)} items)")
        _display_menu_items(menus, user, role)

def _display_menu_items(menus: list, user: dict, role: str) -> None:
    """Display a list of menu items"""
    for m in menus:
        with st.expander(f"{m.get('name', 'Unnamed')} ({m.get('category', 'No Category')})"):
            # Show which event this belongs to if not in event mode
            if not is_event_scoped() and m.get("event_id"):
                st.caption(f"Event ID: {m.get('event_id')}")
            
            locked = _is_locked(m.get("event_id"))

            st.markdown("**Description:**")
            if locked:
                st.write(m.get("description", "No description"))
                suggest_edit_box(
                    field_name="Description",
                    current_value=m.get("description", ""),
                    user=user,
                    target_id=m["id"],
                    doc_type="menu_item"
                )
            else:
                # Direct edit for unlocked items
                new_desc = st.text_area(
                    "Edit Description",
                    value=m.get("description", ""),
                    key=f"desc_{m['id']}"
                )
                if new_desc != m.get("description", ""):
                    if st.button(f"Save Description", key=f"save_desc_{m['id']}"):
                        _update_menu_item(m["id"], {"description": new_desc})
                        st.success("Description updated!")
                        st.rerun()

            st.markdown("**Ingredients:**")
            if locked:
                st.write(m.get("ingredients", "No ingredients listed"))
                suggest_edit_box(
                    field_name="Ingredients",
                    current_value=m.get("ingredients", ""),
                    user=user,
                    target_id=m["id"],
                    doc_type="menu_item"
                )
            else:
                new_ingredients = st.text_area(
                    "Edit Ingredients",
                    value=m.get("ingredients", ""),
                    key=f"ingredients_{m['id']}"
                )
                if new_ingredients != m.get("ingredients", ""):
                    if st.button(f"Save Ingredients", key=f"save_ingredients_{m['id']}"):
                        _update_menu_item(m["id"], {"ingredients": new_ingredients})
                        st.success("Ingredients updated!")
                        st.rerun()

            st.markdown("**Tags:**")
            current_tags = m.get("tags", [])
            if locked:
                st.write(", ".join(current_tags) if current_tags else "No tags")
                suggest_edit_box(
                    field_name="Tags",
                    current_value=", ".join(current_tags),
                    user=user,
                    target_id=m["id"],
                    doc_type="menu_item"
                )
            else:
                new_tags = st.text_input(
                    "Edit Tags (comma-separated)",
                    value=", ".join(current_tags),
                    key=f"tags_{m['id']}"
                )
                if new_tags != ", ".join(current_tags):
                    if st.button(f"Save Tags", key=f"save_tags_{m['id']}"):
                        tags_list = [tag.strip() for tag in new_tags.split(",") if tag.strip()]
                        _update_menu_item(m["id"], {"tags": tags_list})
                        st.success("Tags updated!")
                        st.rerun()

            # Delete button (if user has permission)
            if role in ["admin", "manager"] or m.get("created_by") == user.get("id"):
                st.markdown("---")
                if st.button(f"🗑️ Delete Menu Item", key=f"delete_{m['id']}"):
                    if _delete_menu_item(m["id"]):
                        st.success("Menu item deleted!")
                        st.rerun()

            # Show feedback if event is complete
            if m.get("event_id") and _event_is_complete(m["event_id"]):
                _render_feedback(m)

# ----------------------------
# ➕ Create Menu Item
# ----------------------------

def _show_create_menu_form(user: dict) -> None:
    """Show form to create a new menu item"""
    with st.form("create_menu_form"):
        st.subheader("Create New Menu Item")
        
        name = st.text_input("Name *", placeholder="e.g., Grilled Chicken Breast")
        category = st.selectbox(
            "Category *",
            ["Appetizer", "Main Course", "Side Dish", "Dessert", "Beverage", "Other"]
        )
        description = st.text_area("Description", placeholder="Describe the dish...")
        ingredients = st.text_area("Ingredients", placeholder="List ingredients...")
        tags = st.text_input("Tags (comma-separated)", placeholder="e.g., gluten-free, vegetarian")
        
        # If in event mode, auto-assign to current event
        active_event_id = get_active_event_id()
        if active_event_id:
            st.info(f"This menu item will be added to the current event")
            event_id = active_event_id
        else:
            # Let user choose which event to assign to
            events = _get_available_events()
            event_options = ["No Event"] + [f"{e['name']} ({e['id']})" for e in events]
            selected_event = st.selectbox("Assign to Event", event_options)
            event_id = None if selected_event == "No Event" else selected_event.split("(")[-1].rstrip(")")
        
        submitted = st.form_submit_button("Create Menu Item")
        
        if submitted:
            if not name:
                st.error("Please provide a name for the menu item")
            else:
                menu_data = {
                    "id": generate_id("menu"),
                    "name": name,
                    "category": category,
                    "description": description,
                    "ingredients": ingredients,
                    "tags": [tag.strip() for tag in tags.split(",") if tag.strip()],
                    "event_id": event_id,
                    "created_by": user["id"],
                    "created_at": datetime.utcnow()
                }
                
                if _create_menu_item(menu_data):
                    st.success(f"Menu item '{name}' created!")
                    st.rerun()

# ----------------------------
# 🧱 Embedded Menu Editor (for dashboards)
# ----------------------------

def render_menu_editor(event_id: str, user: dict) -> None:
    """Minimal scoped menu editor for inclusion inside dashboards or forms."""
    st.markdown("### 🍽️ Menu Items")

    query = db.collection("menus").where("event_id", "==", event_id)
    menus = [doc.to_dict() for doc in query.stream()]

    if not menus:
        st.info("No menu items for this event.")
        if st.button("Add Menu Item", key=f"add_menu_{event_id}"):
            _show_create_menu_form(user)
        return

    role = get_user_role(user)
    _display_menu_items(menus, user, role)

# ----------------------------
# 🔒 Lock Logic
# ----------------------------

def _is_locked(event_id: str = None) -> bool:
    """Check if an event's menus are locked (event is not in planning status)"""
    if not event_id:
        # If no event specified, check active event
        event_id = get_active_event_id()
    
    if not event_id:
        return False
        
    try:
        doc = db.collection("events").document(event_id).get()
        if doc.exists:
            return doc.to_dict().get("status") != "planning"
    except:
        pass
    
    return False

def _event_is_complete(event_id: str) -> bool:
    """Check if an event is complete"""
    try:
        doc = db.collection("events").document(event_id).get()
        if doc.exists:
            return doc.to_dict().get("status") == "complete"
    except:
        pass
    return False

# ----------------------------
# 📊 Helper Functions
# ----------------------------

def _get_available_events() -> list:
    """Get list of available events for menu assignment"""
    try:
        events = db.collection("events").where("deleted", "==", False).stream()
        return [doc.to_dict() | {"id": doc.id} for doc in events]
    except:
        return []

def _create_menu_item(menu_data: dict) -> bool:
    """Create a new menu item"""
    try:
        db.collection("menus").document(menu_data["id"]).set(menu_data)
        return True
    except Exception as e:
        st.error(f"Failed to create menu item: {e}")
        return False

def _update_menu_item(menu_id: str, updates: dict) -> bool:
    """Update a menu item"""
    try:
        db.collection("menus").document(menu_id).update(updates)
        return True
    except Exception as e:
        st.error(f"Failed to update menu item: {e}")
        return False

def _delete_menu_item(menu_id: str) -> bool:
    """Delete a menu item"""
    try:
        db.collection("menus").document(menu_id).delete()
        return True
    except Exception as e:
        st.error(f"Failed to delete menu item: {e}")
        return False

# ----------------------------
# ✅ Completed Event Feedback
# ----------------------------

def _render_feedback(menu: dict) -> None:
    st.markdown("---")
    st.subheader("📊 Post-Event Feedback")

    feedback = menu.get("feedback", {})
    popularity = feedback.get("popularity")
    comments = feedback.get("comments")

    if popularity:
        st.markdown(f"**Popularity Score:** {popularity}/5")
    if comments:
        st.markdown(f"**Comments:** {comments}")
    else:
        st.markdown("_No feedback submitted._")
