import streamlit as st
from firebase_init import db
from utils import get_active_event_id, generate_id
from auth import get_user_id
from datetime import datetime
import json

# ----------------------------
# 🍽️ Menu Editor (Single)
# ----------------------------

def menu_editor_ui(menu_id=None, prefill_data=None):
    """Edit or create a menu."""
    st.title("🍽️ Menu Editor")

    user_id = get_user_id()
    doc_ref = None
    menu = None

    if menu_id:
        doc_ref = db.collection("menus").document(menu_id)
        doc = doc_ref.get()
        if not doc.exists:
            st.error("Menu not found.")
            return
        menu = doc.to_dict()
    elif prefill_data:
        menu = prefill_data
        st.info("💡 This form is pre-filled from parsed data.")
    else:
        st.warning("No menu to show.")
        return

    with st.form("edit_menu_form"):
        title = st.text_input("Menu Title", value=menu.get("title", ""))
        meals_json = st.text_area("Meals (JSON)", value=json.dumps(menu.get("meals", []), indent=2))
        tags = st.text_input("Tags (comma-separated)", value=", ".join(menu.get("tags", [])))

        submitted = st.form_submit_button("💾 Save")
        if submitted:
            data = {
                "title": title,
                "meals": json.loads(meals_json) if meals_json else [],
                "tags": [t.strip() for t in tags.split(",") if t.strip()],
                "updated_at": datetime.utcnow(),
                "updated_by": user_id,
            }
            if doc_ref:
                doc_ref.update(data)
                st.success("✅ Menu updated!")
            else:
                menu_id = generate_id("menu")
                data["created_at"] = datetime.utcnow()
                data["created_by"] = user_id
                db.collection("menus").document(menu_id).set(data)
                st.success("✅ Menu saved!")

# ----------------------------
# 🍽️ Full Menu Editor UI
# ----------------------------

def full_menu_editor_ui(event_id=None, key_prefix: str = ""):
    """Full menu editor UI with scoped widget keys."""
    st.title("🍽️ Event Menu Editor")

    # Shortcut to historical menu viewer
    if st.button("📜 View Historical Menus"):
        st.session_state["next_nav"] = "Historical Menus"

    user_id = get_user_id()
    if not event_id:
        event_id = get_active_event_id()
    if not event_id:
        st.warning("No active event selected.")
        return

    ref = db.collection("events").document(event_id).collection("meta").document("event_file")
    doc = ref.get()
    if not doc.exists:
        st.error("Menu not initialized.")
        return

    data = doc.to_dict()
    menu = data.get("menu", [])

    st.markdown("### 📋 Current Menu")
    meal_colors = {
        "breakfast": "#ADD8E6",
        "lunch": "#FFD700",
        "dinner": "#90EE90",
        "note": "#D3D3D3"
    }

    updated_menu = []
    for i, item in enumerate(menu):
        bg_color = meal_colors.get(item.get("meal", "note").lower(), "#f0f0f0")
        with st.expander(
            f"{item.get('day', 'Day')} - {item.get('meal', 'Meal')}",
            expanded=False,
        ):
            st.markdown(
                f"<div style='background-color:{bg_color};padding:1em;border-radius:8px;'>",
                unsafe_allow_html=True,
            )
            day = st.text_input(
                f"Day #{i+1}",
                value=item.get("day", ""),
                key=f"{key_prefix}day_{i}"
            )
            meal = st.selectbox(
                f"Meal #{i+1}",
                ["Breakfast", "Lunch", "Dinner", "Note"],
                index=_get_meal_index(item.get("meal")),
                key=f"{key_prefix}meal_{i}"
            )
            recipe = st.text_input(
                f"Recipe Name #{i+1}",
                value=item.get("recipe", ""),
                key=f"{key_prefix}recipe_{i}"
            )
            notes = st.text_area(
                f"Notes #{i+1}",
                value=item.get("notes", ""),
                key=f"{key_prefix}notes_{i}"
            )
            allergens = st.text_input(
                f"Allergens #{i+1}",
                value=", ".join(item.get("allergens", [])),
                key=f"{key_prefix}allergens_{i}"
            )
            tags = st.text_input(
                f"Tags #{i+1}",
                value=", ".join(item.get("tags", [])),
                key=f"{key_prefix}tags_{i}"
            )
            st.markdown("</div>", unsafe_allow_html=True)

            updated_menu.append({
                "day": day.strip(),
                "meal": meal.lower(),
                "recipe": recipe.strip(),
                "notes": notes.strip(),
                "allergens": [a.strip() for a in allergens.split(",") if a.strip()],
                "tags": [t.strip() for t in tags.split(",") if t.strip()]
            })

    st.markdown("### ➕ Add New Menu Item")
    form_key = f"{key_prefix}new_menu_item_form"
    with st.form(form_key, clear_on_submit=True):
        col1, col2 = st.columns(2)
        with col1:
            new_day = st.text_input("Day", key=f"{key_prefix}new_day")
            new_meal = st.selectbox(
                "Meal",
                ["Breakfast", "Lunch", "Dinner", "Note"],
                key=f"{key_prefix}new_meal"
            )
            new_recipe = st.text_input("Recipe Name", key=f"{key_prefix}new_recipe")
        with col2:
            new_notes = st.text_area("Notes", key=f"{key_prefix}new_notes")
            new_allergens = st.text_input("Allergens (comma-separated)", key=f"{key_prefix}new_allergens")
            new_tags = st.text_input("Tags (comma-separated)", key=f"{key_prefix}new_tags")

        submit_new = st.form_submit_button("Add Menu Item")
        if submit_new:
            updated_menu.append({
                "day": new_day.strip(),
                "meal": new_meal.lower(),
                "recipe": new_recipe.strip(),
                "notes": new_notes.strip(),
                "allergens": [a.strip() for a in new_allergens.split(",") if a.strip()],
                "tags": [t.strip() for t in new_tags.split(",") if t.strip()]
            })
            st.success(f"✅ Added: {new_recipe.strip()}")

    if st.button("💾 Save Menu"):
        ref.update({
            "menu": updated_menu,
            "last_updated": datetime.utcnow(),
            "updated_by": user_id
        })
        st.success("✅ Menu saved successfully!")

# ----------------------------
# 🔧 Helpers
# ----------------------------

def _get_meal_index(meal: str):
    options = ["Breakfast", "Lunch", "Dinner", "Note"]
    return options.index(meal.capitalize()) if meal and meal.capitalize() in options else 0
