import streamlit as st
from firebase_admin import firestore, storage
from auth import require_login
from utils import generate_id, get_scoped_query, is_event_scoped, get_event_scope_message, get_active_event_id
from datetime import datetime
from PIL import Image
import tempfile
import base64
import io
import json
import re

from mobile_helpers import safe_columns, safe_file_uploader
from mobile_components import render_mobile_navigation

db = firestore.client()

# ----------------------------
# 🧾 Receipt Upload & Parsing
# ----------------------------

@require_login
def receipt_upload_ui(user: dict) -> None:
    st.title("🧾 Receipts")

    if st.session_state.get("mobile_mode"):
        render_mobile_navigation()

    st.info(get_event_scope_message())

    tab1, tab2 = st.tabs(["📤 Upload Receipt", "📋 View Receipts"])

    with tab1:
        _upload_receipt_section(user)

    with tab2:
        _view_receipts_section(user)

# ----------------------------
# 🤖 AI Receipt Parsing Logic
# ----------------------------

def _parse_receipt_with_ai(file_path: str) -> dict:
    try:
        from openai import OpenAI
        api_key = st.secrets.get("openai", {}).get("api_key", "")
        if not api_key:
            st.warning("⚠️ OpenAI API key not configured. Using manual entry.")
            return _parse_receipt_fallback()

        client = OpenAI(api_key=api_key)
    except Exception as e:
        st.warning(f"⚠️ OpenAI not available: {str(e)}. Using manual entry.")
        return _parse_receipt_fallback()

    try:
        with open(file_path, "rb") as image_file:
            image_data = image_file.read()

        base64_image = base64.b64encode(image_data).decode('utf-8')

        prompt = """Analyze this receipt image and extract the following information in JSON format:
        {
            "vendor": "store/vendor name",
            "date": "purchase date as YYYY-MM-DD",
            "total": "total amount as string without currency symbol",
            "items": [
                {
                    "name": "item name",
                    "quantity": "quantity and unit",
                    "price": "price as string without currency symbol"
                }
            ]
        }
        """

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}", "detail": "high"}}
                    ]
                }
            ],
            max_tokens=1000,
            temperature=0.1
        )

        result_text = response.choices[0].message.content.strip()
        json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
        result_data = json.loads(json_match.group()) if json_match else json.loads(result_text)

        parsed_data = {
            "vendor": result_data.get("vendor", "Unknown Vendor"),
            "date": _parse_date(result_data.get("date", "")),
            "total": result_data.get("total", "0.00"),
            "items": []
        }

        for item in result_data.get("items", []):
            if item.get("name"):
                parsed_data["items"].append({
                    "name": item.get("name", "Unknown Item"),
                    "quantity": item.get("quantity", "1"),
                    "price": item.get("price", "0.00")
                })

        if not parsed_data["items"]:
            parsed_data["items"] = [{"name": "Items on receipt", "quantity": "Various", "price": parsed_data["total"]}]

        st.success(f"✅ Successfully parsed {len(parsed_data['items'])} items from receipt!")
        return parsed_data

    except Exception as e:
        st.warning(f"⚠️ AI parsing encountered an error: {str(e)}. Please enter details manually.")
        return _parse_receipt_fallback()

def _parse_receipt_fallback():
    return {
        "vendor": "",
        "date": datetime.today(),
        "total": "",
        "items": [{"name": "", "quantity": "", "price": ""}]
    }

def _parse_date(date_string: str) -> datetime:
    if not date_string:
        return datetime.today()

    formats = [
        "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y",
        "%m-%d-%Y", "%d-%m-%Y", "%Y/%m/%d",
        "%m/%d/%y", "%d/%m/%y"
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_string, fmt)
        except:
            continue

    return datetime.today()

def show_receipt_analytics():
    try:
        query = get_scoped_query("receipts")
        receipts = [doc.to_dict() for doc in query.stream()]

        if not receipts:
            st.info("No receipts to analyze")
            return

        st.markdown("### Receipt Analytics")
        col1, col2, col3, col4 = safe_columns(4)

        with col1:
            st.metric("Total Receipts", len(receipts))
        with col2:
            total_amount = sum(float(r.get('total', '0').replace('$', '').replace(',', '')) for r in receipts if r.get('total'))
            st.metric("Total Spent", f"${total_amount:,.2f}")
        with col3:
            vendors = set(r.get('vendor') for r in receipts if r.get('vendor'))
            st.metric("Unique Vendors", len(vendors))
        with col4:
            avg_amount = total_amount / len(receipts) if receipts else 0
            st.metric("Average Receipt", f"${avg_amount:.2f}")

        ai_parsed = len([r for r in receipts if r.get('ai_parsed')])
        if ai_parsed > 0:
            st.markdown("#### AI Parsing Statistics")
            col1, col2 = safe_columns(2)
            with col1:
                st.metric("AI Parsed", f"{ai_parsed}/{len(receipts)}")
            with col2:
                high_confidence = len([r for r in receipts if r.get('parse_confidence') == 'high'])
                st.metric("High Confidence", f"{high_confidence}/{ai_parsed}")

        if vendors:
            st.markdown("#### Top Vendors")
            vendor_totals = {}
            for receipt in receipts:
                vendor = receipt.get('vendor', 'Unknown')
                amount = float(receipt.get('total', '0').replace('$', '').replace(',', ''))
                vendor_totals[vendor] = vendor_totals.get(vendor, 0) + amount

            for vendor, total in sorted(vendor_totals.items(), key=lambda x: x[1], reverse=True)[:5]:
                st.write(f"**{vendor}:** ${total:,.2f}")

    except Exception as e:
        st.error(f"Could not load analytics: {e}")

