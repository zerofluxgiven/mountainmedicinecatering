# allergies.py

import streamlit as st
from firebase_admin import firestore
from utils import generate_id, format_date, get_active_event_id, get_event_by_id
from auth import require_login, get_user_role
from datetime import datetime
from typing import List, Dict, Optional
import re

db = firestore.client()

# ----------------------------
# 🚨 Allergy Management
# ----------------------------

def add_allergy_to_event(event_id: str, allergy_data: Dict) -> bool:
    """Add an allergy entry to an event"""
    try:
        allergy_id = generate_id("allergy")
        allergy_data['id'] = allergy_id
        allergy_data['created_at'] = datetime.utcnow()
        
        # Add to event's allergies subcollection
        db.collection("events").document(event_id).collection("allergies").document(allergy_id).set(allergy_data)
        
        # Update ingredient allergen info
        for ingredient_id in allergy_data.get('ingredient_ids', []):
            _update_ingredient_allergen_info(ingredient_id, allergy_data['person_name'], allergy_data['allergies'])
        
        return True
        
    except Exception as e:
        st.error(f"Failed to add allergy: {e}")
        return False

def get_event_allergies(event_id: str) -> List[Dict]:
    """Get all allergies for an event"""
    try:
        allergies = db.collection("events").document(event_id).collection("allergies").stream()
        return [doc.to_dict() for doc in allergies]
    except Exception as e:
        st.error(f"Failed to get allergies: {e}")
        return []

def update_allergy(event_id: str, allergy_id: str, updates: Dict) -> bool:
    """Update an allergy entry"""
    try:
        db.collection("events").document(event_id).collection("allergies").document(allergy_id).update(updates)
        return True
    except Exception as e:
        st.error(f"Failed to update allergy: {e}")
        return False

def delete_allergy(event_id: str, allergy_id: str) -> bool:
    """Delete an allergy entry"""
    try:
        # Get allergy data first to remove allergen info from ingredients
        allergy_doc = db.collection("events").document(event_id).collection("allergies").document(allergy_id).get()
        if allergy_doc.exists:
            allergy_data = allergy_doc.to_dict()
            person_name = allergy_data.get('person_name')
            
            # Remove allergen info from ingredients
            for ingredient_id in allergy_data.get('ingredient_ids', []):
                _remove_ingredient_allergen_info(ingredient_id, person_name)
        
        # Delete the allergy
        db.collection("events").document(event_id).collection("allergies").document(allergy_id).delete()
        return True
        
    except Exception as e:
        st.error(f"Failed to delete allergy: {e}")
        return False

def _update_ingredient_allergen_info(ingredient_id: str, person_name: str, allergies: List[str]):
    """Update ingredient with allergen information"""
    try:
        ingredient_ref = db.collection("ingredients").document(ingredient_id)
        ingredient_doc = ingredient_ref.get()
        
        if ingredient_doc.exists:
            current_allergen_info = ingredient_doc.to_dict().get('allergen_info', {})
            current_allergen_info[person_name] = allergies
            ingredient_ref.update({'allergen_info': current_allergen_info})
            
    except Exception as e:
        print(f"Failed to update ingredient allergen info: {e}")

def _remove_ingredient_allergen_info(ingredient_id: str, person_name: str):
    """Remove allergen information from ingredient"""
    try:
        ingredient_ref = db.collection("ingredients").document(ingredient_id)
        ingredient_doc = ingredient_ref.get()
        
        if ingredient_doc.exists:
            current_allergen_info = ingredient_doc.to_dict().get('allergen_info', {})
            if person_name in current_allergen_info:
                del current_allergen_info[person_name]
                ingredient_ref.update({'allergen_info': current_allergen_info})
                
    except Exception as e:
        print(f"Failed to remove ingredient allergen info: {e}")

# ----------------------------
# 🔍 Allergy Checking
# ----------------------------

