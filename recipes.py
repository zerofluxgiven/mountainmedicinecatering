import streamlit as st
from firebase_init import get_db, get_bucket
from firebase_admin import firestore
from datetime import datetime
from utils import format_date, get_active_event_id, value_to_text, generate_id
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
    doc = {
        "id": recipe_id,
        "name": recipe_data.get("title") or recipe_data.get("name", "Untitled"),
        "ingredients": value_to_text(recipe_data.get("ingredients", [])),
        "instructions": value_to_text(recipe_data.get("instructions", [])),
        "special_version": recipe_data.get("special_version", ""),
        "image_url": recipe_data.get("image_url"),
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
            image_file = st.file_uploader(
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
                    st.session_state["recipe_link_input"] = ""
                    st.session_state["link_recipe_title"] = ""
                    st.session_state["link_special_version"] = ""
                    st.session_state["link_ingredients"] = ""
                    st.session_state["link_instructions"] = ""
                    st.session_state["link_image_upload"] = None
                    st.rerun()

        st.markdown("</div>", unsafe_allow_html=True)


# ----------------------------
# ✍️ Add Recipe Manually UI
# ----------------------------

def add_recipe_manual_ui():
    """Create a recipe manually."""

    # Clear form fields on rerun if requested
    if st.session_state.get("clear_manual_recipe_form"):
        for key in [
            "manual_recipe_name",
            "manual_special_version",
            "manual_ingredients",
            "manual_instructions",
            "manual_notes",
            "manual_tags",
        ]:
            st.session_state[key] = ""
        st.session_state["clear_manual_recipe_form"] = False

    with st.expander("Add Recipe Manually", expanded=False):
        st.markdown(
            "<div class='card' style='max-width:600px;margin:0 auto'>",
            unsafe_allow_html=True,
        )

        with st.form("manual_recipe_form"):
            name = st.text_input("Recipe Name", key="manual_recipe_name")
            special_version = st.text_input("Special Version", key="manual_special_version")
            ingredients = st.text_area("Ingredients", key="manual_ingredients")
            instructions = st.text_area("Instructions", key="manual_instructions")
            notes = st.text_area("Notes", key="manual_notes")
            tags = st.text_input("Tags (comma-separated)", key="manual_tags")
            submitted = st.form_submit_button("Save Recipe")

        st.markdown("</div>", unsafe_allow_html=True)

    if submitted:
        import uuid

        user = get_user()
        recipe_id = str(uuid.uuid4())
        data = {
            "id": recipe_id,
            "name": name,
            "ingredients": ingredients,
            "instructions": instructions,
            "special_version": special_version,
            "notes": notes,
            "tags": [t.strip() for t in tags.split(",") if t.strip()],
            "created_at": datetime.utcnow(),
            "author_id": user.get("id") if user else None,
            "author_name": user.get("name") if user else "unknown",
            "ingredients_parsed": False,
        }

        try:
            db.collection("recipes").document(recipe_id).set(data)
            parsed = parse_recipe_ingredients(ingredients)
            if parsed:
                update_recipe_with_parsed_ingredients(recipe_id, parsed)
            st.success("✅ Recipe saved!")
            # flag to clear form fields on the next run
            st.session_state["clear_manual_recipe_form"] = True
            st.rerun()
        except Exception as e:
            st.error(f"Failed to save recipe: {e}")


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
        header = "    " + (header or "Unnamed")

    with st.expander(header):
        if recipe.get("image_url"):
            # Center the image and standardize its display size
            col_center = st.columns([1, 6, 1])[1]
            with col_center:
                st.image(recipe["image_url"], width=400)
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
            st.session_state["editing_recipe_id"] = recipe["id"]
            st.rerun()
        if col_add.button("Add Version", key=f"addver_{recipe['id']}"):
            st.session_state[f"add_ver_{recipe['id']}"] = True
        if col_del.button("Delete", key=f"del_{recipe['id']}"):
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
                save = col_s.form_submit_button("Save")
                cancel = col_c.form_submit_button("Cancel")

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


# ----------------------------
# 📖 Recipes Tab (Public)
# ----------------------------

def recipes_page():
    """Simple recipe browsing page."""
    st.title("📚 Recipes")

    add_recipe_via_link_ui()
    add_recipe_manual_ui()

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

