import streamlit as st


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

    ingredients = recipe.get("ingredients", [])
    pretty_ingredients = []
    for i in ingredients:
        line = f"- {i.get('item', '').title()} ({normalize_quantity(i.get('quantity'))} {normalize_unit(i.get('unit'))})".strip()
        pretty_ingredients.append(line)
    st.text_area("Ingredients", value="\n".join(pretty_ingredients))

    st.text_area("Instructions", value=recipe.get("instructions", ""))
    st.text_area("Notes", value=recipe.get("notes", ""))

