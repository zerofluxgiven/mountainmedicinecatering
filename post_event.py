# post_event.py

import streamlit as st
from firebase_admin import firestore
from auth import require_role
from utils import format_date
from datetime import datetime

db = firestore.client()

# ----------------------------
# 📋 Post-Event Interview
# ----------------------------

@require_role("manager")
def post_event_ui(user: dict) -> None:
    """Displays the post-event survey and saves feedback into the event document."""
    st.title("📋 Post-Event Interview")

    active_event = st.session_state.get("active_event")
    if not active_event:
        st.warning("No active event selected.")
        return

    event_ref = db.collection("events").document(active_event)
    event_doc = event_ref.get().to_dict()

    if not event_doc or event_doc.get("status") != "complete":
        st.warning("Post-event feedback is only available for completed events.")
        return

    st.subheader(f"Event: {event_doc.get('name')} ({format_date(event_doc.get('date'))})")

    # ----------------------------
    # 🍽️ Popularity Ratings
    # ----------------------------
    st.markdown("### 🍽️ Menu Popularity")
    menus = db.collection("menus").where("event_id", "==", active_event).stream()
    menu_popularity = {}
    for menu in menus:
        m = menu.to_dict()
        rating = st.slider(f"{m.get('name', 'Unnamed Item')}", 1, 5, 3)
        menu_popularity[m["id"]] = rating

    # ----------------------------
    # 🧾 Feedback Sections
    # ----------------------------

    st.markdown("### 🥡 Leftovers or Overages")
    leftovers_notes = st.text_area("Leftovers, extra food, or waste:")

    st.markdown("### ⏱️ Timing Issues")
    timing_issues = st.text_area("Notes about prep/service timing:")

    st.markdown("### 🛠️ Issues + Improvements")
    improvements = st.text_area("Problems encountered + ideas for next time:")

    st.markdown("### 🧾 Forgotten / Missing Items")
    forgotten_items = st.text_area("Things that were forgotten or should be added:")

    # ----------------------------
    # ✅ Save & Generate PDF
    # ----------------------------
    if st.button("✅ Save Summary & Generate PDF"):
        try:
            event_ref.update({
                "post_event_summary": {
                    "menu_popularity": menu_popularity,
                    "leftovers_notes": leftovers_notes,
                    "timing_issues": timing_issues,
                    "improvements": improvements,
                    "forgotten_items": forgotten_items,
                    "completed_by": user["id"],
                    "completed_at": datetime.utcnow(),
                }
            })
            st.success("Post-event summary saved. Generating PDF...")
            from pdf_export import generate_event_summary_pdf
            generate_event_summary_pdf(active_event)
            st.info("📄 PDF summary generated and ready for download.")
        except Exception as e:
            st.error(f"❌ Failed to save post-event summary: {e}")
