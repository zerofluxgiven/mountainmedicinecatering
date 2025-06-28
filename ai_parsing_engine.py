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
from utils import normalize_keys, normalize_recipe_quantities
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
    if not (recipe.get("name") or recipe.get("title")):
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
    image_url = extract_image_from_file(uploaded_file)

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
        if t == "recipes":
            recipe_data = parsed[t]
            if isinstance(recipe_data, dict) and "recipes" in recipe_data:
                recipe_data = recipe_data["recipes"]
            if isinstance(recipe_data, list):
                recipe_data = recipe_data[0] if recipe_data else {}
            recipe_data = normalize_keys(recipe_data)
            normalize_recipe_quantities(recipe_data)
            if image_url:
                recipe_data.setdefault("image_url", image_url)
            parsed[t] = recipe_data

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
# 🖼️ Image Extraction Helpers
# --------------------------------------------

import base64
from urllib.parse import urljoin


def extract_image_from_pdf(uploaded_file):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(uploaded_file.read())
            tmp_path = tmp.name
        doc = fitz.open(tmp_path)
        for page in doc:
            images = page.get_images(full=True)
            if images:
                xref = images[0][0]
                base_image = doc.extract_image(xref)
                img_bytes = base_image.get("image")
                ext = base_image.get("ext", "png")
                b64 = base64.b64encode(img_bytes).decode("utf-8")
                doc.close()
                os.remove(tmp_path)
                return f"data:image/{ext};base64,{b64}"
        doc.close()
        os.remove(tmp_path)
    except Exception as e:
        print(f"PDF image extraction error: {e}")
    return None


def extract_image_from_docx_file(uploaded_file):
    try:
        document = Document(uploaded_file)
        for rel in document.part._rels.values():
            target = rel.target_part
            if "image" in target.content_type:
                b64 = base64.b64encode(target.blob).decode("utf-8")
                ext = target.content_type.split("/")[-1]
                return f"data:image/{ext};base64,{b64}"
    except Exception as e:
        print(f"DOCX image extraction error: {e}")
    return None


def extract_image_from_file(uploaded_file):
    """Upload the first discovered image to Firebase Storage and return its URL."""
    from firebase_init import get_bucket
    import uuid

    try:
        uploaded_file.seek(0)
        bucket = get_bucket()

        img_bytes = None
        ext = None
        if uploaded_file.type.startswith("image"):
            img_bytes = uploaded_file.read()
            ext = uploaded_file.type.split("/")[-1]
        elif uploaded_file.type == "application/pdf":
            data_url = extract_image_from_pdf(uploaded_file)
            if data_url:
                header, b64 = data_url.split(",", 1)
                img_bytes = base64.b64decode(b64)
                ext = header.split("/")[-1].split(";")[0]
        elif uploaded_file.type in (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        ):
            data_url = extract_image_from_docx_file(uploaded_file)
            if data_url:
                header, b64 = data_url.split(",", 1)
                img_bytes = base64.b64decode(b64)
                ext = header.split("/")[-1].split(";")[0]

        if img_bytes and ext:
            blob = bucket.blob(f"parsed_images/{uuid.uuid4()}.{ext}")
            blob.upload_from_string(img_bytes, content_type=f"image/{ext}")
            blob.make_public()
            return blob.public_url
    except Exception as e:
        print(f"Image extraction error: {e}")
    return None


def extract_image_from_soup(soup, base_url):
    props = ["og:image", "og:image:url", "twitter:image"]
    for prop in props:
        tag = soup.find("meta", property=prop)
        if tag and tag.get("content"):
            return urljoin(base_url, tag["content"])
    img_tag = soup.find("img")
    if img_tag and img_tag.get("src"):
        return urljoin(base_url, img_tag["src"])
    return None

# --------------------------------------------
# 🤖 AI Prompt Routing (Patched)
# --------------------------------------------

def query_ai_parser(raw_text, target_type):
    system_prompt = (
        "You are an expert data parser. Extract only structured data from unstructured text.\n"
        "Return only a JSON object using proper capitalization.\n"
        "When parsing recipes, include a concise list of relevant tags such as cuisine, meal type, diets or allergens.\n"
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
        image_url = extract_image_from_soup(soup, url)
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

    # Normalize key casing for downstream logic
    recipe = normalize_keys(recipe)
    normalize_recipe_quantities(recipe)
    if image_url and not recipe.get("image_url"):
        recipe["image_url"] = image_url

    if not is_meaningful_recipe(recipe):
        st.warning(
            "⚠️ Recipe content extracted from URL appears to be incomplete or unusable."
        )
        return {}

    return recipe

# --------------------------------------------
# 📄 Parse Recipe From File
# --------------------------------------------

def parse_recipe_from_file(uploaded_file) -> dict:
    """Extract text from an uploaded file and parse the first recipe."""
    raw_text = extract_text(uploaded_file)
    if not raw_text or not raw_text.strip():
        return {}

    image_url = extract_image_from_file(uploaded_file)
    cleaned_text = clean_raw_text(raw_text)
    parsed = query_ai_parser(cleaned_text, "recipes")

    recipe = parsed
    if isinstance(parsed, dict) and "recipes" in parsed:
        recipe = parsed["recipes"]
        if isinstance(recipe, list):
            recipe = recipe[0] if recipe else {}

    recipe = normalize_keys(recipe)
    normalize_recipe_quantities(recipe)
    if image_url and not recipe.get("image_url"):
        recipe["image_url"] = image_url

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
