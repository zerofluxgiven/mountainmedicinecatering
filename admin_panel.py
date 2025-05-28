# roles.py - Updated for Firebase Authentication

import streamlit as st
from firebase_init import db
from auth import require_role, get_current_user, get_user_role as auth_get_user_role

db = firestore.client()
COLLECTION = "users"

# ----------------------------
# 🔍 Fetch Roles (Updated for Firebase)
# ----------------------------

def get_all_users() -> list[dict]:
    """Returns all user documents from Firestore."""
    try:
        # Sync Firebase users first
        from auth import sync_firebase_users
        sync_firebase_users()
        
        docs = db.collection(COLLECTION).stream()
        return [doc.to_dict() | {"id": doc.id} for doc in docs]
    except Exception as e:
        st.error(f"Failed to get users: {e}")
        return []

def get_user_role(user_id: str) -> str:
    """Returns a user's role by ID, defaulting to 'viewer'."""
    doc = db.collection(COLLECTION).document(user_id).get()
    if doc.exists:
        return doc.to_dict().get("role", "viewer")
    
    # Try to get from Firebase if not in Firestore
    try:
        from firebase_admin import auth as firebase_auth
        firebase_user = firebase_auth.get_user(user_id)
        # Create user record in Firestore
        role = "admin" if firebase_user.email in ["mistermcfarland@gmail.com"] else "viewer"
        user_data = {
            "id": user_id,
            "email": firebase_user.email, 
            "name": firebase_user.display_name or firebase_user.email.split('@')[0],
            "role": role,
            "created_at": datetime.utcnow(),
            "active": True,
            "email_verified": firebase_user.email_verified
        }
        db.collection(COLLECTION).document(user_id).set(user_data)
        return role
    except:
        return "viewer"

# ----------------------------
# 🔄 Update Role (Firebase Enhanced)
# ----------------------------

def update_user_role(user_id: str, role: str) -> None:
    """Updates a user's role in Firestore and logs the change."""
    try:
        # Update role in Firestore
        db.collection(COLLECTION).document(user_id).update({
            "role": role,
            "role_updated_at": datetime.utcnow()
        })
        
        # Log the role change
        current_user = get_current_user()
        db.collection("logs").add({
            "action": "role_update",
            "target_user_id": user_id,
            "new_role": role,
            "updated_by": current_user.get("id") if current_user else "system",
            "timestamp": datetime.utcnow()
        })
        
        st.success(f"✅ Role updated to **{role}**")
        
        # Send notification
        from notifications import send_notification
        user_doc = db.collection(COLLECTION).document(user_id).get()
        if user_doc.exists:
            user_name = user_doc.to_dict().get("name", "Unknown")
            send_notification(
                f"Role updated for {user_name}: {role}",
                role="admin"
            )
            
    except Exception as e:
        st.error(f"Failed to update role: {e}")

# ----------------------------
# ⚙️ Admin UI (Firebase Enhanced)
# ----------------------------

def role_admin_ui() -> None:
    """Displays the role management panel (admin-only) with Firebase integration."""
    st.subheader("👥 User Role Management")

    current_user = get_current_user()
    if not current_user or auth_get_user_role(current_user) != "admin":
        st.warning("Only admins can view or change user roles.")
        return

    # Get all users
    users = get_all_users()
    
    if not users:
        st.info("No users found. Users will appear here after they register.")
        return
    
    # Statistics
    role_stats = {}
    for user in users:
        role = user.get("role", "viewer")
        role_stats[role] = role_stats.get(role, 0) + 1
    
    st.markdown("### 📊 Role Statistics")
    cols = st.columns(len(role_stats))
    for i, (role, count) in enumerate(role_stats.items()):
        with cols[i]:
            st.metric(role.title(), count)
    
    st.markdown("---")
    st.markdown(f"### 👥 Manage User Roles ({len(users)} users)")
    
    # Current admin ID to prevent self-demotion
    current_admin_id = current_user.get("id")
    
    for user in users:
        with st.expander(f"{user.get('name', 'Unnamed')} ({user.get('email', 'No email')})"):
            col1, col2 = st.columns([2, 1])
            
            with col1:
                # User info
                st.markdown(f"**Email:** {user.get('email', 'Unknown')}")
                st.markdown(f"**User ID:** `{user.get('id', 'Unknown')}`")
                
                # Firebase-specific info
                if user.get('email_verified'):
                    st.markdown("**Email Status:** ✅ Verified")
                else:
                    st.markdown("**Email Status:** ⚠️ Unverified")
                
                if user.get('created_at'):
                    from utils import format_date
                    st.markdown(f"**Joined:** {format_date(user.get('created_at'))}")
            
            with col2:
                current_role = user.get("role", "viewer")
                st.markdown(f"**Current Role:** `{current_role}`")
                
                # Role selection
                can_change_role = True
                warning_msg = None
                
                # Prevent admin from changing own role
                if user.get('id') == current_admin_id:
                    can_change_role = False
                    warning_msg = "Cannot change your own role"
                
                # Prevent demoting last admin
                elif current_role == "admin":
                    other_admins = [u for u in users if u.get("role") == "admin" and u.get("id") != user.get("id")]
                    if not other_admins:
                        can_change_role = False
                        warning_msg = "Cannot demote the last admin"
                
                if warning_msg:
                    st.warning(warning_msg)
                
                if can_change_role:
                    new_role = st.selectbox(
                        "Assign Role",
                        ["viewer", "user", "manager", "admin"],
                        index=["viewer", "user", "manager", "admin"].index(current_role),
                        key=f"role_{user['id']}"
                    )
                    
                    if new_role != current_role:
                        if st.button("💾 Save Role", key=f"save_{user['id']}", type="primary"):
                            update_user_role(user["id"], new_role)
                            st.rerun()
                else:
                    st.info(f"Role: **{current_role}** (protected)")
            
            # Additional actions
            st.markdown("---")
            col1, col2, col3 = st.columns(3)
            
            with col1:
                # Email verification action
                if not user.get('email_verified', False):
                    if st.button("📧 Send Verification", key=f"verify_{user['id']}"):
                        try:
                            from firebase_admin import auth as firebase_auth
                            verification_link = firebase_auth.generate_email_verification_link(user.get('email'))
                            st.success("✅ Verification email queued!")
                            st.info("Email verification system integration needed")
                        except Exception as e:
                            st.error(f"Failed to send verification: {e}")
            
            with col2:
                # View activity
                if st.button("📊 View Activity", key=f"activity_{user['id']}"):
                    show_user_activity_summary(user)
            
            with col3:
                # Delete user (if not admin or current user)
                if (current_role != "admin" and 
                    user.get('id') != current_admin_id):
                    
                    if st.button("🗑️ Delete User", key=f"delete_{user['id']}", type="secondary"):
                        confirm_key = f"confirm_delete_{user['id']}"
                        if not st.session_state.get(confirm_key, False):
                            st.session_state[confirm_key] = True
                            st.warning("⚠️ Click again to confirm permanent deletion")
                        else:
                            try:
                                from auth import delete_firebase_user
                                if delete_firebase_user(user['id']):
                                    st.success("✅ User deleted successfully")
                                    st.rerun()
                            except Exception as e:
                                st.error(f"Failed to delete user: {e}")
                            finally:
                                st.session_state[confirm_key] = False