def check_recipe_for_allergies(recipe_id: str, event_id: str) -> Dict[str, List[Dict]]:
    """Check if a recipe contains any allergens for the event"""
    try:
        # Get recipe
        recipe_doc = db.collection("recipes").document(recipe_id).get()
        if not recipe_doc.exists:
            return {}
        
        recipe = recipe_doc.to_dict()
        recipe_ingredient_ids = recipe.get('ingredient_ids', [])
        
        # Get event allergies
        allergies = get_event_allergies(event_id)
        
        # Check for conflicts
        conflicts = {}
        
        for allergy in allergies:
            person = allergy.get('person_name')
            allergen_ids = allergy.get('ingredient_ids', [])
            allergen_tags = allergy.get('tags', [])
            
            # Check ingredient matches
            matching_ingredients = set(recipe_ingredient_ids) & set(allergen_ids)
            
            # Check tag matches
            recipe_tags = recipe.get('tags', [])
            matching_tags = set(recipe_tags) & set(allergen_tags)
            
            if matching_ingredients or matching_tags:
                conflicts[person] = {
                    'ingredients': list(matching_ingredients),
                    'tags': list(matching_tags),
                    'allergies': allergy.get('allergies', [])
                }
        
        return conflicts
        
    except Exception as e:
        st.error(f"Failed to check allergies: {e}")
        return {}

def get_safe_recipes_for_event(event_id: str) -> List[Dict]:
    """Get all recipes that are safe for all attendees"""
    try:
        # Get all event allergies
        allergies = get_event_allergies(event_id)
        
        # Collect all allergen ingredients and tags
        allergen_ingredients = set()
        allergen_tags = set()
        
        for allergy in allergies:
            allergen_ingredients.update(allergy.get('ingredient_ids', []))
            allergen_tags.update(allergy.get('tags', []))
        
        # Get all recipes
        all_recipes = db.collection("recipes").stream()
        safe_recipes = []
        
        for doc in all_recipes:
            recipe = doc.to_dict()
            recipe['id'] = doc.id
            
            # Check if recipe is safe
            recipe_ingredients = set(recipe.get('ingredient_ids', []))
            recipe_tags = set(recipe.get('tags', []))
            
            if not (recipe_ingredients & allergen_ingredients) and not (recipe_tags & allergen_tags):
                safe_recipes.append(recipe)
        
        return safe_recipes
        
    except Exception as e:
        st.error(f"Failed to get safe recipes: {e}")
        return []

# ----------------------------
# 🎨 Allergy Management UI
# ----------------------------

@require_login
def allergy_management_ui(user: dict):
    """Main allergy management interface"""
    st.title("🚨 Allergy Management")
    
    # Check for active event
    active_event_id = get_active_event_id()
    if not active_event_id:
        st.warning("Please activate an event to manage allergies")
        return
    
    event = get_event_by_id(active_event_id)
    if not event:
        st.error("Active event not found")
        return
    
    st.info(f"Managing allergies for: **{event.get('name', 'Unknown Event')}**")
    
    tab1, tab2, tab3 = st.tabs(["View Allergies", "Add Allergy", "Check Recipes"])
    
    with tab1:
        _view_allergies_tab(active_event_id)
    
    with tab2:
        _add_allergy_tab(active_event_id, user)
    
    with tab3:
        _check_recipes_tab(active_event_id)

def _view_allergies_tab(event_id: str):
    """View and manage existing allergies"""
    st.subheader("📋 Current Allergies")
    
    allergies = get_event_allergies(event_id)
    
    if not allergies:
        st.info("No allergies recorded for this event")
        return
    
    st.markdown(f"### {len(allergies)} people with allergies")
    
    for allergy in allergies:
        with st.expander(f"🧑 {allergy.get('person_name', 'Unknown')} - {len(allergy.get('allergies', []))} allergies"):
            # Person details
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("**Allergies:**")
                for a in allergy.get('allergies', []):
                    st.write(f"• {a}")
                
                st.markdown("**Severity:** " + allergy.get('severity', 'Unknown'))
            
            with col2:
                st.markdown("**Notes:**")
                st.write(allergy.get('notes', 'No notes'))
            
            # Allergen details
            st.markdown("---")
            
            # Show flagged ingredients
            ingredient_ids = allergy.get('ingredient_ids', [])
            if ingredient_ids:
                st.markdown("**⚠️ Flagged Ingredients:**")
                
                # Get ingredient names
                for ing_id in ingredient_ids[:10]:  # Show first 10
                    try:
                        ing_doc = db.collection("ingredients").document(ing_id).get()
                        if ing_doc.exists:
                            ing_name = ing_doc.to_dict().get('name', 'Unknown')
                            st.write(f"• {ing_name}")
                    except:
                        pass
                
                if len(ingredient_ids) > 10:
                    st.write(f"... and {len(ingredient_ids) - 10} more")
            
            # Show flagged tags
            tags = allergy.get('tags', [])
            if tags:
                st.markdown("**🏷️ Flagged Tags:**")
                tag_html = " ".join([f"<span class='tag'>{tag}</span>" for tag in tags])
                st.markdown(tag_html, unsafe_allow_html=True)
            
            # Action buttons
            st.markdown("---")
            col1, col2 = st.columns(2)
            
            with col1:
                if st.button("Edit", key=f"edit_{allergy['id']}"):
                    st.session_state[f"editing_allergy_{allergy['id']}"] = True
                    st.rerun()
            
            with col2:
                if st.button("Delete", key=f"delete_{allergy['id']}"):
                    if delete_allergy(event_id, allergy['id']):
                        st.success("Allergy deleted")
                        st.rerun()

