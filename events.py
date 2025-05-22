import streamlit as st
from firestore import db
from utils import session_get, get_active_event_id
from ui_components import show_event_mode_banner, render_event_toolbar

# ----------------------------
# 🔥 Get All Events
# ----------------------------
def get_all_events():
    docs = db.collection("events").order_by("start_date").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

# ----------------------------
# ⚡ Set Active Event
# ----------------------------
def activate_event(event_id):
    db.collection("config").document("global").set({"active_event": event_id})

# ----------------------------
# 🎛 Events Tab UI
# ----------------------------
def event_ui(user):
    st.markdown("## 📅 All Events")

    events = get_all_events()
    active_event_id = get_active_event_id()

    for event in events:
        is_active = event["id"] == active_event_id
        with st.expander(f"{'🟣' if is_active else '⚪'} {event.get('name', 'Unnamed Event')}"):
            st.write(f"📍 Location: {event.get('location', 'Unknown')}")
            st.write(f"📆 Dates: {event.get('start_date', '?')} → {event.get('end_date', '?')}")
            st.write(f"👥 Guests: {event.get('guest_count', '-')}")
            st.write(f"📝 Description: {event.get('description', '-')[:120]}...")

            cols = st.columns([1, 1, 6])
            if cols[0].button("⚡ Activate", key=f"act_{event['id']}"):
                activate_event(event["id"])
                st.rerun()

            if cols[1].button("✏️ Edit/Plan", key=f"edit_{event['id']}"):
                st.session_state["editing_event_id"] = event["id"]
                st.session_state["top_nav"] = "Event Planner"
                st.rerun()

    show_event_mode_banner()
    if active_event_id:
        render_event_toolbar(active_event_id, context="active")
