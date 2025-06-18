import streamlit as st
from firebase_init import get_db, get_bucket
from firebase_admin import firestore
from datetime import datetime
from utils import format_date, get_active_event_id
from auth import get_user
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

    recipe_data = {
        "id": str(uuid.uuid4()),
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
# 🧪 Firestore Save Utilities
# ----------------------------

def save_recipe_to_firestore(recipe_data, user_id=None, file_id=None):
    recipe_id = str(uuid.uuid4())
    doc = {
        "id": recipe_id,
        "name": recipe_data.get("title") or recipe_data.get("name", "Untitled"),
        "ingredients": recipe_data.get("ingredients", []),
        "instructions": recipe_data.get("instructions", []),
        "tags": recipe_data.get("tags", []),
        "created_by": user_id,
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
    st.markdown(
        "<div class='card' style='max-width:600px;margin:0 auto'>",
        unsafe_allow_html=True,
    )
    st.markdown("**Add Recipe via Link**")
    url = st.text_input(
        "",
        placeholder="Just paste a link to an online recipe",
        key="recipe_link_input",
    )
    parse_clicked = st.button("Parse", key="parse_link_btn")

    if parse_clicked and url:
        with st.spinner("Parsing recipe..."):
            from ai_parsing_engine import parse_recipe_from_url

            data = parse_recipe_from_url(url)
            st.session_state["parsed_link_recipe"] = data

    data = st.session_state.get("parsed_link_recipe")

    if data:
        title = st.text_input("Title", value=data.get("title", ""))
        ingredients_value = (
            "\n".join(data.get("ingredients", []))
            if isinstance(data.get("ingredients"), list)
            else data.get("ingredients", "")
        )
        instructions_value = (
            "\n".join(data.get("instructions", []))
            if isinstance(data.get("instructions"), list)
            else data.get("instructions", "")
        )
        ingredients = st.text_area("Ingredients", value=ingredients_value)
        instructions = st.text_area("Instructions", value=instructions_value)
        image_file = st.file_uploader("Recipe Photo", type=["png", "jpg", "jpeg"])
        if image_file:
            st.image(image_file, use_column_width=True)

        if st.button("Save Recipe", key="save_link_recipe"):
            user = get_user()
            image_url = None
            if image_file:
                import uuid

                blob = bucket.blob(f"recipes/{uuid.uuid4()}_{image_file.name}")
                blob.upload_from_file(image_file)
                blob.make_public()
                image_url = blob.public_url

            recipe_doc = {
                "name": title,
                "ingredients": ingredients,
                "instructions": instructions,
                "image_url": image_url,
                "created_at": datetime.utcnow(),
                "author_name": user.get("name") if user else "unknown",
            }
            db.collection("recipes").document().set(recipe_doc)
            st.success("Recipe saved!")
            st.session_state.pop("parsed_link_recipe", None)

    st.markdown("</div>", unsafe_allow_html=True)


def _render_recipe_card(recipe: dict):
    """Render a single recipe preview card."""
    ing_preview = "".join(
        f"- {line}\n" for line in (recipe.get("ingredients", "").splitlines()[:3])
    )
    if st.session_state.get("mobile_mode"):
        content = ""
        if recipe.get("image_url"):
            content += f"<img src='{recipe['image_url']}' style='width:100%;border-radius:8px;'>"
        content += f"<pre style='white-space:pre-wrap'>{ing_preview}</pre>"
        from mobile_layout import mobile_card

        mobile_card(recipe.get("name", "Unnamed"), content, icon="🍲", key=recipe["id"])
        if st.button("Edit", key=f"edit_{recipe['id']}"):
            st.session_state["editing_recipe_id"] = recipe["id"]
            st.experimental_rerun()
    else:
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        if recipe.get("image_url"):
            st.image(recipe["image_url"], use_column_width=True)
        st.markdown(f"### {recipe.get('name', 'Unnamed')}")
        st.markdown(ing_preview)
        if st.button("Edit", key=f"edit_{recipe['id']}"):
            st.session_state["editing_recipe_id"] = recipe["id"]
            st.experimental_rerun()
        st.markdown("</div>", unsafe_allow_html=True)


# ----------------------------
# 📖 Recipes Tab (Public)
# ----------------------------

def recipes_page():
    """Simple recipe browsing page."""
    st.title("📚 Recipes")

    add_recipe_via_link_ui()

    # If a recipe has been selected for editing, open editor directly
    editing_id = st.session_state.pop("editing_recipe_id", None)
    if editing_id:
        from recipes_editor import recipe_editor_ui
        recipe_editor_ui(editing_id)
        return

    search_term = st.text_input("Search recipes", key="recipe_search")

    try:
        recipes = [
            doc.to_dict() | {"id": doc.id}
            for doc in db.collection("recipes")
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .stream()
        ]
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

