import streamlit as st
from datetime import datetime, timedelta
from utils import format_timestamp
from auth import require_role
from notifications import send_notification
from firebase_init import db
from google.cloud.firestore_v1.base_query import FieldFilter

# ----------------------------
# 🛠️ Admin Tools
# ----------------------------
@require_role("admin")
def admin_utilities_ui():
    """Main admin utilities interface"""
    st.title("🛠️ Admin Utilities")

    tab1, tab2, tab3, tab4 = st.tabs(["📊 Dashboard", "📜 Audit Logs", "🧹 Cleanup", "📦 Archive Events"])

    with tab1:
        _admin_dashboard()
    with tab2:
        _audit_log_viewer()
    with tab3:
        _cleanup_tools()
    with tab4:
        _archive_event_tool()

# ----------------------------
# 📊 Dashboard Snapshot
# ----------------------------
def _admin_dashboard():
    """Display admin dashboard with system statistics"""
    st.subheader("📈 App Snapshot")
    
    try:
        col1, col2, col3 = st.columns(3)

        with col1:
            events = list(db.collection("events").stream())
            active_events = len([e for e in events if e.to_dict().get("status") == "active"])
            st.metric("Total Events", len(events))
            st.metric("Active Events", active_events)

        with col2:
            suggestions = list(db.collection("suggestions").where("status", "==", "pending").stream())
            st.metric("Pending Suggestions", len(suggestions))
            
            users = list(db.collection("users").stream())
            st.metric("Total Users", len(users))

        with col3:
            recipes = list(db.collection("recipes").stream())
            st.metric("Total Recipes", len(recipes))
            
            deleted_files = list(db.collection("files").where(filter=FieldFilter("deleted", "==", True)).stream())
            st.metric("Active Files", len(files))

        st.divider()

        # Additional metrics
        col4, col5, col6 = st.columns(3)
        with col4:
            tags = list(db.collection("tags").stream())
            st.metric("Tag Variants", len(tags))
        
        with col5:
            deleted_files = list(db.collection("files").where(filter=FieldFilter("deleted", "==", True)).stream())
            st.metric("Soft-Deleted Files", len(deleted_files))
        
        with col6:
            now = datetime.utcnow()
            month_ago = now - timedelta(days=30)
            recent_logs = list(db.collection("logs").where(filter=FieldFilter("timestamp", ">=", month_ago)).stream())
            unique_users = set(log.to_dict().get("user_id") for log in recent_logs if log.to_dict().get("user_id"))
            st.metric("Active Users (30d)", len(unique_users))

        # System health indicators
        st.markdown("### 🔍 System Health")
        
        # Check for common issues
        warnings = []
        
        if len(suggestions) > 10:
            warnings.append(f"⚠️ {len(suggestions)} pending suggestions need review")
        
        if len(deleted_files) > 50:
            warnings.append(f"⚠️ {len(deleted_files)} deleted files could be cleaned up")
        
        orphaned_files = 0
        for file_doc in files:
            file_data = file_doc.to_dict()
            if file_data.get("event_id"):
                event_exists = db.collection("events").document(file_data["event_id"]).get().exists
                if not event_exists:
                    orphaned_files += 1
        
        if orphaned_files > 0:
            warnings.append(f"⚠️ {orphaned_files} files linked to non-existent events")
        
        if warnings:
            for warning in warnings:
                st.warning(warning)
        else:
            st.success("✅ System health looks good!")

    except Exception as e:
        st.error(f"⚠️ Could not load dashboard data: {e}")

# ----------------------------
# 📜 Audit Log Viewer
# ----------------------------
def _audit_log_viewer():
    """Display recent audit logs"""
    st.subheader("📜 Audit Logs")
    
    try:
        # Get filter options
        col1, col2 = st.columns(2)
        with col1:
            days_back = st.selectbox("Show logs from:", [1, 7, 30, 90], index=1)
        with col2:
            limit = st.selectbox("Max entries:", [50, 100, 200], index=0)
        
        # Calculate date filter
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Query logs
        logs_query = (db.collection("logs")
                     .where("timestamp", ">=", cutoff_date)
                      .order_by("timestamp", direction=firestore.Query.DESCENDING)
                     .limit(limit))
        
        logs = list(logs_query.stream())
        
        if not logs:
            st.info("No logs found for the selected time period.")
            return
        
        st.info(f"Showing {len(logs)} log entries from the last {days_back} days")
        
        for log_doc in logs:
            log_data = log_doc.to_dict()
            
            timestamp = format_timestamp(log_data.get('timestamp'))
            action = log_data.get('action', 'Unknown')
            user_id = log_data.get('user_id', 'System')
            details = log_data.get('details', {})
            
            with st.expander(f"🕒 {timestamp} - {action} by {user_id}"):
                st.markdown(f"**Action:** {action}")
                st.markdown(f"**User:** {user_id}")
                st.markdown(f"**Timestamp:** {timestamp}")
                
                if details:
                    st.markdown("**Details:**")
                    st.json(details)
                
                # Additional fields
                for key, value in log_data.items():
                    if key not in ['timestamp', 'action', 'user_id', 'details']:
                        st.markdown(f"**{key.title()}:** {value}")

    except Exception as e:
        st.error(f"⚠️ Could not load audit logs: {e}")

