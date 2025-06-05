# auth.py - Firebase Auth Compatibility Layer

from firebase_auth_ui import (
    get_current_user,
    get_user_role as firebase_get_user_role, 
    get_user_id as firebase_get_user_id,
    is_user_logged_in,
    require_auth,
    require_role,
    check_role as firebase_check_role,
    get_all_users as firebase_get_all_users,
    firebase_auth_ui
)
import streamlit as st
from utils import session_get, session_set
import functools
from datetime import datetime

# Use centralized database client
from firebase_init import db, firestore

USER_COLLECTION = "users"

# ------------------------------
# 📥 Load User from Session (Legacy Compatibility)
# ------------------------------

def load_user_session() -> dict | None:
    """Legacy function - returns current Firebase user"""
    return get_current_user()

def show_login_form() -> None:
    """Legacy function - use firebase_auth_ui instead"""
    return firebase_auth_ui()

def logout() -> None:
    """Logs out the current user."""
    from firebase_auth_ui import logout_user
    logout_user()
    st.success("👋 Logged out successfully")
    st.rerun()

# ------------------------------
# 🔐 Permission + Identity (Updated for Firebase)
# ------------------------------

def get_user_id(user: dict | None = None) -> str | None:
    """Get user ID from user dict"""
    return firebase_get_user_id(user)

def get_user_role(user: dict | None = None) -> str:
    """Returns user role or 'viewer' if not set."""
    return firebase_get_user_role(user)

def check_role(user: dict | None, role_required: str) -> bool:
    """Check if user has required role or higher"""
    return firebase_check_role(user, role_required)

def require_login(fn):
    """Decorator that blocks access to a function unless a user is logged in."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        if not is_user_logged_in():
            st.warning("🔐 Please log in to continue.")
            firebase_auth_ui()
            return
        return fn(*args, **kwargs)
    return wrapper

# ------------------------------
# 👤 User Profile Functions (Updated for Firebase)
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
        current_user = get_current_user()
        if current_user and current_user.get("id") == user_id:
            current_user.update(updates)
            st.session_state["firebase_user"] = current_user
        
        return True
    except Exception as e:
        st.error(f"❌ Failed to update profile: {e}")
        return False

# ------------------------------
# 📋 User Management (Updated for Firebase)
# ------------------------------

def get_all_users() -> list[dict]:
    """Returns all users with their role and ID."""
    return firebase_get_all_users()

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
        # Update in Firestore
        db.collection(USER_COLLECTION).document(user_id).update({
            "active": False,
            "deactivated_at": datetime.utcnow()
        })
        
        # Revoke Firebase sessions
        from firebase_auth_ui import auth_manager
        auth_manager._revoke_all_user_sessions(user_id)
        
        return True
    except Exception as e:
        st.error(f"❌ Failed to deactivate user: {e}")
        return False

# ------------------------------
# 🔍 User Search and Analytics (Preserved)
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
            "verified_users": len([u for u in users if u.get("email_verified", False)]),
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
# 🛡️ Security Functions (Enhanced for Firebase)
# ------------------------------

def log_auth_attempt(email: str, success: bool, method: str = "firebase") -> None:
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
# 🔄 Migration and Maintenance (Firebase Enhanced)
# ------------------------------

def sync_firebase_users() -> int:
    """Sync Firebase users with Firestore"""
    try:
        from firebase_admin import auth as firebase_auth
        
        # Get all Firebase users
        firebase_users = firebase_auth.list_users().users
        synced_count = 0
        
        for fb_user in firebase_users:
            # Check if user exists in Firestore
            user_doc = db.collection(USER_COLLECTION).document(fb_user.uid).get()
            
            if not user_doc.exists:
                # Create user in Firestore
                role = "admin" if fb_user.email in ["mistermcfarland@gmail.com"] else "viewer"
                user_data = {
                    "id": fb_user.uid,
                    "email": fb_user.email,
                    "name": fb_user.display_name or fb_user.email.split('@')[0],
                    "role": role,
                    "created_at": datetime.utcnow(),
                    "last_login": datetime.utcnow(),
                    "active": True,
                    "email_verified": fb_user.email_verified
                }
                db.collection(USER_COLLECTION).document(fb_user.uid).set(user_data)
                synced_count += 1
            else:
                # Update existing user with Firebase data
                db.collection(USER_COLLECTION).document(fb_user.uid).update({
                    "email_verified": fb_user.email_verified,
                    "email": fb_user.email,
                    "name": fb_user.display_name or fb_user.email.split('@')[0]
                })
        
        return synced_count
    except Exception as e:
        st.error(f"Firebase sync failed: {e}")
        return 0

def delete_firebase_user(user_id: str) -> bool:
    """Delete user from both Firebase and Firestore"""
    try:
        from firebase_admin import auth as firebase_auth
        from firebase_auth_ui import auth_manager
        
        # Delete from Firebase Auth
        firebase_auth.delete_user(user_id)
        
        # Delete from Firestore
        db.collection(USER_COLLECTION).document(user_id).delete()
        
        # Revoke all sessions
        auth_manager._revoke_all_user_sessions(user_id)
        
        return True
    except Exception as e:
        st.error(f"Failed to delete user: {e}")
        return False

# ------------------------------
# 🎨 UI Helper Functions (Preserved)
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
    verified_icon = "✅" if user.get("email_verified", False) else "⚠️"
    
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
        👤 {user.get('name', 'User')} ({role}) {verified_icon}
    </div>
    """
    
    st.markdown(badge_html, unsafe_allow_html=True)

# ------------------------------
# 🚀 Initialization (Firebase Enhanced)
# ------------------------------

def initialize_auth_system() -> None:
    """Initialize the Firebase authentication system"""
    try:
        # Sync Firebase users to Firestore if needed
        if st.session_state.get("auth_initialized") != True:
            synced = sync_firebase_users()
            if synced > 0:
                st.info(f"✅ Firebase auth system initialized. Synced {synced} users.")
            
            st.session_state["auth_initialized"] = True
            
    except Exception as e:
        st.error(f"⚠️ Auth system initialization failed: {e}")
