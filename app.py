# ✅ FINAL PATCHED app.py (persistent login without rerun)
import streamlit as st

# ✅ Correct Streamlit config placed immediately after import
st.set_page_config(
    page_title="Mountain Medicine Catering",
    layout="wide",
    initial_sidebar_state="collapsed"
)

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

# ⚙️ Config
PUBLIC_MODE = False

TABS = {
    "Dashboard": "dashboard",
    "Events": "events",
    "Recipes": "recipes",
    "Ingredients": "ingredients",
    "Allergies": "allergies",
    "Historical Menus": "historical_menus",
    "Upload": "files",
    "Receipts": "receipts",
    "Admin Panel": "admin",
    "Assistant": "assistant"
}

def initialize_event_mode_state():
    user = session_get("user")
    if not user:
        return

    user_id = user.get("id")
    if not user_id:
        return

    session_key = f"initialized_{user_id}"
    if session_key not in st.session_state:
        st.session_state[session_key] = True

        if "active_event_id" not in st.session_state:
            st.session_state["active_event_id"] = None
            st.session_state["active_event"] = None

        try:
            from firebase_init import db, firestore
            user_doc = db.collection("users").document(user_id).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                last_event = user_data.get("last_active_event")
                if last_event:
                    st.session_state["recent_event_id"] = last_event
        except Exception:
            pass

import streamlit.components.v1 as components

def handle_auth_routing():
    query_params = st.query_params

    # 🔍 Fallback to localStorage if token/device not passed via query
    if "token" not in query_params:
        components.html('''
            <script>
              const token = localStorage.getItem("mm_token") || "";
              const device = localStorage.getItem("mm_device") || "desktop";
              const query = `?token=${token}&device=${device}`;
              if (token) window.location.href = window.location.pathname + query;
            </script>
        ''', height=0)
        st.stop()

    if query_params.get("logout") == ["true"]:
        log_user_action("logout")
        st.session_state.clear()
        st.toast("You have been logged out")
        st.switch_page("/login")

    elif "token" in query_params and "user" not in st.session_state:
        token = query_params["token"][0]
        device = query_params.get("device", ["desktop"])[0]
        st.session_state["device_type"] = device
        st.session_state["mobile_mode"] = (device == "mobile")

        user = enrich_session_from_token(token)
        if user:
            st.session_state["user"] = user  # ✅ Ensure session holds user
            st.toast(f"Welcome {user.get('name', 'back')} 👋")
            log_user_action(user.get("id", "unknown"), user.get("role", "viewer"), "login")
            st.experimental_set_query_params()  # ✅ Clear token from URL without rerun
        else:
            st.error("Login failed. Invalid or expired token.")
            st.stop()

    elif not get_user():
        st.stop()

