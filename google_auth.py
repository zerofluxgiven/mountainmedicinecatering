import streamlit as st
from firebase_config import initialize_firebase
initialize_firebase()

# 🔐 Auth & Permissions
from auth import load_user_session, require_role
from utils import format_date
from layout import (
    inject_custom_css,
    render_top_navbar,
    render_floating_assistant
)
from notifications import notifications_sidebar

# 🌟 App Modules
from events import event_ui, get_active_event
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

# ⚙️ Config
PUBLIC_MODE = False  # Set to True for guest access

# 📂 Tab Routing
TABS = {
    "Dashboard": "dashboard",
    "Events": "events",
    "Event Planner": "event_planner",
    "Recipes": "recipes",
    "Upload": "files",
    "Receipts": "receipts",
    "Post-Event": "post_event",
    "Suggestions": "suggestions",
    "Bulk Suggestions": "bulk_suggestions",
    "PDF Export": "pdf_export",
    "Audit Logs": "audit_logs",
    "Explore Tags": "tags",
    "Admin Panel": "admin",
    "Assistant": "assistant"
}

# ----------------------------
# 🚀 Main App
# ----------------------------
def main():
    st.set_page_config(page_title="Mountain Medicine Catering", layout="wide")

    # 💅 Style & JS
    inject_custom_css()
    render_floating_assistant()

    # 🔐 Auth
    user = load_user_session()

    # 🪧 Public mode
    if PUBLIC_MODE and not user:
        from landing import show as show_landing
        show_landing()
        return

    # 🧭 Logged-in navigation
    st.markdown("## 🌄 Mountain Medicine Catering")

    if user:
        st.sidebar.write(f"👤 Logged in as **{user.get('name', 'User')}**")
        notifications_sidebar(user)
    else:
        st.sidebar.write("👀 Viewing as guest")

    selected_tab = render_top_navbar(list(TABS.keys()))

    # -----------------------------------
    # 🔀 Tab Routing Logic
    # -----------------------------------
    if selected_tab == "Dashboard":
        if PUBLIC_MODE:
            st.warning("Dashboard is private.")
            return

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

    elif selected_tab == "Events":
        event_ui(user)

    elif selected_tab == "Event Planner":
        if user and "editing_event_id" in st.session_state:
            event_planning_dashboard_ui(st.session_state["editing_event_id"])
        else:
            st.info("Select an event to edit from the Events tab.")

    elif selected_tab == "Recipes":
        menu_editor_ui(user)

    elif selected_tab == "Upload":
        file_manager_ui(user)

    elif selected_tab == "Receipts":
        receipt_upload_ui(user)

    elif selected_tab == "Post-Event":
        post_event_ui(user)

    elif selected_tab == "Suggestions":
        event_modifications_ui(user)

    elif selected_tab == "Bulk Suggestions":
        bulk_suggestions_ui()

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