def _add_allergy_tab(event_id: str, user: dict):
    """Add new allergy"""
    st.subheader("➕ Add New Allergy")
    
    with st.form("add_allergy_form"):
        # Person details
        col1, col2 = st.columns(2)
        
        with col1:
            person_name = st.text_input("Person's Name *", placeholder="e.g., John Smith")
            severity = st.selectbox("Severity *", ["Mild", "Moderate", "Severe", "Life-threatening"])
        
        with col2:
            allergies = st.text_area("Allergies (one per line) *", 
                                   placeholder="e.g.,\nPeanuts\nShellfish\nGluten",
                                   height=100)
        
        notes = st.text_area("Additional Notes", 
                           placeholder="e.g., Carries EpiPen, can tolerate small amounts of dairy")
        
        st.markdown("### 🔍 Flag Allergens")
        st.caption("Select ingredients and tags that should trigger allergy warnings")
        
        # Ingredient search
        st.markdown("**Search Ingredients to Flag:**")
        ingredient_search = st.text_input("Type ingredient names (comma-separated)", 
                                        placeholder="e.g., peanut, shrimp, wheat")
        
        # Tag selection
        st.markdown("**Select Tags to Flag:**")
        
        # Get common allergy-related tags
        common_allergy_tags = ["gluten-free", "dairy-free", "nut-free", "vegan", "vegetarian", 
                              "shellfish", "eggs", "soy", "wheat", "peanuts"]
        
        selected_tags = st.multiselect("Tags", common_allergy_tags)
        
        # Additional tags
        additional_tags = st.text_input("Additional tags (comma-separated)", 
                                      placeholder="e.g., sesame, tree nuts")
        
        submitted = st.form_submit_button("Add Allergy", type="primary")
        
        if submitted:
            if not person_name or not allergies:
                st.error("Please fill in all required fields")
            else:
                # Parse allergies
                allergy_list = [a.strip() for a in allergies.split('\n') if a.strip()]
                
                # Parse ingredients
                ingredient_ids = []
                if ingredient_search:
                    from ingredients import search_ingredients
                    
                    search_terms = [term.strip() for term in ingredient_search.split(',') if term.strip()]
                    for term in search_terms:
                        results = search_ingredients(term)
                        if results:
                            # Add the first match
                            ingredient_ids.append(results[0]['id'])
                
                # Combine tags
                all_tags = selected_tags.copy()
                if additional_tags:
                    all_tags.extend([t.strip() for t in additional_tags.split(',') if t.strip()])
                
                # Create allergy data
                allergy_data = {
                    'person_name': person_name,
                    'allergies': allergy_list,
                    'severity': severity,
                    'notes': notes,
                    'ingredient_ids': ingredient_ids,
                    'tags': all_tags,
                    'created_by': user['id']
                }
                
                if add_allergy_to_event(event_id, allergy_data):
                    st.success(f"✅ Added allergy information for {person_name}")
                    st.rerun()

