# ingredients.py

import streamlit as st
from utils import generate_id, format_date
from auth import require_login, get_user_role
from datetime import datetime
from typing import List, Dict, Optional
import re
from google.cloud.firestore_v1.base_query import FieldFilter
from utils import normalize_ingredient



# ----------------------------
# 🥕 Ingredient Management
# ----------------------------

def scale_ingredients(ingredients: list, multiplier: float) -> list:
    """Scale quantities of ingredients by a multiplier (e.g., guest count)"""
    for ing in ingredients:
        try:
            qty = float(ing.get("quantity", "1").split()[0])
            ing["quantity"] = str(round(qty * multiplier, 2))
        except:
            pass  # fallback: skip if not numerical
    return ingredients

def get_event_ingredient_list(event_id: str) -> list:
    """Aggregate and scale ingredients for all recipes in the event's menu"""
    try:
        meta_doc = db.collection("events").document(event_id).collection("meta").document("event_file").get()
        if not meta_doc.exists:
            return []
        meta = meta_doc.to_dict()
        menu_recipes = meta.get("menu", [])

        event_doc = db.collection("events").document(event_id).get()
        guest_count = event_doc.to_dict().get("guest_count", 1)

        all_ingredients = []
        for recipe_entry in menu_recipes:
            recipe_name = recipe_entry.get("recipe")
            if not recipe_name:
                continue

            query = db.collection("recipes").where("name", "==", recipe_name).limit(1).stream()
            recipe_doc = next(query, None)
            if not recipe_doc:
                continue

            recipe_data = recipe_doc.to_dict()
            if recipe_data.get("parsed_ingredients"):
                scaled = scale_ingredients(recipe_data["parsed_ingredients"], guest_count)
                all_ingredients.extend(scaled)
        return all_ingredients
    except Exception as e:
        st.error(f"Could not build event ingredient list: {e}")
        return []



def normalize_ingredient(ingredient: str) -> str:
    """Normalize ingredient name for consistency"""
    # Basic normalization - lowercase, strip whitespace, remove plurals
    normalized = ingredient.lower().strip()
    
    # Simple plural handling
    if normalized.endswith('ies'):
        normalized = normalized[:-3] + 'y'
    elif normalized.endswith('es'):
        normalized = normalized[:-2]
    elif normalized.endswith('s') and not normalized.endswith('ss'):
        normalized = normalized[:-1]
    
    return normalized

def parse_ingredient_line(line: str) -> Dict[str, str]:
    """Parse an ingredient line into quantity, unit, and name"""
    # Common measurement patterns
    quantity_pattern = r'^(\d+(?:\.\d+)?(?:/\d+)?|\d+\s*-\s*\d+)'
    unit_pattern = r'(cups?|tbsp?|tsp?|oz|ounces?|lbs?|pounds?|g|grams?|kg|kilograms?|ml|liters?|gallons?|quarts?|pints?|pieces?|cloves?|bunches?|cans?|packages?|boxes?)'
    
    line = line.strip()
    result = {
        'original': line,
        'quantity': '',
        'unit': '',
        'name': line,
        'normalized_name': ''
    }
    
    # Try to extract quantity
    quantity_match = re.match(quantity_pattern, line)
    if quantity_match:
        result['quantity'] = quantity_match.group(1)
        line = line[len(result['quantity']):].strip()
    
    # Try to extract unit
    unit_match = re.match(unit_pattern, line, re.IGNORECASE)
    if unit_match:
        result['unit'] = unit_match.group(1).lower()
        line = line[len(result['unit']):].strip()
    
    # Clean up the ingredient name
    # Remove common words like "of", "fresh", etc.
    cleanup_words = ['of', 'fresh', 'dried', 'chopped', 'minced', 'sliced', 'diced']
    words = line.split()
    cleaned_words = [w for w in words if w.lower() not in cleanup_words]
    
    result['name'] = ' '.join(cleaned_words) if cleaned_words else line
    result['normalized_name'] = normalize_ingredient(result['name'])
    
    return result