def main():
    handle_auth_routing()
    from firebase_init import db, firestore

    for key, default in {
        "top_nav": None,
        "next_nav": None,
        "active_event": None,
        "active_event_id": None,
        "recent_event_id": None,
        "user": None,
        "editing_event_id": None,
        "editing_menu_event_id": None,
        "viewing_menu_event_id": None,
        "show_menu_form": False,
        "current_file_data": b"",
        "mobile_detected": st.session_state.get("mobile_mode", False),
    }.items():
        if key not in st.session_state:
            st.session_state[key] = default

    try:
        admin_email = "mistermcfarland@gmail.com"
        users = db.collection("users").where("email", "==", admin_email).stream()
        admin_found = False

        for user_doc in users:
            user_data = user_doc.to_dict()
            if user_data.get("role") != "admin":
                db.collection("users").document(user_doc.id).update({"role": "admin"})
                st.success("✅ Admin role updated for mistermcfarland@gmail.com")
            admin_found = True

        if not admin_found:
            current_user = st.session_state.get("user")
            if current_user and current_user.get("email") == admin_email:
                db.collection("users").document(current_user["id"]).set({
                    "id": current_user["id"],
                    "email": admin_email,
                    "name": current_user.get("name", "Admin"),
                    "role": "admin",
                    "created_at": datetime.utcnow(),
                    "active": True,
                    "email_verified": True
                }, merge=True)
                st.success("✅ Admin user created")
    except Exception as e:
        st.warning(f"Could not verify admin role: {e}")

    st.markdown("""
        <style>
        [data-testid="stSidebar"] { display: none !important; }
        .block-container { padding-top: 1rem !important; }
        </style>
    """, unsafe_allow_html=True)

    mobile_layout.apply_mobile_theme()
    apply_theme()
    inject_layout_fixes()
    render_floating_ai_chat()

    user = get_user()

    if PUBLIC_MODE and not user:
        show_landing()
        return

    if not user:
        st.title("🔐 Login Required")
        st.markdown("Please log in to access Mountain Medicine Catering.")
        login_url = st.secrets.get("auth", {}).get("login_url", "")
        if login_url:
            st.markdown(f"""
                <div style="text-align:center; margin-top:2em;">
                    <a href="{login_url}">
                        <button style="font-size: 1.1rem; padding: 0.6em 1.5em; background: #6C4AB6; color: white; border: none; border-radius: 8px;">Login with Google</button>
                    </a>
                </div>
            """, unsafe_allow_html=True)
        else:
            st.error("No login URL configured. Please set `auth.login_url` in secrets.toml.")
        return

    initialize_event_mode_state()

    if st.session_state.get("top_nav") is None:
        st.session_state["top_nav"] = "Dashboard"

    role = get_user_role(user)
    visible_tabs = list(TABS.keys())
    selected_tab = render_top_navbar(visible_tabs)

    if role != "admin":
        for admin_tab in ["Admin Panel", "Suggestions", "Bulk Suggestions", "Audit Logs", "PDF Export"]:
            if admin_tab in visible_tabs:
                visible_tabs.remove(admin_tab)

    if selected_tab == "Dashboard":
        try:
            render_dashboard(user)
        except Exception as e:
            st.error(f"Dashboard tab crashed: {e}")

    elif selected_tab == "Events":
        try:
            render_leave_event_button("main")
            enhanced_event_ui(user)
        except Exception as e:
            st.error(f"Events tab crashed: {e}")

    elif selected_tab == "Recipes":
        try:
            recipes_page()
        except Exception as e:
            st.error(f"Recipes tab crashed: {e}")

    elif selected_tab == "Ingredients":
        try:
            ingredient_catalogue_ui(user)
        except Exception as e:
            st.error(f"Ingredients tab crashed: {e}")

    elif selected_tab == "Allergies":
        try:
            allergy_management_ui(user)
        except Exception as e:
            st.error(f"Allergies tab crashed: {e}")

    elif selected_tab == "Historical Menus":
        try:
            historical_menus_ui()
        except Exception as e:
            st.error(f"Historical Menus tab crashed: {e}")

    elif selected_tab == "Upload":
        try:
            render_upload_tab(user)
        except Exception as e:
            st.error(f"Upload tab crashed: {e}")

    elif selected_tab == "Receipts":
        try:
            receipt_upload_ui(user)
        except Exception as e:
            st.error(f"Receipts tab crashed: {e}")

    elif selected_tab == "Admin Panel":
        try:
            render_admin_panel(user)
        except Exception as e:
            st.error(f"Admin Panel tab crashed: {e}")

    elif selected_tab == "Assistant":
        try:
            ai_chat_ui()
        except Exception as e:
            st.error(f"Assistant tab crashed: {e}")

def render_upload_tab(user):
    upload_tab, analytics_tab = st.tabs(["📄 Upload Files", "📊 File Analytics"])
    with upload_tab:
        file_manager_ui(user)
    with analytics_tab:
        show_file_analytics()

def render_admin_panel(user):
    role = get_user_role()
    if role != "admin":
        st.warning("⚠️ Admin access required.")
        return
    admin_panel_ui()

if __name__ == "__main__":
    main()
