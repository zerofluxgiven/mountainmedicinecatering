import sys
import os
sys.path.append(os.path.abspath("src"))
import streamlit as st
from src.auth import load_user_session, is_authenticated, get_user_role
from src.layout import load_css, show_event_header
from src.firestore_utils import get_active_event

# Page config
st.set_page_config(page_title="Catering App", layout="wide")
load_css()
load_user_session()

# Check Event Mode
active_event = get_active_event()
if active_event:
    show_event_header(active_event)

# Sidebar navigation
st.sidebar.title("Navigation")
page = st.sidebar.selectbox("Go to", [
    "Dashboard",
    "Menu Editor",
    "Files",
    "Event Mode",
    "Post-Event Interview",
    "Suggestions",
    "Admin Panel"
])

# Permissions
role = get_user_role()

# Routing logic
if page == "Dashboard":
    from pages import dashboard
    dashboard.show()
elif page == "Menu Editor":
    from pages import menu_editor
    menu_editor.show()
elif page == "Files":
    from pages import files
    files.show()
elif page == "Event Mode":
    from pages import event_mode
    event_mode.show()
elif page == "Post-Event Interview":
    if active_event:
        from pages import post_event
        post_event.show()
    else:
        st.warning("No active event to summarize.")
elif page == "Suggestions":
    if role in ["admin", "manager"]:
        from pages import event_modifications
        event_modifications.show()
    else:
        st.warning("You don’t have permission to view suggestions.")
elif page == "Admin Panel":
    if role == "admin":
        from pages import admin
        admin.show()
    else:
        st.warning("Admins only.")
