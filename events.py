# events.py - Complete Fixed Version with Smart Context Buttons

import streamlit as st
from utils import session_get, get_active_event_id, format_date, generate_id
from ui_components import show_event_mode_banner
from layout import render_smart_event_button, render_status_indicator
from menu_viewer import menu_viewer_ui
from event_file import generate_menu_template
from datetime import datetime
from firebase_init import db, firestore

# ----------------------------
# 🔥 Get All Events
# ----------------------------

def save_user_event_preference(user_id: str, event_id: str = None):
    """Save user's last active event to their profile"""
    try:
        db.collection("users").document(user_id).update({
            "last_active_event": event_id,
            "last_event_update": datetime.utcnow()
        })
    except Exception:
        # If user doesn't exist, create the preference
        try:
            db.collection("users").document(user_id).set({
                "last_active_event": event_id,
                "last_event_update": datetime.utcnow()
            }, merge=True)
        except Exception as e:
            st.warning(f"Could not save event preference: {e}")

def get_all_events() -> list[dict]:
    """Fetch all events with attached event_file data."""
    try:
        events_ref = db.collection("events")
        docs = events_ref.order_by("start_date", direction=firestore.Query.DESCENDING).stream()
        events = []
        for doc in docs:
            data = doc.to_dict()
            meta_ref = events_ref.document(doc.id).collection("meta").document("event_file")
            meta_doc = meta_ref.get()
            if meta_doc.exists:
                data["event_file"] = meta_doc.to_dict()
            data["id"] = doc.id
            events.append(data)
        return events
    except Exception as e:
        st.error(f"⚠️ Failed to fetch events: {e}")
        return []

# ----------------------------
# ⚡ Smart Event Management
# ----------------------------

def activate_event(event_id: str) -> None:
    """Sets the active event globally and updates status if needed."""
    try:
        # Set global Event Mode
        db.collection("config").document("global").set({"active_event": event_id}, merge=True)
        
        # Ensure session state is updated
        st.session_state["active_event"] = event_id
        st.session_state["active_event_id"] = event_id

        # Save user preference
        user = st.session_state.get("user")
        if user and user.get("id"):
            save_user_event_preference(user["id"], event_id)
        
        # Update event status to 'active' if it's still in 'planning'
        event_ref = db.collection("events").document(event_id)
        event_doc = event_ref.get()
        if event_doc.exists:
            event_data = event_doc.to_dict()
            if event_data.get('status') == 'planning':
                update_event(event_id, {"status": "active"})
        
        st.success(f"✅ Event Mode activated: {event_id}")
    except Exception as e:
        st.error(f"❌ Could not activate event: {e}")

def deactivate_event_mode() -> None:
    """Deactivates the currently active event mode globally."""
    try:
        # Update global config
        db.collection("config").document("global").update({"active_event": None})
        
        # Ensure session state is cleared
        if "active_event_id" in st.session_state:
            del st.session_state["active_event_id"]
            
        # Force synchronization with app state
        st.session_state["active_event"] = None

        # Clear user preference
        user = st.session_state.get("user")
        if user and user.get("id"):
            save_user_event_preference(user["id"], None)
        
        st.success("✅ Event Mode deactivated")
    except Exception as e:
        st.error(f"❌ Could not deactivate Event Mode: {e}")

def complete_event_and_end_sessions(event_id: str) -> bool:
    """Complete an event and clear all user sessions"""
    try:
        # Update event status to complete
        update_event(event_id, {"status": "complete"})
        
        # Clear global active event
        db.collection("config").document("global").update({"active_event": None})
        
        # Clear all user preferences for this event
        users_with_event = db.collection("users").where("last_active_event", "==", event_id).stream()
        batch = db.batch()
        for user_doc in users_with_event:
            user_ref = db.collection("users").document(user_doc.id)
            batch.update(user_ref, {
                "last_active_event": None,
                "last_event_update": datetime.utcnow()
            })
        batch.commit()
        
        # Clear current session
        if st.session_state.get("active_event_id") == event_id:
            st.session_state["active_event_id"] = None
            st.session_state["active_event"] = None
        
        st.success("✅ Event completed and all sessions ended")
        return True
        
    except Exception as e:
        st.error(f"❌ Failed to complete event: {e}")
        return False

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
            "version": 1,
            "deleted": False
        })
        
        # Ensure required fields have defaults
        event_data.setdefault("guest_count", 0)
        event_data.setdefault("staff_count", 0)
        event_data.setdefault("menu", [])
        event_data.setdefault("shopping_list", [])
        event_data.setdefault("equipment_list", [])
        
        db.collection("events").document(event_id).set(event_data)

         # ✅ Create canonical event_file under /events/{eventId}/meta/event_file
        default_menu = generate_menu_template(event_data.get("start_date"), event_data.get("end_date"))

        db.collection("events").document(event_id).collection("meta").document("event_file").set({
            "menu": default_menu,
            "menu_html": "",
            "schedule": [],
            "equipment": [],
            "notes": ""
        })

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
            "version": firestore.Increment(1)
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
        
        # If this was the active event, clear it and store as recent
        active_event_id = get_active_event_id()
        if active_event_id == event_id:
            st.session_state["recent_event_id"] = event_id
            db.collection("config").document("global").update({"active_event": None})
            if "active_event_id" in st.session_state:
                del st.session_state["active_event_id"]
        
        return True
        
    except Exception as e:
        st.error(f"❌ Failed to delete event: {e}")
        return False

