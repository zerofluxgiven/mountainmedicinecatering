import streamlit as st
from datetime import datetime
from utils import format_timestamp
from notifications import send_notification
from auth import require_role
from db_client import db  # ✅ Fixed: Use centralized database client

# ----------------------------
# 👤 User Admin Panel (Admin Only)
# ----------------------------
@require_role("admin")
def user_admin_ui():
    """Main user administration interface"""
    st.title("👥 User Admin Panel")
    st.caption("View users, update roles, and monitor activity across the app.")

    # Get all users
    try:
        users_docs = list(db.collection("users").stream())
        users = [doc.to_dict() | {"id": doc.id} for doc in users_docs]
    except Exception as e:
        st.error(f"⚠️ Could not load users: {e}")
        return

    if not users:
        st.info("No users found in the system.")
        return

    # Search and filter
    col1, col2 = st.columns(2)
    with col1:
        search = st.text_input("🔍 Search by name or email:", placeholder="Enter search term...")
    with col2:
        role_filter = st.selectbox("Filter by role:", ["All", "admin", "manager", "user", "viewer"])

    # Apply filters
    filtered_users = users
    
    if search:
        search_lower = search.lower()
        filtered_users = [
            u for u in filtered_users 
            if (search_lower in u.get("name", "").lower() or 
                search_lower in u.get("email", "").lower())
        ]
    
    if role_filter != "All":
        filtered_users = [u for u in filtered_users if u.get("role", "viewer") == role_filter]

    if not filtered_users:
        st.info("No matching users found.")
        return

    # User statistics
    st.markdown("### 📊 User Statistics")
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Users", len(users))
    with col2:
        admin_count = len([u for u in users if u.get("role") == "admin"])
        st.metric("Admins", admin_count)
    with col3:
        manager_count = len([u for u in users if u.get("role") == "manager"])
        st.metric("Managers", manager_count)
    with col4:
        user_count = len([u for u in users if u.get("role") in ["user", "viewer"]])
        st.metric("Regular Users", user_count)

    st.markdown("---")
    st.markdown(f"### 👥 Users ({len(filtered_users)} shown)")

    # Available roles
    roles = ["viewer", "user", "manager", "admin"]
    current_admin = st.session_state.get("user", {}).get("id")

    # Display users
    for user in sorted(filtered_users, key=lambda x: x.get("name", "").lower()):
        with st.expander(f"👤 {user.get('name', 'Unnamed')} ({user.get('email', 'No email')})"):
            
            # User details
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown(f"**User ID:** `{user.get('id', 'Unknown')}`")
                st.markdown(f"**Email:** {user.get('email', 'Not provided')}")
                st.markdown(f"**Name:** {user.get('name', 'Not provided')}")
                
                # Join date
                created_at = user.get('created_at')
                if created_at:
                    st.markdown(f"**Joined:** {format_timestamp(created_at)}")
                else:
                    st.markdown("**Joined:** Unknown")
            
            with col2:
                # Current role
                current_role = user.get("role", "viewer")
                st.markdown(f"**Current Role:** `{current_role}`")
                
                # Activity metrics (if available)
                events_participated = user.get('events_participated', [])
                recipes_contributed = user.get('recipes', [])
                hours_logged = user.get('hours_logged', 0)
                
                st.markdown(f"**Events Participated:** {len(events_participated)}")
                st.markdown(f"**Recipes Contributed:** {len(recipes_contributed)}")
                st.markdown(f"**Hours Logged:** {hours_logged}")

            # Role management
            st.markdown("---")
            st.markdown("**👑 Role Management**")
            
            # Prevent admins from changing their own role or demoting the last admin
            can_change_role = True
            warning_message = None
            
            if user.get('id') == current_admin:
                can_change_role = False
                warning_message = "Cannot change your own role"
            elif current_role == "admin":
                # Check if this is the last admin
                other_admins = [u for u in users if u.get("role") == "admin" and u.get("id") != user.get("id")]
                if not other_admins:
                    can_change_role = False
                    warning_message = "Cannot demote the last admin"
            
            if warning_message:
                st.warning(warning_message)
            
            if can_change_role:
                new_role = st.selectbox(
                    "Assign Role",
                    roles,
                    index=roles.index(current_role),
                    key=f"role_{user['id']}",
                    help="Select the new role for this user"
                )
                
                if new_role != current_role:
                    col_save, col_cancel = st.columns(2)
                    
                    with col_save:
                        if st.button(f"💾 Update to {new_role}", key=f"save_{user['id']}", type="primary"):
                            try:
                                # Update user role
                                db.collection("users").document(user["id"]).update({"role": new_role})
                                
                                # Log the change
                                db.collection("logs").add({
                                    "action": "role_change",
                                    "user_id": user["id"],
                                    "timestamp": datetime.utcnow(),
                                    "details": {
                                        "from_role": current_role,
                                        "to_role": new_role,
                                        "target_user": user.get("name", user.get("email", user["id"])),
                                        "changed_by": current_admin
                                    }
                                })
                                
                                # Send notification to admins
                                send_notification(
                                    f"Role changed for {user.get('name', user.get('email', 'Unknown'))}: {current_role} → {new_role}",
                                    role="admin"
                                )
                                
                                st.success(f"✅ Role updated to **{new_role}**")
                                st.rerun()  # ✅ Fixed: was st.experimental_rerun()
                                
                            except Exception as e:
                                st.error(f"❌ Failed to update role: {e}")
                    
                    with col_cancel:
                        if st.button("❌ Cancel", key=f"cancel_{user['id']}"):
                            st.rerun()  # ✅ Fixed: was st.experimental_rerun()
            else:
                # Show current role as read-only
                st.info(f"Current role: **{current_role}** (cannot be changed)")
            
            # Additional user actions
            st.markdown("---")
            st.markdown("**⚙️ User Actions**")
            
            col_actions = st.columns(3)
            
            with col_actions[0]:
                if st.button("📧 Send Message", key=f"msg_{user['id']}"):
                    # This could open a modal or redirect to messaging
                    st.info("Messaging feature coming soon!")
            
            with col_actions[1]:
                if st.button("📊 View Activity", key=f"activity_{user['id']}"):
                    show_user_activity(user)
            
            with col_actions[2]:
                # Only allow deletion of non-admin users by other admins
                if (current_role != "admin" and 
                    user.get('id') != current_admin and 
                    st.button("🗑️ Deactivate", key=f"deactivate_{user['id']}")):
                    
                    # ✅ Fixed: Using Streamlit's built-in confirmation
                    with st.popover("⚠️ Confirm Deactivation"):
                        st.write(f"Deactivate user {user.get('name', user.get('email', 'Unknown'))}?")
                        if st.button("✅ Yes, Deactivate", type="primary"):
                            try:
                                # Mark user as inactive instead of deleting
                                db.collection("users").document(user["id"]).update({
                                    "active": False,
                                    "deactivated_at": datetime.utcnow(),
                                    "deactivated_by": current_admin
                                })
                                
                                st.success("User deactivated")
                                st.rerun()  # ✅ Fixed: was st.experimental_rerun()
                                
                            except Exception as e:
                                st.error(f"Failed to deactivate user: {e}")

