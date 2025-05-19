import streamlit as st
from firebase_admin import firestore
from datetime import datetime, timedelta
from auth import require_role
from utils import session_get, session_set

db = firestore.client()
EVENTS_COLLECTION = "events"
ACTIVE_EVENT_DOC = "active_event"

# ------------------------------
# 🔧 Firestore Interaction
# ------------------------------

def get_all_events():
    docs = db.collection(EVENTS_COLLECTION).order_by("date", direction=firestore.Query.DESCENDING).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_event(event_id: str):
    ref = db.collection(EVENTS_COLLECTION).document(event_id)
    doc = ref.get()
    if doc.exists:
        return doc.to_dict() | {"id": doc.id}
    return None

def create_event(name: str, date: datetime, location: str, guest_count: int):
    doc_ref = db.collection(EVENTS_COLLECTION).document()
    data = {
        "name": name,
        "date": date,
        "location": location,
        "guest_count": guest_count,
        "status": "draft",
        "created_at": firestore.SERVER_TIMESTAMP,
    }
    doc_ref.set(data)
    st.success("Event created.")

def update_event_status(event_id: str, status: str):
    db.collection(EVENTS_COLLECTION).document(event_id).update({
        "status": status,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
    if status == "active":
        db.collection("system").document(ACTIVE_EVENT_DOC).set({
            "event_id": event_id,
            "activated_at": firestore.SERVER_TIMESTAMP,
        })

def get_active_event_id():
    doc = db.collection("system").document(ACTIVE_EVENT_DOC).get()
    return doc.to_dict().get("event_id") if doc.exists else None

def get_active_event():
    active_id = get_active_event_id()
    if active_id:
        return get_event(active_id)
    return None

def exit_event_mode():
    db.collection("system").document(ACTIVE_EVENT_DOC).delete()
    st.success("Exited Event Mode.")

# ------------------------------
# ⚡ Event Mode Status Display
# ------------------------------

def display_event_mode_banner(event):
    status = event.get("status", "unknown").capitalize()
    st.markdown(f"""
        <div style='background-color:#ffeecc;padding:10px;border-radius:8px;margin:10px 0;'>
            <strong>📅 Event Mode: {event.get("name")} ({status})</strong>
            <br>Date: {event.get('date').strftime('%b %d, %Y')}
            <br>Location: {event.get('location')}
            <br>Guests: {event.get('guest_count')}
        </div>
    """, unsafe_allow_html=True)

# ------------------------------
# 🔁 Event Mode Reminder Popup
# ------------------------------

def maybe_show_event_popup():
    if session_get("event_popup_dismissed"):
        return

    today = datetime.now().date()
    upcoming_events = [
        e for e in get_all_events()
        if abs((e["date"].date() - today).days) <= 1
        and e["status"] in ("draft", "paused")
    ]

    if not upcoming_events:
        return

    e = upcoming_events[0]
    with st.expander(f"🔔 You have an upcoming event: {e['name']}"):
        st.write(f"📍 {e['location']} on {e['date'].strftime('%A, %b %d')}")
        st.write(f"👥 Guests: {e['guest_count']}")
        col1, col2 = st.columns(2)
        if col1.button("Enter Event Mode Now"):
            update_event_status(e["id"], "active")
            session_set("event_popup_dismissed", True)
            st.experimental_rerun()
        if col2.button("Dismiss for Now"):
            session_set("event_popup_dismissed", True)

# ------------------------------
# 🖥️ Main UI Page
# ------------------------------

def event_ui(user):
    st.subheader("📋 Events")
    maybe_show_event_popup()

    active = get_active_event()
    if active:
        display_event_mode_banner(active)
        st.write("✅ Event Mode is active. Only tagged content will be editable.")
        with st.expander("Modify Active Event"):
            col1, col2, col3 = st.columns(3)
            if col1.button("Pause Event"):
                update_event_status(active["id"], "paused")
                st.experimental_rerun()
            if col2.button("Mark Complete"):
                update_event_status(active["id"], "complete")
                st.success("Event marked complete. Summaries will be generated.")
            if col3.button("Exit Event Mode"):
                exit_event_mode()
                st.experimental_rerun()

    with st.expander("➕ Create New Event"):
        with st.form("create_event_form"):
            name = st.text_input("Event Name")
            date = st.date_input("Event Date")
            location = st.text_input("Location")
            guests = st.number_input("Guest Count", min_value=1, value=10)
            submitted = st.form_submit_button("Create Event")
            if submitted:
                create_event(name, datetime.combine(date, datetime.min.time()), location, guests)
                st.experimental_rerun()

    st.write("### 📅 All Events")
    events = get_all_events()
    for event in events:
        with st.expander(f"📌 {event['name']} ({event['status']})"):
            st.write(f"🗓️ Date: {event['date'].strftime('%b %d, %Y')}")
            st.write(f"📍 Location: {event['location']}")
            st.write(f"👥 Guests: {event['guest_count']}")
            if require_role(user, "admin"):
                st.button("Activate", key=f"act_{event['id']}",
                          on_click=update_event_status, args=(event['id'], "active"))

