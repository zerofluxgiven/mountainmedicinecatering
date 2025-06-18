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

