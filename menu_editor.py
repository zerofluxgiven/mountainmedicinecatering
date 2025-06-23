import streamlit as st
from firebase_init import db
from utils import get_active_event_id, generate_id
from event_file import generate_menu_template
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

    # Auto-generate blank menu for each event day if empty
    if not menu:
        event_doc = db.collection("events").document(event_id).get()
        event_data = event_doc.to_dict() if event_doc.exists else {}
        menu = generate_menu_template(event_data.get("start_date", ""), event_data.get("end_date", ""))

    st.markdown("### 📋 Current Menu")
    meal_colors = {
        "breakfast": "#ADD8E6",
        "lunch": "#FFD700",
        "dinner": "#90EE90",
        "note": "#D3D3D3"
    }

    # Fetch recipe options once for dropdowns
    recipe_docs = db.collection("recipes").stream()
    recipe_options = [""] + sorted([d.to_dict().get("name", "") for d in recipe_docs])

    updated_menu = []
    for i, item in enumerate(menu):
        bg_color = meal_colors.get(item.get("meal", "note").lower(), "#f0f0f0")
        with st.expander(
            f"{item.get('day', 'Day')} - {item.get('meal', 'Meal').capitalize()}",
            expanded=False,
        ):
            st.markdown(
                f"<div style='background-color:{bg_color};padding:1em;border-radius:8px;'>",
                unsafe_allow_html=True,
            )
            st.markdown(f"**Date:** {item.get('day','')}")
            st.markdown(f"**Meal:** {item.get('meal','').capitalize()}")
            recipe_name = st.selectbox(
                "Recipe",
                recipe_options,
                index=recipe_options.index(item.get("recipe", "")) if item.get("recipe", "") in recipe_options else 0,
                key=f"{key_prefix}recipe_{i}"
            )
            st.markdown("</div>", unsafe_allow_html=True)

            updated_menu.append({
                "day": item.get("day", ""),
                "meal": item.get("meal", ""),
                "recipe": recipe_name,
                "notes": "",
                "allergens": [],
                "tags": []
            })

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
