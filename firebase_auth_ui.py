# auth.py - Complete authentication system with Google OAuth support

import streamlit as st
from utils import session_get, session_set
import functools
from datetime import datetime

# Use centralized database client
from db_client import db

USER_COLLECTION = "users"

# ------------------------------
# 📥 Load User from Session
# ------------------------------

def load_user_session() -> dict | None:
    """Returns the user dict stored in session, or None if not logged in."""
    if "user" in st.session_state:
        return st.session_state["user"]

    user = session_get("user")
    if user:
        st.session_state["user"] = user
        return user

    # Don't show login form here - let calling code handle it
    return None

def show_login_form() -> None:
    """Displays the login form with email and Google options"""
    st.subheader("🔐 Login to Mountain Medicine")
    
    # Google Sign-In option
    st.markdown("### 🚀 Quick Sign-In")
    
    # Import Google auth UI component
    try:
        from firebase_auth_ui import render_google_auth_button
        
        st.markdown("**Sign in with Google for fastest access:**")
        google_result = render_google_auth_button()
        
        if google_result:
            handle_google_auth(google_result)
            return
            
        st.markdown("---")
        
    except ImportError:
        st.info("Google Sign-In temporarily unavailable. Please use email login below.")
    except Exception as e:
        st.warning(f"Google Sign-In error: {e}. Please use email login below.")
    
    # Email login form
    st.markdown("### 📧 Sign in with Email")
    
    with st.form("login_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            email = st.text_input(
                "Email Address", 
                placeholder="your.email@example.com",
                help="Enter your email address"
            )
        
        with col2:
            name = st.text_input(
                "Display Name", 
                placeholder="Your Name",
                help="How you'd like to be displayed in the app"
            )
        
        # Terms acceptance
        terms_accepted = st.checkbox(
            "I agree to the terms of service and privacy policy", 
            help="Required to create an account"
        )
        
        submitted = st.form_submit_button("🔑 Sign In / Create Account", type="primary")

        if submitted:
            if not email or "@" not in email:
                st.error("❌ Please enter a valid email address")
            elif not terms_accepted:
                st.error("❌ Please accept the terms of service to continue")
            else:
                # Create user with email
                handle_email_auth(email, name or email.split("@")[0])

def handle_email_auth(email: str, name: str) -> None:
    """Handle email-based authentication (simplified)"""
    try:
        # Create user ID from email
        user_id = email.lower().replace("@", "_at_").replace(".", "_dot_")
        
        user_data = {
            "id": user_id,
            "email": email,
            "name": name,
            "auth_provider": "email",
            "last_login": datetime.utcnow(),
            "created_at": datetime.utcnow()
        }
        
        # Check if user exists
        existing_user = db.collection(USER_COLLECTION).document(user_id).get()
        
        if existing_user.exists:
            # Update existing user
            existing_data = existing_user.to_dict()
            user_data["role"] = existing_data.get("role", "viewer")
            user_data["created_at"] = existing_data.get("created_at", datetime.utcnow())
            
            # Update last login
            db.collection(USER_COLLECTION).document(user_id).update({
                "name": name,  # Allow name updates
                "last_login": datetime.utcnow()
            })
        else:
            # New user - set default role
            user_data["role"] = "viewer"
            db.collection(USER_COLLECTION).document(user_id).set(user_data)
        
        # Set session
        session_set("user", user_data)
        st.session_state["user"] = user_data
        
        st.success(f"✅ Welcome, {name}!")
        st.rerun()
        
    except Exception as e:
        st.error(f"❌ Login failed: {e}")

def handle_google_auth(google_user: dict) -> None:
    """Process Google authenticated user"""
    try:
        user_id = google_user['uid']
        email = google_user['email']
        name = google_user.get('displayName', email.split('@')[0])
        
        # Create/update user in Firestore
        user_data = {
            "id": user_id,
            "email": email,
            "name": name,
            "auth_provider": "google",
            "photo_url": google_user.get('photoURL'),
            "last_login": datetime.utcnow()
        }
        
        # Check if user exists
        existing_user = db.collection(USER_COLLECTION).document(user_id).get()
        
        if existing_user.exists:
            # Update last login and preserve role
            existing_data = existing_user.to_dict()
            user_data["role"] = existing_data.get("role", "viewer")
            user_data["created_at"] = existing_data.get("created_at", datetime.utcnow())
            
            db.collection(USER_COLLECTION).document(user_id).update({
                "last_login": datetime.utcnow(),
                "photo_url": google_user.get('photoURL'),
                "name": name  # Update name in case it changed
            })
        else:
            # New user - set default role and creation date
            user_data["role"] = "viewer"
            user_data["created_at"] = datetime.utcnow()
            db.collection(USER_COLLECTION).document(user_id).set(user_data)
        
        # Set session
        session_set("user", user_data)
        st.session_state["user"] = user_data
        
        st.success(f"✅ Welcome back, {name}!")
        st.rerun()
        
    except Exception as e:
        st.error(f"❌ Google authentication failed: {e}")

