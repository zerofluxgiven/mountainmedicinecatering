import streamlit as st
from typing import List, Dict, Any, Optional

# -----------------------------
# 📥 Mobile File Uploader
# -----------------------------
def mobile_file_uploader(label: str, type: Optional[List[str]] = None) -> Optional[bytes]:
    uploaded_file = st.file_uploader(label, type=type)
    if uploaded_file:
        return uploaded_file.read()
    return None


# -----------------------------
# 📊 Mobile Table Renderer
# -----------------------------
def mobile_table(data: List[Dict[str, Any]], columns: List[str]) -> None:
    for row in data:
        st.markdown("---")
        for col in columns:
            st.markdown(f"**{col}:** {row.get(col, '')}")


# -----------------------------
# 🧱 Mobile Columns Wrapper
# -----------------------------
def mobile_safe_columns(n: int):
    if n <= 1:
        return [st]
    return st.columns(n)


# -----------------------------
# 🔣 Mobile Select Dropdown
# -----------------------------
def mobile_select(label: str, options: List[str], index: int = 0) -> str:
    return st.selectbox(label, options, index=index)


# -----------------------------
# 🔤 Mobile Text Input
# -----------------------------
def mobile_input(label: str, value: str = "", placeholder: str = "", password: bool = False) -> str:
    if password:
        return st.text_input(label, value=value, placeholder=placeholder, type="password")
    return st.text_input(label, value=value, placeholder=placeholder)


# -----------------------------
# 🔘 Mobile Button
# -----------------------------
def mobile_button(label: str, key: Optional[str] = None) -> bool:
    return st.button(label, key=key)


# -----------------------------
# 🧾 Mobile Card Renderer
# -----------------------------
def mobile_card(title: str, content: str = "", icon: Optional[str] = None):
    st.markdown("""
    <div style='border:1px solid #ccc; padding:12px; border-radius:10px; background:#fafafa;'>
    """, unsafe_allow_html=True)
    if icon:
        st.markdown(f"## {icon} {title}")
    else:
        st.markdown(f"### {title}")
    st.markdown(content)
    st.markdown("</div>", unsafe_allow_html=True)


# -----------------------------
# 📋 Navigation Renderer
# -----------------------------
def render_mobile_navigation():
    nav_items = ["Dashboard", "Events", "Recipes", "Chat", "Profile"]
    selected = st.selectbox("📱 Mobile Nav", nav_items, key="mobile_nav")
    st.session_state.mobile_tab = selected