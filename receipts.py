# receipts.py

import streamlit as st
from firebase_admin import firestore, storage
from auth import require_login
from utils import generate_id
from datetime import datetime
from PIL import Image
import openai
import tempfile

db = firestore.client()

# ----------------------------
# 🧾 Receipt Upload & Parsing
# ----------------------------

@require_login
def receipt_upload_ui(user: dict) -> None:
    """UI for uploading receipts with optional AI-assisted parsing."""
    st.title("🧾 Upload a Receipt")
    st.caption("AI-assisted receipt parser with manual editing and event linking.")

    uploaded = st.file_uploader("Upload receipt (PDF or image)", type=["pdf", "jpg", "jpeg", "png"])
    event_id = st.text_input("Link to Event ID (optional)")
    list_id = st.text_input("Link to Shopping List ID (optional)")
    equipment_id = st.text_input("Link to Equipment ID (optional)")

    if uploaded:
        file_id = generate_id("receipt")
        file_name = uploaded.name
        file_ext = file_name.split(".")[-1].lower()

        # Save file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix="." + file_ext) as tmp:
            tmp.write(uploaded.read())
            tmp_path = tmp.name

        parsed_data = _parse_receipt_with_ai(tmp_path)

        st.subheader("🧠 Parsed Result (Editable)")
        vendor = st.text_input("Vendor", parsed_data.get("vendor", ""))
        date = st.date_input("Purchase Date", parsed_data.get("date", datetime.today()))
        total = st.text_input("Total Amount", parsed_data.get("total", ""))

        items = parsed_data.get("items", [])
        edited_items = []
        for item in items:
            with st.expander(f"Item: {item.get('name')}"):
                name = st.text_input("Name", item.get("name"))
                qty = st.text_input("Quantity", item.get("quantity"))
                price = st.text_input("Price", item.get("price"))
                edited_items.append({"name": name, "quantity": qty, "price": price})

        if st.button("✅ Save Receipt"):
            try:
                db.collection("receipts").document(file_id).set({
                    "id": file_id,
                    "name": file_name,
                    "uploaded_by": user["id"],
                    "uploaded_at": datetime.utcnow(),
                    "vendor": vendor,
                    "date": date.strftime("%Y-%m-%d"),
                    "total": total,
                    "items": edited_items,
                    "event_id": event_id or None,
                    "shopping_list_id": list_id or None,
                    "equipment_id": equipment_id or None
                })
                st.success("Receipt saved and parsed data stored.")
            except Exception as e:
                st.error(f"❌ Failed to save receipt: {e}")

# ----------------------------
# 🧠 AI Parser (mock / extendable)
# ----------------------------

def _parse_receipt_with_ai(file_path: str) -> dict:
    """
    Mock AI parser for receipts. Replace with OpenAI Vision/GPT call.
    """
    return {
        "vendor": "Costco",
        "date": datetime.today(),
        "total": "112.58",
        "items": [
            {"name": "Lemons", "quantity": "5 lb", "price": "4.99"},
            {"name": "Spring Water", "quantity": "2 cases", "price": "9.99"},
        ]
    }
