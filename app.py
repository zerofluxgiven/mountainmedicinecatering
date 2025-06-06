import streamlit as st
import streamlit.components.v1 as components
from auth import get_user, authenticate_user, get_user_role

from mobile_layout import mobile_layout
from mobile_components import detect_mobile, mobile_safe_columns
from floating_ai_chat import integrate_floating_chat
from notifications import notifications_sidebar
from datetime import datetime
from utils import format_date, get_active_event, session_get
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
PUBLIC_MODE = False  # Set to True for guest access

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

def handle_auth_routing():
    query_params = st.query_params

    if query_params.get("logout") == "true":
        st.session_state.clear()
        st.toast("You have been logged out")
        st.switch_page("/login")

    elif "token" in query_params:
        token = query_params["token"]
        result = authenticate_user(token=token)
        if result:
            st.session_state.user = result
            st.toast(f"Welcome {result.get('name', 'back')} 👋")
            st.switch_page("/")
        else:
            st.error("Invalid login link.")
            st.stop()

    elif not get_user() and st.session_state.get("page") != "login":
        st.switch_page("/login")
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
        "firebase_user": None,
        "editing_event_id": None,
        "editing_menu_event_id": None,
        "viewing_menu_event_id": None,
        "show_menu_form": False,
        "current_file_data": b"",
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
            current_user = st.session_state.get("firebase_user")
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

    st.set_page_config(
        page_title="Mountain Medicine Catering",
        layout="wide",
        initial_sidebar_state="collapsed"
    )

    # 🚫 Remove sidebar completely
    st.markdown("""
        <style>
        [data-testid="stSidebar"] { display: none !important; }
        .block-container { padding-top: 1rem !important; }
        </style>
    """, unsafe_allow_html=True)

    mobile_layout.apply_mobile_theme()
    apply_theme()
    inject_layout_fixes()
    integrate_floating_chat()

    user = get_user()

    if PUBLIC_MODE and not user:
        show_landing()
        return

    if not user and not PUBLIC_MODE:
        st.markdown("## 🌄 Mountain Medicine")
        return

    initialize_event_mode_state()
    render_top_navbar()

    if st.session_state.get("top_nav") is None:
        st.session_state["top_nav"] = "Dashboard"

    selected_tab = st.radio("Navigation", list(TABS.keys()), key="top_nav", horizontal=True, label_visibility="collapsed")
    st.session_state["top_nav"] = selected_tab

    if selected_tab == "Dashboard":
        if user:
            render_dashboard(user)
        else:
            st.warning("Please log in to view the dashboard.")

    elif selected_tab == "Events":
        if user:
            render_leave_event_button("main")
            enhanced_event_ui(user)
        else:
            st.warning("Please log in to view events.")

    elif selected_tab == "Recipes":
        if user:
            recipes_page()
        else:
            st.warning("Please log in to view recipes.")

    elif selected_tab == "Ingredients":
        if user:
            ingredient_catalogue_ui(user)
        else:
            st.warning("Please log in to view ingredients.")

    elif selected_tab == "Allergies":
        if user:
            allergy_management_ui(user)
        else:
            st.warning("Please log in to manage allergies.")

    elif selected_tab == "Historical Menus":
        if user:
            historical_menus_ui()
        else:
            st.warning("Please log in to view historical menus.")

    elif selected_tab == "Upload":
        if user:
            render_upload_tab(user)
        else:
            st.warning("Please log in to upload files.")

    elif selected_tab == "Receipts":
        if user:
            receipt_upload_ui(user)
        else:
            st.warning("Please log in to manage receipts.")

    elif selected_tab == "Admin Panel":
        if user:
            render_admin_panel(user)
        else:
            st.warning("Please log in to access admin features.")

    elif selected_tab == "Assistant":
        if user:
            ai_chat_ui()
        else:
            st.warning("Please log in to use the assistant.")

def render_upload_tab(user):
    upload_tab, analytics_tab = st.tabs(["📤 Upload Files", "📊 File Analytics"])
    with upload_tab:
        file_manager_ui(user)
    with analytics_tab:
        show_file_analytics()

def render_admin_panel(user):
    role = get_user_role()
    if role != "admin":
        st.warning("⚠️ Admin access required.")
        st.info(f"Your current role: {role}")
        return
    admin_panel_ui()

