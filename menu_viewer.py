# menu_viewer.py

import streamlit as st
from auth import require_role, get_user_id
from utils import get_active_event_id
from event_file import get_event_file, update_event_file_field, initialize_event_file
from recipes import save_menu_to_firestore

# ----------------------------
# 📋 View & Edit Menu (Structured)
# ----------------------------

@require_role("user")
def menu_viewer_ui(event_id=None, key_prefix: str = ""):
    """Display and edit an event menu with scoped widget keys."""
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
            name = st.text_input(
                f"Dish Name #{i+1}",
                item.get("name", ""),
                key=f"{key_prefix}name_{i}"
            )
            category = st.selectbox(
                f"Category #{i+1}",
                ["Appetizer", "Main", "Side", "Dessert", "Drink", "Other"],
                index=_get_category_index(item.get("category")),
                key=f"{key_prefix}cat_{i}"
            )
            description = st.text_area(
                f"Description #{i+1}",
                item.get("description", ""),
                key=f"{key_prefix}desc_{i}"
            )
            tags = st.text_input(
                f"Tags #{i+1} (comma-separated)",
                ", ".join(item.get("tags", [])),
                key=f"{key_prefix}tags_{i}"
            )
            updated_menu.append({
                "name": name.strip(),
                "category": category,
                "description": description.strip(),
                "tags": [t.strip() for t in tags.split(",") if t.strip()]
            })

    st.markdown("### ➕ Add New Menu Item")
    form_key = f"{key_prefix}new_menu_item_form"
    with st.form(form_key, clear_on_submit=True):
        new_name = st.text_input("New Dish Name", key=f"{key_prefix}new_name")
        new_category = st.selectbox(
            "New Category",
            ["Appetizer", "Main", "Side", "Dessert", "Drink", "Other"],
            key=f"{key_prefix}new_category",
        )
        new_description = st.text_area("New Description", key=f"{key_prefix}new_desc")
        new_tags = st.text_input("New Tags (comma-separated)", key=f"{key_prefix}new_tags")
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



