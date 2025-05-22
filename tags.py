# tags.py

from typing import List, Dict, Optional
import streamlit as st
from firebase_admin import firestore

db = firestore.client()

TAGS_COLLECTION = "tags"

# ----------------------------
# 🔤 Normalization Helpers
# ----------------------------

def normalize_tag(tag: str) -> str:
    """Standardizes a tag by lowercasing and stripping whitespace."""
    return tag.strip().lower()

def get_most_common_variant(tag: str) -> str:
    """Returns the most commonly used display version of a tag."""
    norm_tag = normalize_tag(tag)
    tag_doc = db.collection(TAGS_COLLECTION).document(norm_tag).get()
    if tag_doc.exists:
        return tag_doc.to_dict().get("display", tag.strip())
    return tag.strip()

def get_suggested_tag(tag: str) -> str:
    """Returns normalized + corrected tag suggestion based on frequency."""
    norm_tag = normalize_tag(tag)
    all_tags = get_all_tags()
    if norm_tag in all_tags:
        return all_tags[norm_tag]["display"]
    candidates = {
        k: v for k, v in all_tags.items() if k.lower() == norm_tag
    }
    if candidates:
        sorted_candidates = sorted(candidates.items(), key=lambda x: x[1].get("count", 0), reverse=True)
        return sorted_candidates[0][1]["display"]
    return tag

# ----------------------------
# 📊 Usage Counting
# ----------------------------

def increment_tag_usage(tag: str) -> None:
    """Increments usage count for a normalized tag or creates it."""
    norm_tag = normalize_tag(tag)
    tag_ref = db.collection(TAGS_COLLECTION).document(norm_tag)
    tag_doc = tag_ref.get()

    if tag_doc.exists:
        tag_ref.update({"count": firestore.Increment(1)})
    else:
        tag_ref.set({"display": tag.strip(), "count": 1})

# ----------------------------
# 🔍 Fetch All Tags
# ----------------------------

def get_all_tags() -> Dict[str, Dict]:
    """Fetch all tag documents from Firestore."""
    docs = db.collection(TAGS_COLLECTION).stream()
    return {doc.id: doc.to_dict() for doc in docs}

# ----------------------------
# 🔄 Merge Tag Logic
# ----------------------------

def merge_tags(from_tag: str, to_tag: str) -> None:
    """Merge one tag into another, deleting the old one."""
    from_norm = normalize_tag(from_tag)
    to_norm = normalize_tag(to_tag)

    from_ref = db.collection(TAGS_COLLECTION).document(from_norm)
    to_ref = db.collection(TAGS_COLLECTION).document(to_norm)

    from_doc = from_ref.get()
    to_doc = to_ref.get()

    if not from_doc.exists:
        st.warning(f"Tag '{from_tag}' not found.")
        return

    from_count = from_doc.to_dict().get("count", 0)

    if to_doc.exists:
        to_ref.update({"count": firestore.Increment(from_count)})
    else:
        to_ref.set({
            "display": to_tag.strip(),
            "count": from_count
        })

    from_ref.delete()
    st.success(f"Merged '{from_tag}' into '{to_tag}'.")

# ----------------------------
# ⚙️ Admin Tag Manager UI
# ----------------------------

def admin_tag_manager_ui() -> None:
    """Admin UI for viewing and merging tags."""
    st.subheader("🏷️ Tag Management")

    tags = get_all_tags()
    sorted_tags = sorted(tags.items(), key=lambda x: x[1].get("count", 0), reverse=True)

    st.write("### Existing Tags")
    for tag_id, data in sorted_tags:
        st.write(f"- **{data.get('display')}** (used {data.get('count', 0)} times)")

    st.write("### Merge Tags")
    with st.form("merge_tags"):
        from_tag = st.text_input("Tag to merge from (old tag)")
        to_tag = st.text_input("Tag to merge into (preferred tag)")
        submitted = st.form_submit_button("Merge")
        if submitted and from_tag and to_tag:
            merge_tags(from_tag, to_tag)
