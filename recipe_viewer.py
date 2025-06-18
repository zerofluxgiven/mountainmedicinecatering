import streamlit as st


def normalize_quantity(value):
    if not value or str(value).lower() in ["", "null", "none"]:
        return "to taste"
    return str(value).strip()


def normalize_unit(value):
    if not value or str(value).lower() in ["", "null", "none"]:
        return ""
    return str(value).strip()


def _value_to_text(value):
    """Convert parsed lists/dicts into a newline string for display."""
    if isinstance(value, list):
        lines = []
        for item in value:
            if isinstance(item, dict):
                parts = []
                qty = item.get("quantity") or item.get("qty")
                if qty:
                    parts.append(str(qty))
                unit = item.get("unit")
                if unit:
                    parts.append(str(unit))
                name = item.get("item") or item.get("name")
                if name:
                    parts.append(str(name))
                else:
                    parts.append(" ".join(str(v) for v in item.values()))
                lines.append(" ".join(parts).strip())
            else:
                lines.append(str(item))
        return "\n".join(lines)
    if isinstance(value, dict):
        return "\n".join(f"{k}: {v}" for k, v in value.items())
    return str(value or "")


def render_recipe_preview(parsed_data):
    """Display a simple read-only preview of a parsed recipe."""
    recipe = parsed_data.get("recipes", {})
    if isinstance(recipe, list):
        recipe = recipe[0] if recipe else {}

    st.subheader("🧪 Auto-Detected Recipe Preview")

    st.text_input("Recipe Name", value=recipe.get("name") or recipe.get("title", ""))

    st.text_area("Ingredients", value=_value_to_text(recipe.get("ingredients")))

    st.text_area("Instructions", value=_value_to_text(recipe.get("instructions")))
    st.text_area("Notes", value=_value_to_text(recipe.get("notes")))