def get_or_create_ingredient(name: str, normalized_name: str = None) -> str:
    """Get existing ingredient or create new one, return ingredient ID"""
    if not normalized_name:
        normalized_name = normalize_ingredient(name)
    
    # Check if ingredient exists
    existing = db.collection("ingredients").where("normalized_name", "==", normalized_name).limit(1).stream()
    existing_list = list(existing)
    
    if existing_list:
        return existing_list[0].id
    
    # Create new ingredient
    ingredient_id = generate_id("ing")
    db.collection("ingredients").document(ingredient_id).set({
        "id": ingredient_id,
        "name": name.title(),
        "normalized_name": normalized_name,
        "category": categorize_ingredient(name),
        "created_at": datetime.utcnow(),
        "usage_count": 0,
        "common_units": [],
        "substitutes": [],
        "allergen_info": {}
    })
    
    return ingredient_id

def categorize_ingredient(ingredient_name: str) -> str:
    """Auto-categorize ingredient based on name"""
    name_lower = ingredient_name.lower()
    
    # Category mappings
    categories = {
        "Proteins": ["chicken", "beef", "pork", "fish", "salmon", "tuna", "shrimp", "tofu", "egg", "turkey", "lamb"],
        "Dairy": ["milk", "cheese", "yogurt", "butter", "cream", "sour cream", "cottage cheese", "mozzarella"],
        "Vegetables": ["carrot", "celery", "onion", "garlic", "tomato", "pepper", "broccoli", "spinach", "lettuce", "potato"],
        "Fruits": ["apple", "banana", "orange", "lemon", "lime", "berry", "strawberry", "grape", "peach", "mango"],
        "Grains": ["rice", "pasta", "bread", "flour", "oats", "quinoa", "barley", "wheat", "cereal"],
        "Herbs & Spices": ["salt", "pepper", "basil", "oregano", "thyme", "rosemary", "paprika", "cumin", "cinnamon"],
        "Oils & Fats": ["oil", "olive oil", "butter", "margarine", "shortening", "lard"],
        "Condiments": ["sauce", "ketchup", "mustard", "mayo", "vinegar", "dressing", "salsa"],
        "Baking": ["sugar", "flour", "baking powder", "baking soda", "yeast", "vanilla", "cocoa"],
        "Beverages": ["water", "juice", "coffee", "tea", "soda", "wine", "beer", "broth", "stock"]
    }
    
    for category, keywords in categories.items():
        if any(keyword in name_lower for keyword in keywords):
            return category
    
    return "Other"

# ----------------------------
# 🍳 Recipe Parsing
# ----------------------------

def parse_recipe_ingredients(ingredients_text: str) -> List[Dict]:
    """Parse a recipe's ingredients text into structured data"""
    lines = ingredients_text.strip().split('\n')
    parsed_ingredients = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Skip section headers (e.g., "For the sauce:")
        if line.endswith(':') or line.startswith('#'):
            continue
        
        parsed = parse_ingredient_line(line)
        
        # Get or create ingredient in database
        ingredient_id = get_or_create_ingredient(parsed['name'], parsed['normalized_name'])
        
        parsed['ingredient_id'] = ingredient_id
        parsed_ingredients.append(parsed)
    
    return parsed_ingredients

def update_recipe_with_parsed_ingredients(recipe_id: str, parsed_ingredients: List[Dict]):
    """Update a recipe with parsed ingredient data"""
    try:
        # Get unique ingredient IDs
        ingredient_ids = list(set(ing['ingredient_id'] for ing in parsed_ingredients))
        
        # Update recipe
        db.collection("recipes").document(recipe_id).update({
            "parsed_ingredients": parsed_ingredients,
            "ingredient_ids": ingredient_ids,
            "ingredients_parsed": True,
            "parsed_at": datetime.utcnow()
        })
        
        # Update ingredient usage counts
        for ing_id in ingredient_ids:
            db.collection("ingredients").document(ing_id).update({
                "usage_count": firestore.Increment(1)
            })
        
        return True
        
    except Exception as e:
        st.error(f"Failed to update recipe: {e}")
        return False