def _check_recipes_tab(event_id: str):
    """Check recipes for allergens"""
    st.subheader("🔍 Check Recipes for Allergens")
    
    # Get event allergies
    allergies = get_event_allergies(event_id)
    
    if not allergies:
        st.info("No allergies recorded. Add allergies first to check recipes.")
        return
    
    # Show allergy summary
    st.markdown("### Active Allergies")
    allergy_summary = []
    for allergy in allergies:
        person = allergy.get('person_name')
        allergens = ", ".join(allergy.get('allergies', []))
        allergy_summary.append(f"**{person}:** {allergens}")
    
    st.write(" | ".join(allergy_summary))
    st.markdown("---")
    
    # Recipe checker
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("🟢 Show Safe Recipes", use_container_width=True):
            with st.spinner("Finding safe recipes..."):
                safe_recipes = get_safe_recipes_for_event(event_id)
                
                if safe_recipes:
                    st.success(f"Found {len(safe_recipes)} safe recipes!")
                    
                    for recipe in safe_recipes[:10]:  # Show first 10
                        st.write(f"✅ {recipe.get('name', 'Unnamed')}")
                    
                    if len(safe_recipes) > 10:
                        st.write(f"... and {len(safe_recipes) - 10} more")
                else:
                    st.warning("No recipes found that are safe for all attendees")
    
    with col2:
        # Get event menu items
        try:
            menu_items = db.collection("menus").where("event_id", "==", event_id).stream()
            menu_list = [doc.to_dict() | {"id": doc.id} for doc in menu_items]
            
            if menu_list:
                if st.button("🔍 Check Current Menu", use_container_width=True):
                    st.markdown("### Menu Allergy Check")
                    
                    conflicts_found = False
                    
                    for menu_item in menu_list:
                        # Check if menu item has associated recipe
                        recipe_id = menu_item.get('recipe_id')
                        if recipe_id:
                            conflicts = check_recipe_for_allergies(recipe_id, event_id)
                            
                            if conflicts:
                                conflicts_found = True
                                st.error(f"⚠️ **{menu_item.get('name', 'Unknown')}** contains allergens!")
                                
                                for person, details in conflicts.items():
                                    allergen_list = ", ".join(details['allergies'])
                                    st.write(f"   → Unsafe for {person} ({allergen_list})")
                            else:
                                st.success(f"✅ {menu_item.get('name', 'Unknown')} - Safe")
                        else:
                            st.warning(f"⚠️ {menu_item.get('name', 'Unknown')} - No recipe linked")
                    
                    if not conflicts_found:
                        st.success("🎉 All menu items are safe for all attendees!")
            else:
                st.info("No menu items found for this event")
                
        except Exception as e:
            st.error(f"Failed to check menu: {e}")

# ----------------------------
# 🏷️ Allergy Warning Component
# ----------------------------

def render_allergy_warning(recipe_id: str, event_id: str = None):
    """Render allergy warning for a recipe"""
    if not event_id:
        event_id = get_active_event_id()
    
    if not event_id:
        return
    
    conflicts = check_recipe_for_allergies(recipe_id, event_id)
    
    if conflicts:
        warning_msg = "⚠️ **ALLERGY WARNING:** "
        warnings = []
        
        for person, details in conflicts.items():
            allergens = ", ".join(details['allergies'])
            warnings.append(f"{person} ({allergens})")
        
        warning_msg += " | ".join(warnings)
        st.error(warning_msg)

# ----------------------------
# 📊 Allergy Analytics
# ----------------------------

def get_allergy_analytics(event_id: str = None) -> Dict:
    """Get analytics about allergies"""
    try:
        if event_id:
            # Event-specific analytics
            allergies = get_event_allergies(event_id)
            
            # Count unique allergens
            all_allergens = []
            for allergy in allergies:
                all_allergens.extend(allergy.get('allergies', []))
            
            allergen_counts = {}
            for allergen in all_allergens:
                allergen_counts[allergen] = allergen_counts.get(allergen, 0) + 1
            
            return {
                'total_people': len(allergies),
                'allergen_counts': allergen_counts,
                'severity_breakdown': _get_severity_breakdown(allergies)
            }
        else:
            # Global analytics across all events
            # This would aggregate data across all events
            return {}
            
    except Exception as e:
        st.error(f"Failed to get analytics: {e}")
        return {}

def _get_severity_breakdown(allergies: List[Dict]) -> Dict[str, int]:
    """Get breakdown by severity"""
    severity_counts = {
        "Mild": 0,
        "Moderate": 0,
        "Severe": 0,
        "Life-threatening": 0
    }
    
    for allergy in allergies:
        severity = allergy.get('severity', 'Unknown')
        if severity in severity_counts:
            severity_counts[severity] += 1
    
    return severity_counts