def logout() -> None:
    """Logs out the current user."""
    # Clear session state
    if "user" in st.session_state:
        del st.session_state["user"]
    
    # Clear session storage
    session_set("user", None)
    
    # Clear any Google auth state
    try:
        from firebase_auth_ui import sign_out_google
        sign_out_google()
    except (ImportError, AttributeError):
        pass  # Google auth not available
    
    st.success("👋 Logged out successfully")
    st.rerun()

# ------------------------------
# 🔐 Permission + Identity
# ------------------------------

def get_user_id(user: dict | None) -> str | None:
    """Get user ID from user dict"""
    return user.get("id") if user else None

def get_user_role(user: dict | None) -> str:
    """Returns user role or 'viewer' if not set."""
    if not user:
        return "viewer"
    
    try:
        # First check session state for cached role
        if "role" in user:
            return user["role"]
        
        # Fallback to database lookup
        doc = db.collection(USER_COLLECTION).document(user["id"]).get()
        if doc.exists:
            role = doc.to_dict().get("role", "viewer")
            # Cache role in session
            user["role"] = role
            return role
    except Exception as e:
        st.error(f"⚠️ Could not fetch user role: {e}")
    
    return "viewer"

def check_role(user: dict | None, role_required: str) -> bool:
    """Check if user has required role or higher"""
    roles = ["viewer", "user", "manager", "admin"]
    
    try:
        current_role = get_user_role(user)
        return roles.index(current_role) >= roles.index(role_required)
    except (ValueError, IndexError):
        return False

def require_role(required_role: str):
    """Decorator that restricts function to users with given role or higher."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            user = st.session_state.get("user")
            if not check_role(user, required_role):
                st.warning(f"🔒 Access denied. Requires '{required_role}' role or higher.")
                st.info(f"Your current role: {get_user_role(user)}")
                return
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def require_login(fn):
    """Decorator that blocks access to a function unless a user is logged in."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        user = st.session_state.get("user")
        if not user:
            st.warning("🔐 Please log in to continue.")
            show_login_form()
            return
        return fn(*args, **kwargs)
    return wrapper

# ------------------------------
# 👤 User Profile Functions
# ------------------------------

def get_user_profile(user_id: str) -> dict | None:
    """Get complete user profile by ID"""
    try:
        doc = db.collection(USER_COLLECTION).document(user_id).get()
        if doc.exists:
            return doc.to_dict()
        return None
    except Exception as e:
        st.error(f"⚠️ Could not fetch user profile: {e}")
        return None

def update_user_profile(user_id: str, updates: dict) -> bool:
    """Update user profile"""
    try:
        # Add update timestamp
        updates["updated_at"] = datetime.utcnow()
        
        db.collection(USER_COLLECTION).document(user_id).update(updates)
        
        # Update session state if it's the current user
        current_user = st.session_state.get("user")
        if current_user and current_user.get("id") == user_id:
            current_user.update(updates)
            st.session_state["user"] = current_user
        
        return True
    except Exception as e:
        st.error(f"❌ Failed to update profile: {e}")
        return False

# ------------------------------
# 📋 User Management
# ------------------------------

def get_all_users() -> list[dict]:
    """Returns all users with their role and ID."""
    try:
        docs = db.collection(USER_COLLECTION).stream()
        users = []
        for doc in docs:
            user_data = doc.to_dict()
            user_data["id"] = doc.id
            users.append(user_data)
        return users
    except Exception as e:
        st.error(f"⚠️ Could not fetch user list: {e}")
        return []

def update_user_role(user_id: str, new_role: str) -> bool:
    """Update a user's role"""
    try:
        db.collection(USER_COLLECTION).document(user_id).update({
            "role": new_role,
            "role_updated_at": datetime.utcnow()
        })
        
        st.success(f"✅ User role updated to {new_role}")
        return True
    except Exception as e:
        st.error(f"❌ Failed to update user role: {e}")
        return False

def deactivate_user(user_id: str) -> bool:
    """Deactivate a user account"""
    try:
        db.collection(USER_COLLECTION).document(user_id).update({
            "active": False,
            "deactivated_at": datetime.utcnow()
        })
        return True
    except Exception as e:
        st.error(f"❌ Failed to deactivate user: {e}")
        return False

# ------------------------------
# 🔍 User Search and Analytics
# ------------------------------

def search_users(query: str) -> list[dict]:
    """Search users by name or email"""
    try:
        all_users = get_all_users()
        query_lower = query.lower()
        
        matching_users = []
        for user in all_users:
            name_match = query_lower in user.get("name", "").lower()
            email_match = query_lower in user.get("email", "").lower()
            
            if name_match or email_match:
                matching_users.append(user)
        
        return matching_users
    except Exception as e:
        st.error(f"⚠️ User search failed: {e}")
        return []