def render_dashboard(user):
    if mobile_layout.is_mobile:
        mobile_layout.render_mobile_dashboard(user, get_active_event())
        return

    event = get_active_event()
    if event:
        col1, col2 = st.columns([3, 1])
        with col1:
            st.success(f"📅 Active Event: **{event.get('name', 'Unnamed')}**")
            st.markdown(f"📍 **Location:** {event.get('location', 'Unknown')}")
            st.markdown(f"🗓️ **Date:** {format_date(event.get('start_date'))} → {format_date(event.get('end_date'))}")
            if event.get('description'):
                st.markdown(f"📝 **Description:** {event.get('description')}")

        with col2:
            if st.button("Edit Event", use_container_width=True):
                st.session_state["editing_event_id"] = event["id"]
                st.session_state["show_event_dashboard"] = True
                st.session_state["top_nav"] = "Events"
                st.rerun()

        st.markdown("### 📈 Quick Stats")
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("👥 Guests", event.get("guest_count", "-"))
        with col2:
            st.metric("🧑‍🍳 Staff", event.get("staff_count", "-"))
        with col3:
            try:
                menu_docs = list(db.collection("menus").where("event_id", "==", event["id"]).stream())
                menu_count = len(menu_docs)
            except:
                menu_count = len(event.get("menu", []))
            st.metric("🍽️ Menu Items", menu_count)
        with col4:
            status = event.get("status", "planning")
            st.metric("📊 Status", status.title())

        st.markdown("### ✅ Today's Checklist")
        checklist_items = [
            "Prep station setup complete",
            "Reviewed schedule with staff", 
            "Checked inventory and supplies",
            "Load equipment into transport",
            "Set up dishwashing station",
            "Final headcount confirmed"
        ]
        checklist_cols = st.columns(2)
        for i, item in enumerate(checklist_items):
            with checklist_cols[i % 2]:
                st.checkbox(item, key=f"checklist_{i}")

        st.markdown("### 🚀 Quick Actions")
        action_cols = st.columns(4)
        with action_cols[0]:
            if st.button("📋 View Menu", use_container_width=True):
                st.session_state["top_nav"] = "Recipes"
                st.rerun()
        with action_cols[1]:
            if st.button("📁 Upload Files", use_container_width=True):
                st.session_state["top_nav"] = "Upload"
                st.rerun()
        with action_cols[2]:
            if st.button("📦 Packing", use_container_width=True):
                st.session_state["top_nav"] = "Packing"
                st.rerun()
        with action_cols[3]:
            if st.button("🤖 AI Assistant", use_container_width=True):
                st.session_state["top_nav"] = "Assistant"
                st.rerun()

    else:
        st.info("No active event is currently set.")
        st.markdown("### 🎯 Get Started")
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("#### Create New Event")
            st.markdown("Start planning your next catering event")
            if st.button("Create Event", use_container_width=True):
                st.session_state["top_nav"] = "Events"
                st.rerun()
        with col2:
            st.markdown("#### Browse Existing Events")
            st.markdown("Activate or review past events")
            if st.button("View Events", use_container_width=True):
                st.session_state["top_nav"] = "Events"
                st.rerun()

        try:
            recent_events = get_all_events()
            if recent_events:
                recent_active = [e for e in recent_events if not e.get("deleted")][:3]
                if recent_active:
                    st.markdown("### 📅 Recent Events")
                    for event in recent_active:
                        col1, col2, col3 = st.columns([3, 1, 1])
                        with col1:
                            st.write(f"**{event.get('name', 'Unnamed')}**")
                            st.caption(f"{event.get('location', 'Unknown')} • {event.get('guest_count', 0)} guests")
                        with col2:
                            status = event.get('status', 'planning')
                            if status == 'active':
                                st.success(status.title())
                            elif status == 'complete':
                                st.info(status.title())
                            else:
                                st.warning(status.title())
                        with col3:
                            if st.button("Activate", key=f"quick_activate_{event['id']}"):
                                from events import activate_event
                                activate_event(event['id'])
                                st.rerun()
        except Exception as e:
            st.error(f"Could not load recent events: {e}")

def optimize_for_mobile():
    if detect_mobile():
        mobile_css = """
        <style>
        .main .block-container {
            padding-top: 1rem;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }
        .stColumns {
            flex-direction: column !important;
        }
        .stButton > button {
            width: 100% !important;
            margin-bottom: 0.5rem !important;
        }
        </style>
        """
        st.markdown(mobile_css, unsafe_allow_html=True)

def handle_app_errors():
    try:
        main()
    except Exception as e:
        st.error("🚨 An unexpected error occurred")
        st.exception(e)
        try:
            from firebase_init import db, firestore
            from utils import generate_id
            error_id = generate_id("error")
            db.collection("app_errors").document(error_id).set({
                "error": str(e),
                "user": st.session_state.get("user", {}).get("id", "unknown"),
                "timestamp": datetime.now(),
                "page": st.session_state.get("top_nav", "unknown")
            })
        except:
            pass

def monitor_performance():
    import time
    start_time = time.time()
    st.session_state["page_load_start"] = start_time

if __name__ == "__main__":
    optimize_for_mobile()
    monitor_performance()
    handle_app_errors()
