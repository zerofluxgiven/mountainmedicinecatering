import streamlit as st
from firebase_admin import firestore
from datetime import datetime
from auth import get_user_id
from utils import generate_id

db = firestore.client()
COLLECTION = "suggestions"

# ----------------------------
# 📥 Create Suggestion
# ----------------------------

def create_suggestion(document_type, document_id, field, current_value, suggested_value, user):
    suggestion_id = generate_id("sugg")
    db.collection(COLLECTION).document(suggestion_id).set({
        "id": suggestion_id,
        "document_type": document_type,
        "document_id": document_id,
        "field": field,
        "current_value": current_value,
        "suggested_value": suggested_value,
        "user_id": user["id"],
        "user_name": user.get("name", "Unknown"),
        "status": "pending",
        "created_at": firestore.SERVER_TIMESTAMP,
        "event_id": user.get("active_event_id"),
    })
    st.success("Suggestion submitted for review.")

# ----------------------------
# 📝 Input Component
# ----------------------------

def suggestion_input(field_name, current_value, document_type, document_id, user):
    st.write(f"🔒 *{field_name} is locked (Event Mode)*")
    suggestion = st.text_input(f"💡 Suggest new {field_name}", value=current_value, key=f"suggest_{field_name}")
    if suggestion != current_value and st.button("Submit Suggestion", key=f"suggest_btn_{field_name}"):
        create_suggestion(document_type, document_id, field_name, current_value, suggestion, user)
    return current_value

# ----------------------------
# ✅ Approvals + Rejections
# ----------------------------

def approve_suggestion(suggestion_id):
    db.collection(COLLECTION).document(suggestion_id).update({
        "status": "approved",
        "approved_at": firestore.SERVER_TIMESTAMP
    })
    st.success("Approved.")

def reject_suggestion(suggestion_id):
    db.collection(COLLECTION).document(suggestion_id).update({
        "status": "rejected",
        "rejected_at": firestore.SERVER_TIMESTAMP
    })
    st.warning("Rejected.")

# ----------------------------
# 🔎 Fetching + Filtering
# ----------------------------

def get_pending_suggestions():
    docs = db.collection(COLLECTION).where("status", "==", "pending").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    return [doc.to_dict() for doc in docs]

def get_suggestion_count():
    return len(get_pending_suggestions())
