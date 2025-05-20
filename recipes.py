import streamlit as st
from firebase_admin import firestore
from utils import format_date

db = firestore.client()

# ----------------------------
# 📖 Recipes Tab (Public)
# ----------------------------

def recipes_page():
    st.title("📚 Recipes")

    try:
        docs = db.collection("recipes").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
        recipes = [doc.to_dict() | {"id": doc.id} for doc in docs]
    except Exception as e:
        st.error(f"Failed to load recipes: {e}")
        return

    if not recipes:
        st.info("No recipes found.")
        return

    for recipe in recipes:
        with st.container():
            st.subheader(recipe.get("name", "Unnamed Recipe"))
            st.markdown(f"👨‍🍳 By: *{recipe.get('author_name', 'Unknown')}*")
            st.markdown(f"🕒 Created: {format_date(recipe.get('created_at'))}")
            st.markdown("### Ingredients")
            st.markdown(recipe.get("ingredients", "—"))
            st.markdown("### Instructions")
            st.markdown(recipe.get("instructions", "—"))

            tags = recipe.get("tags", [])
            if tags:
                st.markdown("**Tags:** " + ", ".join(f"`{tag}`" for tag in tags))

            st.markdown("---")
