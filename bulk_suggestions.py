# bulk_suggestions.py
import streamlit as st
from auth import require_role

@require_role("admin")
def bulk_suggestions_ui():
    st.title("🧠 Bulk Suggestions")
    st.info("This section is under construction.")
