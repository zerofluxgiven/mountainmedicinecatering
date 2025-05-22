import streamlit as st
from firebase_config import initialize_firebase
initialize_firebase()

# 🔐 Auth & Permissions
from auth import load_user_session, require_role
from utils import format_date, get_active_event  # ✅ Moved here
from layout import (
    inject_custom_css,
    render_top_navbar,
    render_floating_assistant,
)
from ui_components import show_event_mode_banner
from landing import show as show_landing  # ✅ Moved to top-level

from notifications import notifications_sidebar

# 🌟 App Modules
from events import event_ui
from post_event import post_event_ui
from files import file_manager_ui
from receipts import receipt_upload_ui
from event_modifications import event_modifications_ui
from bulk_suggestions import bulk_suggestions_ui
from audit import audit_log_ui
from roles import role_admin_ui
from tags import admin_tag_manager_ui
from ai_chat import ai_chat_ui
from pdf_export import pdf_export_ui
from menu_editor import menu_editor_ui
from event_planning_dashboard import event_planning_dashboard_ui