# ----------------------------
# 📆 Upcoming Events Helper
# ----------------------------

def get_upcoming_events(events: list[dict], count: int = 5) -> list[dict]:
    """Return the next `count` upcoming events sorted by start date."""
    today = datetime.utcnow().date()

    def _parse_date(ev):
        try:
            return datetime.fromisoformat(ev.get("start_date", "")).date()
        except Exception:
            return datetime.max.date()

    future_events = [e for e in events if not e.get("deleted") and _parse_date(e) >= today]
    future_events.sort(key=_parse_date)
    return future_events[:count]

# ----------------------------
# 🆕 Create Event Section
# ----------------------------

def render_create_event_section(user: dict) -> None:
    """Render the create event form inside an expander."""
    with st.expander("Create New Event", expanded=False):
        with st.form("create_event_form"):
            col1, col2 = st.columns(2)
            with col1:
                name = st.text_input("Event Name *", placeholder="e.g., Summer Retreat 2025")
                location = st.text_input("Location *", placeholder="e.g., Mountain Lodge")
                sd_col1, sd_col2 = st.columns(2)
                with sd_col1:
                    start_date = st.date_input("Start Date *", format="MM/DD/YYYY")
                with sd_col2:
                    end_date = st.date_input("End Date *", format="MM/DD/YYYY")
            with col2:
                description = st.text_area("Description", placeholder="Brief description of the event...")
                guest_count = st.number_input("Expected Guests", min_value=0, value=20)

            submitted = st.form_submit_button("Create Event", type="primary")

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
                        "guest_count": guest_count,
                    }
                    event_id = create_event(event_data, user["id"])
                    if event_id:
                        st.success(f"✅ Event created: {name}")

# ----------------------------
# 🆕 Event Details Page
# ----------------------------

def _render_event_details(event: dict, user: dict) -> None:
    """Render a sleek event detail page."""
    st.markdown(f"### {event.get('name', 'Unnamed Event')}")
    start_fmt = format_date(event.get("start_date"))
    end_fmt = format_date(event.get("end_date"))
    st.write(f"**Dates:** {start_fmt} → {end_fmt}")
    st.write(f"**Location:** {event.get('location', 'Unknown')}")
    st.write(f"**Guests:** {event.get('guest_count', '-')}")
    if event.get("description"):
        st.write(event.get("description"))

    col1, col2, col3 = st.columns(3)
    if col1.button("Back"):
        st.session_state.pop("selected_event_id", None)
        st.experimental_rerun()
    if col2.button("Edit"):
        st.session_state["editing_event_id"] = event["id"]
        st.session_state["next_nav"] = "Events"
        st.session_state["show_event_dashboard"] = True
        st.session_state.pop("selected_event_id", None)
        st.experimental_rerun()
    can_delete = (user.get("id") == event.get("created_by") or st.session_state.get("user_role") == "admin")
    if can_delete:
        if col3.button("Delete"):
            if delete_event(event["id"]):
                st.success("Event deleted")
                st.session_state.pop("selected_event_id", None)
                st.experimental_rerun()
# ----------------------------
# 🎛 Enhanced Events Tab UI
# ----------------------------


