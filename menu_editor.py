import streamlit as st
from db_client import db
from utils import get_active_event_id, is_event_scoped
from datetime import datetime

# ----------------------------
# 📝 Menu Editor
# ----------------------------

def menu_editor_ui():
    st.title("📋 Edit Menu")

    if not is_event_scoped():
        st.warning("Please enter Event Mode to edit a menu.")
        return

    event_id = get_active_event_id()
    menu_doc_ref = db.collection("events").document(event_id).collection("meta").document("event_file")

    try:
        menu_doc = menu_doc_ref.get()
        if menu_doc.exists:
            event_data = menu_doc.to_dict()
            menu = event_data.get("menu", [])
        else:
            menu = []
    except Exception as e:
        st.error(f"Error loading menu: {e}")
        return

    st.markdown("### 🍽️ Current Menu")
    new_menu = []

    if not menu:
        st.info("No menu items yet. Add your first below.")

    for idx, item in enumerate(menu):
        with st.expander(f"{item.get('day', 'Day')} - {item.get('meal', 'Meal')}", expanded=False):
            col1, col2 = st.columns(2)
            day = col1.text_input("Day", item.get("day", ""), key=f"day_{idx}")
            meal = col2.text_input("Meal", item.get("meal", ""), key=f"meal_{idx}")
            recipe = st.text_input("Recipe Name", item.get("recipe", ""), key=f"recipe_{idx}")
            if day and meal and recipe:
                new_menu.append({"day": day, "meal": meal, "recipe": recipe})

    st.markdown("---")
    with st.form("add_menu_item_form"):
        st.subheader("➕ Add New Menu Item")
        new_day = st.text_input("Day", key="new_day")
        new_meal = st.text_input("Meal", key="new_meal")
        new_recipe = st.text_input("Recipe Name", key="new_recipe")
        submitted = st.form_submit_button("Add")
        if submitted and new_day and new_meal and new_recipe:
            new_menu.append({"day": new_day, "meal": new_meal, "recipe": new_recipe})

    if st.button("💾 Save Menu"):
        try:
            menu_doc_ref.update({
                "menu": new_menu,
                "menu_updated_at": datetime.utcnow()
            })
            st.success("✅ Menu saved successfully.")
        except Exception as e:
            st.error(f"❌ Failed to save menu: {e}")
