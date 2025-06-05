import streamlit as st
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

# ⚙️ Config
PUBLIC_MODE = False  # Set to True for guest access

# 📂 Updated Tab Routing with all your original tabs
TABS = {
    "Dashboard": "dashboard",
    "Events": "events", 
    "Recipes": "recipes",
    "Ingredients": "ingredients",
    "Allergies": "allergies",
    "Upload": "files",
    "Receipts": "receipts",
    "Packing": "packing",
    "Post-Event": "post_event",
    "Suggestions": "suggestions",
    "Bulk Suggestions": "bulk_suggestions", 
    "PDF Export": "pdf_export",
    "Audit Logs": "audit_logs",
    "Explore Tags": "tags",
    "Admin Panel": "admin",
    "Assistant": "assistant"
}

# Add this function before main() to handle event mode persistence:
def initialize_event_mode_state():
    """Initialize event mode state for new users"""
    user = session_get("user")
    if not user:
        return
        
    user_id = user.get("id")
    if not user_id:
        return
        
    # Check if this is a new session for this user
    session_key = f"initialized_{user_id}"
    if session_key not in st.session_state:
        st.session_state[session_key] = True
        
        # For new users, ensure event mode is OFF
        if "active_event_id" not in st.session_state:
            st.session_state["active_event_id"] = None
            st.session_state["active_event"] = None
            
        # Try to restore last active event from Firestore user preferences
        try:
            from db_client import db
            user_doc = db.collection("users").document(user_id).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                last_event = user_data.get("last_active_event")
                if last_event:
                    st.session_state["recent_event_id"] = last_event
        except Exception:
            pass