# ----------------------------
# 🧹 Cleanup Tools
# ----------------------------
def _cleanup_tools():
    """System cleanup utilities"""
    st.subheader("🧹 System Cleanup")
    
    # Stale suggestions cleanup
    st.markdown("### 📝 Stale Suggestions")
    
    col1, col2 = st.columns(2)
    with col1:
        days_old = st.number_input("Mark suggestions as stale after (days):", min_value=1, value=14)
    with col2:
        if st.button("🧹 Clean Stale Suggestions"):
            try:
                cutoff = datetime.utcnow() - timedelta(days=days_old)
                stale_query = (db.collection("suggestions")
             .where(filter=FieldFilter("status", "==", "pending"))
             .where(filter=FieldFilter("created_at", "<", cutoff)))
                
                stale_suggestions = list(stale_query.stream())
                count = 0
                
                for suggestion_doc in stale_suggestions:
                    db.collection("suggestions").document(suggestion_doc.id).update({
                        "status": "rejected",
                        "reviewed_by": "system_cleanup",
                        "reviewed_at": datetime.utcnow(),
                        "rejection_reason": f"Automatically rejected after {days_old} days"
                    })
                    count += 1
                
                if count > 0:
                    st.success(f"✅ Rejected {count} stale suggestions older than {days_old} days.")
                    
                    # Log the cleanup action
                    db.collection("logs").add({
                        "action": "cleanup_stale_suggestions",
                        "user_id": st.session_state.get("user", {}).get("id", "system"),
                        "timestamp": datetime.utcnow(),
                        "details": {"count": count, "days_old": days_old}
                    })
                else:
                    st.info("No stale suggestions found.")
                    
            except Exception as e:
                st.error(f"❌ Cleanup failed: {e}")
    
    st.divider()
    
    # Orphaned files cleanup
    st.markdown("### 📁 Orphaned Files")
    st.caption("Files linked to events that no longer exist")
    
    if st.button("🔍 Find Orphaned Files"):
        try:
            deleted_files = list(db.collection("files").where(filter=FieldFilter("deleted", "==", True)).stream())
            orphaned = []
            
            for file_doc in files:
                file_data = file_doc.to_dict()
                if file_data.get("event_id"):
                    event_exists = db.collection("events").document(file_data["event_id"]).get().exists
                    if not event_exists:
                        orphaned.append((file_doc.id, file_data))
            
            if orphaned:
                st.warning(f"Found {len(orphaned)} orphaned files:")
                
                for file_id, file_data in orphaned:
                    st.write(f"- {file_data.get('filename', 'Unknown')} (linked to {file_data.get('event_id')})")
                
                if st.button("🧹 Unlink Orphaned Files"):
                    for file_id, _ in orphaned:
                        db.collection("files").document(file_id).update({"event_id": None})
                    
                    st.success(f"✅ Unlinked {len(orphaned)} orphaned files")
            else:
                st.success("✅ No orphaned files found")
                
        except Exception as e:
            st.error(f"❌ Could not check for orphaned files: {e}")
    
    st.divider()
    
    # Permanent deletion of soft-deleted files
    st.markdown("### 🗑️ Permanent Deletion")
    st.caption("Permanently delete files that have been soft-deleted")
    
    try:
        deleted_files = list(db.collection("files").where(filter=FieldFilter("deleted", "==", True)).stream())
        
        if deleted_files:
            st.warning(f"Found {len(deleted_files)} soft-deleted files")
            
            # Show some examples
            st.write("Examples:")
            for i, file_doc in enumerate(deleted_files[:5]):
                file_data = file_doc.to_dict()
                deleted_at = format_timestamp(file_data.get('deleted_at'))
                st.write(f"- {file_data.get('filename', 'Unknown')} (deleted {deleted_at})")
            
            if len(deleted_files) > 5:
                st.write(f"... and {len(deleted_files) - 5} more")
            
            st.error("⚠️ **Warning:** This action cannot be undone!")
            
            confirm_text = st.text_input("Type 'DELETE PERMANENTLY' to confirm:")
            
            if confirm_text == "DELETE PERMANENTLY" and st.button("🗑️ Delete Permanently"):
                count = 0
                for file_doc in deleted_files:
                    try:
                        db.collection("files").document(file_doc.id).delete()
                        count += 1
                    except Exception as e:
                        st.error(f"Failed to delete {file_doc.id}: {e}")
                
                if count > 0:
                    st.success(f"✅ Permanently deleted {count} files")
                    
                    # Log the action
                    db.collection("logs").add({
                        "action": "permanent_file_deletion",
                        "user_id": st.session_state.get("user", {}).get("id", "system"),
                        "timestamp": datetime.utcnow(),
                        "details": {"count": count}
                    })
        else:
            st.info("No soft-deleted files found")
            
    except Exception as e:
        st.error(f"❌ Could not check deleted files: {e}")

