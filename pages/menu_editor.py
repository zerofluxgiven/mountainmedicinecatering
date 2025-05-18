import streamlit as st
from src.auth import is_authenticated, require_login, get_user_role, is_event_staff
from src.firestore_utils import get_active_event, log_suggestion, normalize_tags
from google.cloud import firestore

db = firestore.Client()

def show():
    require_login()
    st.title("Menu Editor")

    active_event = get_active_event()
    scoped_only = True

    # Allow toggle if not in strict Event Mode
    if active_event:
        scoped_only = st.toggle("View All Menus", value=False)

    query = db.collection("menus")
    if active_event and scoped_only:
        query = query.where("event_id", "==", active_event["event_id"])

    docs = query.stream()

    for doc in docs:
        item = doc.to_dict()
        st.markdown("---")
        st.subheader(f"{item['name']}")

        # Check for lock
        is_locked = (
            active_event and 
            item.get("event_id") != active_event["event_id"]
        )

        if is_locked:
            st.warning("Locked for editing — suggest a change instead:")
            new_name = st.text_input("Suggest new name:", key=f"suggest_{doc.id}", value=item["name"])
            if st.button("Submit Suggestion", key=f"suggest_btn_{doc.id}"):
                log_suggestion(
                    entity_id=doc.id,
                    field="name",
                    original=item["name"],
                    proposed=new_name,
                    context="menu_editor"
                )
                st.success("Suggestion submitted.")
        else:
            # Editable fields
            new_name = st.text_input("Name", key=f"edit_{doc.id}", value=item["name"])
            new_tags = st.text_input("Tags (comma-separated)", key=f"tags_{doc.id}",
                                     value=", ".join(item.get("tags", [])))
            if st.button("Save Changes", key=f"save_{doc.id}"):
                cleaned_tags = normalize_tags([t.strip() for t in new_tags.split(",") if t.strip()])
                doc.reference.update({
                    "name": new_name,
                    "tags": cleaned_tags
                })
                st.success("Menu item updated.")