def event_ui(user: dict | None, events: list[dict]) -> None:
    """Display a list of events with selectable detail view."""

    if not user:
        st.warning("Please log in to manage events.")
        return

    # Detail view of a single event
    selected_id = st.session_state.get("selected_event_id")
    if selected_id:
        event = next((e for e in events if e["id"] == selected_id), None)
        if event:
            _render_event_details(event, user)
            return
        else:
            st.session_state.pop("selected_event_id", None)

    active_event_id = get_active_event_id()
    if active_event_id:
        active_event = next((e for e in events if e["id"] == active_event_id), None)
        if active_event:
            st.info(f"🟣 Event Mode Active: **{active_event.get('name', 'Unknown Event')}**")

    for idx, event in enumerate(events):
        if event.get("deleted"):
            continue

        name = event.get("name", "Unnamed Event")
        date_str = format_date(event.get("start_date"))
        top_line = f"**{name}** {date_str}"
        bottom_line = f"{event.get('guest_count', '-') } guests - {event.get('location', 'Unknown')}"

        if st.button(top_line, key=f"view_{event['id']}", use_container_width=True):
            st.session_state["selected_event_id"] = event["id"]
            st.experimental_rerun()
        st.markdown(bottom_line)

    if st.session_state.get("show_event_dashboard"):
        from event_planning_dashboard import event_planning_dashboard
        editing_event_id = st.session_state.get("editing_event_id")
        if editing_event_id:
            event_planning_dashboard(editing_event_id)

    show_event_mode_banner()

# ----------------------------
# 📊 Event Statistics
# ----------------------------

def show_event_statistics():
    """Display event statistics dashboard"""
    try:
        events = get_all_events()
        
        if not events:
            return
        
        st.markdown("### Event Statistics")
        
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
        
        # Show recent activity
        recent_events = sorted(
            [e for e in events if not e.get('deleted')], 
            key=lambda x: x.get('created_at', datetime.min), 
            reverse=True
        )[:3]
        
        if recent_events:
            st.markdown("#### Recent Events")
            for event in recent_events:
                status = event.get('status', 'planning')
                col1, col2 = st.columns([10, 1])
                with col1:
                    st.write(f"• **{event.get('name', 'Unnamed')}**")
                with col2:
                    render_status_indicator(status)
                
    except Exception as e:
        st.error(f"⚠️ Could not load statistics: {e}")

# ----------------------------
# 🔍 Event Search and Filter
# ----------------------------

def render_event_filters():
    """Render event search and filter controls"""
    col1, col2, col3 = st.columns(3)
    
    with col1:
        search_term = st.text_input("Search events", placeholder="Search by name or location...")
    
    with col2:
        status_filter = st.selectbox(
            "Filter by status",
            ["All", "planning", "active", "complete"],
            key="status_filter_select",
        )

    with col3:
        date_filter = st.selectbox(
            "Date range",
            ["All time", "This month", "Next month", "Past events"],
            key="date_filter_select",
        )
    
    return search_term, status_filter, date_filter

def filter_events(events, search_term, status_filter, date_filter):
    """Apply filters to events list"""
    filtered = events
    
    # Apply search filter
    if search_term:
        search_lower = search_term.lower()
        filtered = [e for e in filtered if 
                   search_lower in e.get('name', '').lower() or 
                   search_lower in e.get('location', '').lower()]
    
    # Apply status filter
    if status_filter != "All":
        filtered = [e for e in filtered if e.get('status') == status_filter]
    
    # Apply date filter (simplified)
    if date_filter != "All time":
        # This could be enhanced with actual date filtering logic
        pass
    
    return filtered

# ----------------------------
# 🎯 Enhanced Event UI with Filters
# ----------------------------

def enhanced_event_ui(user: dict | None) -> None:
    """Reimagined event UI with upcoming events and expandable sections."""

    events = get_all_events()

    # Upcoming Events section
    st.markdown("### Upcoming Events")
    upcoming = get_upcoming_events(events)
    if upcoming:
        for ev in upcoming:
            name = ev.get("name", "Unnamed Event")
            date_str = format_date(ev.get("start_date"))
            st.markdown(f"**{name}** {date_str}")
            st.markdown(f"{ev.get('guest_count', '-') } guests - {ev.get('location', 'Unknown')}")
    else:
        st.write("No upcoming events.")

    if user:
        render_create_event_section(user)
    else:
        st.warning("Please log in to create events.")

    with st.expander("All Events", expanded=False):
        event_ui(user, events)

    with st.expander("Search Event", expanded=False):
        search_term, status_filter, date_filter = render_event_filters()
        filtered = filter_events(events, search_term, status_filter, date_filter)
        if search_term or status_filter != "All" or date_filter != "All time":
            st.info(f"Showing {len(filtered)} matching events")
            for ev in filtered:
                st.markdown(f"**{ev.get('name', 'Unnamed Event')}** {format_date(ev.get('start_date'))}")
                st.markdown(f"{ev.get('guest_count', '-') } guests - {ev.get('location', 'Unknown')}")
        else:
            st.write("Enter search criteria above to find events.")

    with st.expander("Event Statistics", expanded=False):
        show_event_statistics()

# ----------------------------
# 🔄 Backward Compatibility
# ----------------------------

def get_active_event():
    """Get the full active event document"""
    from utils import get_active_event
    return get_active_event()
