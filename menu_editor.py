import streamlit as st
from firebase_admin import firestore
from auth import require_role
from tags import get_suggested_tag, increment_tag_usage
from suggestions import suggestion_input
from event_mode import is_locked, get_scoped_event_id
from layout import show_locked_notice, show_event_tag_label
from utils import generate_id

db = firestore.client()
COLLECTION = "menu_items"

# -------------------------------
# 🔍 Load Menu Items
# -------------------------------

def get_menu_items(event_id=None):
    ref = db.collection(COLLECTION)
    if event_id:
        ref = ref.where("event_id", "==", event_id)
    docs = ref.order_by("name").stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_menu_item(item_id):
    doc = db.collection(COLLECTION).document(item_id).get()
    return doc.to_dict() | {"id": doc.id} if doc.exists else None

# -------------------------------
# ➕ Add Menu Item
# -------------------------------

def add_menu_item(name, tags, event_id):
    item_id = generate_id("menu")
    db.collection(COLLECTION).document(item_id).set({
        "id": item_id,
        "name": name,
        "tags": tags,
        "event_id": event_id,
        "leftovers": "",
        "notes": "",
    })
    for tag in tags:
        increment_tag_usage(tag)
    st.success("Item added.")

# -------------------------------
# ✏️ Menu Item Editor
# -------------------------------

def menu_item_editor(item, user):
    st.markdown("### 🍴 Menu Item")
    st.write(f"📄 ID: `{item['id']}`")
    show_event_tag_label(item["event_id"])

    locked = is_locked(item["event_id"])
    if locked:
        show_locked_notice()

    name = suggestion_input(
        "Name", item["name"],
        document_type="menu_item",
        document_id=item["id"],
        user=user
    ) if locked else st.text_input("Name", item["name"])

    tags_str = ", ".join(item.get("tags", []))
    tags_input = suggestion_input(
        "Tags (comma-separated)", tags_str,
        document_type="menu_item",
        document_id=item["id"],
        user=user
    ) if locked else st.text_input("Tags (comma-separated)", tags_str)

    leftovers = suggestion_input(
        "Leftovers / Overages", item.get("leftovers", ""),
        document_type="menu_item",
        document_id=item["id"],
        user=user
    ) if locked else st.text_area("Leftovers / Overages", item.get("leftovers", ""))

    notes = suggestion_input(
        "Staff Notes", item.get("notes", ""),
        document_type="menu_item",
        document_id=item["id"],
        user=user
    ) if locked else st.text_area("Staff Notes", item.get("notes", ""))

    if not locked and st.button("💾 Save Changes"):
        updated_tags = [get_suggested_tag(t.strip()) for t in tags_input.split(",") if t.strip()]
        db.collection(COLLECTION).document(item["id"]).update({
            "name": name,
            "tags": updated_tags,
            "leftovers": leftovers,
            "notes": notes
        })
        for tag in updated_tags:
            increment_tag_usage(tag)
        st.success("Changes saved.")
        st.experimental_rerun()

# -------------------------------
# 📋 Page UI
# -------------------------------

def menu_editor_ui(user):
    st.subheader("🍽️ Menu Editor")

    scoped_event_id = get_scoped_event_id()
    menu_items = get_menu_items(event_id=scoped_event_id)

    st.write("### Current Menu Items")
    for item in menu_items:
        with st.expander(f"{item['name']}"):
            menu_item_editor(item, user)

    st.write("### ➕ Add New Item")
    if not require_role(user, "manager"):
        st.warning("You need manager access to add items.")
        return

    if not scoped_event_id:
        st.info("No active event selected.")
        return

    with st.form("add_menu_item"):
        name = st.text_input("New Item Name")
        tags = st.text_input("Tags (comma-separated)")
        submitted = st.form_submit_button("Add")
        if submitted and name:
            tag_list = [get_suggested_tag(t.strip()) for t in tags.split(",") if t.strip()]
            add_menu_item(name, tag_list, scoped_event_id)
            st.experimental_rerun()
