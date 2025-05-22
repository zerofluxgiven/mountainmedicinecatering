import streamlit as st
from datetime import datetime, timedelta
from utils import format_timestamp
from auth import require_role
from notifications import send_notification
from db_client import db

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
            
            files = list(db.collection("files").where("deleted", "==", False).stream())
            st.metric("Active Files", len(files))

        st.divider()

        # Additional metrics
        col4, col5, col6 = st.columns(3)
        with col4:
            tags = list(db.collection("tags").stream())
            st.metric("Tag Variants", len(tags))
        
        with col5:
            deleted_files = list(db.collection("files").where("deleted", "==", True).stream())
            st.metric("Soft-Deleted Files", len(deleted_files))
        
        with col6:
            now = datetime.utcnow()
            month_ago = now - timedelta(days=30)
            recent_logs = list(db.collection("logs").where("timestamp", ">=", month_ago).stream())
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
                     .order_by("timestamp", direction=db.query.DESCENDING)
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
                             .where("status", "==", "pending")
                             .where("created_at", "<", cutoff))
                
                stale_suggestions = list(stale_query.stream())
                count = 0
                
                for suggestion_doc in stale_suggestions:
                    db.collection("suggestions").document(suggestion_doc.id).update({
                        "status": "rejected",
