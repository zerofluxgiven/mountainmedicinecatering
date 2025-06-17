import streamlit as st
from firebase_init import db
from firebase_admin import firestore
from datetime import datetime
from utils import get_active_event_id, generate_id, format_date
from auth import get_user_id
from ingredients import parse_recipe_ingredients, update_recipe_with_parsed_ingredients, get_event_ingredient_list, search_ingredients, search_recipes_by_ingredient
from allergies import render_allergy_warning

# ----------------------------
# 📖 Recipe Editor UI (already updated)
# ----------------------------

def recipe_editor_ui(recipe_id=None):
    ...  # Unchanged from prior update

# ----------------------------
# 📂 Browse Recipes Tab
# ----------------------------

def _browse_recipes_tab():
    try:
        docs = db.collection("recipes").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
        recipes = [doc.to_dict() | {"id": doc.id} for doc in docs]
    except Exception as e:
        st.error(f"Failed to load recipes: {e}")
        return

    if not recipes:
        st.info("No recipes found.")
        return

    col1, col2, col3 = st.columns(3)

    with col1:
        search_term = st.text_input("Search recipes", placeholder="Search by name...")

    with col2:
        all_tags = set()
        for recipe in recipes:
            all_tags.update(recipe.get("tags", []))
        selected_tags = st.multiselect("Filter by tags", sorted(all_tags))

    with col3:
        show_parsed_only = st.checkbox("Show only parsed recipes")

    filtered = recipes

    if search_term:
        search_lower = search_term.lower()
        filtered = [r for r in filtered if search_lower in r.get("name", "").lower()]

    if selected_tags:
        filtered = [r for r in filtered if any(tag in r.get("tags", []) for tag in selected_tags)]

    if show_parsed_only:
        filtered = [r for r in filtered if r.get("ingredients_parsed", False)]

    st.markdown(f"### Showing {len(filtered)} recipes")

    for recipe in filtered:
        with st.container():
            col1, col2 = st.columns([4, 1])
            with col1:
                st.subheader(recipe.get("name", "Unnamed Recipe"))
            with col2:
                if recipe.get("ingredients_parsed"):
                    st.success("✅ Parsed")
                else:
                    st.info("📝 Not parsed")

            active_event_id = get_active_event_id()
            if active_event_id:
                render_allergy_warning(recipe["id"], active_event_id)

            st.markdown(f"👨‍🍳 By: *{recipe.get('author_name', 'Unknown')}*")
            st.markdown(f"🕒 Created: {format_date(recipe.get('created_at'))}")

            if recipe.get("ingredients_parsed") and recipe.get("parsed_ingredients"):
                st.markdown("### Ingredients (Parsed)")
                ingredients_by_category = {}
                for ping in recipe["parsed_ingredients"]:
                    try:
                        ing_doc = db.collection("ingredients").document(ping["ingredient_id"]).get()
                        category = ing_doc.to_dict().get("category", "Other") if ing_doc.exists else "Other"
                    except:
                        category = "Other"
                    ingredients_by_category.setdefault(category, []).append(ping)

                for category, items in ingredients_by_category.items():
                    st.markdown(f"**{category}:**")
                    for item in items:
                        parts = [item.get("quantity", ""), item.get("unit", ""), item.get("name", "Unknown")]
                        st.write(f"• {' '.join(part for part in parts if part)}")
            else:
                st.markdown("### Ingredients")
                st.markdown(recipe.get("ingredients", "—"))

            st.markdown("### Instructions")
            st.markdown(recipe.get("instructions", "—"))

            tags = recipe.get("tags", [])
            if tags:
                st.markdown("**Tags:** " + ", ".join(f"`{tag}`" for tag in tags))

            st.markdown("---")


# ----------------------------
# 🔎 Search by Ingredient
# ----------------------------

def _search_by_ingredient_tab():
    st.subheader("🔍 Find Recipes by Ingredient")
    search_query = st.text_input("Type ingredient name", placeholder="e.g., chicken, tomato, basil...")

    if not search_query:
        return

    matching_ingredients = search_ingredients(search_query)

    if not matching_ingredients:
        st.info("No matching ingredients found. Try a different search term.")
        return

    selected_ingredient = st.selectbox(
        "Select ingredient",
        options=matching_ingredients,
        format_func=lambda x: f"{x['name']} (used in {x.get('usage_count', 0)} recipes)"
    )

    if selected_ingredient and st.button("Search Recipes"):
        recipes = search_recipes_by_ingredient(selected_ingredient['id'])
        if not recipes:
            st.info(f"No recipes found with {selected_ingredient['name']}")
            return

        st.success(f"Found {len(recipes)} recipes with {selected_ingredient['name']}")
        for recipe in recipes:
            with st.expander(f"📖 {recipe.get('name', 'Unnamed Recipe')}"):
                st.write(f"**Author:** {recipe.get('author_name', 'Unknown')}")
                st.write(f"**Created:** {format_date(recipe.get('created_at'))}")
                if recipe.get("parsed_ingredients"):
                    for ping in recipe["parsed_ingredients"]:
                        if ping.get("ingredient_id") == selected_ingredient["id"]:
                            st.info(f"Uses: {ping.get('original', 'Unknown amount')}")
                tags = recipe.get("tags", [])
                if tags:
                    st.write("**Tags:** " + ", ".join(f"`{tag}`" for tag in tags))


# ----------------------------
# 📊 Recipe Analytics Tab
# ----------------------------

def _recipe_analytics_tab():
    st.subheader("📊 Recipe Analytics")
    try:
        recipes = [doc.to_dict() for doc in db.collection("recipes").stream()]
        if not recipes:
            st.info("No recipes to analyze")
            return

        total_recipes = len(recipes)
        parsed_recipes = sum(1 for r in recipes if r.get("ingredients_parsed"))
        all_ingredients = db.collection("ingredients").stream()
        ingredients_list = [doc.to_dict() for doc in all_ingredients]

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Recipes", total_recipes)
        with col2:
            st.metric("Parsed Recipes", f"{parsed_recipes}/{total_recipes}")
            st.progress(parsed_recipes / total_recipes)
        with col3:
            st.metric("Unique Ingredients", len(ingredients_list))
        with col4:
            avg_ingredients = sum(len(r.get("ingredient_ids", [])) for r in recipes) / total_recipes
            st.metric("Avg Ingredients/Recipe", f"{avg_ingredients:.1f}")

        st.markdown("### 🥕 Most Used Ingredients")
        top_ingredients = sorted(ingredients_list, key=lambda x: x.get("usage_count", 0), reverse=True)[:10]
        for i, ing in enumerate(top_ingredients):
            col1, col2, col3 = st.columns([3, 1, 1])
            with col1:
                st.write(f"{i+1}. **{ing.get('name', 'Unknown')}**")
            with col2:
                st.write(f"Used {ing.get('usage_count', 0)}x")
            with col3:
                st.caption(ing.get('category', 'Other'))

        st.markdown("### 🏷️ Popular Tags")
        tag_counts = {}
        for r in recipes:
            for tag in r.get("tags", []):
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

        sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        for tag, count in sorted_tags:
            col1, col2 = st.columns([3, 1])
            with col1:
                st.write(f"• **{tag}**")
            with col2:
                st.write(f"{count} recipes")
    except Exception as e:
        st.error(f"Could not load analytics: {e}")