def show_user_activity_summary(user: dict):
    """Show a brief activity summary for a user"""
    user_id = user.get("id")
    
    with st.container():
        st.markdown(f"#### 📊 Activity Summary for {user.get('name', 'Unknown')}")
        
        try:
            # Get user's events
            events_created = list(db.collection("events").where("created_by", "==", user_id).stream())
            
            # Get user's files
            files_uploaded = list(db.collection("files").where("uploaded_by", "==", user_id).stream())
            
            # Get user's active sessions
            active_sessions = list(db.collection("active_sessions")
                                 .where("user_id", "==", user_id)
                                 .where("active", "==", True).stream())
            
            # Display metrics
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric("Events Created", len(events_created))
            with col2:
                st.metric("Files Uploaded", len(files_uploaded))
            with col3:
                st.metric("Active Sessions", len(active_sessions))
            
            # Show recent events
            if events_created:
                st.markdown("**Recent Events:**")
                for event_doc in events_created[-3:]:  # Show last 3
                    event_data = event_doc.to_dict()
                    st.write(f"• {event_data.get('name', 'Unnamed')} ({event_data.get('status', 'unknown')})")
            
            # Show last login from Firebase
            try:
                from firebase_admin import auth as firebase_auth
                firebase_user = firebase_auth.get_user(user_id)
                if firebase_user.user_metadata.last_sign_in_timestamp:
                    from datetime import datetime
                    from utils import format_date
                    last_signin = datetime.fromtimestamp(firebase_user.user_metadata.last_sign_in_timestamp / 1000)
                    st.write(f"**Last Sign In:** {format_date(last_signin)}")
            except:
                pass
            
        except Exception as e:
            st.error(f"Could not load activity summary: {e}")

# ----------------------------
# 🚀 Initialization (Firebase Enhanced)
# ----------------------------

def initialize_role_system():
    """Initialize the role management system with Firebase"""
    try:
        # Ensure admin user exists
        from firebase_admin import auth as firebase_auth
        from datetime import datetime
        
        admin_email = "mistermcfarland@gmail.com"
        
        try:
            # Check if admin exists in Firebase
            admin_user = firebase_auth.get_user_by_email(admin_email)
            
            # Ensure admin has correct role in Firestore
            admin_doc = db.collection(COLLECTION).document(admin_user.uid).get()
            if not admin_doc.exists or admin_doc.to_dict().get("role") != "admin":
                admin_data = {
                    "id": admin_user.uid,
                    "email": admin_email,
                    "name": admin_user.display_name or "Admin",
                    "role": "admin",
                    "created_at": datetime.utcnow(),
                    "active": True,
                    "email_verified": admin_user.email_verified
                }
                db.collection(COLLECTION).document(admin_user.uid).set(admin_data, merge=True)
                
        except firebase_auth.UserNotFoundError:
            st.warning(f"Admin user {admin_email} not found in Firebase. Please register this email.")
        
        return True
        
    except Exception as e:
        st.error(f"Failed to initialize role system: {e}")
        return False

# ----------------------------
# 🔄 Legacy Compatibility
# ----------------------------

def role_admin_ui_legacy():
    """Legacy function name - use role_admin_ui instead"""
    return role_admin_ui()