def _display_receipts(receipts: list) -> None:
    total_amount = sum(
        float(r.get('total', '0').replace('$', '').replace(',', ''))
        for r in receipts if r.get('total')
    )

    col1, col2, col3 = safe_columns(3)
    with col1:
        st.metric("Total Receipts", len(receipts))
    with col2:
        st.metric("Total Spent", f"${total_amount:,.2f}")
    with col3:
        avg = total_amount / len(receipts) if receipts else 0
        st.metric("Average", f"${avg:.2f}")

    st.markdown("---")

    for receipt in receipts:
        with st.expander(f"🧾 {receipt.get('vendor', 'Unknown')} - {receipt.get('date', 'Unknown date')} - ${receipt.get('total', '0.00')}"):
            col1, col2 = safe_columns(2)

            with col1:
                st.markdown(f"**Vendor:** {receipt.get('vendor', 'Unknown')}")
                st.markdown(f"**Date:** {receipt.get('date', 'Unknown')}")
                st.markdown(f"**Total:** ${receipt.get('total', '0.00')}")
                st.markdown(f"**Uploaded by:** {receipt.get('uploaded_by', 'Unknown')}")

                if receipt.get('ai_parsed'):
                    confidence = receipt.get('parse_confidence', 'unknown')
                    emoji = "🟢" if confidence == "high" else "🟡"
                    st.markdown(f"**AI Parsed:** {emoji} {confidence} confidence")

            with col2:
                if receipt.get('url'):
                    st.link_button("📥 Download Original", receipt['url'])

                if not is_event_scoped() and receipt.get('event_id'):
                    st.markdown(f"**Event ID:** {receipt.get('event_id')}")
                if receipt.get('shopping_list_id'):
                    st.markdown(f"**Shopping List:** {receipt.get('shopping_list_id')}")
                if receipt.get('equipment_id'):
                    st.markdown(f"**Equipment List:** {receipt.get('equipment_id')}")

            items = receipt.get('items', [])
            if items:
                st.markdown("#### Items")
                for item in items:
                    col1, col2, col3 = safe_columns([3, 1, 1])
                    with col1:
                        st.write(f"• {item.get('name', 'Unknown')}")
                    with col2:
                        st.write(item.get('quantity', ''))
                    with col3:
                        st.write(f"${item.get('price', '0.00')}")

            if receipt.get('notes'):
                st.markdown("#### Notes")
                st.write(receipt['notes'])

            if st.button(f"🗑️ Delete Receipt", key=f"del_{receipt['id']}"):
                try:
                    db.collection("receipts").document(receipt['id']).delete()
                    st.success("Receipt deleted")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to delete: {e}")