# ----------------------------
# 🔍 Ingredient Search
# ----------------------------

def search_recipes_by_ingredient(ingredient_id: str) -> List[Dict]:
    """Find all recipes containing a specific ingredient"""
    try:
        recipes = db.collection("recipes").where("ingredient_ids", "array_contains", ingredient_id).stream()
        return [doc.to_dict() | {"id": doc.id} for doc in recipes]
    except Exception as e:
        st.error(f"Failed to search recipes: {e}")
        return []

def search_ingredients(query: str) -> List[Dict]:
    """Search ingredients by name"""
    query_lower = query.lower()
    try:
        # Get all ingredients (in a real app, you'd want to use a proper search index)
        all_ingredients = db.collection("ingredients").stream()
        results = []
        
        for doc in all_ingredients:
            ing = doc.to_dict()
            if query_lower in ing.get('name', '').lower() or query_lower in ing.get('normalized_name', ''):
                results.append(ing)
        
        return sorted(results, key=lambda x: x.get('usage_count', 0), reverse=True)
        
    except Exception as e:
        st.error(f"Failed to search ingredients: {e}")
        return []

# ----------------------------
# 🎨 Ingredient Catalogue UI
# ----------------------------


def ingredient_catalogue_ui(user: dict):
    """Main ingredient catalogue interface"""
    st.title("🥕 Ingredient Catalogue")
    
    tab1, tab2, tab3 = st.tabs(["Browse Ingredients", "Recipe Search", "Parse Recipes"])
    
    with tab1:
        _browse_ingredients_tab()
    
    with tab2:
        _ingredient_search_tab()
    
    with tab3:
        _parse_recipes_tab(user)

def _browse_ingredients_tab():
    """Browse and manage ingredients"""
    st.subheader("📚 Browse Ingredients")
    
    # Search box
    search_query = st.text_input("Search ingredients", placeholder="Type to search...")
    
    # Category filter
    categories = ["All", "Proteins", "Dairy", "Vegetables", "Fruits", "Grains", 
                 "Herbs & Spices", "Oils & Fats", "Condiments", "Baking", "Beverages", "Other"]
    selected_category = st.selectbox("Filter by category", categories)
    
    # Get ingredients
    try:
        if selected_category == "All":
            query = db.collection("ingredients").order_by("usage_count", direction=firestore.Query.DESCENDING)
        else:
            query = db.collection("ingredients").where(filter=FieldFilter("category", "==", selected_category))
        
        ingredients = [doc.to_dict() for doc in query.stream()]
        
        # Apply search filter
        if search_query:
            search_lower = search_query.lower()
            ingredients = [ing for ing in ingredients if 
                          search_lower in ing.get('name', '').lower() or 
                          search_lower in ing.get('normalized_name', '')]
        
        if not ingredients:
            st.info("No ingredients found.")
            return
        
        # Display ingredients
        st.markdown(f"### Found {len(ingredients)} ingredients")
        
        # Create a grid layout
        cols = st.columns(3)
        for i, ingredient in enumerate(ingredients):
            with cols[i % 3]:
                with st.container():
                    st.markdown(f"**{ingredient.get('name', 'Unknown')}**")
                    st.caption(f"Category: {ingredient.get('category', 'Other')}")
                    st.caption(f"Used in {ingredient.get('usage_count', 0)} recipes")
                    
                    # Check for allergen warnings
                    allergen_info = ingredient.get('allergen_info', {})
                    if allergen_info:
                        allergen_count = len(allergen_info)
                        st.warning(f"⚠️ {allergen_count} allergen warning(s)")
                    
                    if st.button("View Details", key=f"view_{ingredient['id']}"):
                        _show_ingredient_details(ingredient)
        
    except Exception as e:
        st.error(f"Failed to load ingredients: {e}")

