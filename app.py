import streamlit as st
from auth import load_user_session, require_role
from files import file_manager_ui
from tags import admin_tag_manager_ui
from events import event_ui
from suggestions import suggestions_ui
from notifications import notifications_sidebar
from roles import role_admin_ui
from audit import audit_log_ui
from pdf_export import pdf_export_ui

# Optional: Debug toggle for development
PUBLIC_MODE = False  # Flip to True to allow unauthenticated viewing

def main():
    st.set_page_config(page_title="Mountain Medicine Catering", layout="wide")

    user = load_user_session()

    # If public mode is off, require login
    if not PUBLIC_MODE and not user:
        st.warning("Please log in to continue.")
        return

    st.title("Mountain Medicine Catering")

    if user:
        st.sidebar.write(f"👋 Welcome, **{user.get('name', 'User')}**")
        notifications_sidebar(user)
    else:
        st.sidebar.write("👀 Viewing as Guest")

    tab = st.sidebar.radio("Navigation", [
        "Files", 
        "Tags", 
        "Events", 
        "Suggestions", 
        "PDF Export", 
        "Audit Logs", 
        "Admin"
    ])

    # Route pages
    if tab == "Files":
        file_manager_ui(user)

    elif tab == "Tags":
        if user:
            admin_tag_manager_ui()

    elif tab == "Events":
        event_ui(user)

    elif tab == "Suggestions":
        if user:
            suggestions_ui(user)

    elif tab == "PDF Export":
        if user:
            pdf_export_ui(user)

    elif tab == "Audit Logs":
        if user:
            audit_log_ui(user)

    elif tab == "Admin":
        if require_role(user, "admin"):
            role_admin_ui()

if __name__ == "__main__":
    main()
