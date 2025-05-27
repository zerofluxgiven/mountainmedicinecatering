import streamlit as st
from datetime import datetime, timedelta
from utils import format_timestamp
from notifications import send_notification
from auth import require_role, sync_firebase_users, delete_firebase_user
from db_client import db  # ✅ Fixed: Use centralized database client
from google.cloud.firestore_v1.base_query import FieldFilter

# ----------------------------
# 👤 User Admin Panel (Admin Only)
# ----------------------------
@require_role("admin")
def user_admin_ui():
    """Main user administration interface with Firebase integration"""
    st.title("👥 User Admin Panel")
    st.caption("View users, update roles, and monitor activity across the app with Firebase authentication.")

    # Sync Firebase users first
    try:
        synced_count = sync_firebase_users()
        if synced_count > 0:
            st.success(f"✅ Synced {synced_count} Firebase users to Firestore")
    except Exception as e:
        st.warning(f"Could not sync Firebase users: {e}")

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
        verified_count = len([u for u in users if u.get("email_verified", False)])
        st.metric("Verified", verified_count)
    with col4:
        active_count = len([u for u in users if u.get("active", True)])
        st.metric("Active Users", active_count)

    st.markdown("---")
    st.markdown(f"### 👥 Users ({len(filtered_users)} shown)")

    # Available roles
    roles = ['viewer', 'user', 'manager', 'admin']
    current_admin = st.session_state.get("firebase_user", {}).get("id")

    # Display users
    for user in sorted(filtered_users, key=lambda x: x.get("name", "").lower()):
        with st.expander(f"👤 {user.get('name', 'Unnamed')} ({user.get('email', 'No email')})"):
            
            # User details
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown(f"**User ID:** `{user.get('id', 'Unknown')}`")
                st.markdown(f"**Email:** {user.get('email', 'Not provided')}")
                st.markdown(f"**Name:** {user.get('name', 'Not provided')}")
                
                # Email verification status
                if user.get('email_verified', False):
                    st.markdown("**Email:** ✅ Verified")
                else:
                    st.markdown("**Email:** ⚠️ Unverified")
                
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
                
                # Last login
                last_login = user.get('last_login')
                if last_login:
                    st.markdown(f"**Last Login:** {format_timestamp(last_login)}")
                
                # Account status
                if user.get('active', True):
                    st.markdown("**Status:** 🟢 Active")
                else:
                    st.markdown("**Status:** 🔴 Inactive")

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
                                st.rerun()
                                
                            except Exception as e:
                                st.error(f"❌ Failed to update role: {e}")
                    
                    with col_cancel:
                        if st.button("❌ Cancel", key=f"cancel_{user['id']}"):
                            st.rerun()
            else:
                # Show current role as read-only
                st.info(f"Current role: **{current_role}** (cannot be changed)")
            
            # Additional user actions
            st.markdown("---")
            st.markdown("**⚙️ User Actions**")
            
            col_actions = st.columns(4)
            
            with col_actions[0]:
                if st.button("📧 Send Message", key=f"msg_{user['id']}"):
                    # This could open a modal or redirect to messaging
                    st.info("Messaging feature coming soon!")
            
            with col_actions[1]:
                if st.button("📊 View Activity", key=f"activity_{user['id']}"):
                    show_user_activity(user)
            
            with col_actions[2]:
                # Email verification action
                if not user.get('email_verified', False):
                    if st.button("📧 Resend Verification", key=f"verify_{user['id']}"):
                        try:
                            from firebase_admin import auth as firebase_auth
                            verification_link = firebase_auth.generate_email_verification_link(user.get('email'))
                            st.success("✅ Verification email sent!")
                            st.info("Email verification link generated (integrate with email service)")
                        except Exception as e:
                            st.error(f"Failed to send verification: {e}")
            
            with col_actions[3]:
                # Delete user action (only for non-admins, not current user)
                if (current_role != "admin" and 
                    user.get('id') != current_admin):
                    
                    confirm_key = f"confirm_delete_{user['id']}"
                    if not st.session_state.get(confirm_key, False):
                        if st.button("🗑️ Delete User", key=f"delete_{user['id']}", type="secondary"):
                            st.session_state[confirm_key] = True
                            st.rerun()
                    else:
                        st.warning("⚠️ This will permanently delete the user from Firebase!")
                        col_yes, col_no = st.columns(2)
                        
                        with col_yes:
                            if st.button("✅ Confirm Delete", key=f"confirm_yes_{user['id']}", type="primary"):
                                if delete_firebase_user(user['id']):
                                    st.success("✅ User deleted from Firebase and Firestore")
                                    st.rerun()
                        
                        with col_no:
                            if st.button("❌ Cancel", key=f"confirm_no_{user['id']}"):
                                st.session_state[confirm_key] = False
                                st.rerun()

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
        
        # Get user's active sessions
        active_sessions = list(db.collection("active_sessions").where("user_id", "==", user_id).where("active", "==", True).stream())
        
        # Get user's logs (with proper ordering and fallback)
        try:
            user_logs = list(db.collection("logs").where(filter=FieldFilter("user_id", "==", user_id))
                .order_by("timestamp", direction=firestore.Query.DESCENDING)
                .limit(10).stream())
        except Exception:
            # Fallback if ordering fails (no index)
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
            st.metric("Active Sessions", len(active_sessions))
        
        # Show Firebase-specific info
        st.markdown("#### 🔐 Firebase Account Info")
        try:
            from firebase_admin import auth as firebase_auth
            firebase_user = firebase_auth.get_user(user_id)
            
            col1, col2 = st.columns(2)
            with col1:
                st.write(f"**Firebase UID:** `{firebase_user.uid}`")
                st.write(f"**Email Verified:** {'✅ Yes' if firebase_user.email_verified else '❌ No'}")
            with col2:
                st.write(f"**Account Created:** {format_timestamp(datetime.fromtimestamp(firebase_user.user_metadata.creation_timestamp / 1000))}")
                st.write(f"**Last Sign In:** {format_timestamp(datetime.fromtimestamp(firebase_user.user_metadata.last_sign_in_timestamp / 1000)) if firebase_user.user_metadata.last_sign_in_timestamp else 'Never'}")
        except Exception as e:
            st.warning(f"Could not load Firebase user data: {e}")
        
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
        
        # Show active sessions
        if active_sessions:
            st.markdown("#### 📱 Active Sessions")
            for session_doc in active_sessions:
                session_data = session_doc.to_dict()
                created_at = format_timestamp(session_data.get('created_at'))
                expires_at = format_timestamp(session_data.get('expires_at'))
                st.write(f"• Session created: {created_at}, expires: {expires_at}")
                
                # Option to revoke session
                if st.button(f"🚪 Revoke Session", key=f"revoke_{session_doc.id}"):
                    try:
                        from firebase_auth_ui import auth_manager
                        auth_manager._revoke_session(session_doc.id)
                        st.success("Session revoked")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Failed to revoke session: {e}")
        
    except Exception as e:
        st.error(f"Could not load user activity: {e}")

