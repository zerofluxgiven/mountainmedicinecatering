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




def render_recipe_preview(parsed_data, allow_edit: bool = False, key_prefix: str = "") -> bool:
    """Display a read-only preview of a parsed recipe.

    Parameters
    ----------
    parsed_data : dict
        Parsed JSON data containing a ``recipes`` entry.
    allow_edit : bool, optional
        Whether to display an ``Edit Recipe`` button.
    key_prefix : str, optional
        Prefix for widget keys to avoid collisions.

    Returns
    -------
    bool
        ``True`` if the Edit button was pressed, else ``False``.
    """

    recipe = parsed_data.get("recipes", {})
    if isinstance(recipe, list):
        recipe = recipe[0] if recipe else {}

    st.markdown(f"#### {recipe.get('name') or recipe.get('title', 'Unnamed Recipe')}")
    st.text_area(
        "Ingredients",
        value=value_to_text(recipe.get("ingredients")),
        disabled=True,
        key=f"{key_prefix}_ingredients",
    )
    st.text_area(
        "Instructions",
        value=value_to_text(recipe.get("instructions")),
        disabled=True,
        key=f"{key_prefix}_instructions",
    )
    st.text_area(
        "Notes",
        value=value_to_text(recipe.get("notes")),
        disabled=True,
        key=f"{key_prefix}_notes",
    )

    if allow_edit:
        return st.button("✏️ Edit Recipe", key=f"{key_prefix}_edit_btn")
    return False


def render_menu_preview(parsed_data, allow_edit: bool = False, key_prefix: str = "") -> bool:
    """Display a simple read-only preview of a parsed menu."""
    menu = parsed_data.get("menus") or parsed_data.get("menu") or {}
    if isinstance(menu, list):
        menu = menu[0] if menu else {}

    st.markdown(f"#### {menu.get('name') or menu.get('title', 'Unnamed Menu')}")

    items = menu.get("items") or menu.get("recipes") or menu.get("dishes") or []
    if isinstance(items, dict):
        items = [items]
    for i, item in enumerate(items):
        st.text_input(
            f"Item {i+1}",
            value=item.get("name") or item.get("recipe") or item.get("title", "Unnamed"),
            disabled=True,
            key=f"{key_prefix}_item_{i}",
        )

    if allow_edit:
        return st.button("✏️ Edit Menu", key=f"{key_prefix}_edit_menu_btn")
    return False


def render_ingredient_preview(parsed_data, allow_edit: bool = False, key_prefix: str = "") -> bool:
    """Display a read-only preview for a parsed ingredient."""
    ingredient = parsed_data.get("ingredients") or {}
    if isinstance(ingredient, list):
        ingredient = ingredient[0] if ingredient else {}

    st.markdown(f"#### {ingredient.get('name', 'Unnamed Ingredient')}")
    st.text_input(
        "Unit",
        value=ingredient.get("unit", ""),
        disabled=True,
        key=f"{key_prefix}_unit",
    )
    st.text_area(
        "Notes",
        value=value_to_text(ingredient.get('notes')), 
        disabled=True,
        key=f"{key_prefix}_ing_notes",
    )

    if allow_edit:
        return st.button("✏️ Edit Ingredient", key=f"{key_prefix}_edit_ing_btn")

    return False

