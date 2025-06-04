# menu_viewer.py

import streamlit as st
from firebase_admin import firestore
from db_client import db
import streamlit.components.v1 as components

# ----------------------------
# 📜 Render Menu View
# ----------------------------

def render_menu_view(event_id: str):
    """Render the HTML content of the event's menu from event_file.menu_html."""
    try:
        doc = db.collection("events").document(event_id).collection("meta").document("event_file").get()
        if doc.exists:
            data = doc.to_dict()
            html = data.get("menu_html", "<p><i>No menu uploaded yet.</i></p>")
            st.markdown("### 📜 Event Menu Preview")
            components.html(html, height=800, scrolling=True)
        else:
            st.info("⚠️ No menu data found.")
    except Exception as e:
        st.error(f"Failed to load menu: {e}")

# ----------------------------
# ✏️ Render Menu Editor (Coming Soon)
# ----------------------------

def render_menu_editor(event_id: str):
    """Basic editor UI stub. Full structured editor coming later."""
    st.markdown("### ✏️ Edit Menu (Coming Soon)")
    st.info("This editor will let you structure menus by meal type, day, notes, and more.")
