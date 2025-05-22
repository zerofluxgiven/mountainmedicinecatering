# events.py

import streamlit as st
from utils import session_get, get_active_event_id, format_date, generate_id
from ui_components import show_event_mode_banner, render_event_toolbar
from datetime import datetime
from db_client import db

# ----------------------------
# 🔥 Get All Events
# ----------------------------

def get_all_events() -> list[dict]:
    """Fetch all events from Firestore, sorted by start date."""
    try:
        docs = db.collection("events").order_by("start_date").stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        st.error(f"⚠️ Failed to fetch events: {e}")
        return []

# ----------------------------
# ⚡ Set Active Event
# ----------------------------

def activate_event(event_id: str) -> None:
    """Sets the active event globally in the config document."""
    try:
        db.collection("config").document("global").set({"active_event": event_id}, merge=True)
        # Also update session state for immediate UI update
        st.session_state["active_event_id"] = event_id
        st.success(f"✅ Event activated: {event_id}")
    except Exception as e:
        st.error(f"❌ Could not activate event: {e}")

# ----------------------------
# 📅 Create New Event
# ----------------------------

def create_event(event_data: dict, user_id: str) -> str:
    """Create a new event with validation"""
    try:
        event_id = generate_id("evt")
        
        # Add metadata
        event_data.update({
            "id": event_id,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "status": "planning",
            "version": 1
        })
        
        # Ensure required fields have defaults
        event_data.setdefault("guest_count", 0)
        event_data.setdefault("staff_count", 0)
        event_data.setdefault("menu", [])
        event_data.setdefault("shopping_list", [])
        event_data.setdefault("equipment_list", [])
        
        db.collection("events").document(event_id).set(event_data)
        return event_id
        
    except Exception as e:
        st.error(f"❌ Failed to create event: {e}")
        return None

# ----------------------------
# ✏️ Edit Event
# ----------------------------

def update_event(event_id: str, updates: dict) -> bool:
    """Update an existing event"""
    try:
        # Add update metadata
        updates.update({
            "updated_at": datetime.utcnow(),
            "version": db.increment(1)
        })
        
        db.collection("events").document(event_id).update(updates)
        return True
        
    except Exception as e:
        st.error(f"❌ Failed to update event: {e}")
        return False

# ----------------------------
# 🗑️ Delete Event
# ----------------------------

def delete_event(event_id: str) -> bool:
    """Soft delete an event"""
    try:
        db.collection("events").document(event_id).update({
            "deleted": True,
            "deleted_at": datetime.utcnow()
        })
        
        # If this was the active event, clear it
        active_event_id = get_active_event_id()
        if active_event_id == event_id:
            db.collection("config").document("global").update({"active_event": None})
            if "active_event_id" in st.session_state:
                del st.session_state["active_event_id"]
        
        return True
        
    except Exception as e:
        st.error(f"❌ Failed to delete event: {e}")
        return False

# ----------------------------
# 🎛 Events Tab UI
# ----------------------------

