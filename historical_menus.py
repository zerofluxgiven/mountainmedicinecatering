import streamlit as st
from firebase_init import db
from utils import format_date

# ----------------------------
# 📜 Historical Menus Viewer
# ----------------------------

def historical_menus_ui():
    st.title("📜 Historical Menus")

    events_ref = db.collection("events")
    events = events_ref.stream()

    menu_events = []
    for event in events:
        event_data = event.to_dict()
        event_id = event.id
        meta_ref = events_ref.document(event_id).collection("meta").document("event_file")
        meta_doc = meta_ref.get()
        if meta_doc.exists and meta_doc.to_dict().get("menu"):
            menu_events.append({
                "id": event_id,
                "name": event_data.get("name", "Unnamed Event"),
                "date": event_data.get("start_date"),
                "menu": meta_doc.to_dict().get("menu", [])
            })

    sort_mode = st.radio("Sort by", ["Newest First", "Oldest First", "Event Name"])

    if sort_mode == "Newest First":
        menu_events.sort(key=lambda e: e["date"] or "", reverse=True)
    elif sort_mode == "Oldest First":
        menu_events.sort(key=lambda e: e["date"] or "")
    else:
        menu_events.sort(key=lambda e: e["name"].lower()

    for event in menu_events:
        st.markdown(f"## 🗓️ {event['name']} ({format_date(event['date'])})")
        menu = event["menu"]

        meal_colors = {
            "breakfast": "#ADD8E6",
            "lunch": "#FFD700",
            "dinner": "#90EE90",
            "note": "#D3D3D3"
        }

        for item in menu:
            bg_color = meal_colors.get(item.get("meal", "note").lower(), "#f0f0f0")
            with st.container():
                st.markdown(f"<div style='background-color:{bg_color};padding:1em;border-radius:8px;'>", unsafe_allow_html=True)
                st.markdown(f"**Day:** {item.get('day', '-')}")
                st.markdown(f"**Meal:** {item.get('meal', '-').capitalize()}")
                st.markdown(f"**Recipe:** {item.get('recipe', '-')}")
                st.markdown(f"**Notes:** {item.get('notes', '-')}")
                st.markdown(f"**Tags:** {', '.join(item.get('tags', [])}")
                st.markdown(f"**Allergens:** {', '.join(item.get('allergens', [])}")
                st.markdown("</div>", unsafe_allow_html=True)

        st.markdown("---")
