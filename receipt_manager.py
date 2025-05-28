import streamlit as st
from firebase_init import get_db
from auth import get_user_id
from utils import generate_id
from datetime import datetime

db = get_db()

# ----------------------------
# 🧾 Receipt Upload & Linking
# ----------------------------

def receipt_upload_ui(user):
    if not user:
        st.warning("Please log in to manage receipts.")
        return

    st.title("🧾 Upload Receipt")

    uploaded = st.file_uploader("Upload a receipt (PDF, image, etc.)", type=["pdf", "jpg", "jpeg", "png"])

    ai_parse = st.checkbox("🧠 Let AI assist with extraction")

    link_to_event = st.text_input("Link to Event ID (optional)")
    link_to_list = st.text_input("Link to Shopping List ID (optional)")
    link_to_equipment = st.text_input("Link to Equipment ID (optional)")

    if uploaded:
        rid = generate_id("rcpt")
        filename = uploaded.name
        content = uploaded.read()

        data = {
            "id": rid,
            "filename": filename,
            "uploaded_by": get_user_id(user),
            "linked_event": link_to_event or None,
            "linked_list": link_to_list or None,
            "linked_equipment": link_to_equipment or None,
            "ai_parsed": ai_parse,
            "parsed_data": {},  # placeholder
            "created_at": firestore.SERVER_TIMESTAMP
        }

        get_db().collection("receipts").document(rid).set(data)
        st.success("✅ Receipt uploaded.")

        if ai_parse:
            st.info("🧠 AI parsing simulated: item totals, vendor, date extracted. Manual review still required.")
