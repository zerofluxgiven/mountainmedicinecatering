import streamlit as st
from firebase_init import db
from firebase_admin import firestore
from datetime import datetime
from utils import get_active_event_id, generate_id, value_to_text
from auth import get_user_id
from ingredients import parse_recipe_ingredients, update_recipe_with_parsed_ingredients
from allergies import render_allergy_warning
from recipes import save_recipe_to_firestore



# ----------------------------
# 📖 Recipe Editor UI
# ----------------------------

def recipe_editor_ui(recipe_id=None, prefill_data=None):
    st.title("📖 Recipe Editor")

    user_id = get_user_id()
    event_id = get_active_event_id()

    doc_ref = None
    recipe = None
    if recipe_id:
        doc_ref = db.collection("recipes").document(recipe_id)
        doc = doc_ref.get()
        if not doc.exists:
            st.error("Recipe not found.")
            return
        recipe = doc.to_dict()
    elif prefill_data:
        recipe = prefill_data
        st.info("💡 This form is pre-filled from parsed data.")
    else:
        st.warning("No recipe to show.")
        return

    if recipe.get("image_url"):
        st.image(recipe["image_url"], use_column_width=True, caption="📷 Recipe Image")

    display_name = recipe.get("name") or recipe.get("title", "Unnamed Recipe")
    st.subheader(f"Editing: {display_name}")

    with st.form("edit_recipe_form"):
        name = st.text_input(
            "Recipe Name",
            value=recipe.get("name") or recipe.get("title", ""),
        )
        ingredients = st.text_area("Ingredients", value=value_to_text(recipe.get("ingredients")))
        instructions = st.text_area("Instructions", value=value_to_text(recipe.get("instructions")))
        notes = st.text_area("Notes", value=value_to_text(recipe.get("notes")))
      
        tags = st.text_input("Tags (comma-separated)", value=", ".join(recipe.get("tags", [])))
        edit_note = st.text_input("📝 Edit Note (for version history)", value="", key="edit_note")

        if st.button("🧠 Suggest Tags with AI"):
            st.info("🧠 AI tag suggestion coming soon...")

        if recipe.get("ingredients_parsed"):
            render_allergy_warning(recipe)

        if st.checkbox("Show Parsed Ingredients", value=False):
            parsed = recipe.get("parsed_ingredients", [])
            if parsed:
                st.markdown("### 🌿 Parsed Ingredients")
                for ing in parsed:
                    st.write(f"- {ing.get('quantity', '?')} {ing.get('unit', '')} {ing.get('name', '')}")
            else:
                st.info("No parsed ingredients available.")

        st.markdown("### 🧬 Variants (Sub-Recipes for Allergies/Diets)")
        variants = recipe.get("variants", [])
        for idx, variant in enumerate(variants):
            with st.expander(f"Variant #{idx + 1}: {variant.get('label', 'Untitled Variant')}"):
                st.markdown(f"**Modified Instructions:**\n{variant.get('instructions', '-')}")
                st.markdown(f"**Allergen Notes:** {variant.get('notes', '-')}")

        new_variant_label = st.text_input("➕ New Variant Label", key="new_variant_label")
        new_variant_notes = st.text_area("Allergen Notes", key="new_variant_notes")
        new_variant_instructions = st.text_area("Modified Instructions", key="new_variant_instructions")

        add_variant = st.form_submit_button("Add Variant")
        if add_variant and new_variant_label and doc_ref:
            variant = {
                "label": new_variant_label,
                "notes": new_variant_notes,
                "instructions": new_variant_instructions,
                "created_at": datetime.utcnow(),
                "created_by": user_id
            }
            doc_ref.update({"variants": firestore.ArrayUnion([variant])})
            st.success("Variant added.")

        submitted = st.form_submit_button("🗕 Save Changes")
        if submitted:
            version_entry = {
                "name": name,
                "ingredients": ingredients,
                "instructions": instructions,
                "notes": notes,
                "tags": [t.strip() for t in tags.split(",") if t.strip()],
                "edit_note": edit_note,
                "timestamp": datetime.utcnow(),
                "edited_by": user_id
            }
            if doc_ref:
                doc_ref.collection("versions").document(generate_id("ver")).set(version_entry)
                doc_ref.update({
                    "name": name,
                    "ingredients": ingredients,
                    "instructions": instructions,
                    "notes": notes,
                    "tags": version_entry["tags"],
                    "updated_at": datetime.utcnow(),
                    "updated_by": user_id
                })
                update_recipe_with_parsed_ingredients(recipe_id, ingredients)
                st.success("✅ Recipe updated!")
            else:
                # New recipe from parsed data
                new_id = save_recipe_to_firestore(
                    {
                        "name": name,
                        "ingredients": ingredients,
                        "instructions": instructions,
                        "notes": notes,
                        "tags": version_entry["tags"],
                    },
                    user_id=user_id,
                )
                if new_id:
                    st.success("✅ Recipe saved!")

    if doc_ref:
        st.markdown("---")
        st.markdown("### 🕓 Version History")
        versions = doc_ref.collection("versions").order_by(
            "timestamp", direction=firestore.Query.DESCENDING
        ).stream()
        for v in versions:
            vdata = v.to_dict()
            timestamp = vdata.get("timestamp")
            label = timestamp.strftime("%Y-%m-%d %H:%M") if timestamp else "Unknown"
            with st.expander(f"🕓 {label} - {vdata.get('edited_by')}"):
                st.write("**Name:**", vdata.get("name"))
                st.write("**Instructions:")
                st.code(vdata.get("instructions", ""))
                st.write("**Notes:**", vdata.get("notes", ""))
                if vdata.get("edit_note"):
                    st.info(f"📝 Edit Note: {vdata.get('edit_note')}")
                st.caption(f"Tags: {', '.join(vdata.get('tags', []))}")

