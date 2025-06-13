# menu_viewer.py

import streamlit as st
from auth import require_role, get_user_id
from utils import get_active_event_id
from event_file import get_event_file, update_event_file_field, initialize_event_file

# ----------------------------
# 📋 View & Edit Menu (Structured)
# ----------------------------

@require_role("user")
def menu_viewer_ui(event_id=None):
    st.title("🍽️ Event Menu")

    if not event_id:
        event_id = get_active_event_id()
    if not event_id:
        st.warning("No active event selected.")
        return

    user_id = get_user_id()

    # Initialize event file if not present
    initialize_event_file(event_id, user_id)

    event_file = get_event_file(event_id)
    menu = event_file.get("menu", [])

    st.markdown("### 🧾 Current Menu")

    updated_menu = []
    for i, item in enumerate(menu):
        with st.expander(f"{item.get('name', 'Untitled Dish')}", expanded=False):
            name = st.text_input(f"Dish Name #{i+1}", item.get("name", ""), key=f"name_{i}")
            category = st.selectbox(f"Category #{i+1}", ["Appetizer", "Main", "Side", "Dessert", "Drink", "Other"], index=_get_category_index(item.get("category", key="auto_key", key="auto_key"), key=f"cat_{i}")
            description = st.text_area(f"Description #{i+1}", item.get("description", ""), key=f"desc_{i}")
            tags = st.text_input(f"Tags #{i+1} (comma-separated)", ", ".join(item.get("tags", []), key=f"tags_{i}")
            updated_menu.append({
                "name": name.strip(),
                "category": category,
                "description": description.strip(),
                "tags": [t.strip() for t in tags.split(",") if t.strip()]
            })

    st.markdown("### ➕ Add New Menu Item")
    with st.form("new_menu_item_form", clear_on_submit=True):
        new_name = st.text_input("New Dish Name")
        new_category = st.selectbox("New Category", key="New Category", ["Appetizer", "Main", "Side", "Dessert", "Drink", "Other"], key="auto_key"
        new_description = st.text_area("New Description")
        new_tags = st.text_input("New Tags (comma-separated)")
        submitted = st.form_submit_button("Add Menu Item")
        if submitted and new_name.strip():
            updated_menu.append({
                "name": new_name.strip(),
                "category": new_category,
                "description": new_description.strip(),
                "tags": [t.strip() for t in new_tags.split(",") if t.strip()]
            })
            st.success(f"✅ Added: {new_name.strip()}")

    if st.button("💾 Save Menu"):
        update_event_file_field(event_id, "menu", updated_menu, user_id)
        st.success("✅ Menu saved successfully!")
        st.rerun()

# ----------------------------
# 🔧 Helpers
# ----------------------------

def _get_category_index(category: str):
    options = ["Appetizer", "Main", "Side", "Dessert", "Drink", "Other"]
    return options.index(category) if category in options else 0

from event_file import update_event_file_field

def save_menu_to_firestore(menu_data: list, event_id: str, user_id: str) -> bool:
    """
    Save structured menu data to the event's event_file in Firestore.
    This overwrites the current menu.
    """
    try:
        update_event_file_field(event_id, "menu", menu_data, user_id)
        return True
    except Exception as e:
        print("Error saving menu:", e)
        return False

