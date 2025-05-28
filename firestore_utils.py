from firebase_init import firebase_admin
# firestore_utils.py

"""
📦 Firestore Utility Functions
Use this file for reusable Firestore access patterns such as:
- Batched writes
- Paginated queries
- Generic document helpers
"""

from firebase_admin import firestore

db = firestore.client()

# Example: Batch update documents
def batch_update(collection_name: str, updates: list[tuple[str, dict]]) -> None:
    """
    Batch update multiple documents in a Firestore collection.
    Args:
        collection_name: Name of the collection
        updates: List of (document_id, data_dict) tuples
    """
    batch = db.batch()
    for doc_id, data in updates:
        ref = db.collection(collection_name).document(doc_id)
        batch.update(ref, data)
    batch.commit()

# Example: Safely fetch a document
def get_doc_safe(collection: str, doc_id: str) -> dict | None:
    try:
        doc = db.collection(collection).document(doc_id).get()
        return doc.to_dict() if doc.exists else None
    except Exception as e:
        print(f"⚠️ Error fetching document {doc_id}: {e}")
        return None