def event_ui(user: dict | None) -> None:
    """Main Events tab UI showing list of events and actions."""
    st.markdown("## 📅 All Events")

    if not user:
        st.warning("Please log in to manage events.")
        return

    # Create new event section
    with st.container():
        st.markdown("### ➕ Create New Event")
        
        with st.form("create_event_form"):
            col1, col2 = st.columns(2)
            
            with col1:
                name = st.text_input("Event Name *", placeholder="e.g., Summer Retreat 2025")
                location = st.text_input("Location *", placeholder="e.g., Mountain Lodge")
                start_date = st.date_input("Start Date *")
                
            with col2:
                description = st.text_area("Description", placeholder="Brief description of the event...")
                end_date = st.date_input("End Date *")
                guest_count = st.number_input("Expected Guests", min_value=0, value=20)
            
            submitted = st.form_submit_button("🎪 Create Event")
            
            if submitted:
                if not all([name, location, start_date, end_date]):
                    st.error("Please fill in all required fields (*)")
                elif start_date > end_date:
                    st.error("Start date must be before end date")
                else:
                    event_data = {
                        "name": name,
                        "location": location,
                        "description": description,
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "guest_count": guest_count
                    }
                    
                    event_id = create_event(event_data, user["id"])
                    if event_id:
                        st.success(f"✅ Event created: {name}")
                        st.rerun()

    st.markdown("---")
    
    # List existing events
    events = get_all_events()
    active_event_id = get_active_event_id()

    if not events:
        st.info("No events found. Create your first event above!")
        return

    st.markdown("### 📋 Existing Events")
    
    for event in events:
        if event.get("deleted"):
            continue  # Skip deleted events in main view
            
        is_active = event["id"] == active_event_id
        
        with st.expander(f"{'🟣' if is_active else '⚪'} {event.get('name', 'Unnamed Event')}", expanded=is_active):
            # Event details
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown(f"📍 **Location:** {event.get('location', 'Unknown')}")
                st.markdown(f"📆 **Dates:** {event.get('start_date', '?')} → {event.get('end_date', '?')}")
                st.markdown(f"👥 **Guests:** {event.get('guest_count', '-')}")
                
            with col2:
                st.markdown(f"📊 **Status:** `{event.get('status', 'planning')}`")
                st.markdown(f"👤 **Created by:** {event.get('created_by', 'Unknown')}")
                if event.get('created_at'):
                    st.markdown(f"🕒 **Created:** {format_date(event.get('created_at'))}")
            
            # Description
            if event.get('description'):
                st.markdown(f"📝 **Description:** {event.get('description')}")
            
            # Action buttons
            st.markdown("---")
            col1, col2, col3, col4 = st.columns([1, 1, 1, 2])
            
            with col1:
                if st.button("⚡ Activate", key=f"act_{event['id']}", disabled=is_active):
                    activate_event(event["id"])
                    st.rerun()

            with col2:
                if st.button("✏️ Edit", key=f"edit_{event['id']}"):
                    st.session_state["editing_event_id"] = event["id"]
                    st.session_state["top_nav"] = "Event Planner"
                    st.rerun()
            
            with col3:
                # Only allow deletion by creator or admin
                can_delete = (user.get("id") == event.get("created_by") or 
                            st.session_state.get("user_role") == "admin")
                
                if can_delete:
                    if st.button("🗑️ Delete", key=f"del_{event['id']}"):
                        if st.confirm(f"Delete event '{event.get('name')}'?"):
                            if delete_event(event["id"]):
                                st.success("Event deleted")
                                st.rerun()
            
            with col4:
                # Status management
                if event.get('status') == 'planning':
                    if st.button("▶️ Start Event", key=f"start_{event['id']}"):
                        if update_event(event["id"], {"status": "active"}):
                            st.success("Event started")
                            st.rerun()
                elif event.get('status') == 'active':
                    if st.button("✅ Complete Event", key=f"complete_{event['id']}"):
                        if update_event(event["id"], {"status": "complete"}):
                            st.success("Event completed")
                            st.rerun()

    # Show event mode banner and toolbar if active event
    show_event_mode_banner()
    if active_event_id:
        render_event_toolbar(active_event_id, context="active")

# ----------------------------
# 📊 Event Statistics
# ----------------------------

def show_event_statistics():
    """Display event statistics"""
    try:
        events = get_all_events()
        
        if not events:
            return
        
        st.markdown("### 📊 Event Statistics")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            total_events = len([e for e in events if not e.get('deleted')])
            st.metric("Total Events", total_events)
        
        with col2:
            active_events = len([e for e in events if e.get('status') == 'active'])
            st.metric("Active Events", active_events)
        
        with col3:
            completed_events = len([e for e in events if e.get('status') == 'complete'])
            st.metric("Completed Events", completed_events)
        
        with col4:
            total_guests = sum(e.get('guest_count', 0) for e in events if not e.get('deleted'))
            st.metric("Total Guests Served", total_guests)
            
    except Exception as e:
        st.error(f"⚠️ Could not load statistics: {e}")

# Enhanced event UI with statistics
def enhanced_event_ui(user: dict | None) -> None:
    """Enhanced event UI with statistics"""
    show_event_statistics()
    st.markdown("---")
    event_ui(user)
