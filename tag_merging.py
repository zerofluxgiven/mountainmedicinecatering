import streamlit as st
from auth import require_role

# Firestore init

# ----------------------------
# 🏷️ Tag Merging UI (Admin Only)
# ----------------------------
@require_role("admin")
def tag_merging_ui():
    st.title("🏷️ Tag Merging & Normalization")
    st.caption("Detect, merge, and normalize duplicate tags across the system.")

    tags_ref = db.collection("tags")
    tags = [doc.to_dict() for doc in tags_ref.stream()]

    if not tags:
        st.info("No tags found.")
        return

    tag_counts = {t["name"].lower(): t.get("count", 1) for t in tags}
    sorted_tags = sorted(tag_counts.items(), key=lambda x: (-x[1], x[0]))

    st.subheader("Tag Frequency")
    selected = st.multiselect("Select tags to merge (e.g., 'lemon', 'Lemon', 'lemons'):", [t[0] for t in sorted_tags])

    if selected:
        canonical = st.text_input("Canonical replacement tag (e.g., 'Lemon')")

        if st.button("🔁 Merge Selected Tags") and canonical:
            _merge_tags(selected, canonical)
            st.success(f"✅ Merged {len(selected)} tags into '{canonical}'")

# ----------------------------
# 🔁 Merge Logic Across Collections
# ----------------------------
def _merge_tags(old_tags, new_tag):
    collections_to_update = ["events", "menus", "recipes", "files", "shopping_lists", "equipment_lists"]

    for collection in collections_to_update:
        docs = db.collection(collection).stream()
        for doc in docs:
            data = doc.to_dict()
            if "tags" in data:
                current_tags = [t.lower() for t in data.get("tags", [])]
                if any(t in old_tags for t in current_tags):
                    updated = list(set(
                        [new_tag] + [t for t in current_tags if t not in old_tags]
                    ))
                    db.collection(collection).document(data["id"]).update({"tags": updated})

    # Update the tags collection itself
    for old in old_tags:
        db.collection("tags").document(old).delete()

    db.collection("tags").document(new_tag.lower()).set({
        "name": new_tag,
        "count": sum(1 for _ in db.collection("menus").where("tags", "array_contains", new_tag).stream())
    }, merge=True)
