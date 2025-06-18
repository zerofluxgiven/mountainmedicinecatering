import streamlit as st
from firebase_init import db
from auth import get_user_id
from datetime import datetime
from utils import generate_id


def ingredients_editor_ui(ingredient_id=None, prefill_data=None):
    """Edit or create an ingredient."""
    st.title("🥕 Ingredient Editor")

    user_id = get_user_id()
    doc_ref = None
    ingredient = None

    if ingredient_id:
        doc_ref = db.collection("ingredients").document(ingredient_id)
        doc = doc_ref.get()
        if not doc.exists:
            st.error("Ingredient not found.")
            return
        ingredient = doc.to_dict()
    elif prefill_data:
        ingredient = prefill_data
        st.info("💡 This form is pre-filled from parsed data.")
    else:
        st.warning("No ingredient to show.")
        return

    with st.form("edit_ingredient_form"):
        name = st.text_input("Ingredient Name", value=ingredient.get("name", ""))
        unit = st.text_input("Unit", value=ingredient.get("unit", ""))
        category = st.text_input("Category", value=ingredient.get("category", ""))
        notes = st.text_area("Notes", value=ingredient.get("notes", ""))
        tags = st.text_input(
            "Tags (comma-separated)",
            value=", ".join(ingredient.get("tags", []))
        )

        submitted = st.form_submit_button("💾 Save")
        if submitted:
            data = {
                "name": name,
                "unit": unit,
                "category": category,
                "notes": notes,
                "tags": [t.strip() for t in tags.split(",") if t.strip()],
                "updated_at": datetime.utcnow(),
                "updated_by": user_id,
            }
            if doc_ref:
                doc_ref.update(data)
                st.success("✅ Ingredient updated!")
            else:
                ing_id = generate_id("ing")
                data["created_at"] = datetime.utcnow()
                data["created_by"] = user_id
                db.collection("ingredients").document(ing_id).set(data)
                st.success("✅ Ingredient saved!")
