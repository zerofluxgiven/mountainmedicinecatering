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

# --------------------------------------------
# 🧠 Main Entry Point
# --------------------------------------------
def parse_file(uploaded_file, target_type="all", user_id=None, file_id=None):
    """
    Parse uploaded file using AI to extract structured data
    and save to the associated file document in Firestore.
    """
    st.warning("🧪 Running parse_file()...")
    print("📄 STARTING parse_file()")

    raw_text = extract_text(uploaded_file)
    st.warning("📄 Extracted some text:" + raw_text[:300])
    print("📄 Extracted text:", raw_text[:300])

    if not raw_text:
        st.error("❌ No text extracted from file.")
        return {}

    parsed = {}

    # Define what types to extract
    target_types = [target_type] if target_type != "all" else [
        "recipes", "menus", "tags", "ingredients", "allergens"
    ]

    for t in target_types:
        parsed[t] = query_ai_parser(raw_text, t)
        st.warning(f"🧪 Parsed AI content: {parsed}")
        st.warning(f"📁 File ID for update: {file_id}")
        
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
            print("✅ Saved parsed_data to Firestore")
            st.warning("✅ Saved parsed_data to Firestore")

        except Exception as e:
            print(f"Error saving parsed data to Firestore: {e}")

    return parsed

# --------------------------------------------
# 📄 Text Extraction for All File Types
# --------------------------------------------
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
        print("🔍 AI raw output:", response.choices[0].message.content)
        st.warning("🔍 AI raw output:\n" + response.choices[0].message.content)
    
        return json.loads(response.choices[0].message.content)

    except json.JSONDecodeError as decode_error:
        print(f"JSON decode error: {decode_error}")
        st.error("❌ Failed to parse AI response as valid JSON.")
        return {}
    
    except Exception as e:
        print(f"OpenAI error: {e}")
        st.error(f"OpenAI error: {e}")
        return {}

# --------------------------------------------
# ⏬ UI Extract Buttons (called from other files)
# --------------------------------------------
def render_extraction_buttons(file_id, parsed_data):
    """
    Optionally allow user to extract specific parsed items like recipes or menus
    """
    st.markdown("---")
    st.subheader("🧪 Extract From Parsed Data")

    if not parsed_data:
        st.info("No parsed data available.")
        return

    st.warning(f"Parsed keys: {list(parsed_data.keys())}")
    st.json(parsed_data)


    if "recipes" in parsed_data and parsed_data["recipes"]:
        if st.button("📥 Save as Recipe"):
            try:
                from recipes import save_recipe_to_firestore
                for r in parsed_data["recipes"] if isinstance(parsed_data["recipes"], list) else [parsed_data["recipes"]]:
                    save_recipe_to_firestore(r)
                st.success("✅ Recipes saved to database")
            except Exception as e:
                st.error(f"Failed to save recipes: {e}")

    if "menus" in parsed_data and parsed_data["menus"]:
        if st.button("📥 Save as Menu"):
            try:
                from menus import save_menu_to_firestore  # If menu saving exists
                menus = parsed_data["menus"] if isinstance(parsed_data["menus"], list) else [parsed_data["menus"]]
                from utils import get_active_event_id
                from auth import get_user_id
                for m in menus:
                    save_menu_to_firestore(menus, get_active_event_id(), get_user_id())
                    break  # Save all at once
                st.success("✅ Menus saved to database")
            except Exception as e:
                st.error(f"Failed to save menus: {e}")
