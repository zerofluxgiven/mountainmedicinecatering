import streamlit as st
from db_client import db
from utils import get_active_event_id, is_event_scoped
from datetime import datetime
from ingredients import get_event_ingredient_list

# ----------------------------
# 📄 Load & Save Menu from event_file
# ----------------------------

def get_event_menu(event_id):
    try:
        ref = db.collection("events").document(event_id).collection("meta").document("event_file")
        doc = ref.get()
        if doc.exists:
            return doc.to_dict().get("menu", [])
    except Exception as e:
        st.error(f"Failed to load menu: {e}")
    return []

def save_event_menu(event_id, menu_list):
    try:
        ref = db.collection("events").document(event_id).collection("meta").document("event_file")
        ref.update({"menu": menu_list})
        return True
    except Exception as e:
        st.error(f"Failed to save menu: {e}")
        return False


# ----------------------------
# 📝 Menu Editor
# ----------------------------

def menu_editor_ui():
    st.title("📋 Edit Menu")

    

    tabs = st.tabs(["📝 Edit Menu", "📦 Ingredients Preview"])
    with tabs[0]:
        if not is_event_scoped():
            st.warning("Please enter Event Mode to edit a menu.")
            return

        event_id = get_active_event_id()
        menu = get_event_menu(event_id)


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
                if save_event_menu(event_id, new_menu):
                    st.success("✅ Menu saved successfully.")
            except Exception as e:
                st.error(f"❌ Failed to save menu: {e}")

    with tabs[1]:
        st.subheader("📦 Ingredients Preview")
        try:
            ingredients = get_event_ingredient_list(get_active_event_id())
            if ingredients:
                for ing in ingredients:
                    qty = ing.get("quantity", "N/A")
                    unit = ing.get("unit", "")
                    name = ing.get("name", "")
                    st.write(f"- {qty} {unit} {name}")
            else:
                st.info("No ingredients found. Make sure recipes are linked and parsed.")
        except Exception as e:
            st.error(f"Failed to load ingredients: {e}")




