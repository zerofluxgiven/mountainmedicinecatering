import streamlit as st
import streamlit.components.v1 as components
from datetime import datetime

from auth import get_user, get_user_role
from user_session_initializer import enrich_session_from_token
from layout import apply_theme, render_top_navbar, render_enhanced_sidebar, render_leave_event_button
from ui_components import show_event_mode_banner, inject_layout_fixes
from utils import format_date, get_active_event, session_get, log_user_action
from dashboard import render_dashboard
from mobile_layout import mobile_layout
from mobile_components import mobile_safe_columns
from notifications import notifications_sidebar
from landing import show as show_landing
from events import enhanced_event_ui, get_all_events
from post_event import post_event_ui
from file_storage import file_manager_ui, show_file_analytics
from receipts import receipt_upload_ui
from upload import upload_ui_desktop, upload_ui_mobile
from pdf_export import pdf_export_ui
from event_planning_dashboard import event_planning_dashboard_ui
from event_modifications import event_modifications_ui
from bulk_suggestions import bulk_suggestions_ui
from audit import audit_log_ui
from roles import role_admin_ui as admin_panel_ui
from ingredients import ingredient_catalogue_ui
from allergies import allergy_management_ui
from packing import packing_ui
from ai_chat import ai_chat_ui
from recipes import recipes_page
from admin_utilities import admin_utilities_ui
from historical_menus import historical_menus_ui

# Add custom JavaScript for better session handling
components.html("""
<script>
// Keep session alive
let lastActivity = Date.now();
let sessionCheckInterval;

// Update activity timestamp on any interaction
document.addEventListener('click', () => { lastActivity = Date.now(); });
document.addEventListener('keypress', () => { lastActivity = Date.now(); });
document.addEventListener('scroll', () => { lastActivity = Date.now(); });

// Check session periodically
function checkSession() {
  const token = localStorage.getItem("mm_token");
  const expiry = parseInt(localStorage.getItem("mm_token_expiry") || "0", 10);
  const now = Date.now();
  
  // If token is valid and user is active, keep session alive
  if (token && now < expiry && (now - lastActivity) < 300000) { // 5 minutes
    return;
  }
  
  // If token expired, redirect to login
  if (!token || now >= expiry) {
    clearInterval(sessionCheckInterval);
    window.location.href = 'https://mountainmedicine-6e572.web.app/?reason=expired';
  }
}

// Check session every 30 seconds
sessionCheckInterval = setInterval(checkSession, 30000);

function shouldRedirect() {
  const token = localStorage.getItem("mm_token");
  const device = localStorage.getItem("mm_device") || "desktop";
  const expiry = parseInt(localStorage.getItem("mm_token_expiry") || "0", 10);
  const now = Date.now();

  if (!token || now >= expiry) return;

  const url = new URL(window.location.href);
  const hasTokenParam = url.searchParams.has("token");

  if (!hasTokenParam) {
    const newUrl = url.pathname + `?token=${token}&device=${device}`;
    window.location.replace(newUrl);
  }
}

// 🔁 Try every 5 seconds if no token param
setInterval(() => {
  shouldRedirect();
}, 5000);

// 📅 Also run when user returns to the tab
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    shouldRedirect();
  }
});
</script>
""", height=0)

