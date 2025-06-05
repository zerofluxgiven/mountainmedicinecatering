import streamlit as st
from firebase_init import get_db
from utils import format_date, get_active_event_id
from ingredients import parse_recipe_ingredients, update_recipe_with_parsed_ingredients
from allergies import render_allergy_warning
from ingredients import get_event_ingredient_list
from datetime import datetime
import uuid
import re


db = get_db()

def parse_and_store_recipe_from_file(file_text: str, uploaded_by: str) -> dict:
    """Parse a text file for recipe content and return draft dict"""
    lines = file_text.strip().splitlines()
    name = lines[0].strip() if lines else "Unnamed Recipe"

    try:
        ingredients_start = next(i for i, line in enumerate(lines) if "ingredient" in line.lower())
    except StopIteration:
        ingredients_start = 1

    try:
        instructions_start = next(i for i, line in enumerate(lines) if "instruction" in line.lower())
    except StopIteration:
        instructions_start = len(lines) // 2

    ingredients = "\n".join(lines[ingredients_start:instructions_start]).strip()
    instructions = "\n".join(lines[instructions_start:]).strip()

    return {
        "name": name,
        "ingredients": ingredients,
        "instructions": instructions,
        "notes": "",
        "created_at": datetime.utcnow(),
        "author_id": uploaded_by,
        "author_name": uploaded_by,
        "ingredients_parsed": False,
    }

def save_recipe_to_firestore(recipe_data: dict) -> str:
    """Save the recipe dict to Firestore"""
    recipe_id = str(uuid.uuid4())
    recipe_data["id"] = recipe_id
    try:
        db.collection("recipes").document(recipe_id).set(recipe_data)
        return recipe_id
    except Exception as e:
        print("Error saving recipe:", e)
        return None

def get_all_recipes_for_event_menu():
    try:
        recipes = db.collection("recipes").stream()
        return [{"id": r.id, **r.to_dict()} for r in recipes if not r.to_dict().get("deleted", False)]
    except Exception as e:
        st.error(f"Error loading recipes: {e}")
        return []

# ----------------------------
# 📖 Recipes Tab (Public)
# ----------------------------

def recipes_page():
    st.title("📋 Recipes")

    tab1, tab2, tab3 = st.tabs(["Browse Recipes", "Search by Ingredient", "Recipe Analytics"])

    with tab1:
        _browse_recipes_tab()

        st.markdown("---")
        st.markdown("### ➕ Add a New Recipe")

        with st.form("add_recipe_form"):
            name = st.text_input("Recipe Name")
            ingredients = st.text_area("Ingredients")
            instructions = st.text_area("Instructions")
            tags = st.text_input("Tags (comma-separated)")
            submitted = st.form_submit_button("Save Recipe")

            if submitted:
                user = st.session_state.get("user", {})
                uploaded_by = user.get("id", "unknown")
                recipe = {
                    "name": name,
                    "ingredients": ingredients,
                    "instructions": instructions,
                    "notes": "",
                    "created_at": datetime.utcnow(),
                    "author_id": uploaded_by,
                    "author_name": user.get("name", uploaded_by),
                    "ingredients_parsed": False,
                    "tags": [tag.strip() for tag in tags.split(",") if tag.strip()]
                }
                recipe_id = save_recipe_to_firestore(recipe)
                if recipe_id:
                    st.success(f"✅ Recipe saved! ID: {recipe_id}")
                else:
                    st.error("❌ Failed to save recipe.")

        active_event = get_active_event_id()
        if active_event:
            with st.expander("📦 Ingredients for Active Event"):
                try:
                    ingredients = get_event_ingredient_list(active_event)
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

    with tab2:
        _search_by_ingredient_tab()

    with tab3:
        _recipe_analytics_tab()

    # Inline editing for selected recipe via dashboard trigger
    if st.session_state.get("editing_recipe_id"):
        from menu_editor import menu_editor_ui
        st.markdown("---")
        st.markdown("## 📃 Edit Recipe")
        menu_editor_ui(None, context="recipe", recipe_id=st.session_state["editing_recipe_id"])
