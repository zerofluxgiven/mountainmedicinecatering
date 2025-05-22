import streamlit as st
from floating_ai_chat import integrate_floating_chat
from notifications import notifications_sidebar
from datetime import datetime
from auth import load_user_session, get_user_role
from utils import format_date, get_active_event
from layout import apply_theme
from layout import render_top_navbar
from layout import render_user_header
from layout import render_global_event_controls
from ui_components import show_event_mode_banner
from landing import show as show_landing
from events import enhanced_event_ui
from post_event import post_event_ui
from file_storage import file_manager_ui, show_file_analytics
from receipts import receipt_upload_ui
from pdf_export import pdf_export_ui
from menu_editor import menu_editor_ui
from event_planning_dashboard import event_planning_dashboard_ui
from event_modifications import event_modifications_ui
from bulk_suggestions import bulk_suggestions_ui
from audit import audit_log_ui
from tag_merging import tag_merging_ui
from admin_panel import admin_panel_ui

# ⚙️ Config
PUBLIC_MODE = False  # Set to True for guest access

# 📂 Updated Tab Routing (removed Assistant tab)
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
    "Admin Panel": "admin"
}

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

    # Configure page
    st.set_page_config(
        page_title="Mountain Medicine Catering", 
        layout="wide",
        initial_sidebar_state="collapsed"  # Start with collapsed sidebar for mobile
    )

    # 💅 Apply complete theme system
    apply_theme()

    # 🔧 Fix layout issues
    from ui_components import inject_layout_fixes
    inject_layout_fixes()

    # 🔐 Auth
    user = load_user_session()

    # 🪧 Public mode
    if PUBLIC_MODE and not user:
        show_landing()
        return

    # Show login form if no user and not in public mode
    if not user and not PUBLIC_MODE:
        from auth import show_login_form
        st.markdown("## 🌄 Mountain Medicine Catering")
        show_login_form()
        return

    # 🧭 Header with user info and global controls
    render_user_header()
    render_global_event_controls() # - This is already called in apply_theme()

    # 💬 Floating AI Assistant
    integrate_floating_chat()

    # 🧭 Main navigation
    st.markdown("## 🌄 Mountain Medicine Catering")
    
    # Event Mode banner
    show_event_mode_banner()
    
    # Top navigation
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
    # 🔀 Enhanced Tab Routing Logic
    # -----------------------------------
    if selected_tab == "Dashboard":
        render_dashboard(user)

    elif selected_tab == "Events":
        enhanced_event_ui(user)  # Use enhanced version with filters

    elif selected_tab == "Event Planner":
        render_event_planner(user)

    elif selected_tab == "Recipes":
        menu_editor_ui(user)

    elif selected_tab == "Upload":
        render_upload_tab(user)

    elif selected_tab == "Receipts":
        receipt_upload_ui(user)

    elif selected_tab == "Post-Event":
        post_event_ui(user)

    elif selected_tab == "Suggestions":
        event_modifications_ui(user)

    elif selected_tab == "Bulk Suggestions":
        bulk_suggestions_ui()

    elif selected_tab == "PDF Export":
        pdf_export_ui()

    elif selected_tab == "Audit Logs":
        audit_log_ui(user)

    elif selected_tab == "Explore Tags":
        if user:
            tag_merging_ui()
        else:
            st.info("🔒 Login required to manage tags.")

    elif selected_tab == "Admin Panel":
        render_admin_panel(user)

# ----------------------------
# 📊 Enhanced Dashboard
# ----------------------------
def render_dashboard(user):
    """Enhanced dashboard with better layout and mobile support"""
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
                st.session_state["top_nav"] = "Event Planner"
                st.rerun()

        # Event metrics
        st.markdown("### 📈 Quick Stats")
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("👥 Guests", event.get("guest_count", "-"))
        with col2:
            st.metric("🧑‍🍳 Staff", event.get("staff_count", "-"))
        with col3:
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
        action_cols = st.columns(3)
        
        with action_cols[0]:
            if st.button("📋 View Menu", use_container_width=True):
                st.session_state["top_nav"] = "Recipes"
                st.rerun()
        
        with action_cols[1]:
            if st.button("📁 Upload Files", use_container_width=True):
                st.session_state["top_nav"] = "Upload"
                st.rerun()
        
        with action_cols[2]:
            if st.button("🛒 Shopping Lists", use_container_width=True):
                # Quick AI prompt for shopping list
                st.session_state.ai_quick_prompt = "Generate a shopping list for the active event"
                st.session_state.chat_open = True
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

# ----------------------------
# 📅 Event Planner Tab
# ----------------------------
def render_event_planner(user):
    """Render event planner with proper checks"""
    if not user:
        st.warning("Please log in to use the event planner.")
        return
        
    if "editing_event_id" in st.session_state:
        event_planning_dashboard_ui(st.session_state["editing_event_id"])
    else:
        st.info("Select an event to edit from the Events tab.")
        
        # Show recent events for quick access
        try:
            from events import get_all_events
            events = get_all_events()
            recent_events = [e for e in events if not e.get("deleted")][:5]
            
            if recent_events:
                st.markdown("### 📋 Recent Events")
                for event in recent_events:
                    col1, col2 = st.columns([3, 1])
                    with col1:
                        st.write(f"**{event.get('name', 'Unnamed')}** - {event.get('status', 'planning')}")
                    with col2:
                        if st.button("Edit", key=f"quick_edit_{event['id']}"):
                            st.session_state["editing_event_id"] = event["id"]
                            st.rerun()
        except Exception as e:
            st.error(f"Could not load recent events: {e}")

# ----------------------------
# 📁 Enhanced Upload Tab
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
# 🔐 Admin Panel Tab
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
# 📱 Mobile Detection and Optimization
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
# 🧪 Error Handling
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
# 🎯 Performance Monitoring
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
# 🏃 App Entry Point
# ----------------------------
if __name__ == "__main__":
    # Apply mobile optimizations
    optimize_for_mobile()
    
    # Monitor performance
    monitor_performance()
    
    # Run app with error handling
    handle_app_errors()
