import streamlit as st

# ✅ Correct Streamlit config placed immediately after import
st.set_page_config(
    page_title="Mountain Medicine Catering",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# 🔧 Patch: Hide radio label gap globally
st.markdown("""
<style>
div[data-testid="stRadio"] > label {
    display: none;
}
</style>
""", unsafe_allow_html=True)

# 🔁 Force login retry if no session and localStorage token is present
st.markdown("""
<script>
  const token = localStorage.getItem("mm_token") || "";
  const device = localStorage.getItem("mm_device") || "desktop";
  const query = `?token=${token}&device=${device}`;
  if (!window.location.search.includes("token=") && token) {
    window.location.href = window.location.pathname + query;
  }
</script>
""", unsafe_allow_html=True)

from auth import get_user, get_user_role
from user_session_initializer import enrich_session_from_token
from dashboard import render_dashboard
from mobile_layout import mobile_layout
from mobile_components import mobile_safe_columns
from floating_ai_chat import render_floating_ai_chat
from notifications import notifications_sidebar
from datetime import datetime
from utils import format_date, get_active_event, session_get, log_user_action
from layout import apply_theme, render_top_navbar, render_enhanced_sidebar, render_leave_event_button
from ui_components import show_event_mode_banner, inject_layout_fixes
from landing import show as show_landing
from events import enhanced_event_ui, get_all_events
from post_event import post_event_ui
from file_storage import file_manager_ui, show_file_analytics
from receipts import receipt_upload_ui
from pdf_export import pdf_export_ui
from event_planning_dashboard import event_planning_dashboard_ui
from event_modifications import event_modifications_ui
from bulk_suggestions import bulk_suggestions_ui
from audit import audit_log_ui
from tag_merging import tag_merging_ui
from roles import role_admin_ui as admin_panel_ui
from ingredients import ingredient_catalogue_ui
from allergies import allergy_management_ui
from packing import packing_ui
from ai_chat import ai_chat_ui
from recipes import recipes_page
from admin_utilities import admin_utilities_ui
from historical_menus import historical_menus_ui

# (rest of file continues unchanged)
