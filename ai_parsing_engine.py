import io
import os
import tempfile
import mimetypes
import openai
import fitz  # PyMuPDF
from PIL import Image
import pytesseract
import json
from datetime import datetime
from firebase_init import db, firestore
import streamlit as st

client = openai.OpenAI(api_key=st.secrets["openai"]["api_key"])

def parse_file(uploaded_file, target_type="all", user_id=None, file_id=None):
    st.warning("🧪 Running parse_file()...")
    print("📄 STARTING parse_file()")

    raw_text = extract_text(uploaded_file)
    st.warning("📄 Extracted some text:" + raw_text[:300])
    print("📄 Extracted text:", raw_text[:300])

    if not raw_text:
        st.error("❌ No text extracted from file.")
        return {}

    parsed = {}
    target_types = [target_type] if target_type != "all" else [
        "recipes", "menus", "tags", "ingredients", "allergens"
    ]

    for t in target_types:
        parsed[t] = query_ai_parser(raw_text, t)

    if file_id:
        parsed_record = {
            "parsed": parsed,
            "version": 1,
            "status": "pending_review",
            "last_updated": datetime.utcnow(),
            "user_id": user_id
        }
        try:
            db.collection("files").document(file_id).update({"parsed_data": parsed_record})
            st.warning("✅ Saved parsed_data to Firestore")
        except Exception as e:
            print(f"Error saving parsed data to Firestore: {e}")

    return parsed

def extract_text(uploaded_file):
    mime_type, _ = mimetypes.guess_type(uploaded_file.name)
    try:
        uploaded_file.seek(0)
        if uploaded_file.type.startswith("text"):
            return uploaded_file.read().decode("utf-8")
        elif uploaded_file.type == "application/pdf":
            return extract_text_from_pdf(uploaded_file)
        elif uploaded_file.type.startswith("image"):
            return extract_text_from_image(uploaded_file)
        else:
            return uploaded_file.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"Text extraction error: {e}")
        return ""

def extract_text_from_pdf(uploaded_file):
    text = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(uploaded_file.read())
            tmp_path = tmp.name
        doc = fitz.open(tmp_path)
        for page in doc:
            text += page.get_text()
        doc.close()
        os.remove(tmp_path)
    except Exception as e:
        print(f"PDF parse error: {e}")
    return text

def extract_text_from_image(uploaded_file):
    try:
        image = Image.open(uploaded_file)
        return pytesseract.image_to_string(image)
    except Exception as e:
        print(f"Image OCR error: {e}")
        return ""

def query_ai_parser(raw_text, target_type):
    system_prompt = (
        "You are an expert data parser. Extract only structured data from unstructured text.\n"
        "Return only a JSON object.\n"
        "- recipes → include name, ingredients, instructions, servings, tags\n"
        "- menus → day, meal, items\n"
        "- tags → list of relevant tags\n"
        "- ingredients → list of items with quantity + unit if available\n"
        "- allergens → list of known allergens mentioned"
    )

    user_prompt = f"Extract {target_type} data from the following:\n\n```\n{raw_text[:6000]}\n```\nOnly return JSON."

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3
        )

        raw_output = response.choices[0].message.content
        print("🔍 AI raw output:", raw_output)
        st.warning("🔍 AI raw output:\n" + raw_output)

        return json.loads(raw_output)

    except json.JSONDecodeError as decode_error:
        st.error("❌ Failed to parse AI response as valid JSON.")
        return {}

    except Exception as e:
        st.error(f"OpenAI error: {e}")
        return {}