# ----------------------------
# 🚀 Main App
# ----------------------------
def main():
    # ✅ Initialize Firebase first
    try:
        from firebase_config import initialize_firebase
        initialize_firebase()
    except Exception as e:
        st.error(f"❌ Failed to initialize Firebase: {e}")
        st.stop()
                # Ensure admin user exists with correct role
    try:
        from db_client import db
        admin_email = "mistermcfarland@gmail.com"
    
        # Check all users and find the admin
        users = db.collection("users").where("email", "==", admin_email).stream()
        admin_found = False
    
        for user_doc in users:
            user_data = user_doc.to_dict()
            if user_data.get("role") != "admin":
                # Update to admin role
                db.collection("users").document(user_doc.id).update({"role": "admin"})
                st.success("✅ Admin role updated for mistermcfarland@gmail.com")
            admin_found = True
    
        if not admin_found:
            # If you're logged in but no user record exists, create one
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

    # Configure page
    st.set_page_config(
        page_title="Mountain Medicine Catering", 
        layout="wide",
        initial_sidebar_state="collapsed"
    )


    
    # ✅ ADD THIS LINE - Initialize auth system
    try:
        from auth import load_user_session, get_user_role, show_login_form, initialize_auth_system
        initialize_auth_system()
    except Exception as e:
        st.error(f"❌ Failed to initialize authentication: {e}")
        st.stop()
    
    # Your existing code continues here...
    mobile_layout.apply_mobile_theme()

    # 💅 Apply complete theme system
    apply_theme()

    # 🔧 Fix layout issues
    inject_layout_fixes()

    # 💬 Integrate floating chat
    integrate_floating_chat()

    # 🔐 Auth
    user = load_user_session()

    # 🪧 Public mode
    if PUBLIC_MODE and not user:
        show_landing()
        return

    # Show login form if no user and not in public mode
    if not user and not PUBLIC_MODE:
        st.markdown("## 🌄 Mountain Medicine Catering")
        show_login_form()
        return

    # Initialize event mode state for the user
    initialize_event_mode_state()

    # 🧭 Enhanced sidebar with admin tools
    render_enhanced_sidebar()

    # 🧭 Main navigation
    st.markdown("## 🌄 Mountain Medicine Catering")

    if user:
        st.sidebar.write(f"👤 Logged in as **{user.get('name', 'User')}**")
        notifications_sidebar(user)
    else:
        st.sidebar.write("👀 Viewing as guest")

    # Top navigation
    if mobile_layout.is_mobile:
        selected_tab = mobile_layout.render_mobile_navigation()
    else:
        selected_tab = render_top_navbar(list(TABS.keys()))

    # Sidebar for notifications and quick info
    if user:
        with st.sidebar:
            st.write(f"👤 **{user.get('name', 'User')}**")
            st.caption(f"Role: {get_user_role(user)}")
            notifications_sidebar(user)
            
            # Quick event info in sidebar
            active_event = get_active_event()
            if active_event:
                st.markdown("---")
                st.markdown("### 📅 Active Event")
                st.write(f"**{active_event.get('name', 'Unknown')}**")
                st.caption(f"📍 {active_event.get('location', 'Unknown')}")
                st.caption(f"👥 {active_event.get('guest_count', 0)} guests")

    # -----------------------------------
    # 🔀 Enhanced Tab Routing Logic (PRESERVED FROM YOUR ORIGINAL)
    # -----------------------------------
    if selected_tab == "Dashboard":
        # Dashboard should be accessible to logged-in users regardless of PUBLIC_MODE
        if not user:
            st.warning("Please log in to view the dashboard.")
        else:
            render_dashboard(user)

    elif selected_tab == "Events":
        # Events tab should always be accessible to logged-in users
        if not user:
            st.warning("Please log in to view events.")
        else:
            render_leave_event_button("main")
            enhanced_event_ui(user)

    elif selected_tab == "Recipes":
        # Recipes/Menu editor accessible to logged-in users
        if not user:
            st.warning("Please log in to view recipes.")
        else:
            recipes_page()

    elif selected_tab == "Ingredients":
        # Ingredients catalogue accessible to logged-in users
        if not user:
            st.warning("Please log in to view ingredients.")
        else:
            ingredient_catalogue_ui(user)

    elif selected_tab == "Allergies":
        # Allergies require login
        if not user:
            st.warning("Please log in to manage allergies.")
        else:
            allergy_management_ui(user)

    elif selected_tab == "Upload":
        # File upload requires login
        if not user:
            st.warning("Please log in to upload files.")
        else:
            render_upload_tab(user)

    elif selected_tab == "Receipts":
        # Receipts require login
        if not user:
            st.warning("Please log in to manage receipts.")
        else:
            receipt_upload_ui(user)

    elif selected_tab == "Packing":
        # Packing requires login
        if not user:
            st.warning("Please log in to manage packing.")
        else:
            packing_ui()

    elif selected_tab == "Post-Event":
        # Post-event requires login and appropriate role
        if not user:
            st.warning("Please log in to access post-event features.")
        else:
            post_event_ui(user)

    elif selected_tab == "Suggestions":
        # Suggestions require manager+ role
        if not user:
            st.warning("Please log in to view suggestions.")
        else:
            event_modifications_ui(user)

    elif selected_tab == "Bulk Suggestions":
        # Bulk suggestions require admin role
        if not user:
            st.warning("Please log in to access bulk suggestions.")
        else:
            bulk_suggestions_ui()

    elif selected_tab == "PDF Export":
        # PDF export requires login
        if not user:
            st.warning("Please log in to export PDFs.")
        else:
            pdf_export_ui()

    elif selected_tab == "Audit Logs":
        # Audit logs require login
        if not user:
            st.warning("Please log in to view audit logs.")
        else:
            audit_log_ui(user)

    elif selected_tab == "Explore Tags":
        # Tags can be viewed by logged-in users
        if not user:
            st.warning("Please log in to explore tags.")
        else:
            tag_merging_ui()

    elif selected_tab == "Admin Panel":
        # Admin panel requires admin role
        if not user:
            st.warning("Please log in to access admin features.")
        else:
            render_admin_panel(user)

    elif selected_tab == "Assistant":
        # Assistant requires login
        if not user:
            st.warning("Please log in to use the assistant.")
        else:
            ai_chat_ui()

