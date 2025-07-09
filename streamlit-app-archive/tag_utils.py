import streamlit as st
try:
    from openai import OpenAI
    client = OpenAI(api_key=st.secrets["openai"]["api_key"])
except Exception:
    client = None


def suggest_recipe_tags(name: str, ingredients: str, instructions: str, special_version: str = "") -> list[str]:
    """Use OpenAI to suggest tags for a recipe."""
    if not client:
        return []
    prompt = (
        "Suggest concise tags for the following recipe. "
        "Include cuisine, meal type, and any diet or allergy indicators if applicable. "
        f"Title: {name}\nSpecial Version: {special_version}\nIngredients: {ingredients}\nInstructions: {instructions[:500]}"
    )
    try:
        res = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        text = res.choices[0].message.content
        tags = [t.strip().title() for t in text.split(',') if t.strip()]
        return tags
    except Exception as e:
        st.warning(f"Tag suggestion failed: {e}")
        return []
