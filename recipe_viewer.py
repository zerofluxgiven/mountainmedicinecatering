import streamlit as st
from utils import value_to_text


def normalize_quantity(value):
    if not value or str(value).lower() in ["", "null", "none"]:
        return "to taste"
    return str(value).strip()


def normalize_unit(value):
    if not value or str(value).lower() in ["", "null", "none"]:
        return ""
    return str(value).strip()




def render_recipe_preview(parsed_data):
    """Display a simple read-only preview of a parsed recipe."""
    recipe = parsed_data.get("recipes", {})
    if isinstance(recipe, list):
        recipe = recipe[0] if recipe else {}

    st.subheader("🧪 Auto-Detected Recipe Preview")

    st.text_input("Recipe Name", value=recipe.get("name") or recipe.get("title", ""))

    st.text_area("Ingredients", value=value_to_text(recipe.get("ingredients")))

    st.text_area("Instructions", value=value_to_text(recipe.get("instructions")))
    st.text_area("Notes", value=value_to_text(recipe.get("notes")))