# ----------------------------
# 📊 User Activity Details
# ----------------------------
def show_user_activity(user):
    """Show detailed user activity"""
    user_id = user.get("id")
    
    st.markdown(f"### 📊 Activity for {user.get('name', 'Unknown')}")
    
    try:
        # Get user's events
        events_created = list(db.collection("events").where("created_by", "==", user_id).stream())
        
        # Get user's suggestions
        suggestions_made = list(db.collection("suggestions").where("user_id", "==", user_id).stream())
        
        # Get user's files
        files_uploaded = list(db.collection("files").where("uploaded_by", "==", user_id).stream())
        
        # Get user's logs (with proper ordering)
        try:
            user_logs = list(db.collection("logs").where("user_id", "==", user_id)
                            .order_by("timestamp", direction=db.query.DESCENDING)
                            .limit(10).stream())
        except Exception:
            # Fallback if ordering fails
            user_logs = list(db.collection("logs").where("user_id", "==", user_id).limit(10).stream())
        
        # Display metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Events Created", len(events_created))
        with col2:
            st.metric("Suggestions Made", len(suggestions_made))
        with col3:
            st.metric("Files Uploaded", len(files_uploaded))
        with col4:
            st.metric("Recent Actions", len(user_logs))
        
        # Show recent activity
        if user_logs:
            st.markdown("#### 🕒 Recent Activity")
            for log_doc in user_logs:
                log_data = log_doc.to_dict()
                timestamp = format_timestamp(log_data.get('timestamp'))
                action = log_data.get('action', 'Unknown action')
                st.write(f"• **{timestamp}** - {action}")
        
        # Show created events
        if events_created:
            st.markdown("#### 🎪 Events Created")
            for event_doc in events_created:
                event_data = event_doc.to_dict()
                st.write(f"• **{event_data.get('name', 'Unnamed')}** - {event_data.get('status', 'unknown')} status")
        
    except Exception as e:
        st.error(f"Could not load user activity: {e}")
