import streamlit as st
import uuid
from firebase_init import get_db, get_bucket
from firebase_admin import firestore
from datetime import datetime
from utils import format_date, get_active_event_id, value_to_text, generate_id, delete_button
from auth import get_user
from mobile_helpers import safe_file_uploader
from ingredients import (
    parse_recipe_ingredients,
    update_recipe_with_parsed_ingredients,
    get_event_ingredient_list,
    search_ingredients,
    search_recipes_by_ingredient,
)
from allergies import render_allergy_warning

db = get_db()
bucket = get_bucket()


def merge_recipe_data(existing_data, new_data):
    """Merge data from second page into existing recipe data."""
    merged = existing_data.copy()
    
    # Merge ingredients - append new ones
    existing_ingredients = existing_data.get("ingredients", [])
    new_ingredients = new_data.get("ingredients", [])
    
    if isinstance(existing_ingredients, str):
        existing_ingredients = [existing_ingredients]
    if isinstance(new_ingredients, str):
        new_ingredients = [new_ingredients]
    
    # Combine ingredients
    if new_ingredients:
        if existing_ingredients:
            merged["ingredients"] = existing_ingredients + new_ingredients
        else:
            merged["ingredients"] = new_ingredients
    
    # Merge instructions - append new ones
    existing_instructions = existing_data.get("instructions", [])
    new_instructions = new_data.get("instructions", [])
    
    if isinstance(existing_instructions, str):
        existing_instructions = [existing_instructions]
    if isinstance(new_instructions, str):
        new_instructions = [new_instructions]
    
    # Combine instructions
    if new_instructions:
        if existing_instructions:
            merged["instructions"] = existing_instructions + new_instructions
        else:
            merged["instructions"] = new_instructions
    
    # Merge other fields - prefer existing unless empty
    for field in ["notes", "tags", "allergens"]:
        if field in new_data and new_data[field]:
            if field == "tags" or field == "allergens":
                # Combine lists
                existing = merged.get(field, [])
                new = new_data.get(field, [])
                merged[field] = list(set(existing + new))
            else:
                # Append text
                existing = merged.get(field, "")
                new = new_data.get(field, "")
                if existing and new:
                    merged[field] = f"{existing}\n{new}"
                elif new:
                    merged[field] = new
    
    # Keep original name and serves
    if "name" not in merged or not merged["name"]:
        merged["name"] = new_data.get("name", "Unnamed Recipe")
    
    return merged


def find_recipe_by_name(name: str):
    """Return existing recipe with the same name if any."""
    try:
        query = (
            db.collection("recipes")
            .where("name", "==", name.strip())
            .limit(1)
            .stream()
        )
        for doc in query:
            return doc.to_dict() | {"id": doc.id}
    except Exception as e:
        print(f"Duplicate lookup failed: {e}")
    return None


def render_ingredient_columns(items):
    if not isinstance(items, list):
        items = [i.strip() for i in str(items).splitlines() if i.strip()]
    cols = st.columns(2)
    for idx, item in enumerate(items):
        col = cols[idx % 2]
        col.markdown(f"- {item}")

# ----------------------------
# 🔄 Parse and Store Recipe From File
# ----------------------------

