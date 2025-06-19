import io
import os
import tempfile
import mimetypes
import csv
import re
import openai
import fitz  # PyMuPDF
from PIL import Image
import pytesseract
from docx import Document
import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import streamlit as st
from firebase_init import db, firestore
from recipes import (
    save_recipe_to_firestore,
    save_event_to_firestore,
    save_menu_to_firestore,
    save_ingredient_to_firestore,
)

client = openai.OpenAI(api_key=st.secrets["openai"]["api_key"])

# --------------------------------------------
# 🧹 Central Cleaning & Validation Utils
# --------------------------------------------

def clean_raw_text(text: str) -> str:
    text = text.replace("\r", "").strip()
    lines = text.split("\n")
    cleaned = [line for line in lines if len(line.strip()) > 2 and not line.lower().startswith("http")]
    return "\n".join(cleaned)

def is_meaningful_recipe(recipe: dict) -> bool:
    if not isinstance(recipe, dict):
        return False
    if not recipe.get("name"):
        return False
    return bool(recipe.get("ingredients") or recipe.get("instructions"))

# --------------------------------------------
# 🧠 Main Entry Point (Patched)
# --------------------------------------------

def parse_file(uploaded_file, target_type="all", user_id=None, file_id=None):
    st.warning("🧪 Running parse_file()...")
    print("📄 STARTING parse_file()")

    raw_text = extract_text(uploaded_file)
    st.session_state["extracted_text"] = raw_text

    if raw_text and raw_text.strip():
        st.success("✅ Some text extracted.")
        print("📄 Extracted text:", raw_text[:300])
    else:
        st.warning("❌ No text extracted from file.")
        return {}

    parsed = {}
    target_types = [target_type] if target_type != "all" else [
        "recipes", "menus", "tags", "ingredients", "allergens"
    ]

    cleaned_text = clean_raw_text(raw_text)

    for t in target_types:
        parsed[t] = query_ai_parser(cleaned_text, t)

    if file_id:
        parsed_record = {
            "parsed": parsed,
            "version": 1,
            "status": "unusable" if not is_meaningful_recipe(parsed.get("recipes", {})) else "pending_review",
            "raw_text": raw_text[:5000],
            "last_updated": datetime.utcnow(),
            "user_id": user_id
        }
        try:
            db.collection("files").document(file_id).update({"parsed_data": parsed_record})
            st.warning("✅ Saved parsed_data to Firestore")
        except Exception as e:
            print(f"Error saving parsed data to Firestore: {e}")

    return parsed

# --------------------------------------------
# 📄 Text Extraction
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
        elif uploaded_file.type in ("text/csv", "application/vnd.ms-excel", "application/csv"):
            return extract_text_from_csv(uploaded_file)
        elif uploaded_file.type in (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        ):
            return extract_text_from_docx(uploaded_file)
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

def extract_text_from_csv(uploaded_file):
    try:
        text = uploaded_file.read().decode("utf-8", errors="ignore")
        uploaded_file.seek(0)
        reader = csv.reader(io.StringIO(text))
        return "\n".join([", ".join(row) for row in reader])
    except Exception as e:
        print(f"CSV parse error: {e}")
        return ""

def extract_text_from_docx(uploaded_file):
    try:
        document = Document(uploaded_file)
        return "\n".join([para.text for para in document.paragraphs])
    except Exception as e:
        print(f"DOCX parse error: {e}")
        return ""

# --------------------------------------------
# 🤖 AI Prompt Routing (Patched)
# --------------------------------------------

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

    user_prompt = f"""
Extract structured {target_type} data from the following text. 
Use common section headers like:
- Ingredients:
- Instructions:
- Steps:
- Servings:

Only return a JSON object.

```
{raw_text[:6000]}
```
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        raw_output = response.choices[0].message.content
        print("🔍 AI raw output:", raw_output)
        st.warning("🔍 AI raw output:\n" + raw_output)

        try:
            return json.loads(raw_output)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw_output, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            raise

    except json.JSONDecodeError:
        st.error("❌ Failed to parse AI response as valid JSON.")
        return {}

    except Exception as e:
        st.error(f"OpenAI error: {e}")
        return {}

# --------------------------------------------
# 🌐 Parse Recipe From URL (Patched)
# --------------------------------------------

def parse_recipe_from_url(url: str) -> dict:
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        text = soup.get_text(separator="\n")
    except Exception as e:
        st.error(f"Failed to fetch page: {e}")
        return {}

    cleaned_text = clean_raw_text(text)
    parsed = query_ai_parser(cleaned_text, "recipes")

    # API may return the recipe nested under a "recipes" key
    recipe = parsed
    if isinstance(parsed, dict) and "recipes" in parsed:
        recipe = parsed["recipes"]
        if isinstance(recipe, list):
            recipe = recipe[0] if recipe else {}

    if not is_meaningful_recipe(recipe):
        st.warning(
            "⚠️ Recipe content extracted from URL appears to be incomplete or unusable."
        )
        return {}

    return recipe

# --------------------------------------------
# 💾 Modular Save Buttons
# --------------------------------------------

def render_extraction_buttons(file_id, parsed_data, user_id=None):
    from utils import get_active_event_id

    if not parsed_data:
        st.info("No parsed data available.")
        return

    st.markdown("## 💾 Save Extracted Content")

    if "recipes" in parsed_data and parsed_data["recipes"]:
        recipes = parsed_data["recipes"]
        recipes = recipes if isinstance(recipes, list) else [recipes]
        if st.button("📥 Save Recipes"):
            try:
                for r in recipes:
                    save_recipe_to_firestore(r, user_id=user_id, file_id=file_id)
                st.success("✅ Recipes saved to database")
            except Exception as e:
                st.error(f"Failed to save recipes: {e}")

    if "menus" in parsed_data and parsed_data["menus"]:
        menus = parsed_data["menus"]
        menus = menus if isinstance(menus, list) else [menus]
        event_id = get_active_event_id()
        if st.button("📥 Save Menus"):
            try:
                for m in menus:
                    save_menu_to_firestore(m, event_id=event_id, user_id=user_id, file_id=file_id)
                st.success("✅ Menus saved to database")
            except Exception as e:
                st.error(f"Failed to save menus: {e}")

    if "events" in parsed_data and parsed_data["events"]:
        events = parsed_data["events"]
        events = events if isinstance(events, list) else [events]
        if st.button("📥 Save Events"):
            try:
                for e in events:
                    save_event_to_firestore(e, user_id=user_id, file_id=file_id)
                st.success("✅ Events saved to database")
            except Exception as e:
                st.error(f"Failed to save events: {e}")

    if "ingredients" in parsed_data and parsed_data["ingredients"]:
        ingredients = parsed_data["ingredients"]
        if st.button("📥 Save Ingredients"):
            try:
                for ing in ingredients:
                    save_ingredient_to_firestore(ing, user_id=user_id, file_id=file_id)
                st.success("✅ Ingredients saved to database")
            except Exception as e:
                st.error(f"Failed to save ingredients: {e}")

    st.markdown("---")
    st.subheader("🧪 Parsed Data")
    st.json(parsed_data)
