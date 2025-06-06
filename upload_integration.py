import streamlit as st
from firebase_init import db
from utils import get_active_event_id
from auth import get_user_id
from datetime import datetime
from menus import save_menu_to_firestore

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
        meal = st.selectbox("Meal", ["Breakfast", "Lunch", "Dinner", "Note"])
        recipe = st.text_input("Recipe Name", value=parsed_data.get("title", ""))
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
