# menu_viewer.py

import streamlit as st
from auth import require_role, get_user_id
from firebase_init import db
from utils import get_active_event_id
from event_file import get_event_file, update_event_file_field, initialize_event_file
from recipes import save_menu_to_firestore

# ----------------------------
# 📋 View & Edit Menu (Structured)
# ----------------------------

@require_role("user")
def menu_viewer_ui(event_id=None, key_prefix: str = "", show_headers: bool = True):
    """Display and edit an event menu with scoped widget keys."""
    if show_headers:
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

    if show_headers:
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
                ["Breakfast", "Lunch", "Dinner", "Snack", "Post-Ceremony"],
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

    # Persist edits to existing items on each interaction
    if updated_menu != menu:
        update_event_file_field(event_id, "menu", updated_menu, user_id)

    with st.expander("➕ Add New Menu Item", expanded=False):
        form_key = f"{key_prefix}new_menu_item_form"
        with st.form(form_key, clear_on_submit=True):
            # Fetch recipe options for autocomplete dropdown
            recipe_docs = db.collection("recipes").stream()
            recipe_map: dict[str, list[str]] = {}
            for doc in recipe_docs:
                data = doc.to_dict() or {}
                base = data.get("name", "Unnamed Recipe")
                special = data.get("special_version", "").strip()
                recipe_map.setdefault(base, [])
                if special:
                    recipe_map[base].append(special)

            options = []
            for base in sorted(recipe_map.keys()):
                options.append({"label": base, "value": base})
                for sp in recipe_map[base]:
                    options.append({"label": f"   \u21b3 {sp}", "value": f"{base} - {sp}"})

            new_name_choice = st.selectbox(
                "New Dish Name",
                options,
                format_func=lambda x: x["label"],
                key=f"{key_prefix}new_name"
            )
            new_name = new_name_choice["value"]

            new_category = st.selectbox(
                "New Category",
                ["Breakfast", "Lunch", "Dinner", "Snack", "Post-Ceremony"],
                key=f"{key_prefix}new_category",
            )
            new_description = st.text_area("New Description", key=f"{key_prefix}new_desc")

            submitted = st.form_submit_button("Add Menu Item")
            if submitted and new_name.strip():
                updated_menu.append({
                    "name": new_name.strip(),
                    "category": new_category,
                    "description": new_description.strip(),
                    "tags": []
                })
                update_event_file_field(event_id, "menu", updated_menu, user_id)
                st.success(f"✅ Added: {new_name.strip()}")
                st.rerun()



# ----------------------------
# 🔧 Helpers
# ----------------------------

def _get_category_index(category: str):
    options = ["Breakfast", "Lunch", "Dinner", "Snack", "Post-Ceremony"]
    return options.index(category) if category in options else 0