# ----------------------------
# 🔍 Advanced User Search
# ----------------------------
def advanced_user_search():
    """Advanced search and filtering for users"""
    st.markdown("### 🔍 Advanced Search")
    
    with st.form("advanced_search"):
        col1, col2, col3 = st.columns(3)
        
        with col1:
            name_search = st.text_input("Name contains:")
            email_search = st.text_input("Email contains:")
        
        with col2:
            role_search = st.multiselect("Roles:", ["admin", "manager", "user", "viewer"])
            verified_only = st.checkbox("Email verified only")
        
        with col3:
            joined_after = st.date_input("Joined after:", value=None)
            joined_before = st.date_input("Joined before:", value=None)
        
        submitted = st.form_submit_button("🔍 Search")
        
        if submitted:
            # Implement advanced search logic here
            filters = {}
            if name_search:
                filters['name_contains'] = name_search
            if email_search:
                filters['email_contains'] = email_search
            if role_search:
                filters['roles'] = role_search
            if verified_only:
                filters['verified_only'] = verified_only
            if joined_after:
                filters['joined_after'] = joined_after
            if joined_before:
                filters['joined_before'] = joined_before
            
            st.info(f"Advanced search with filters: {filters}")
            # TODO: Implement actual filtering logic
            st.write("Advanced search results would appear here based on:")
            for key, value in filters.items():
                st.write(f"- {key}: {value}")

