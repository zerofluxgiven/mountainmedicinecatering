from google.cloud import firestore
import streamlit as st
from collections import Counter

db = firestore.Client()

# ========== EVENT MODE ==========

def get_active_event():
    try:
        doc = db.collection("state").document("active_event").get()
        return doc.to_dict() if doc.exists else None
    except:
        return None

def set_active_event(event_id):
    db.collection("state").document("active_event").set({
        "event_id": event_id
    })

# ========== SUGGESTIONS ==========

def get_pending_suggestion_count():
    docs = db.collection("suggestions").where("status", "==", "pending").stream()
    return sum(1 for _ in docs)

def log_suggestion(entity_id, field, original, proposed, context):
    db.collection("suggestions").add({
        "entity_id": entity_id,
        "field": field,
        "original_value": original,
        "suggested_value": proposed,
        "status": "pending",
        "context": context,
        "submitted_by": st.session_state.user["uid"],
    })

def resolve_suggestion(suggestion_id, approve: bool):
    doc_ref = db.collection("suggestions").document(suggestion_id)
    doc_ref.update({
        "status": "approved" if approve else "rejected"
    })

# ========== TAG NORMALIZATION ==========

def normalize_tags(tags):
    """Return a cleaned list of tags using most common casing/version."""
    tag_counter = Counter()
    all_tags = db.collection("tags").stream()
    for t in all_tags:
        data = t.to_dict()
        tag_counter[data["name"].strip().lower()] += data.get("count", 1)

    normalized = []
    for tag in tags:
        key = tag.strip().lower()
        best_match = tag_counter.most_common(1)[0][0] if key in tag_counter else key
        normalized.append(best_match)
    return list(set(normalized))

def register_tag_usage(tags):
    for tag in tags:
        key = tag.strip().lower()
        ref = db.collection("tags").document(key)
        ref.set({"name": key, "count": firestore.Increment(1)}, merge=True)

# ========== FILE SYSTEM HELPERS ==========

def soft_delete_file(file_id):
    db.collection("files").document(file_id).update({
        "deleted": True
    })

def restore_file(file_id):
    db.collection("files").document(file_id).update({
        "deleted": False
    })

def log_action(action, user_id, meta=None):
    db.collection("logs").add({
        "action": action,
        "user_id": user_id,
        "meta": meta or {},
    })
