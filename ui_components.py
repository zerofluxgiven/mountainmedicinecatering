# ui_components.py - Fixed version with unique keys

import streamlit as st
from utils import format_date
from event_mode import get_active_event

# ----------------------------
# 📢 Event Mode Banner with Unique Keys
# ----------------------------

def show_event_mode_banner() -> None:
    """Displays a visual banner when Event Mode is active - no duplicate button."""
    active_event = get_active_event()
    if not active_event:
        return

    name = active_event.get("name", "Unnamed Event")
    date = format_date(active_event.get("date"))
    location = active_event.get("location", "Unknown")

    # Just show the banner - no button to avoid duplicates
    banner_html = f"""
        <div style="background-color:#fff8e1;padding:8px 12px;border-radius:8px;margin:8px 0;border:1px solid #ffecb3;">
            <strong>📅 Event Mode Active:</strong> {name}<br>
            <small>📍 {location} | 🗓 {date}</small>
        </div>
    """
    
    # Display banner only - the exit button is in the header
    st.markdown(banner_html, unsafe_allow_html=True)

# ----------------------------
# 🧰 Event Toolbar Stub (Updated with unique keys)
# ----------------------------

def render_event_toolbar(*args, **kwargs) -> None:
    """Stub for rendering event toolbar. Placeholder until extended."""
    # Generate unique key based on context
    context_id = kwargs.get('context', 'default')
    toolbar_key = f"toolbar_{context_id}_{hash(str(args))}"
    
    st.markdown(f"<!-- Event toolbar placeholder: {toolbar_key} -->", unsafe_allow_html=True)

# ----------------------------
# 🎯 Context-Aware Event Controls
# ----------------------------

def render_event_controls(event_id: str, context: str = "default") -> None:
    """Render event controls with context-specific unique keys"""
    if not event_id:
        return
    
    from utils import get_active_event_id
    active_event_id = get_active_event_id()
    
    # Create unique keys based on context and event ID
    base_key = f"{context}_{event_id}"
    
    if active_event_id == event_id:
        # Event is active - show deactivate button
        if st.button("Deactivate Event", key=f"deactivate_{base_key}"):
            try:
                st.session_state["recent_event_id"] = event_id
                from events import deactivate_event_mode
                deactivate_event_mode()
                st.success("Event deactivated")
                st.rerun()
            except ImportError:
                st.error("Could not deactivate event")
    
    elif active_event_id and active_event_id != event_id:
        # Another event is active - show switch button
        if st.button("Switch to Event", key=f"switch_{base_key}"):
            try:
                from events import activate_event
                if active_event_id:
                    st.session_state["recent_event_id"] = active_event_id
                activate_event(event_id)
                st.success("Switched events")
                st.rerun()
            except ImportError:
                st.error("Could not switch events")
    
    else:
        # No event active - show activate button
        if st.button("Activate Event", key=f"activate_{base_key}"):
            try:
                from events import activate_event
                activate_event(event_id)
                st.success("Event activated")
                st.rerun()
            except ImportError:
                st.error("Could not activate event")

# ----------------------------
# 🔄 Quick Event Switcher
# ----------------------------

def render_quick_event_switcher() -> None:
    """Render a quick event switcher dropdown"""
    try:
        from db_client import db
        
        # Get recent events
        events_docs = list(db.collection("events")
                          .where("deleted", "==", False)
                          .order_by("start_date", direction=db.query.DESCENDING)
                          .limit(5)
                          .stream())
        
        events = [doc.to_dict() | {"id": doc.id} for doc in events_docs]
        
        if not events:
            return
        
        # Create options
        options = ["No Event Active"]
        event_mapping = {}
        
        for event in events:
            display_name = f"{event.get('name', 'Unnamed')} ({event.get('start_date', 'No date')})"
            options.append(display_name)
            event_mapping[display_name] = event["id"]
        
        # Current selection
        from utils import get_active_event_id
        active_event_id = get_active_event_id()
        current_index = 0
        
        if active_event_id:
            for i, (display_name, event_id) in enumerate(event_mapping.items()):
                if event_id == active_event_id:
                    current_index = i + 1
                    break
        
        # Render selector
        selected = st.selectbox(
            "Quick Event Switch",
            options,
            index=current_index,
            key="quick_event_switcher"
        )
        
        # Handle selection change
        if selected != options[current_index]:
            if selected == "No Event Active":
                # Deactivate current event
                if active_event_id:
                    st.session_state["recent_event_id"] = active_event_id
                    try:
                        from events import deactivate_event_mode
                        deactivate_event_mode()
                        st.rerun()
                    except ImportError:
                        st.error("Could not deactivate event")
            else:
                # Activate selected event
                new_event_id = event_mapping.get(selected)
                if new_event_id:
                    try:
                        from events import activate_event
                        if active_event_id:
                            st.session_state["recent_event_id"] = active_event_id
                        activate_event(new_event_id)
                        st.rerun()
                    except ImportError:
                        st.error("Could not activate event")
        
    except Exception as e:
        st.error(f"Could not load event switcher: {e}")

