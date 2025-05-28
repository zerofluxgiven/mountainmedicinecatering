# suggestions.py

import streamlit as st
from firebase_init import db
from datetime import datetime
from auth import get_user_id
from utils import generate_id

db = db
COLLECTION = "suggestions"

# ----------------------------
# 📥 Create Suggestion (from AI or user)
# ----------------------------

def create_suggestion(
    document_type: str,
    document_id: str,
    field: str,
    current_value: str,
    suggested_value: str,
    user: dict,
    edited_by: str = "user",
    context_mode: str = None,
    source_references: list = None,
) -> None:
    suggestion_id = generate_id("sugg")
    suggestion_data = {
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
        "edited_by": edited_by,
        "context_mode": context_mode,
        "source_references": source_references or [],
    }

    db.collection(COLLECTION).document(suggestion_id).set(suggestion_data)
    st.success("✅ Suggestion submitted for admin review.")

# ----------------------------
# 📝 Input Component (for locked fields)
# ----------------------------

def suggestion_input(field_name: str, current_value: str, document_type: str, document_id: str, user: dict, context_mode: str = None) -> str:
    st.write(f"🔒 *{field_name} is locked (Event Mode)*")
    suggestion = st.text_input(f"💡 Suggest new {field_name}", value=current_value, key=f"suggest_{field_name}")
    if suggestion != current_value and st.button("Submit Suggestion", key=f"suggest_btn_{field_name}"):
        create_suggestion(
            document_type=document_type,
            document_id=document_id,
            field=field_name,
            current_value=current_value,
            suggested_value=suggestion,
            user=user,
            edited_by="user",
            context_mode=context_mode
        )
    return current_value

# ----------------------------
# ✅ Approval & Rejection
# ----------------------------

def approve_suggestion(suggestion_id: str) -> None:
    db.collection(COLLECTION).document(suggestion_id).update({
        "status": "approved",
        "approved_at": firestore.SERVER_TIMESTAMP
    })

def reject_suggestion(suggestion_id: str) -> None:
    db.collection(COLLECTION).document(suggestion_id).update({
        "status": "rejected",
        "rejected_at": firestore.SERVER_TIMESTAMP
    })

# ----------------------------
# 🔍 Fetching Suggestions
# ----------------------------

def get_pending_suggestions() -> list[dict]:
    docs = db.collection(COLLECTION).where("status", "==", "pending").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    return [doc.to_dict() for doc in docs]

def get_suggestion_count() -> int:
    return len(get_pending_suggestions())

# ----------------------------
# 🧠 AI Helper for Suggestion Drafting
# ----------------------------

def ai_submit_suggestion(
    document_type: str,
    document_id: str,
    field: str,
    current_value: str,
    suggested_value: str,
    user: dict,
    context_mode: str,
    sources: list = None,
) -> None:
    """Used by AI assistant — saves as pending suggestion."""
    create_suggestion(
        document_type=document_type,
        document_id=document_id,
        field=field,
        current_value=current_value,
        suggested_value=suggested_value,
        user=user,
        edited_by="ai_assistant",
        context_mode=context_mode,
        source_references=sources or []
    )