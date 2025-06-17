import streamlit as st
from firebase_init import get_db
from datetime import datetime
from utils import generate_id

db = get_db()

# ----------------------------
# 🛒 Shopping List Management
# ----------------------------

def create_shopping_list(list_data: dict, user_id: str | None = None) -> str | None:
    """Create a shopping list document"""
    try:
        list_id = generate_id("shoplist")
        doc = {
            "id": list_id,
            "name": list_data.get("name", "Untitled Shopping List"),
            "items": list_data.get("items", []),
            "tags": list_data.get("tags", []),
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "deleted": False,
            "source_file": list_data.get("source_file"),
            "parsed_data": list_data.get("parsed_data", {}),
        }
        db.collection("shopping_lists").document(list_id).set(doc)
        return list_id
    except Exception as e:
        st.error(f"❌ Failed to create shopping list: {e}")
        return None

def update_shopping_list(list_id: str, updates: dict) -> bool:
    """Update an existing shopping list"""
    try:
        updates["updated_at"] = datetime.utcnow()
        db.collection("shopping_lists").document(list_id).update(updates)
        return True
    except Exception as e:
        st.error(f"❌ Failed to update shopping list: {e}")
        return False

def delete_shopping_list(list_id: str) -> bool:
    """Soft delete a shopping list"""
    try:
        db.collection("shopping_lists").document(list_id).update({
            "deleted": True,
            "deleted_at": datetime.utcnow(),
        })
        return True
    except Exception as e:
        st.error(f"❌ Failed to delete shopping list: {e}")
        return False

def get_shopping_list(list_id: str) -> dict | None:
    """Fetch a single shopping list"""
    doc = db.collection("shopping_lists").document(list_id).get()
    return doc.to_dict() if doc.exists else None

def list_shopping_lists() -> list:
    """List all shopping lists"""
    docs = db.collection("shopping_lists").where("deleted", "==", False).stream()
    return [d.to_dict() | {"id": d.id} for d in docs]