# ----------------------------
# 📦 Archive Events
# ----------------------------
def _archive_event_tool():
    """Archive completed events"""
    st.subheader("📦 Archive Completed Events")
    
    try:
        # Find completed events that aren't archived
        completed_events = list(db.collection("events")
                               .where("status", "==", "complete")
                               .where("archived", "==", False)
                               .stream())
        
        if not completed_events:
            st.success("✅ No completed events need archiving")
            return
        
        st.info(f"Found {len(completed_events)} completed events ready for archival")
        
        # Show events that will be archived
        st.markdown("### Events to Archive:")
        for event_doc in completed_events[:10]:  # Show first 10
            event_data = event_doc.to_dict()
            st.write(f"- **{event_data.get('name', 'Unnamed')}** ({event_data.get('start_date', 'Unknown date')})")
        
        if len(completed_events) > 10:
            st.write(f"... and {len(completed_events) - 10} more")
        
        col1, col2 = st.columns(2)
        
        with col1:
            if st.button("📦 Archive All Completed Events"):
                archived_count = 0
                
                for event_doc in completed_events:
                    try:
                        db.collection("events").document(event_doc.id).update({
                            "archived": True,
                            "archived_at": datetime.utcnow()
                        })
                        archived_count += 1
                    except Exception as e:
                        st.error(f"Failed to archive event {event_doc.id}: {e}")
                
                if archived_count > 0:
                    st.success(f"✅ Archived {archived_count} completed events")
                    
                    # Send notification
                    send_notification(
                        f"Archived {archived_count} completed events",
                        role="admin"
                    )
                    
                    # Log the action
                    db.collection("logs").add({
                        "action": "archive_completed_events",
                        "user_id": st.session_state.get("user", {}).get("id", "system"),
                        "timestamp": datetime.utcnow(),
                        "details": {"count": archived_count}
                    })
                    
                    st.rerun()
        
        with col2:
            # Option to archive events older than X days
            days_old = st.number_input("Or archive events completed more than X days ago:", min_value=1, value=30)
            
            if st.button(f"📦 Archive Events Older Than {days_old} Days"):
                cutoff_date = datetime.utcnow() - timedelta(days=days_old)
                
                old_events = [
                    event_doc for event_doc in completed_events
                    if event_doc.to_dict().get('completed_at', datetime.min) < cutoff_date
                ]
                
                if old_events:
                    for event_doc in old_events:
                        db.collection("events").document(event_doc.id).update({
                            "archived": True,
                            "archived_at": datetime.utcnow()
                        })
                    
                    st.success(f"✅ Archived {len(old_events)} events older than {days_old} days")
                else:
                    st.info(f"No events found that are older than {days_old} days")
        
    except Exception as e:
        st.error(f"⚠️ Could not load completed events: {e}")

# ----------------------------
# 📊 System Statistics
# ----------------------------
def get_system_stats():
    """Get comprehensive system statistics"""
    try:
        stats = {
            "events": {
                "total": 0,
                "active": 0,
                "completed": 0,
                "archived": 0
            },
            "users": {"total": 0, "admins": 0, "managers": 0},
            "files": {"total": 0, "deleted": 0},
            "suggestions": {"pending": 0, "approved": 0, "rejected": 0}
        }
        
        # Count events
        events = list(db.collection("events").stream())
        stats["events"]["total"] = len(events)
        
        for event_doc in events:
            event_data = event_doc.to_dict()
            status = event_data.get("status", "planning")
            if status == "active":
                stats["events"]["active"] += 1
            elif status == "complete":
                stats["events"]["completed"] += 1
            
            if event_data.get("archived"):
                stats["events"]["archived"] += 1
        
        # Count users
        users = list(db.collection("users").stream())
        stats["users"]["total"] = len(users)
        
        for user_doc in users:
            user_data = user_doc.to_dict()
            role = user_data.get("role", "viewer")
            if role == "admin":
                stats["users"]["admins"] += 1
            elif role == "manager":
                stats["users"]["managers"] += 1
        
        # Count files
        files = list(db.collection("files").stream())
        stats["files"]["total"] = len(files)
        stats["files"]["deleted"] = len([f for f in files if f.to_dict().get("deleted")])
        
        # Count suggestions
        suggestions = list(db.collection("suggestions").stream())
        for suggestion_doc in suggestions:
            suggestion_data = suggestion_doc.to_dict()
            status = suggestion_data.get("status", "pending")
            if status in stats["suggestions"]:
                stats["suggestions"][status] += 1
        
        return stats
        
    except Exception as e:
        st.error(f"Could not calculate system statistics: {e}")
        return None