def _ingredient_search_tab():
    """Search recipes by ingredient"""
    st.subheader("🔍 Search Recipes by Ingredient")
    
    # Ingredient selector
    ingredient_search = st.text_input("Type ingredient name", placeholder="e.g., chicken, tomato...")
    
    if ingredient_search:
        # Search ingredients
        matching_ingredients = search_ingredients(ingredient_search)
        
        if matching_ingredients:
            # Let user select specific ingredient
            selected_ingredient = st.selectbox(
                "Select ingredient",
                options=matching_ingredients,
                format_func=lambda x: f"{x['name']} ({x['usage_count']} recipes)"
            )
            
            if selected_ingredient and st.button("Search Recipes"):
                # Find recipes with this ingredient
                recipes = search_recipes_by_ingredient(selected_ingredient['id'])
                
                if recipes:
                    st.success(f"Found {len(recipes)} recipes with {selected_ingredient['name']}")
                    
                    for recipe in recipes:
                        with st.expander(f"📖 {recipe.get('name', 'Unnamed Recipe')}"):
                            st.write(f"**Author:** {recipe.get('author_name', 'Unknown')}")
                            st.write(f"**Created:** {format_date(recipe.get('created_at'))}")
                            
                            # Show how this ingredient is used
                            parsed_ings = recipe.get('parsed_ingredients', [])
                            for ping in parsed_ings:
                                if ping.get('ingredient_id') == selected_ingredient['id']:
                                    st.info(f"Uses: {ping.get('original', 'Unknown amount')}")
                            
                            # Recipe actions
                            col1, col2 = st.columns(2)
                            with col1:
                                if st.button("View Recipe", key=f"view_recipe_{recipe['id']}"):
                                    st.session_state["selected_recipe"] = recipe['id']
                                    st.session_state["top_nav"] = "Recipes"
                                    st.rerun()
                else:
                    st.info(f"No recipes found with {selected_ingredient['name']}")
        else:
            st.info("No matching ingredients found")

def _parse_recipes_tab(user: dict):
    """Parse ingredients from existing recipes"""
    st.subheader("🔧 Parse Recipe Ingredients")
    st.caption("Extract structured ingredient data from recipe text")
    
    role = get_user_role(user)
    if role not in ["admin", "manager"]:
        st.warning("Only managers and admins can parse recipes")
        return
    
    # Get unparsed recipes
    try:
        unparsed = db.collection("recipes").where("ingredients_parsed", "==", False).stream()
        unparsed_recipes = [doc.to_dict() | {"id": doc.id} for doc in unparsed]
        
        # Also get recipes without the field
        all_recipes = db.collection("recipes").stream()
        for doc in all_recipes:
            recipe = doc.to_dict()
            if "ingredients_parsed" not in recipe:
                recipe["id"] = doc.id
                unparsed_recipes.append(recipe)
        
        if not unparsed_recipes:
            st.success("✅ All recipes have been parsed!")
            
            # Option to re-parse
            if st.checkbox("Show all recipes for re-parsing"):
                all_recipes = db.collection("recipes").stream()
                unparsed_recipes = [doc.to_dict() | {"id": doc.id} for doc in all_recipes]
        
        if unparsed_recipes:
            st.info(f"Found {len(unparsed_recipes)} recipes to parse")
            
            # Select recipe to parse
            selected_recipe = st.selectbox(
                "Select recipe to parse",
                options=unparsed_recipes,
                format_func=lambda x: x.get('name', 'Unnamed Recipe')
            )
            
            if selected_recipe:
                st.markdown(f"### {selected_recipe.get('name', 'Unnamed')}")
                
                # Show current ingredients text
                ingredients_text = selected_recipe.get('ingredients', '')
                st.markdown("**Current ingredients text:**")
                st.text_area("", value=ingredients_text, height=200, disabled=True)
                
                if st.button("🔍 Parse Ingredients", type="primary"):
                    with st.spinner("Parsing ingredients..."):
                        # Parse the ingredients
                        parsed = parse_recipe_ingredients(ingredients_text)
                        
                        if parsed:
                            st.success(f"✅ Parsed {len(parsed)} ingredients!")
                            
                            # Show parsed results
                            st.markdown("**Parsed ingredients:**")
                            for ping in parsed:
                                cols = st.columns([1, 1, 2, 2])
                                with cols[0]:
                                    st.write(ping.get('quantity', '-'))
                                with cols[1]:
                                    st.write(ping.get('unit', '-'))
                                with cols[2]:
                                    st.write(ping.get('name', '-'))
                                with cols[3]:
                                    st.caption(f"→ {ping.get('normalized_name', '-')}")
                            
                            # Save button
                            if st.button("💾 Save Parsed Data"):
                                if update_recipe_with_parsed_ingredients(selected_recipe['id'], parsed):
                                    st.success("✅ Recipe updated with parsed ingredients!")
                                    st.rerun()
                        else:
                            st.warning("No ingredients could be parsed")
        
    except Exception as e:
        st.error(f"Failed to load recipes: {e}")