def parse_and_store_recipe_from_file(file_text: str, uploaded_by: str) -> str | None:
    import uuid

    lines = file_text.strip().splitlines()
    name = lines[0].strip() if lines else "Unnamed Recipe"

    try:
        ingredients_start = next(i for i, line in enumerate(lines) if "ingredient" in line.lower())
    except StopIteration:
        ingredients_start = 1

    try:
        instructions_start = next(i for i, line in enumerate(lines) if "instruction" in line.lower())
    except StopIteration:
        instructions_start = len(lines) // 2

    ingredients = "\n".join(lines[ingredients_start:instructions_start]).strip()
    instructions = "\n".join(lines[instructions_start:]).strip()
    ingredients = value_to_text(ingredients)
    instructions = value_to_text(instructions)

    recipe_data = {
        "id": str(uuid.uuid4()),
        "name": name,
        "ingredients": ingredients,
        "instructions": instructions,
        "notes": "",
        "special_version": "",
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
# 🧪 Firestore Save Utilities
# ----------------------------

def save_recipe_to_firestore(recipe_data, user_id=None, file_id=None):
    recipe_id = str(uuid.uuid4())
    
    # Handle serves/servings field naming
    serves = recipe_data.get("serves") or recipe_data.get("servings", 4)
    
    doc = {
        "id": recipe_id,
        "name": recipe_data.get("title") or recipe_data.get("name", "Untitled"),
        "ingredients": value_to_text(recipe_data.get("ingredients", [])),
        "instructions": value_to_text(recipe_data.get("instructions", [])),
        "special_version": recipe_data.get("special_version", ""),
        "image_url": recipe_data.get("image_url"),
        "tags": recipe_data.get("tags", []),
        "serves": serves,  # Add serves field
        "allergens": recipe_data.get("allergens", []),  # Add allergens field
        "ingredients_parsed": bool(recipe_data.get("ingredients")),  # Track if ingredients exist
        "created_by": user_id,
        "created_at": datetime.utcnow(),  # Add timestamp
        "source_file_id": file_id,
    }
    db.collection("recipes").document(recipe_id).set(doc)
    return recipe_id

def save_event_to_firestore(event_data, user_id=None, file_id=None):
    event_id = str(uuid.uuid4())
    doc = {
        "id": event_id,
        "name": event_data.get("title", "Untitled Event"),
        "date": event_data.get("date"),
        "location": event_data.get("location"),
        "notes": event_data.get("notes", ""),
        "tags": event_data.get("tags", []),
        "created_by": user_id,
        "source_file_id": file_id,
    }
    db.collection("events").document(event_id).set(doc)
    return event_id

def save_menu_to_firestore(menu_data, user_id=None, file_id=None):
    menu_id = str(uuid.uuid4())
    doc = {
        "id": menu_id,
        "title": menu_data.get("title", "Untitled Menu"),
        "meals": menu_data.get("meals", []),
        "tags": menu_data.get("tags", []),
        "created_by": user_id,
        "source_file_id": file_id,
    }
    db.collection("menus").document(menu_id).set(doc)
    return menu_id

def save_ingredient_to_firestore(ingredient_data, user_id=None, file_id=None):
    ing_id = str(uuid.uuid4())
    doc = {
        "id": ing_id,
        "name": ingredient_data.get("name", "Unnamed Ingredient"),
        "unit": ingredient_data.get("unit", ""),
        "category": ingredient_data.get("category", ""),
        "notes": ingredient_data.get("notes", ""),
        "tags": ingredient_data.get("tags", []),
        "created_by": user_id,
        "source_file_id": file_id,
    }
    db.collection("ingredients").document(ing_id).set(doc)
    return ing_id


# ----------------------------
# 🌐 Add Recipe via Link UI
# ----------------------------

def add_recipe_via_link_ui():
    """Allow users to paste a link and create a recipe."""

    # Clear form fields on rerun if requested
    if st.session_state.get("clear_link_recipe_form"):
        for key in [
            "recipe_link_input",
            "link_recipe_title",
            "link_special_version",
            "link_ingredients",
            "link_instructions",
            "link_image_upload",
        ]:
            st.session_state[key] = "" if key != "link_image_upload" else None
        st.session_state.pop("parsed_link_recipe", None)
        st.session_state["clear_link_recipe_form"] = False
    dup_state = st.session_state.get("dup_link_recipe")
    if dup_state:
        st.warning("A recipe with this name already exists.")
        option = st.selectbox(
            "Choose how to proceed:",
            ["Add Version", "Save under Different Name", "Cancel"],
            key="dup_link_choice",
        )
        new_name = None
        if option == "Save under Different Name":
            new_name = st.text_input(
                "New Recipe Name",
                value=dup_state["data"].get("name"),
                key="dup_link_newname",
            )
        if st.button("Continue", key="dup_link_continue"):
            user_id = dup_state.get("user_id")
            if option == "Add Version":
                doc_ref = db.collection("recipes").document(dup_state["existing_id"])
                doc_ref.collection("versions").document(generate_id("ver")).set(
                    dup_state["data"] | {
                        "timestamp": datetime.utcnow(),
                        "edited_by": user_id,
                    }
                )
                st.success("✅ Added as new version")
            elif option == "Save under Different Name":
                dup_state["data"]["name"] = new_name or dup_state["data"].get("name")
                save_recipe_to_firestore(dup_state["data"], user_id=user_id)
                st.success("✅ Recipe saved")
            st.session_state.pop("dup_link_recipe")
            st.session_state.pop("parsed_link_recipe", None)
            st.rerun()
        if st.button("Cancel", key="dup_link_cancel"):
            st.session_state.pop("dup_link_recipe")
            st.rerun()
        return

    with st.expander("Add Recipe via Link", expanded=False):
        st.markdown(
            "<div class='card' style='max-width:600px;margin:0 auto'>",
            unsafe_allow_html=True,
        )

        url = st.text_input(
            "Recipe URL",
            placeholder="Just paste a link to an online recipe",
            key="recipe_link_input",
            label_visibility="collapsed",
        )
        parse_clicked = st.button("Get Recipe", key="parse_link_btn")

        if parse_clicked and url:
            with st.spinner("Parsing recipe..."):
                from ai_parsing_engine import parse_recipe_from_url

                data = parse_recipe_from_url(url)
                st.session_state["parsed_link_recipe"] = data

        data = st.session_state.get("parsed_link_recipe")

        if data:
            title = st.text_input(
                "Title",
                value=data.get("name") or data.get("title", ""),
                key="link_recipe_title",
            )
            special_version = st.text_input("Special Version", key="link_special_version")
            ingredients_value = value_to_text(data.get("ingredients"))
            instructions_value = value_to_text(data.get("instructions"))
            ingredients = st.text_area("Ingredients", value=ingredients_value, key="link_ingredients")
            if data.get("ingredients"):
                render_ingredient_columns(data.get("ingredients"))
            instructions = st.text_area("Instructions", value=instructions_value, key="link_instructions")

            parsed_image_url = data.get("image_url")
            image_file = safe_file_uploader(
                "Recipe Photo",
                type=["png", "jpg", "jpeg"],
                key="link_image_upload",
            )
            if image_file:
                # Display a preview of the uploaded image with a standard width
                st.image(image_file, width=400)
            elif parsed_image_url:
                # Show the image parsed from the URL if no file uploaded
                st.image(parsed_image_url, width=400)

            if st.button("Save Recipe", key="save_link_recipe"):
                user = get_user()
                image_url = None
                if image_file:
                    import uuid

                    blob = bucket.blob(f"recipes/{uuid.uuid4()}_{image_file.name}")
                    blob.upload_from_file(image_file)
                    blob.make_public()
                    image_url = blob.public_url
                elif parsed_image_url:
                    image_url = parsed_image_url

                recipe_doc = {
                    "name": title,
                    "ingredients": ingredients,
                    "instructions": instructions,
                    "special_version": special_version,
                    "image_url": image_url,
                    "created_at": datetime.utcnow(),
                    "author_name": user.get("name") if user else "unknown",
                }
                existing = find_recipe_by_name(recipe_doc["name"])
                if existing:
                    st.session_state["dup_link_recipe"] = {
                        "existing_id": existing["id"],
                        "data": recipe_doc,
                        "user_id": user.get("id") if user else None,
                    }
                    st.rerun()
                else:
                    db.collection("recipes").document().set(recipe_doc)
                    st.success("Recipe saved!")
                    st.session_state.pop("parsed_link_recipe", None)
                    st.session_state["clear_link_recipe_form"] = True
                    st.rerun()

        st.markdown("</div>", unsafe_allow_html=True)


# ----------------------------
# ✍️ Add Recipe Manually UI
# ----------------------------

def add_recipe_manual_ui():
    """Create a recipe manually."""
    
    # Handle special version prompt
    if "show_special_version_prompt" in st.session_state:
        recipe_id = st.session_state["show_special_version_prompt"]
        recipe_data = st.session_state.get("saved_recipe_data", {})
        
        st.success("Recipe saved successfully!")
        col1, col2 = st.columns(2)
        
        with col1:
            if st.button("Add Special Version", type="primary", use_container_width=True):
                # Keep form populated and focus on special version field
                st.session_state["keep_form_populated"] = True
                st.session_state["parent_recipe_id"] = recipe_id
                st.session_state["focus_special_version"] = True
                del st.session_state["show_special_version_prompt"]
                st.rerun()
        
        with col2:
            if st.button("Clear Form", use_container_width=True):
                st.session_state["clear_manual_recipe_form"] = True
                del st.session_state["show_special_version_prompt"]
                if "saved_recipe_data" in st.session_state:
                    del st.session_state["saved_recipe_data"]
                st.rerun()
        return

    # Clear form fields on rerun if requested
    if st.session_state.get("clear_manual_recipe_form") and not st.session_state.get("keep_form_populated"):
        for key in [
            "manual_recipe_name",
            "manual_special_version",
            "manual_ingredients",
            "manual_instructions",
            "manual_notes",
            "manual_tags",
        ]:
            if key in st.session_state:
                del st.session_state[key]
        # Handle serves separately since it's a number
        if "manual_serves" in st.session_state:
            del st.session_state["manual_serves"]
        st.session_state["clear_manual_recipe_form"] = False

    with st.expander("Add Recipe Manually", expanded=False):
        st.markdown(
            "<div class='card' style='max-width:600px;margin:0 auto'>",
            unsafe_allow_html=True,
        )

        with st.form("manual_recipe_form"):
            name = st.text_input("Recipe Name", key="manual_recipe_name")
            special_version = st.text_input("Special Version", key="manual_special_version")
            serves = st.number_input("Serves", min_value=1, value=4, key="manual_serves", step=1)
            ingredients = st.text_area("Ingredients", key="manual_ingredients")
            instructions = st.text_area("Instructions", key="manual_instructions")
            notes = st.text_area("Notes", key="manual_notes")
            tags = st.text_input("Tags (comma-separated)", key="manual_tags")
            submitted = st.form_submit_button("Save Recipe")

        st.markdown("</div>", unsafe_allow_html=True)

    if submitted:
        user = get_user()
        parent_recipe_id = st.session_state.get("parent_recipe_id")
        
        data = {
            "name": name,
            "ingredients": ingredients,
            "instructions": instructions,
            "special_version": special_version,
            "notes": notes,
            "serves": serves,
            "tags": [t.strip() for t in tags.split(",") if t.strip()],
            "created_at": datetime.utcnow(),
            "author_id": user.get("id") if user else None,
            "author_name": user.get("name") if user else "unknown",
            "ingredients_parsed": False,
        }

        try:
            if parent_recipe_id and special_version:
                # Save as a version of the parent recipe
                version_id = generate_id("ver")
                data["id"] = version_id
                data["parent_id"] = parent_recipe_id
                db.collection("recipes").document(parent_recipe_id).collection("versions").document(version_id).set(data)
                st.success(f"✅ Special version '{special_version}' saved!")
                # Clear the form
                st.session_state["clear_manual_recipe_form"] = True
                if "parent_recipe_id" in st.session_state:
                    del st.session_state["parent_recipe_id"]
                if "focus_special_version" in st.session_state:
                    del st.session_state["focus_special_version"]
            else:
                # Save as a new recipe
                recipe_id = str(uuid.uuid4())
                data["id"] = recipe_id
                db.collection("recipes").document(recipe_id).set(data)
                parsed = parse_recipe_ingredients(ingredients)
                if parsed:
                    update_recipe_with_parsed_ingredients(recipe_id, parsed)
                st.success("✅ Recipe saved!")
                # Ask about special version only if no special version was provided
                if not special_version:
                    st.session_state["show_special_version_prompt"] = recipe_id
                    st.session_state["saved_recipe_data"] = data
                else:
                    st.session_state["clear_manual_recipe_form"] = True
            st.rerun()
        except Exception as e:
            st.error(f"Failed to save recipe: {e}")


# ----------------------------
# 📤 Add Recipe via Upload UI
# ----------------------------

def add_recipe_via_upload_ui():
    """Upload a file to extract and save a recipe."""
    
    with st.expander("Add Recipe via Upload", expanded=False):
        st.markdown(
            "<div class='card' style='max-width:600px;margin:0 auto'>",
            unsafe_allow_html=True,
        )
        
        # Check if we're adding a second page
        is_adding_second_page = st.session_state.get("add_second_page_mode", False)
        existing_recipe_data = st.session_state.get("first_page_recipe_data", {})
        
        if is_adding_second_page and existing_recipe_data:
            st.info("📄 Adding page 2 to your recipe. Upload the back side or additional page.")
        
        uploaded_file = safe_file_uploader(
            "Upload a recipe file (PDF, image, or document)" if not is_adding_second_page else "Upload page 2 of your recipe",
            type=["pdf", "jpg", "jpeg", "png", "txt", "docx"],
            key="recipe_upload_file" if not is_adding_second_page else "recipe_upload_file_page2"
        )
        
        if uploaded_file:
            with st.spinner("Parsing recipe from file..."):
                from ai_parsing_engine import parse_file
                from file_storage import save_uploaded_file
                
                # Parse the file
                parsed_data = parse_file(uploaded_file, target_type="recipes")
                recipe_data = parsed_data.get("recipes", {})
                
                # Debug info
                if not recipe_data:
                    st.warning(f"⚠️ No recipe data extracted. Parsed data: {list(parsed_data.keys())}")
                
                if recipe_data:
                    # Ensure recipe has a name
                    if not recipe_data.get("name"):
                        recipe_data["name"] = "Unnamed Recipe"
                    
                    # Merge with existing data if adding second page
                    if is_adding_second_page and existing_recipe_data:
                        recipe_data = merge_recipe_data(existing_recipe_data, recipe_data)
                        st.success("✅ Page 2 added successfully!")
                    else:
                        st.success("✅ Recipe extracted successfully!")
                    
                    # Add prompt for second page if this is the first page
                    if not is_adding_second_page:
                        st.markdown(
                            """<div style='background-color: #f0f2f6; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;'>
                            <strong>📄 Have a second page?</strong> 
                            <button style='margin-left: 1rem; padding: 0.25rem 0.75rem; background: #6C4AB6; color: white; 
                                          border: none; border-radius: 4px; cursor: pointer;'
                                    onclick="window.location.reload()">Add Page 2</button>
                            </div>""",
                            unsafe_allow_html=True
                        )
                        if st.button("➕ Add Page 2", key="add_page_2_button"):
                            st.session_state["add_second_page_mode"] = True
                            st.session_state["first_page_recipe_data"] = recipe_data
                            st.rerun()
                    
                    # Preview the recipe
                    col1, col2 = st.columns([2, 1])
                    
                    with col1:
                        st.text_input("Recipe Name", value=recipe_data.get("name", ""), disabled=True)
                        serves = recipe_data.get("serves") or recipe_data.get("servings", 4)
                        st.number_input("Serves", value=float(serves), disabled=True, step=None)
                    
                    with col2:
                        if recipe_data.get("image_url"):
                            st.image(recipe_data["image_url"], width=150)
                    
                    # Show ingredients and instructions preview
                    st.text_area("Ingredients", value=value_to_text(recipe_data.get("ingredients", [])), height=150, disabled=True)
                    st.text_area("Instructions", value=value_to_text(recipe_data.get("instructions", [])), height=150, disabled=True)
                    
                    # Save or edit options
                    col1, col2, col3 = st.columns(3)
                    
                    with col1:
                        if st.button("💾 Save Recipe", use_container_width=True):
                            user = get_user()
                            user_id = user.get("id") if user else None
                            
                            # Check for duplicate
                            existing = find_recipe_by_name(recipe_data.get("name", ""))
                            if existing:
                                st.session_state["dup_upload_recipe"] = {
                                    "data": recipe_data,
                                    "existing_id": existing["id"],
                                    "existing_name": existing["name"]
                                }
                                st.rerun()
                            else:
                                recipe_id = save_recipe_to_firestore(recipe_data, user_id=user_id)
                                st.success(f"✅ Recipe saved successfully!")
                                st.balloons()
                                # Clear the upload and multi-page state
                                if "recipe_upload_file" in st.session_state:
                                    del st.session_state["recipe_upload_file"]
                                if "recipe_upload_file_page2" in st.session_state:
                                    del st.session_state["recipe_upload_file_page2"]
                                if "add_second_page_mode" in st.session_state:
                                    del st.session_state["add_second_page_mode"]
                                if "first_page_recipe_data" in st.session_state:
                                    del st.session_state["first_page_recipe_data"]
                                st.rerun()
                    
                    with col2:
                        if st.button("✏️ Edit First", use_container_width=True):
                            # Save the recipe first, then open editor
                            user = get_user()
                            user_id = user.get("id") if user else None
                            recipe_id = save_recipe_to_firestore(recipe_data, user_id=user_id)
                            st.session_state["editing_recipe_id"] = recipe_id
                            # Clear the upload and multi-page state
                            if "recipe_upload_file" in st.session_state:
                                del st.session_state["recipe_upload_file"]
                            if "recipe_upload_file_page2" in st.session_state:
                                del st.session_state["recipe_upload_file_page2"]
                            if "add_second_page_mode" in st.session_state:
                                del st.session_state["add_second_page_mode"]
                            if "first_page_recipe_data" in st.session_state:
                                del st.session_state["first_page_recipe_data"]
                            st.rerun()
                    
                    with col3:
                        if st.button("❌ Cancel", use_container_width=True):
                            if "recipe_upload_file" in st.session_state:
                                del st.session_state["recipe_upload_file"]
                            if "recipe_upload_file_page2" in st.session_state:
                                del st.session_state["recipe_upload_file_page2"]
                            if "add_second_page_mode" in st.session_state:
                                del st.session_state["add_second_page_mode"]
                            if "first_page_recipe_data" in st.session_state:
                                del st.session_state["first_page_recipe_data"]
                            st.rerun()
                else:
                    st.error("❌ Could not extract a valid recipe from this file.")
                    st.info("💡 Tip: Make sure the file contains a recipe with ingredients and instructions.")
        
        st.markdown("</div>", unsafe_allow_html=True)
    
    # Handle duplicate recipe scenario
    if "dup_upload_recipe" in st.session_state:
        dup_state = st.session_state["dup_upload_recipe"]
        st.warning(f"A recipe named '{dup_state['existing_name']}' already exists.")
        
        col1, col2 = st.columns(2)
        with col1:
            option = st.radio(
                "What would you like to do?",
                ["Add Version", "Save under Different Name"],
                key="dup_upload_option"
            )
        with col2:
            if option == "Save under Different Name":
                new_name = st.text_input("New Name", value=dup_state['data'].get('name', '') + " (Copy)")
        
        if st.button("Confirm", key="dup_upload_confirm"):
            user = get_user()
            user_id = user.get("id") if user else None
            
            if option == "Add Version":
                doc_ref = db.collection("recipes").document(dup_state["existing_id"])
                doc_ref.collection("versions").document(generate_id("ver")).set(
                    dup_state["data"] | {
                        "timestamp": datetime.utcnow(),
                        "edited_by": user_id,
                    }
                )
                st.success("✅ Added as new version")
            elif option == "Save under Different Name":
                dup_state["data"]["name"] = new_name or dup_state["data"].get("name")
                save_recipe_to_firestore(dup_state["data"], user_id=user_id)
                st.success("✅ Recipe saved")
            
            st.session_state.pop("dup_upload_recipe")
            if "recipe_upload_file" in st.session_state:
                del st.session_state["recipe_upload_file"]
            st.rerun()
        
        if st.button("Cancel", key="dup_upload_cancel"):
            st.session_state.pop("dup_upload_recipe")
            st.rerun()


def _render_recipe_card(recipe: dict, *, is_version: bool = False):
    """Render a collapsible recipe card showing only the name by default.

    When ``is_version`` is ``True`` the recipe represents a saved version and
    will be displayed indented with the ``special_version`` text as its title.
    """
    parent_id = recipe.get("parent_id") if is_version else recipe.get("id")
    doc_ref = db.collection("recipes").document(parent_id)

    version_label = ""
    if not is_version:
        try:
            version_count = len(list(doc_ref.collection("versions").stream()))
        except Exception:
            version_count = 0
        version_label = f"v1.{version_count}"

    header = recipe.get("special_version") if is_version else recipe.get("name", "Unnamed")
    if is_version:
        header = header or "Unnamed"

    container = st.container()
    if is_version:
        container.markdown('<div class="version-expander">', unsafe_allow_html=True)
    with container:
        with st.expander(header):
            # Show special versions dropdown if this is a parent recipe
            if not is_version:
                try:
                    versions = list(doc_ref.collection("versions").stream())
                    if versions:
                        version_names = [v.to_dict().get("special_version", "Unnamed Version") for v in versions]
                        selected_version = st.selectbox(
                            "Special Versions",
                            options=["Original"] + version_names,
                            key=f"version_select_{recipe['id']}"
                        )
                        
                        if selected_version != "Original":
                            # Show the selected version
                            version_idx = version_names.index(selected_version)
                            version_data = versions[version_idx].to_dict()
                            recipe = version_data  # Use version data for display
                except Exception as e:
                    print(f"Error loading versions: {e}")
            
            if recipe.get("image_url"):
                # Center the image and standardize its display size
                col_center = st.columns([1, 6, 1])[1]
                with col_center:
                    st.image(recipe["image_url"], width=400)
            # Show serves/servings
            serves = recipe.get("serves") or recipe.get("servings", "")
            if serves:
                st.markdown(f"**Serves:** {serves}")
            
            st.markdown("#### Ingredients")
            render_ingredient_columns(recipe.get("ingredients"))
            st.markdown("#### Instructions")
            st.markdown(value_to_text(recipe.get("instructions", "")))
            if recipe.get("notes"):
                st.markdown("#### Notes")
                st.markdown(recipe.get("notes"))
            if version_label:
                st.caption(version_label)

            col_edit, col_add, col_del = st.columns(3)
            if col_edit.button("Edit", key=f"edit_{recipe['id']}"):
                # For versions, we need to edit the parent recipe
                edit_id = parent_id if is_version else recipe["id"]
                st.session_state["editing_recipe_id"] = edit_id
                st.rerun()
            if col_add.button("Add Version", key=f"addver_{recipe['id']}"):
                st.session_state[f"add_ver_{recipe['id']}"] = True
            if delete_button("Delete", key=f"del_{recipe['id']}"):
                if is_version:
                    doc_ref.collection("versions").document(recipe["id"]).delete()
                else:
                    db.collection("recipes").document(recipe["id"]).delete()
                st.rerun()

        if st.session_state.get(f"add_ver_{recipe['id']}"):
            with st.form(f"ver_form_{recipe['id']}"):
                name = st.text_input("Title", value=recipe.get("name", ""), key=f"ver_name_{recipe['id']}")
                special_version = st.text_input("Special Version", value=recipe.get("special_version", ""), key=f"ver_sp_{recipe['id']}")
                ingredients = st.text_area(
                    "Ingredients",
                    value=value_to_text(recipe.get("ingredients")),
                    key=f"ver_ing_{recipe['id']}"
                )
                instructions = st.text_area(
                    "Instructions",
                    value=value_to_text(recipe.get("instructions")),
                    key=f"ver_inst_{recipe['id']}"
                )
                notes = st.text_area(
                    "Notes",
                    value=value_to_text(recipe.get("notes")),
                    key=f"ver_notes_{recipe['id']}"
                )
                tags = st.text_input("Tags (comma-separated)", value=", ".join(recipe.get("tags", [])), key=f"ver_tags_{recipe['id']}")
                col_c, col_s = st.columns(2)
                cancel = col_c.form_submit_button("Cancel")
                save = col_s.form_submit_button("Save")

                if save:
                    user = get_user()
                    version_entry = {
                        "name": name,
                        "ingredients": ingredients,
                        "instructions": instructions,
                        "notes": notes,
                        "special_version": special_version,
                        "tags": [t.strip() for t in tags.split(',') if t.strip()],
                        "timestamp": datetime.utcnow(),
                        "edited_by": user.get("id") if user else None,
                    }
                    doc_ref.collection("versions").document(generate_id("ver")).set(version_entry)
                    st.session_state.pop(f"add_ver_{recipe['id']}", None)
                    st.rerun()
                elif cancel:
                    st.session_state.pop(f"add_ver_{recipe['id']}", None)
                    st.rerun()

    if is_version:
        container.markdown('</div>', unsafe_allow_html=True)


# ----------------------------
# 📖 Recipes Tab (Public)
# ----------------------------

def recipes_page(user: dict | None = None) -> None:
    """Simple recipe browsing page."""
    st.title("📚 Recipes")

    add_recipe_via_link_ui()
    add_recipe_via_upload_ui()
    add_recipe_manual_ui()

    # Check for inline editor data first
    if "inline_editor_data" in st.session_state and st.session_state.get("inline_editor_type") == "recipe":
        from recipes_editor import recipe_editor_ui
        # Create a temporary recipe for editing
        recipe_data = st.session_state.pop("inline_editor_data")
        st.session_state.pop("inline_editor_type", None)
        recipe_editor_ui(prefill_data=recipe_data)
        return
    
    # If a recipe has been selected for editing, open editor directly
    editing_id = st.session_state.pop("editing_recipe_id", None)
    if editing_id:
        from recipes_editor import recipe_editor_ui
        recipe_editor_ui(editing_id)
        return

    search_term = st.text_input("Search recipes", key="recipe_search")

    try:
        # Try to order by created_at, fall back to unordered if field doesn't exist
        try:
            recipes = [
                doc.to_dict() | {"id": doc.id}
                for doc in db.collection("recipes")
                .order_by("created_at", direction=firestore.Query.DESCENDING)
                .stream()
            ]
        except:
            # Fallback: get all recipes without ordering
            recipes = [
                doc.to_dict() | {"id": doc.id}
                for doc in db.collection("recipes").stream()
            ]
            # Sort in Python by created_at if it exists, otherwise put at end
            recipes.sort(key=lambda r: r.get("created_at", datetime.min), reverse=True)
    except Exception as e:
        st.error(f"Failed to load recipes: {e}")
        return

    if not recipes:
        st.info("No recipes found.")
        return

    if search_term:
        term = search_term.lower()
        recipes = [r for r in recipes if term in r.get("name", "").lower()]

    for recipe in recipes:
        _render_recipe_card(recipe)

        # Display saved versions indented under the base recipe
        try:
            ver_docs = (
                db.collection("recipes")
                .document(recipe["id"])
                .collection("versions")
                .order_by("timestamp", direction=firestore.Query.ASCENDING)
                .stream()
            )
        except Exception:
            ver_docs = []

        for v in ver_docs:
            vdata = v.to_dict() or {}
            vdata.update({"id": v.id, "parent_id": recipe["id"]})
            if "name" not in vdata:
                vdata["name"] = recipe.get("name")
            _render_recipe_card(vdata, is_version=True)

