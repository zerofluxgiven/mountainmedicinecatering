import io
import os
import tempfile
import mimetypes
import openai
import fitz  # PyMuPDF
from PIL import Image
import pytesseract
from datetime import datetime
from firebase_admin import firestore

# --------------------------------------------
# 🔌 Initialize Firestore
# --------------------------------------------
db = firestore.client()

# --------------------------------------------
# 🧠 Main Entry Point
# --------------------------------------------
def parse_file(uploaded_file, target_type="all", user_id=None, file_id=None):
    """
    Parse uploaded file using AI to extract:
    - recipes
    - menus
    - tags
    - ingredients
    - allergens

    Returns parsed JSON and also stores it under /files/{file_id}/parsed_data
    """
    raw_text = extract_text(uploaded_file)
    if not raw_text:
        return {}

    parsed = {}

    # Define what types to extract
    target_types = [target_type] if target_type != "all" else [
        "recipes", "menus", "tags", "ingredients", "allergens"
    ]

    for t in target_types:
        parsed[t] = query_ai_parser(raw_text, t)

    # Optional: Store parsed result to file document in Firestore
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
        except Exception as e:
            print(f"Error saving parsed data to Firestore: {e}")

    return parsed

# --------------------------------------------
# 📄 Text Extraction for All File Types
# --------------------------------------------
def extract_text(uploaded_file):
    mime_type, _ = mimetypes.guess_type(uploaded_file.name)

    try:
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

# --------------------------------------------
# 📄 PDF using PyMuPDF
# --------------------------------------------
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

# --------------------------------------------
# 🖼️ OCR for Images
# --------------------------------------------
def extract_text_from_image(uploaded_file):
    try:
        image = Image.open(uploaded_file)
        return pytesseract.image_to_string(image)
    except Exception as e:
        print(f"Image OCR error: {e}")
        return ""

# --------------------------------------------
# 💬 AI Prompt Routing
# --------------------------------------------
def query_ai_parser(raw_text, target_type):
    system_prompt = """You are an expert data parser. Extract only structured data from unstructured text.
Return only a JSON object.
- recipes → include name, ingredients, instructions, servings, tags
- menus → day, meal, items
- tags → list of relevant tags
- ingredients → list of items with quantity + unit if available
- allergens → list of known allergens mentioned
"""

    user_prompt = f"""
Extract {target_type} data from the following:
```
{raw_text[:6000]}
```
Only return JSON.
"""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3
        )
        return eval(response.choices[0].message.content)
    except Exception as e:
        print(f"OpenAI error: {e}")
        return {}