def _show_ingredient_details(ingredient: Dict):
    """Show detailed ingredient information in sidebar"""
    with st.sidebar:
        st.markdown(f"## {ingredient.get('name', 'Unknown')}")
        
        # Basic info
        st.markdown("### Basic Information")
        st.write(f"**Category:** {ingredient.get('category', 'Other')}")
        st.write(f"**Usage Count:** {ingredient.get('usage_count', 0)} recipes")
        st.write(f"**Common Units:** {', '.join(ingredient.get('common_units', [])) or 'None recorded'}")
        
        # Allergen information
        allergen_info = ingredient.get('allergen_info', {})
        if allergen_info:
            st.markdown("### ⚠️ Allergen Warnings")
            for person, allergies in allergen_info.items():
                st.warning(f"**{person}:** {', '.join(allergies)}")
        
        # Substitutes
        substitutes = ingredient.get('substitutes', [])
        if substitutes:
            st.markdown("### 🔄 Common Substitutes")
            for sub in substitutes:
                st.write(f"• {sub}")
        
        # Add substitute
        st.markdown("### Add Information")
        
        new_substitute = st.text_input("Add substitute")
        if st.button("Add Substitute") and new_substitute:
            try:
                current_subs = ingredient.get('substitutes', [])
                current_subs.append(new_substitute)
                db.collection("ingredients").document(ingredient['id']).update({
                    'substitutes': current_subs
                })
                st.success("Substitute added!")
                st.rerun()
            except Exception as e:
                st.error(f"Failed to add substitute: {e}")

# ----------------------------
# 🔄 Migration Functions
# ----------------------------

def migrate_existing_recipes():
    """One-time migration to parse all existing recipes"""
    try:
        recipes = db.collection("recipes").stream()
        count = 0
        
        for doc in recipes:
            recipe = doc.to_dict()
            if not recipe.get('ingredients_parsed'):
                ingredients_text = recipe.get('ingredients', '')
                if ingredients_text:
                    parsed = parse_recipe_ingredients(ingredients_text)
                    if parsed:
                        update_recipe_with_parsed_ingredients(doc.id, parsed)
                        count += 1
        
        return count
        
    except Exception as e:
        st.error(f"Migration failed: {e}")
        return 0

# ----------------------------
# 📊 Analytics Functions
# ----------------------------

def get_ingredient_analytics():
    """Get analytics about ingredient usage"""
    try:
        # Most used ingredients
        top_ingredients = db.collection("ingredients").order_by("usage_count", direction=firestore.Query.DESCENDING).limit(10).stream()
        
        # Category distribution
        all_ingredients = db.collection("ingredients").stream()
        category_counts = {}
        
        for doc in all_ingredients:
            ing = doc.to_dict()
            category = ing.get('category', 'Other')
            category_counts[category] = category_counts.get(category, 0) + 1
        
        return {
            'top_ingredients': [doc.to_dict() for doc in top_ingredients],
            'category_distribution': category_counts
        }
        
    except Exception as e:
        st.error(f"Failed to get analytics: {e}")
        return None