# ----------------------------
# 📈 User Analytics
# ----------------------------
def show_user_analytics():
    """Show user analytics and trends"""
    st.markdown("### 📈 User Analytics")
    
    try:
        users = [doc.to_dict() for doc in db.collection("users").stream()]
        
        if not users:
            st.info("No user data available")
            return
        
        # Role distribution
        role_counts = {}
        verified_count = 0
        active_count = 0
        
        for user in users:
            role = user.get("role", "viewer")
            role_counts[role] = role_counts.get(role, 0) + 1
            
            if user.get("email_verified", False):
                verified_count += 1
            if user.get("active", True):
                active_count += 1
        
        st.markdown("#### 👥 User Overview")
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Users", len(users))
        with col2:
            st.metric("Verified Users", verified_count, f"{(verified_count/len(users)*100):.1f}%")
        with col3:
            st.metric("Active Users", active_count, f"{(active_count/len(users)*100):.1f}%")
        with col4:
            admin_count = role_counts.get("admin", 0)
            st.metric("Admins", admin_count)
        
        # Role distribution chart
        st.markdown("#### 👥 Role Distribution")
        col1, col2 = st.columns(2)
        
        with col1:
            for role, count in role_counts.items():
                percentage = (count / len(users)) * 100
                st.write(f"**{role.title()}:** {count} users ({percentage:.1f}%)")
        
        with col2:
            # Role distribution chart would go here
            st.write("📊 Role Distribution Chart")
            for role, count in role_counts.items():
                # Simple text-based bar chart
                bar_length = int((count / len(users)) * 20)
                bar = "█" * bar_length + "░" * (20 - bar_length)
                st.write(f"`{role:8} {bar} {count:3d}`")
        
        # User registration trends (if creation dates are available)
        users_with_dates = [u for u in users if u.get('created_at')]
        
        if users_with_dates:
            st.markdown("#### 📅 Registration Trends")
            # Group by month
            monthly_registrations = {}
            for user in users_with_dates:
                created_at = user.get('created_at')
                if hasattr(created_at, 'strftime'):
                    month_key = created_at.strftime("%Y-%m")
                    monthly_registrations[month_key] = monthly_registrations.get(month_key, 0) + 1
            
            if monthly_registrations:
                st.write("**Monthly Registration Counts:**")
                for month, count in sorted(monthly_registrations.items()):
                    st.write(f"**{month}:** {count} new users")
            else:
                st.info("No registration date data available")
        
    except Exception as e:
        st.error(f"Could not generate user analytics: {e}")

# ----------------------------
# 🧹 User Management Tools
# ----------------------------
def user_management_tools():
    """Additional user management tools"""
    st.markdown("### 🧹 User Management Tools")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### 📧 Bulk Operations")
        
        if st.button("📢 Send Announcement to All Users"):
            announcement = st.text_area("Announcement message:", key="bulk_announcement")
            if announcement and st.button("Send to All", key="send_bulk"):
                try:
                    users = [doc.to_dict() for doc in db.collection("users").stream()]
                    for user in users:
                        send_notification(announcement, user_id=user.get('id'))
                    st.success(f"Announcement sent to {len(users)} users")
                except Exception as e:
                    st.error(f"Failed to send announcements: {e}")
        
        if st.button("🔄 Sync Firebase Users"):
            try:
                synced_count = sync_firebase_users()
                st.success(f"✅ Synced {synced_count} Firebase users")
            except Exception as e:
                st.error(f"Sync failed: {e}")
    
    with col2:
        st.markdown("#### 📊 Export Options")
        
        if st.button("📥 Export User List"):
            try:
                users = [doc.to_dict() for doc in db.collection("users").stream()]
                user_data = []
                for user in users:
                    user_data.append({
                        'ID': user.get('id', ''),
                        'Name': user.get('name', ''),
                        'Email': user.get('email', ''),
                        'Role': user.get('role', 'viewer'),
                        'Verified': user.get('email_verified', False),
                        'Active': user.get('active', True),
                        'Created': format_timestamp(user.get('created_at', ''))
                    })
                
                # Convert to CSV format (simplified)
                csv_content = "ID,Name,Email,Role,Verified,Active,Created\n"
                for user in user_data:
                    csv_content += f"{user['ID']},{user['Name']},{user['Email']},{user['Role']},{user['Verified']},{user['Active']},{user['Created']}\n"
                
                st.download_button(
                    label="📥 Download CSV",
                    data=csv_content,
                    file_name=f"users_export_{datetime.now().strftime('%Y%m%d')}.csv",
                    mime="text/csv"
                )
                
            except Exception as e:
                st.error(f"Failed to export user list: {e}")

# Enhanced user admin UI with analytics
def enhanced_user_admin_ui():
    """Enhanced user admin interface with additional features"""
    
    # Tabs for different sections
    tab1, tab2, tab3, tab4 = st.tabs(["👥 User Management", "📈 Analytics", "🔍 Advanced Search", "🧹 Tools"])
    
    with tab1:
        user_admin_ui()
    
    with tab2:
        show_user_analytics()
    
    with tab3:
        advanced_user_search()
    
    with tab4:
        user_management_tools()
