import streamlit as st
from firebase_config import initialize_firebase
initialize_firebase()

# 🔐 Auth & Roles
from auth import load_user_session, require_role
from utils import format_date
from layout import (
    inject_custom_css,
    render_top_navbar,
    render_floating_assistant,
    show_event_mode_banner
)
from notifications import notifications_sidebar

# 🌟 Core Feature Modules
from events import event_ui, get_active_event
from post_event import post_event_ui
from files import file_manager_ui
from event_modifications import event_modifications_ui
from audit import audit_log_ui
from roles import role_admin_ui
from tags import admin_tag_manager_ui
from ai_chat import ai_chat_ui
from pdf_export import pdf_export_ui
from menu_editor import menu_editor_ui

# 🧪 Feature Flag
PUBLIC_MODE = False  # Set to True to simulate guest view

# 📂 Tab Routing
TABS = {
    "Dashboard": "dashboard",
    "Events": "events",
    "Recipes": "recipes",
    "Upload": "files",
    "Post-Event": "post_event",
    "Suggestions": "suggestions",
    "PDF Export": "pdf_export",
    "Audit Logs": "audit_logs",
    "Explore Tags": "tags",
    "Admin Panel": "admin",
    "Assistant": "assistant"
}


def main():
    st.set_page_config(page_title="Mountain Medicine Catering", layout="wide")

    inject_custom_css()
    user = load_user_session()

    # 🧭 Public mode — redirect to landing page
    if PUBLIC_MODE and not user:
        st.switch_page("landing.py")

    render_floating_assistant() if user else None
    show_event_mode_banner()

    # 🧭 Top title
    st.markdown("## 🌄 Mountain Medicine Catering")

    # 🔔 Sidebar status
    if user:
        st.sidebar.write(f"👤 Logged in as **{user.get('name', 'User')}**")
        notifications_sidebar(user)
    else:
        st.sidebar.write("👀 Viewing as guest")

    # 🚀 Top Navbar Navigation
    nav_tabs = list(TABS.keys())

    # Hide restricted tabs in public mode
    if PUBLIC_MODE and not user:
        nav_tabs = [tab for tab in nav_tabs if tab not in ("Dashboard", "Assistant")]

    selected_tab = render_top_navbar(nav_tabs)

    # --------------------
    # Page Routing
    # --------------------
    if selected_tab == "Dashboard":
        event = get_active_event()
        if event:
            st.success(f"📅 Active Event: **{event.get('name', 'Unnamed')}**")
            st.markdown(f"📍 Location: *{event.get('location', 'Unknown')}*")
            st.markdown(f"🗓️ Date: *{format_date(event.get('date'))}*")

            st.markdown("### Quick Status")
            col1, col2, col3 = st.columns(3)
            col1.metric("👥 Guests", event.get("guest_count", "-"))
            col2.metric("🧑‍🍳 Staff", event.get("staff_count", "-"))
            col3.metric("🍽️ Menu Items", len(event.get("menu", [])))

            st.markdown("### ✅ Today's Checklist")
            st.checkbox("Prep station setup complete")
            st.checkbox("Reviewed schedule with staff")
            st.checkbox("Checked inventory and supplies")
        else:
            st.info("No active event is currently set.")
            st.markdown("You can activate an event in the **Events** tab.")

    elif selected_tab == "Events":
        event_ui(user)

    elif selected_tab == "Recipes":
        menu_editor_ui(user)

    elif selected_tab == "Upload":
        file_manager_ui(user)

    elif selected_tab == "Post-Event":
        post_event_ui(user)

    elif selected_tab == "Suggestions":
        event_modifications_ui(user)

    elif selected_tab == "PDF Export":
        pdf_export_ui(user)

    elif selected_tab == "Audit Logs":
        audit_log_ui(user)

    elif selected_tab == "Explore Tags":
        if user:
            admin_tag_manager_ui()
        else:
            st.info("🔒 Login required to manage tags.")

    elif selected_tab == "Admin Panel":
        if require_role(user, "admin"):
            role_admin_ui()
        else:
            st.warning("⚠️ Admin access required.")

    elif selected_tab == "Assistant":
        if user:
            ai_chat_ui()
        else:
            st.warning("🔒 Login required to use the assistant.")


if __name__ == "__main__":
    main()
