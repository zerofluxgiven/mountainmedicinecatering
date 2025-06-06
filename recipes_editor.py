import streamlit as st
from firebase_init import db
from datetime import datetime
from utils import get_active_event_id, generate_id
from auth import get_user_id

# ----------------------------
# 📖 Recipe Editor UI
# ----------------------------

def recipe_editor_ui(recipe_id=None):
    st.title("📖 Recipe Editor")

    user_id = get_user_id()
    event_id = get_active_event_id()

    if not recipe_id:
        st.warning("No recipe selected.")
        return

    doc_ref = db.collection("recipes").document(recipe_id)
    doc = doc_ref.get()
    if not doc.exists:
        st.error("Recipe not found.")
        return

    recipe = doc.to_dict()
    st.subheader(f"Editing: {recipe.get('name', 'Unnamed Recipe')}")

    with st.form("edit_recipe_form"):
        name = st.text_input("Recipe Name", value=recipe.get("name", ""))
        ingredients = st.text_area("Ingredients", value=recipe.get("ingredients", ""))
        instructions = st.text_area("Instructions", value=recipe.get("instructions", ""))
        notes = st.text_area("Notes", value=recipe.get("notes", ""))
        tags = st.text_input("Tags (comma-separated)", value=", ".join(recipe.get("tags", [])))

        # Variant support
        st.markdown("### 🧬 Variants (Sub-Recipes for Allergies/Diets)")
        variants = recipe.get("variants", [])
        for idx, variant in enumerate(variants):
            with st.expander(f"Variant #{idx+1}: {variant.get('label', 'Untitled Variant')}"):
                st.markdown(f"**Modified Instructions:**\n{variant.get('instructions', '-')}")
                st.markdown(f"**Allergen Notes:** {variant.get('notes', '-')}")

        new_variant_label = st.text_input("➕ New Variant Label", key="new_variant_label")
        new_variant_notes = st.text_area("Allergen Notes", key="new_variant_notes")
        new_variant_instructions = st.text_area("Modified Instructions", key="new_variant_instructions")

        add_variant = st.form_submit_button("Add Variant")
        if add_variant and new_variant_label:
            variant = {
                "label": new_variant_label,
                "notes": new_variant_notes,
                "instructions": new_variant_instructions,
                "created_at": datetime.utcnow(),
                "created_by": user_id
            }
            doc_ref.update({"variants": firestore.ArrayUnion([variant])})
            st.success("Variant added.")
            st.experimental_rerun()

        submitted = st.form_submit_button("💾 Save Changes")
        if submitted:
            version_entry = {
                "name": name,
                "ingredients": ingredients,
                "instructions": instructions,
                "notes": notes,
                "tags": [t.strip() for t in tags.split(",") if t.strip()],
                "timestamp": datetime.utcnow(),
                "edited_by": user_id
            }
            # Append to version history
            doc_ref.collection("versions").document(generate_id("ver")).set(version_entry)

            # Update current version
            doc_ref.update({
                "name": name,
                "ingredients": ingredients,
                "instructions": instructions,
                "notes": notes,
                "tags": version_entry["tags"],
                "updated_at": datetime.utcnow(),
                "updated_by": user_id
            })
            st.success("✅ Recipe updated!")

    # Show version history
    st.markdown("---")
    st.markdown("### 🕓 Version History")
    versions = doc_ref.collection("versions").order_by("timestamp", direction=firestore.Query.DESCENDING).stream()
    for v in versions:
        vdata = v.to_dict()
        with st.expander(f"🕓 {vdata.get('timestamp').strftime('%Y-%m-%d %H:%M')} - {vdata.get('edited_by')}"):
            st.write("**Name:**", vdata.get("name"))
            st.write("**Instructions:**")
            st.code(vdata.get("instructions", ""))
            st.write("**Notes:**", vdata.get("notes", ""))
            st.caption(f"Tags: {', '.join(vdata.get('tags', []))}")