def _upload_receipt_section(user: dict) -> None:
    st.subheader("Upload New Receipt")
    st.caption("AI-powered receipt parser extracts vendor, items, and totals automatically.")

    uploaded = safe_file_uploader(
        "Upload receipt (PDF or image)", 
        type=["pdf", "jpg", "jpeg", "png"]
    )

    if uploaded:
        col1, col2 = safe_columns(2)

        with col1:
            if uploaded.type.startswith('image'):
                image = Image.open(uploaded)
                st.image(image, caption="Receipt Preview", use_column_width=True)

        with col2:
            st.info("📸 Receipt uploaded! Click below to analyze it.")

            if st.button("🧠 Parse Receipt with AI", type="primary"):
                with st.spinner("🔍 Analyzing receipt..."):
                    file_id = generate_id("receipt")
                    file_name = uploaded.name
                    file_ext = file_name.split(".")[-1].lower()

                    with tempfile.NamedTemporaryFile(delete=False, suffix="." + file_ext) as tmp:
                        tmp.write(uploaded.getvalue())
                        tmp_path = tmp.name

                    parsed_data = _parse_receipt_with_ai(tmp_path)

                    st.session_state['parsed_receipt'] = {
                        'file_id': file_id,
                        'file_name': file_name,
                        'tmp_path': tmp_path,
                        'parsed_data': parsed_data,
                        'uploaded_file': uploaded
                    }

                    st.success("✅ Receipt parsed! Review and edit below.")
                    st.rerun()

    if 'parsed_receipt' in st.session_state:
        parsed = st.session_state['parsed_receipt']['parsed_data']

        st.markdown("### 📝 Parsed Receipt Data")
        st.caption("Review and edit the extracted information before saving")

        with st.form("receipt_edit_form"):
            col1, col2 = safe_columns(2)

            with col1:
                vendor = st.text_input("Vendor", value=parsed.get("vendor", ""))
                date = st.date_input("Purchase Date", value=parsed.get("date", datetime.today()))

            with col2:
                total = st.text_input("Total Amount", value=parsed.get("total", ""))

                if is_event_scoped():
                    event_id = get_active_event_id()
                    st.info(f"Will be linked to current event")
                else:
                    event_id = st.text_input("Link to Event ID (optional)")

            st.markdown("#### Items")
            items = parsed.get("items", [])
            edited_items = []

            for i, item in enumerate(items):
                col1, col2, col3 = safe_columns([3, 1, 1])

                with col1:
                    name = st.text_input(f"Item {i+1}", value=item.get("name", ""), key=f"name_{i}")
                with col2:
                    qty = st.text_input("Qty", value=item.get("quantity", ""), key=f"qty_{i}")
                with col3:
                    price = st.text_input("Price", value=item.get("price", ""), key=f"price_{i}")

                if name:
                    edited_items.append({"name": name, "quantity": qty, "price": price})

            st.markdown("##### Add Item")
            new_col1, new_col2, new_col3 = safe_columns([3, 1, 1])

            with new_col1:
                new_name = st.text_input("New Item", key="new_item_name")
            with new_col2:
                new_qty = st.text_input("Qty", key="new_item_qty")
            with new_col3:
                new_price = st.text_input("Price", key="new_item_price")

            if new_name:
                edited_items.append({"name": new_name, "quantity": new_qty, "price": new_price})

            st.markdown("#### Additional Information")
            shopping_list_id = st.text_input("Link to Shopping List ID (optional)")
            equipment_id = st.text_input("Link to Equipment ID (optional)")
            notes = st.text_area("Notes (optional)")

            col1, col2 = safe_columns(2)
            with col1:
                save_button = st.form_submit_button("💾 Save Receipt", type="primary")

            with col2:
                if st.form_submit_button("🔄 Re-parse"):
                    with st.spinner("Re-analyzing..."):
                        new_parsed = _parse_receipt_with_ai(st.session_state['parsed_receipt']['tmp_path'])
                        st.session_state['parsed_receipt']['parsed_data'] = new_parsed
                        st.rerun()

            if save_button:
                try:
                    receipt_data = st.session_state['parsed_receipt']
                    bucket = storage.bucket()
                    blob_path = f"receipts/{receipt_data['file_id']}/{receipt_data['file_name']}"
                    blob = bucket.blob(blob_path)

                    with open(receipt_data['tmp_path'], 'rb') as f:
                        blob.upload_from_file(f)

                    blob.make_public()
                    file_url = blob.public_url

                    firestore_data = {
                        "id": receipt_data['file_id'],
                        "filename": receipt_data['file_name'],
                        "url": file_url,
                        "uploaded_by": user["id"],
                        "uploaded_at": datetime.utcnow(),
                        "vendor": vendor,
                        "date": date.strftime("%Y-%m-%d"),
                        "total": total,
                        "items": edited_items,
                        "event_id": event_id or None,
                        "shopping_list_id": shopping_list_id or None,
                        "equipment_id": equipment_id or None,
                        "notes": notes,
                        "ai_parsed": True,
                        "parse_confidence": "high" if vendor and total else "low"
                    }

                    db.collection("receipts").document(receipt_data['file_id']).set(firestore_data)

                    import os
                    os.unlink(receipt_data['tmp_path'])
                    del st.session_state['parsed_receipt']

                    st.success("✅ Receipt saved successfully!")
                    st.balloons()
                    st.rerun()

                except Exception as e:
                    st.error(f"❌ Failed to save receipt: {e}")

def _view_receipts_section(user: dict) -> None:
    st.subheader("Uploaded Receipts")

    try:
        query = get_scoped_query("receipts")
        query = query.order_by("uploaded_at", direction=db.query.DESCENDING)
        receipts = [doc.to_dict() for doc in query.stream()]
    except Exception as e:
        st.error(f"Failed to load receipts: {e}")
        receipts = []

    if not receipts:
        if is_event_scoped():
            st.info("No receipts found for this event.")
        else:
            st.info("No receipts found.")
        return

    if not is_event_scoped():
        receipts_by_event = {}
        for receipt in receipts:
            event_id = receipt.get("event_id", "No Event")
            if event_id not in receipts_by_event:
                receipts_by_event[event_id] = []
            receipts_by_event[event_id].append(receipt)

        for event_id, event_receipts in receipts_by_event.items():
            if event_id != "No Event":
                try:
                    event_doc = db.collection("events").document(event_id).get()
                    event_name = event_doc.to_dict().get("name", "Unknown Event") if event_doc.exists else "Unknown Event"
                    st.markdown(f"### 🎪 {event_name}")
                except:
                    st.markdown(f"### 🎪 Event ID: {event_id}")
            else:
                st.markdown("### 📋 Unassigned Receipts")

            _display_receipts(event_receipts)
    else:
        st.markdown(f"### Event Receipts ({len(receipts)} total)")
        _display_receipts(receipts)