def get_user_stats() -> dict:
    """Get user statistics"""
    try:
        users = get_all_users()
        
        stats = {
            "total_users": len(users),
            "active_users": len([u for u in users if u.get("active", True)]),
            "google_users": len([u for u in users if u.get("auth_provider") == "google"]),
            "email_users": len([u for u in users if u.get("auth_provider") == "email"]),
            "roles": {}
        }
        
        # Count by role
        for user in users:
            role = user.get("role", "viewer")
            stats["roles"][role] = stats["roles"].get(role, 0) + 1
        
        return stats
    except Exception as e:
        st.error(f"⚠️ Could not calculate user stats: {e}")
        return {}

# ------------------------------
# 🛡️ Security Functions
# ------------------------------

def log_auth_attempt(email: str, success: bool, method: str = "email") -> None:
    """Log authentication attempts for security"""
    try:
        db.collection("auth_logs").add({
            "email": email,
            "success": success,
            "method": method,
            "timestamp": datetime.utcnow(),
            "ip_address": "unknown",  # Could be enhanced with real IP detection
        })
    except Exception:
        pass  # Don't fail auth if logging fails

def check_user_permissions(user: dict, resource: str, action: str) -> bool:
    """Advanced permission checking for specific resources and actions"""
    if not user:
        return False
    
    role = get_user_role(user)
    
    # Define permission matrix
    permissions = {
        "admin": ["*"],  # Admin can do everything
        "manager": [
            "events:create", "events:edit", "events:delete",
            "menus:create", "menus:edit", "menus:delete",
            "users:view", "files:manage", "suggestions:approve"
        ],
        "user": [
            "events:view", "events:create", "events:edit_own",
            "menus:view", "menus:create", "files:upload",
            "suggestions:create"
        ],
        "viewer": [
            "events:view", "menus:view", "files:view"
        ]
    }
    
    user_permissions = permissions.get(role, [])
    
    # Check wildcard permission (admin)
    if "*" in user_permissions:
        return True
    
    # Check specific permission
    permission_key = f"{resource}:{action}"
    return permission_key in user_permissions

# ------------------------------
# 🔄 Migration and Maintenance
# ------------------------------

def migrate_legacy_users() -> int:
    """Migrate users from old auth system if needed"""
    try:
        users = get_all_users()
        migrated_count = 0
        
        for user in users:
            # Add missing fields for legacy users
            updates = {}
            
            if "created_at" not in user:
                updates["created_at"] = datetime.utcnow()
            
            if "last_login" not in user:
                updates["last_login"] = datetime.utcnow()
            
            if "active" not in user:
                updates["active"] = True
            
            if "auth_provider" not in user:
                updates["auth_provider"] = "email"  # Assume legacy users are email
            
            if updates:
                db.collection(USER_COLLECTION).document(user["id"]).update(updates)
                migrated_count += 1
        
        return migrated_count
    except Exception as e:
        st.error(f"Migration failed: {e}")
        return 0

# ------------------------------
# 🎨 UI Helper Functions
# ------------------------------

def render_user_avatar(user: dict, size: int = 40) -> None:
    """Render user avatar (photo or initials)"""
    if not user:
        return
    
    photo_url = user.get("photo_url")
    name = user.get("name", "User")
    
    if photo_url:
        # Display photo
        avatar_html = f"""
        <img src="{photo_url}" 
             alt="{name}" 
             style="width: {size}px; height: {size}px; border-radius: 50%; object-fit: cover;">
        """
    else:
        # Display initials
        initials = "".join([word[0].upper() for word in name.split()[:2]])
        avatar_html = f"""
        <div style="
            width: {size}px; 
            height: {size}px; 
            border-radius: 50%; 
            background-color: #6C4AB6; 
            color: white; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-weight: bold;
            font-size: {size//3}px;
        ">
            {initials}
        </div>
        """
    
    st.markdown(avatar_html, unsafe_allow_html=True)

def render_user_badge(user: dict) -> None:
    """Render user info badge"""
    if not user:
        return
    
    role = get_user_role(user)
    role_colors = {
        "admin": "#dc3545",
        "manager": "#fd7e14", 
        "user": "#198754",
        "viewer": "#6c757d"
    }
    
    color = role_colors.get(role, "#6c757d")
    
    badge_html = f"""
    <div style="
        display: inline-flex; 
        align-items: center; 
        gap: 0.5rem; 
        padding: 0.25rem 0.75rem; 
        background-color: {color}; 
        color: white; 
        border-radius: 1rem; 
        font-size: 0.875rem;
        font-weight: 500;
    ">
        👤 {user.get('name', 'User')} ({role})
    </div>
    """
    
    st.markdown(badge_html, unsafe_allow_html=True)

# ------------------------------
# 🚀 Initialization
# ------------------------------

def initialize_auth_system() -> None:
    """Initialize the authentication system"""
    try:
        # Ensure required collections exist
        # This is just a check - Firestore creates collections automatically
        test_doc = db.collection(USER_COLLECTION).limit(1).get()
        
        # Run any necessary migrations
        if st.session_state.get("auth_initialized") != True:
            migrated = migrate_legacy_users()
            if migrated > 0:
                st.info(f"✅ Auth system initialized. Migrated {migrated} legacy users.")
            
            st.session_state["auth_initialized"] = True
            
    except Exception as e:
        st.error(f"⚠️ Auth system initialization failed: {e}")
