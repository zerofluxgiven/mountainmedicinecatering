import streamlit as st
from firebase_config import initialize_firebase
initialize_firebase()

# 🔐 Auth and permissions
from auth import load_user_session, require_role

# 📦 Core UI Modules
from files import file_manager_ui
from tags import admin_tag_manager_ui
from events import event_ui, get_active_event  # ✅ include here
from menu_editor import menu_editor_ui
# from suggestions import suggestions_ui
from event_modifications import event_modifications_ui
from notifications import notifications_sidebar
from roles import role_admin_ui
from audit import audit_log_ui
from pdf_export import pdf_export_ui
from post_event import post_event_ui

# 🎨 Layout Helpers
from layout import show_event_mode_banner, inject_custom_css  # ✅ add inject_custom_css
from utils import format_date  # ✅ import once, here

# ⚙️ Toggle this to simulate public or locked mode
PUBLIC_MODE = False  # Set to True to disable login (view-only)


# ----------------------------
# 🚀 Main App Logic
# ----------------------------

def main():
    st.set_page_config(page_title="Mountain Medicine Catering", layout="wide")
    inject_custom_css()  # ✅ this line loads style.css


    # Load current user session
    user = load_user_session()

    # Require login unless PUBLIC_MODE is True
    if not PUBLIC_MODE and not user:
        st.warning("Please log in to continue.")
        return

    st.title("🌄 Mountain Medicine Catering")

    # Left Sidebar
    if user:
        st.sidebar.write(f"👤 Logged in as **{user.get('name', 'User')}**")
        notifications_sidebar(user)
    else:
        st.sidebar.write("👀 Viewing as guest")

    # Sidebar Navigation
    tab = st.sidebar.radio("📚 Navigation", [
        "Dashboard",
        "Files",
        "Tags",
        "Menu",
        "Events",
        "Post-Event",
        "Suggestions",
        "PDF Export",
        "Audit Logs",
        "Admin Panel"
    ])

    # Show Event Mode banner globally
    show_event_mode_banner()

    # Route Tabs
    if tab == "Dashboard":
        st.subheader("📊 Dashboard Overview")

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
            st.markdown("You can view or activate an upcoming event under the **Events** tab.")

    elif tab == "Files":
        file_manager_ui(user)

    elif tab == "Tags":
        if user:
            admin_tag_manager_ui()

    elif tab == "Menu":
        menu_editor_ui(user)

    elif tab == "Events":
        event_ui(user)

    elif tab == "Post-Event":
        post_event_ui(user)

    elif tab == "Suggestions":
        event_modifications_ui(user)

    elif tab == "PDF Export":
        pdf_export_ui(user)

    elif tab == "Audit Logs":
        audit_log_ui(user)

    elif tab == "Admin Panel":
        if require_role(user, "admin"):
            role_admin_ui()
        else:
            st.warning("Admin access required.")

if __name__ == "__main__":
    main()
