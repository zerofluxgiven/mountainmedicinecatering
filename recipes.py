import streamlit as st
from firebase_init import get_db
from firebase_admin import firestore
from utils import format_date, get_active_event_id
from ingredients import parse_recipe_ingredients, update_recipe_with_parsed_ingredients
from allergies import render_allergy_warning
from ingredients import get_event_ingredient_list


db = get_db()

def parse_and_store_recipe_from_file(file_text: str, uploaded_by: str) -> str | None:
    """Parse a text file for recipe content and store it"""
    from datetime import datetime
    import re
    import uuid

    # Basic extraction
    lines = file_text.strip().splitlines()
    name = lines[0].strip() if lines else "Unnamed Recipe"
    
    # Rough guesswork parsing for ingredients/instructions
    try:
        ingredients_start = next(i for i, line in enumerate(lines) if "ingredient" in line.lower()
    except StopIteration:
        ingredients_start = 1

    try:
        instructions_start = next(i for i, line in enumerate(lines) if "instruction" in line.lower()
    except StopIteration:
        instructions_start = len(lines) // 2

    ingredients = "\n".join(lines[ingredients_start:instructions_start]).strip()
    instructions = "\n".join(lines[instructions_start:]).strip()

    recipe_data = {
        "id": str(uuid.uuid4(),
        "name": name,
        "ingredients": ingredients,
        "instructions": instructions,
        "notes": "",
        "created_at": datetime.utcnow(),
        "author_id": uploaded_by,
        "author_name": uploaded_by,
        "ingredients_parsed": False,
    }

    try:
        ref = db.collection("recipes").document(recipe_data["id"])
        ref.set(recipe_data)
        return recipe_data["id"]
    except Exception as e:
        print("Error saving recipe:", e)
        return None


# ----------------------------
# 📖 Recipes Tab (Public)
# ----------------------------

def recipes_page():
    st.title("📚 Recipes")

    query_params = st.query_params
    if "recipe_id" in query_params:
        recipe_id = query_params["recipe_id"][0]
        recipe_editor_ui(recipe_id)
        return
    
    # Add tabs for different views
    tab1, tab2, tab3 = st.tabs(["Browse Recipes", "Search by Ingredient", "Recipe Analytics"])
    
    with tab1:
        _browse_recipes_tab()
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

                # Event Mode scoped ingredient list
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

def recipe_editor_ui(recipe_id: str):
    """Edit a recipe's structured metadata"""
    recipe_ref = db.collection("recipes").document(recipe_id)

    try:
        doc = recipe_ref.get()
        if not doc.exists:
            st.error("Recipe not found.")
            return
        recipe = doc.to_dict()
        from lock_utils import is_locked
        locked = is_locked(recipe.get("event_id")

    except Exception as e:
        st.error(f"Error loading recipe: {e}")
        return

    st.title("📝 Edit Recipe")

    name = st.text_input("Recipe Name", recipe.get("name", ""), disabled=locked)
    if locked:
        st.text_input("💡 Suggest a new name", key="suggest_name")

    ingredients = st.text_area("Ingredients (one per line)", recipe.get("ingredients", ""), disabled=locked)
    if locked:
        st.text_area("💡 Suggest updated ingredients", key="suggest_ingredients")
    instructions = st.text_area("Instructions", recipe.get("instructions", ""), disabled=locked)
    if locked:
        st.text_area("💡 Suggest updated instructions", key="suggest_instructions")
    notes = st.text_area("Notes", recipe.get("notes", ""), disabled=locked)
    if locked:
        st.text_area("💡 Suggest updated notes", key="suggest_notes")

    
        # Optional: Edit parsed ingredients if present
    parsed = recipe.get("parsed_ingredients", [])
    if parsed:
        st.markdown("### 🧪 Parsed Ingredients")
        for i, ping in enumerate(parsed):
            col1, col2, col3 = st.columns([2, 1, 3])
            with col1:
                parsed[i]["quantity"] = col1.text_input(f"Qty {i+1}", ping.get("quantity", ""), key=f"qty_{i}")
            with col2:
                parsed[i]["unit"] = col2.text_input(f"Unit {i+1}", ping.get("unit", ""), key=f"unit_{i}")
            with col3:
                parsed[i]["name"] = col3.text_input(f"Name {i+1}", ping.get("name", ""), key=f"name_{i}")


    if st.button("🧪 Re-Parse Ingredients"):
        try:
            parsed = parse_recipe_ingredients(ingredients)
            if parsed:
                recipe_ref.update({
                    "parsed_ingredients": parsed,
                    "ingredients_parsed": True
                })
                st.success("✅ Ingredients re-parsed successfully.")
            else:
                st.warning("⚠️ No ingredients could be parsed.")
        except Exception as e:
            st.error(f"Failed to re-parse ingredients: {e}")
    
    if st.button("💾 Save Changes"):
        try:
            if parsed:
                cleaned = []
                for p in parsed:
                    if p.get("name"):
                        cleaned.append({
                            "name": p.get("name", "").strip(),
                            "quantity": p.get("quantity", "").strip(),
                            "unit": p.get("unit", "").strip(),
                        })
                recipe_ref.update({"parsed_ingredients": cleaned})
    
            recipe_ref.update({
                "name": name,
                "ingredients": ingredients,
                "instructions": instructions,
                "notes": notes,
                "updated_at": datetime.utcnow()
            })
            st.success("✅ Recipe saved successfully.")
        except Exception as e:
            st.error(f"❌ Failed to save recipe: {e}")

        if locked:
            from suggestions import create_suggestion as submit_suggestion
            fields = {
                "name": st.session_state.get("suggest_name"),
                "ingredients": st.session_state.get("suggest_ingredients"),
                "instructions": st.session_state.get("suggest_instructions"),
                "notes": st.session_state.get("suggest_notes"),
            }
            for field, new_value in fields.items():
                if new_value:
                    submit_suggestion(
                        doc_type="recipe",
                        doc_id=recipe_id,
                        field=field,
                        new_value=new_value,
                        event_id=recipe.get("event_id")
                    )
            st.success("💡 Suggestions submitted for review.")


    # Optional: AI-Powered Tag Suggestions
    if recipe.get("ingredients_parsed"):
        from ai_chat import suggest_tags_for_ingredients
        st.markdown("### 🤖 Suggested Tags")

        try:
            suggestions = suggest_tags_for_ingredients(parsed)
            if suggestions:
                selected = st.multiselect("Select suggested tags", suggestions)
                if st.button("➕ Add Selected Tags") and selected:
                    new_tags = list(set(recipe.get("tags", []) + selected)
                    recipe_ref.update({"tags": new_tags})
                    st.success(f"✅ Tags updated: {', '.join(new_tags)}")
        except Exception as e:
            st.warning(f"⚠️ AI tag suggestion failed: {e}")



def _browse_recipes_tab():
    """Browse all recipes"""
    try:
        docs = get_db().collection("recipes").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
        recipes = [doc.to_dict() | {"id": doc.id} for doc in docs]
    except Exception as e:
        st.error(f"Failed to load recipes: {e}")
        return

    if not recipes:
        st.info("No recipes found.")
        return

    # Filter options
    col1, col2, col3 = st.columns(3)
    
    with col1:
        search_term = st.text_input("Search recipes", placeholder="Search by name...")
    
    with col2:
        # Get all unique tags
        all_tags = set()
        for recipe in recipes:
            all_tags.update(recipe.get('tags', [])
        
        selected_tags = st.multiselect("Filter by tags", sorted(all_tags)
    
    with col3:
        show_parsed_only = st.checkbox("Show only parsed recipes")
    
    # Apply filters
    filtered_recipes = recipes
    
    if search_term:
        search_lower = search_term.lower()
        filtered_recipes = [r for r in filtered_recipes if search_lower in r.get('name', '').lower()]
    
    if selected_tags:
        filtered_recipes = [r for r in filtered_recipes if any(tag in r.get('tags', []) for tag in selected_tags)]
    
    if show_parsed_only:
        filtered_recipes = [r for r in filtered_recipes if r.get('ingredients_parsed', False)]
    
    st.markdown(f"### Showing {len(filtered_recipes)} recipes")
    
    for recipe in filtered_recipes:
        with st.container():
            # Recipe header with allergy warning
            col1, col2 = st.columns([4, 1])
            
            with col1:
                st.subheader(recipe.get("name", "Unnamed Recipe")
            
            with col2:
                if recipe.get('ingredients_parsed'):
                    st.success("✅ Parsed")
                else:
                    st.info("📝 Not parsed")
            
            # Check for allergy warnings if in event mode
            active_event_id = get_active_event_id()
            if active_event_id:
                render_allergy_warning(recipe["id"], active_event_id)
            
            st.markdown(f"👨‍🍳 By: *{recipe.get('author_name', 'Unknown')}*")
            st.markdown(f"🕒 Created: {format_date(recipe.get('created_at')}")
            
            # Show parsed ingredients if available
            if recipe.get('ingredients_parsed') and recipe.get('parsed_ingredients'):
                st.markdown("### Ingredients (Parsed)")
                
                # Group by category if possible
                ingredients_by_category = {}
                for ping in recipe.get('parsed_ingredients', []):
                    # Get ingredient details
                    try:
                        ing_doc = get_db().collection("ingredients").document(ping['ingredient_id']).get()
                        if ing_doc.exists:
                            category = ing_doc.to_dict().get('category', 'Other')
                            if category not in ingredients_by_category:
                                ingredients_by_category[category] = []
                            ingredients_by_category[category].append(ping)
                    except:
                        if 'Other' not in ingredients_by_category:
                            ingredients_by_category['Other'] = []
                        ingredients_by_category['Other'].append(ping)
                
                # Display by category
                for category, items in ingredients_by_category.items():
                    st.markdown(f"**{category}:**")
                    for item in items:
                        qty = item.get('quantity', '')
                        unit = item.get('unit', '')
                        name = item.get('name', 'Unknown')
                        
                        # Format the line
                        parts = []
                        if qty:
                            parts.append(qty)
                        if unit:
                            parts.append(unit)
                        parts.append(name)
                        
                        st.write(f"• {' '.join(parts)}")
            else:
                # Show raw ingredients
                st.markdown("### Ingredients")
                st.markdown(recipe.get("ingredients", "—")
            
            st.markdown("### Instructions")
            st.markdown(recipe.get("instructions", "—")

            tags = recipe.get("tags", [])
            if tags:
                st.markdown("**Tags:** " + ", ".join(f"`{tag}`" for tag in tags)

            st.markdown("---")

def _search_by_ingredient_tab():
    """Search recipes by ingredient"""
    from ingredients import search_ingredients, search_recipes_by_ingredient
    
    st.subheader("🔍 Find Recipes by Ingredient")
    
    # Ingredient search
    search_query = st.text_input("Type ingredient name", placeholder="e.g., chicken, tomato, basil...")
    
    if search_query:
        # Search for matching ingredients
        matching_ingredients = search_ingredients(search_query)
        
        if matching_ingredients:
            # Let user select specific ingredient
            selected_ingredient = st.selectbox(
                "Select ingredient",
                options=matching_ingredients,
                format_func=lambda x: f"{x['name']} (used in {x.get('usage_count', 0)} recipes)"
            )
            
            if selected_ingredient and st.button("Search Recipes"):
                # Find recipes with this ingredient
                recipes = search_recipes_by_ingredient(selected_ingredient['id'])
                
                if recipes:
                    st.success(f"Found {len(recipes)} recipes with {selected_ingredient['name']}")
                    
                    for recipe in recipes:
                        with st.expander(f"📖 {recipe.get('name', 'Unnamed Recipe')}"):
                            st.write(f"**Author:** {recipe.get('author_name', 'Unknown')}")
                            st.write(f"**Created:** {format_date(recipe.get('created_at')}")
                            
                            # Show how this ingredient is used
                            if recipe.get('parsed_ingredients'):
                                for ping in recipe.get('parsed_ingredients', []):
                                    if ping.get('ingredient_id') == selected_ingredient['id']:
                                        st.info(f"Uses: {ping.get('original', 'Unknown amount')}")
                            
                            # Show tags
                            tags = recipe.get('tags', [])
                            if tags:
                                st.write("**Tags:** " + ", ".join(f"`{tag}`" for tag in tags)
                else:
                    st.info(f"No recipes found with {selected_ingredient['name']}")
        else:
            st.info("No matching ingredients found. Try a different search term.")

def _recipe_analytics_tab():
    """Show recipe analytics"""
    st.subheader("📊 Recipe Analytics")
    
    try:
        # Get all recipes
        recipes = [doc.to_dict() for doc in get_db().collection("recipes").stream()]
        
        if not recipes:
            st.info("No recipes to analyze")
            return
        
        # Calculate metrics
        total_recipes = len(recipes)
        parsed_recipes = len([r for r in recipes if r.get('ingredients_parsed', False)])
        
        # Get all ingredients
        all_ingredients = get_db().collection("ingredients").stream()
        ingredients_list = [doc.to_dict() for doc in all_ingredients]
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Recipes", total_recipes)
        
        with col2:
            st.metric("Parsed Recipes", f"{parsed_recipes}/{total_recipes}")
            if total_recipes > 0:
                st.progress(parsed_recipes / total_recipes)
        
        with col3:
            st.metric("Unique Ingredients", len(ingredients_list)
        
        with col4:
            # Average ingredients per recipe
            avg_ingredients = sum(len(r.get('ingredient_ids', []) for r in recipes) / total_recipes if total_recipes > 0 else 0
            st.metric("Avg Ingredients/Recipe", f"{avg_ingredients:.1f}")
        
        # Most used ingredients
        st.markdown("### 🥕 Most Used Ingredients")
        
        # Get top ingredients by usage count
        top_ingredients = sorted(ingredients_list, key=lambda x: x.get('usage_count', 0), reverse=True)[:10]
        
        if top_ingredients:
            for i, ingredient in enumerate(top_ingredients):
                col1, col2, col3 = st.columns([3, 1, 1])
                
                with col1:
                    st.write(f"{i+1}. **{ingredient.get('name', 'Unknown')}**")
                
                with col2:
                    st.write(f"Used {ingredient.get('usage_count', 0)}x")
                
                with col3:
                    st.caption(ingredient.get('category', 'Other')
        
        # Tag distribution
        st.markdown("### 🏷️ Popular Tags")
        
        tag_counts = {}
        for recipe in recipes:
            for tag in recipe.get('tags', []):
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        if tag_counts:
            sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]
            
            for tag, count in sorted_tags:
                col1, col2 = st.columns([3, 1])
                
                with col1:
                    st.write(f"• **{tag}**")
                
                with col2:
                    st.write(f"{count} recipes")
        
    except Exception as e:
        st.error(f"Could not load analytics: {e}")