st.set_page_config(
    page_title="Mountain Medicine Catering",
    page_icon="public/mountain_logo.png",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown("""
<style>
#MainMenu, .stDeployButton, footer, header {
    visibility: hidden;
}
div[data-testid='stRadio'] > label {
    display: none;
}
/* Remove all top padding */
.main .block-container {
    padding-top: 0rem !important;
    max-width: 100%;
}
[data-testid="stAppViewContainer"] {
    padding-top: 0 !important;
}
.stApp {
    padding-top: 0 !important;
}
.stApp > div:first-child {
    padding-top: 0 !important;
}
/* Remove the decorative rainbow bar */
[data-testid="stDecoration"] {
    display: none !important;
}
</style>
""", unsafe_allow_html=True)


PUBLIC_MODE = False

def enforce_session_expiry():
    expiry_ts = st.session_state.get("token_expiry")
    if expiry_ts and datetime.utcnow().timestamp() > expiry_ts:
        st.session_state.pop("user", None)
        st.session_state.pop("token_expiry", None)
        with st.empty():
            components.html("""
            <div style="font-family:sans-serif; padding:2rem; text-align:center;">
              <h2>Session expired</h2>
              <p>Redirecting to login...</p>
            </div>
            <script>
              localStorage.removeItem("mm_token");
              localStorage.removeItem("mm_token_expiry");
              localStorage.removeItem("mm_remember");
              localStorage.removeItem("mm_token_handled");
              window.location.href='https://mountainmedicine-6e572.web.app/?reason=expired';
            </script>
            """, height=200)
        st.stop()

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
            from firebase_init import db
            user_doc = db.collection("users").document(user_id).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                last_event = user_data.get("last_active_event")
                if last_event:
                    st.session_state["recent_event_id"] = last_event
        except Exception:
            pass

def handle_auth():
    query_params = st.query_params

    if query_params.get("logout") == ["true"]:
        log_user_action("logout")
        keys_to_preserve = ["top_nav"]
        preserved = {k: st.session_state[k] for k in keys_to_preserve if k in st.session_state}
        st.session_state.clear()
        st.session_state.update(preserved)
        st.toast("You have been logged out")

        st.markdown(
            """
            <script>
              localStorage.removeItem('mm_token');
              localStorage.removeItem('mm_token_expiry');
              localStorage.removeItem('mm_token_handled');
              localStorage.removeItem('mm_device');
            </script>
            """,
            unsafe_allow_html=True,
        )
        
        components.html(
            """
            <meta http-equiv="refresh" content="0;url=https://mountainmedicine-6e572.web.app/?reason=logout">
            """,
            height=0
        )
        st.stop()

    if "token" in query_params and "user" not in st.session_state:
        token = query_params.get("token")
        if isinstance(token, list):
            token = token[0]
        device = query_params.get("device", ["desktop"])[0]
        st.session_state["device_type"] = device
        st.session_state["mobile_mode"] = (device == "mobile")
        st.session_state["__mobile_mode_initialized"] = True

        user = enrich_session_from_token(token)

        if user:
            st.session_state["user"] = user
            if not st.session_state.get("__welcome_shown"):
                st.toast(f"Welcome {user.get('name', 'back')} 👋")
                st.session_state["__welcome_shown"] = True
            log_user_action(user.get("id", "unknown"), user.get("role", "viewer"), "login")
            st.query_params.clear()
        else:
            st.session_state.clear()
            st.session_state["__redirect_fallback"] = True
            with st.empty():
                components.html("""
                <meta http-equiv="refresh" content="0;url=https://mountainmedicine-6e572.web.app/?reason=expired">
                """, height=0)
            st.stop()

    elif "user" not in st.session_state and "token" not in query_params:
        # Try to recover session from localStorage
        components.html("""
        <script>
        // Add small delay to prevent race conditions
        setTimeout(() => {
            const token = localStorage.getItem("mm_token") || "";
            const device = localStorage.getItem("mm_device") || "desktop";
            const expiry = parseInt(localStorage.getItem("mm_token_expiry") || "0", 10);
            const now = Date.now();
            
            if (token && now < expiry) {
              // Valid token, redirect with it
              window.location.href = window.location.pathname + `?token=${token}&device=${device}`;
            } else {
              // No valid token, go to login
              window.location.href = "https://mountainmedicine-6e572.web.app/?reason=unauthenticated";
            }
        }, 100);
        </script>
        """, height=0)
        st.stop()

def validate_tab_state(visible_tabs):
    if "top_nav" not in st.session_state or st.session_state["top_nav"] not in visible_tabs:
        st.session_state["top_nav"] = visible_tabs[0] if visible_tabs else "Dashboard"

def main():
    enforce_session_expiry()
    handle_auth()
    user = get_user()

    if PUBLIC_MODE and not user:
        show_landing()
        return

    if st.session_state.get("active_event_id"):
        show_event_mode_banner()


    apply_theme()
    inject_layout_fixes()

    if not st.session_state.get("__mobile_mode_initialized"):
        device = st.query_params.get("device", ["desktop"])[0]
        st.session_state["mobile_mode"] = (device == "mobile")
        st.session_state["__mobile_mode_initialized"] = True

    default_state = {
        "top_nav": "Dashboard",
        "mobile_detected": st.session_state.get("mobile_mode", False),
        "next_nav": None,
        "active_event": None,
        "active_event_id": None,
        "recent_event_id": None,
        "editing_event_id": None,
        "editing_menu_event_id": None,
        "viewing_menu_event_id": None,
        "show_menu_form": False,
        "current_file_data": b"",
    }
    for k, v in default_state.items():
        if k not in st.session_state:
            st.session_state[k] = v

    initialize_event_mode_state()

    from firebase_init import db, firestore

    TABS = {
        "Dashboard": render_dashboard,
        "Events": enhanced_event_ui,
        "Recipes": recipes_page,
        "Ingredients": ingredient_catalogue_ui,
        "Allergies": allergy_management_ui,
        "Historical Menus": historical_menus_ui,
        "Upload": file_manager_ui,
        "Receipts": receipt_upload_ui,
        "Admin Panel": render_admin_panel,
        "Assistant": ai_chat_ui
    }

    visible_tabs = list(TABS.keys())
    role = user.get("role", "viewer") if user else "viewer"
    if user:
        st.session_state["user"] = user
        st.session_state["token_expiry"] = user.get("token_expiry")  # ✅ Add this line
        st.query_params.clear()
    if role != "admin":
        for admin_tab in ["Admin Panel"]:
            if admin_tab in visible_tabs:
                visible_tabs.remove(admin_tab)

    validate_tab_state(visible_tabs)
    selected_tab = render_top_navbar(visible_tabs)

    if selected_tab in TABS:
        try:
            if selected_tab == "Upload":
                upload_ui_mobile() if st.session_state.get("mobile_mode") else upload_ui_desktop()
                show_file_analytics()
            else:
                TABS[selected_tab](user)
        except Exception as e:
            st.error(f"Failed to render '{selected_tab}': {e}")
    else:
        st.warning(f"⚠️ Unknown tab: {selected_tab}")

def render_admin_panel(user):
    role = get_user_role()
    if role != "admin":
        st.warning("Access denied. Admins only.")
        return
    admin_panel_ui()

main()