# ----------------------------
# 💡 Smart Context Messages
# ----------------------------

def show_context_message(message_type: str = "info", custom_message: str = None) -> None:
    """Show context-appropriate messages based on current state"""
    from utils import get_active_event_id
    
    active_event_id = get_active_event_id()
    
    if custom_message:
        if message_type == "info":
            st.info(custom_message)
        elif message_type == "success":
            st.success(custom_message)
        elif message_type == "warning":
            st.warning(custom_message)
        elif message_type == "error":
            st.error(custom_message)
        return
    
    # Default context messages
    if not active_event_id:
        st.info("💡 **Tip:** Activate an event to access event-specific features and AI assistance.")
    else:
        recent_event_id = st.session_state.get("recent_event_id")
        if recent_event_id and recent_event_id != active_event_id:
            st.info("🔄 **Quick Switch:** You can quickly resume your previous event from the header.")

# ----------------------------
# 📊 Event Status Widget
# ----------------------------

def render_event_status_widget(event_id: str) -> None:
    """Render a compact event status widget"""
    if not event_id:
        return
    
    try:
        from utils import get_event_by_id
        event = get_event_by_id(event_id)
        
        if not event:
            return
        
        status = event.get('status', 'planning')
        guest_count = event.get('guest_count', 0)
        
        # Create status widget
        status_colors = {
            'planning': '#ffd54f',
            'active': '#81c784', 
            'complete': '#90a4ae'
        }
        
        status_color = status_colors.get(status, '#90a4ae')
        
        widget_html = f"""
        <div style="
            display: flex; 
            align-items: center; 
            gap: 1rem; 
            padding: 0.5rem 1rem; 
            background: #f8f9fa; 
            border-radius: 8px; 
            border-left: 4px solid {status_color};
            margin: 0.5rem 0;
        ">
            <div>
                <strong>{event.get('name', 'Unknown Event')}</strong><br>
                <small>👥 {guest_count} guests • 📊 {status.title()}</small>
            </div>
        </div>
        """
        
        st.markdown(widget_html, unsafe_allow_html=True)
        
    except Exception as e:
        st.error(f"Could not load event status: {e}")

# ----------------------------
# 🎨 Theme Helpers
# ----------------------------

def apply_purple_theme_to_widget(widget_key: str) -> None:
    """Apply purple theme styling to specific widgets"""
    theme_css = f"""
    <style>
    [data-testid*="{widget_key}"] button {{
        background-color: var(--primary-purple, #6C4AB6) !important;
        color: white !important;
        border: none !important;
        border-radius: 8px !important;
    }}
    
    [data-testid*="{widget_key}"] button:hover {{
        background-color: var(--accent-purple, #563a9d) !important;
    }}
    </style>
    """
    st.markdown(theme_css, unsafe_allow_html=True)

# ----------------------------
# 🔧 Utility Functions
# ----------------------------

def create_unique_key(base: str, context: str = None) -> str:
    """Create a unique key for Streamlit components"""
    if context:
        return f"{context}_{base}_{hash(str([base, context]))}"
    return f"{base}_{hash(base)}"

def safe_button(label: str, key: str, **kwargs) -> bool:
    """Create a button with guaranteed unique key"""
    unique_key = create_unique_key(key, kwargs.get('context', 'default'))
    return st.button(label, key=unique_key, **{k: v for k, v in kwargs.items() if k != 'context'})
