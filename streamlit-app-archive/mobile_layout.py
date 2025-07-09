import streamlit as st
from pathlib import Path
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
def render_mobile_navigation(tabs=None):
    """Render navigation; use dropdown menu on mobile"""
    nav_tabs = tabs or ["Dashboard", "Events", "Recipes", "Chat", "Profile"]

    if st.session_state.get("mobile_mode"):
        from mobile_components import render_mobile_header, inject_mobile_scripts

        inject_mobile_scripts()
        render_mobile_header(nav_items=nav_tabs)
        return st.session_state.get("top_nav", nav_tabs[0])

    from layout import render_top_navbar
    return render_top_navbar(nav_tabs)


# -----------------------------
# The MobileLayout class that app.py expects
# -----------------------------
class MobileLayout:
    def __init__(self):
        self._is_mobile = None
    
    @property
    def is_mobile(self):
        """Detect if user is on mobile device"""
        if self._is_mobile is None:
            # Simple detection - could be enhanced
            try:
                # Check if viewport is mobile-sized
                self._is_mobile = st.session_state.get("mobile_mode", False)
            except:
                self._is_mobile = False
        return self._is_mobile

    def apply_mobile_theme(self):
        """Apply mobile-specific CSS and optimizations"""
        css_file = Path(__file__).resolve().parent / "theme.css"
        try:
            with open(css_file, "r") as f:
                mobile_css = f.read()
            st.markdown(f"<style>{mobile_css}</style>", unsafe_allow_html=True)
        except FileNotFoundError:
            # Fallback minimal CSS
            mobile_css = """
            <style>
            .main .block-container {
                padding: 0 1rem 1rem !important;
                max-width: 100% !important;
            }

            @media (max-width: 768px) {
                .stColumns {
                    flex-direction: column !important;
                }
                .stButton > button {
                    width: 100% !important;
                    min-height: 48px !important;
                }
            }
            </style>
            """
            st.markdown(mobile_css, unsafe_allow_html=True)

    def handle_mobile_file_upload(self, label: str = "Upload or take a photo", type: Optional[List[str]] = None):
        """Provide a mobile-friendly file uploader with camera support."""
        uploaded = st.file_uploader(label, type=type)
        if not uploaded:
            uploaded = st.camera_input(label)
        return uploaded
    
    def render_mobile_navigation(self):
        """Use the unified top navigation for mobile"""
        return render_mobile_navigation()
    
    def render_mobile_dashboard(self, user, event):
        """Render mobile-optimized dashboard"""
        st.title("📊 Dashboard")
        
        if event:
            mobile_card("📅 Active Event", f"**{event.get('name', 'Unnamed')}**", icon="📅")
            
            col1, col2 = st.columns(2)
            with col1:
                st.metric("👥 Guests", event.get("guest_count", 0))
            with col2:
                st.metric("🧑‍🍳 Staff", event.get("staff_count", 0))
            
            st.markdown("### ✅ Quick Tasks")
            st.checkbox("Setup complete")
            st.checkbox("Inventory checked")
        else:
            st.info("No active event selected.")


# Create the instance that app.py expects
mobile_layout = MobileLayout()