# ----------------------------
# 📊 Enhanced Dashboard (PRESERVED AND ENHANCED)
# ----------------------------
def render_dashboard(user):
    if mobile_layout.is_mobile:
        mobile_layout.render_mobile_dashboard(user, get_active_event())
        return
    
    if PUBLIC_MODE:
        st.warning("Dashboard is private.")
        return

    if not user:
        st.warning("Please log in to view the dashboard.")
        return

    event = get_active_event()
    
    if event:
        # Active event dashboard
        col1, col2 = st.columns([3, 1])
        
        with col1:
            st.success(f"📅 Active Event: **{event.get('name', 'Unnamed')}**")
            st.markdown(f"📍 **Location:** {event.get('location', 'Unknown')}")
            st.markdown(f"🗓️ **Date:** {format_date(event.get('start_date'))} → {format_date(event.get('end_date'))}")
            
            if event.get('description'):
                st.markdown(f"📝 **Description:** {event.get('description')}")
        
        with col2:
            # Quick actions
            if st.button("Edit Event", use_container_width=True):
                st.session_state["editing_event_id"] = event["id"]
                st.session_state["show_event_dashboard"] = True
                st.session_state["top_nav"] = "Events"
                st.rerun()

        # Event metrics
        st.markdown("### 📈 Quick Stats")
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("👥 Guests", event.get("guest_count", "-"))
        with col2:
            st.metric("🧑‍🍳 Staff", event.get("staff_count", "-"))
        with col3:
            # Try to get menu count
            try:
                from db_client import db
                menu_docs = list(db.collection("menus").where("event_id", "==", event["id"]).stream())
                menu_count = len(menu_docs)
            except:
                menu_count = len(event.get("menu", []))
            st.metric("🍽️ Menu Items", menu_count)
        with col4:
            status = event.get("status", "planning")
            st.metric("📊 Status", status.title())

        # Today's checklist
        st.markdown("### ✅ Today's Checklist")
        checklist_items = [
            "Prep station setup complete",
            "Reviewed schedule with staff", 
            "Checked inventory and supplies",
            "Load equipment into transport",
            "Set up dishwashing station",
            "Final headcount confirmed"
        ]
        
        # Use columns for mobile-friendly checklist
        checklist_cols = st.columns(2)
        for i, item in enumerate(checklist_items):
            with checklist_cols[i % 2]:
                st.checkbox(item, key=f"checklist_{i}")

        # Quick access buttons
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
        # No active event dashboard
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

        # Show recent events for quick access
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

# ----------------------------
# 📁 Enhanced Upload Tab (PRESERVED)
# ----------------------------
def render_upload_tab(user):
    """Enhanced upload tab with analytics"""
    if not user:
        st.warning("Please log in to upload files.")
        return
    
    # Tabs for upload and analytics
    upload_tab, analytics_tab = st.tabs(["📤 Upload Files", "📊 File Analytics"])
    
    with upload_tab:
        file_manager_ui(user)
    
    with analytics_tab:
        show_file_analytics()

# ----------------------------
# 🔐 Admin Panel Tab (PRESERVED)
# ----------------------------
def render_admin_panel(user):
    """Render admin panel with proper permission checks"""
    if not user:
        st.warning("Please log in to access admin features.")
        return
    
    user_role = get_user_role(user)
    if user_role != "admin":
        st.warning("⚠️ Admin access required.")
        st.info(f"Your current role: {user_role}")
        return
    
    admin_panel_ui()

# ----------------------------
# 📱 Mobile Detection and Optimization (PRESERVED)
# ----------------------------
def detect_mobile():
    """Detect if user is on mobile device"""
    # This is a simplified detection - in a real app you might use JavaScript
    return st.session_state.get("mobile_detected", False)

def optimize_for_mobile():
    """Apply mobile-specific optimizations"""
    if detect_mobile():
        # Mobile-specific CSS
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

# ----------------------------
# 🧪 Error Handling (PRESERVED)
# ----------------------------
def handle_app_errors():
    """Global error handling for the app"""
    try:
        main()
    except Exception as e:
        st.error("🚨 An unexpected error occurred")
        st.exception(e)
        
        # Log error for debugging
        try:
            from db_client import db
            from utils import generate_id
            error_id = generate_id("error")
            db.collection("app_errors").document(error_id).set({
                "error": str(e),
                "user": st.session_state.get("user", {}).get("id", "unknown"),
                "timestamp": datetime.now(),
                "page": st.session_state.get("top_nav", "unknown")
            })
        except:
            pass  # Don't fail on error logging

# ----------------------------
# 🎯 Performance Monitoring (PRESERVED)
# ----------------------------
def monitor_performance():
    """Simple performance monitoring"""
    import time
    start_time = time.time()
    
    # Store start time
    st.session_state["page_load_start"] = start_time
    
    # This would be called at the end of rendering
    def log_performance():
        load_time = time.time() - start_time
        if load_time > 3:  # Log slow pages
            try:
                from db_client import db
                db.collection("performance_logs").add({
                    "page": st.session_state.get("top_nav", "unknown"),
                    "load_time": load_time,
                    "user": st.session_state.get("user", {}).get("id", "unknown"),
                    "timestamp": datetime.now()
                })
            except:
                pass

# ----------------------------
# 🏃 App Entry Point (PRESERVED)
# ----------------------------
if __name__ == "__main__":
    # Apply mobile optimizations
    optimize_for_mobile()
    
    # Monitor performance
    monitor_performance()
    
    # Run app with error handling
    handle_app_errors()
