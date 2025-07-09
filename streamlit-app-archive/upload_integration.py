import streamlit as st
from firebase_init import db
from utils import get_active_event_id
from auth import get_user_id
from shopping_lists import create_shopping_list
from datetime import datetime
from recipes import save_menu_to_firestore
from ai_parsing_engine import is_meaningful_recipe

# ----------------------------
# ⬆️ Upload Integration: Save as Menu
# ----------------------------

def save_parsed_menu_ui(parsed_data: dict):
    st.markdown("### 🍽️ Save as Event Menu Item")

    user_id = get_user_id()
    event_id = get_active_event_id()
    if not event_id:
        st.warning("Please activate or select an event before saving to a menu.")
        return

    with st.form("save_menu_form"):
        day = st.text_input("Day")
        meal = st.selectbox(
            "Meal",
            ["Breakfast", "Lunch", "Dinner", "Note"],
            key="upload_meal_select",
        )
        recipe = st.text_input(
            "Recipe Name",
            value=parsed_data.get("name") or parsed_data.get("title", ""),
        )
        notes = st.text_area("Notes", value=parsed_data.get("notes", ""))
        allergens = st.text_input("Allergens (comma-separated)", value=", ".join(parsed_data.get("allergens", [])))
        tags = st.text_input("Tags (comma-separated)", value=", ".join(parsed_data.get("tags", [])))

        if st.form_submit_button("✅ Save to Event Menu"):
            new_item = {
                "day": day,
                "meal": meal.lower(),
                "recipe": recipe,
                "notes": notes,
                "allergens": [a.strip() for a in allergens.split(",") if a.strip()],
                "tags": [t.strip() for t in tags.split(",") if t.strip()]
            }

            event_file_ref = db.collection("events").document(event_id).collection("meta").document("event_file")
            doc = event_file_ref.get()
            current = doc.to_dict().get("menu", []) if doc.exists else []
            current.append(new_item)

            success = save_menu_to_firestore(current, event_id, user_id)
            if success:
                st.success("✅ Menu item added!")
            else:
                st.error("❌ Failed to save menu item.")

# ----------------------------
# 📥 Save Parsed File As...
# ----------------------------

def show_save_file_actions(upload_info: dict):
    file_id = upload_info.get("file_id")
    parsed = upload_info.get("parsed", {})
    raw_text = upload_info.get("raw_text", "")
    uploaded_name = parsed.get("title") or parsed.get("name") or "Unnamed File"

    st.markdown("### 💾 Save File As...")
    has_recipe = is_meaningful_recipe(parsed)

    if has_recipe:
        col_btn, col_data = st.columns([1, 1])
        with col_btn:
            if st.button("🍲 Save as Recipe", key=f"save_as_recipe_{file_id}"):
                recipe_doc = {
                    "title": uploaded_name,
                    "source_file": file_id,
                    "created_at": datetime.utcnow().isoformat(),
                    "parsed_data": parsed,
                }
                db.collection("recipes").document().set(recipe_doc)
                st.success("✅ File saved as Recipe")
        with col_data:
            with st.expander("Parsed Data", expanded=False):
                st.json(parsed)

    col_event, col_menu, _ = st.columns(3)

    with col_event:
        if st.button("📅 Save as Event", key=f"save_as_event_{file_id}"):
            event_doc = {
                "name": uploaded_name,
                "source_file": file_id,
                "created_at": datetime.utcnow().isoformat(),
                "parsed_data": parsed,
            }
            db.collection("events").document().set(event_doc)
            st.success("✅ File saved as Event")

    with col_menu:
        if st.button("📖 Save as Menu", key=f"save_as_menu_{file_id}"):
            db.collection("menus").document().set({
                "title": uploaded_name,
                "source_file": file_id,
                "created_at": datetime.utcnow().isoformat(),
                "parsed_data": parsed,
            })
            st.success("✅ File saved as Menu")

    col4, col5 = st.columns(2)

    with col4:
        if st.button("🥬 Save as Ingredient", key=f"save_as_ingredient_{file_id}"):
            db.collection("ingredients").document().set({
                "name": uploaded_name,
                "source_file": file_id,
                "created_at": datetime.utcnow().isoformat(),
                "parsed_data": parsed,
            })
            st.success("✅ File saved as Ingredient")

    with col5:
        if st.button("🛒 Save as Shopping List", key=f"save_as_shoplist_{file_id}"):
            create_shopping_list({
                "name": uploaded_name,
                "source_file": file_id,
                "parsed_data": parsed,
                "items": parsed.get("items", []),
            }, user_id=get_user_id())
            st.success("✅ File saved as Shopping List")
