import streamlit as st
from firebase_admin import firestore
from event_mode import get_event_context
from utils import generate_id

db = firestore.client()

# ----------------------------
# 📦 Packing & Loading UI
# ----------------------------

def packing_ui():
    event = get_event_context()
    if not event:
        st.warning("Activate an event to view its packing checklist.")
        return

    st.title("📦 Packing & Loading")
    event_id = event["id"]

    _render_task_list(event_id, "tasks")
    _render_equipment_list(event_id)
    _render_grocery_list(event_id)

# ----------------------------
# ✅ Task Checklist
# ----------------------------

def _render_task_list(event_id, kind):
    st.subheader("📝 Tasks")

    tasks_ref = db.collection("events").document(event_id).collection("tasks")
    tasks = [doc.to_dict() for doc in tasks_ref.stream()]

    for task in tasks:
        checked = st.checkbox(task["label"], value=task.get("done", False), key=f"task_{task['id']}")
        if checked != task.get("done"):
            tasks_ref.document(task["id"]).update({"done": checked})

    new_task = st.text_input("Add a new task", key="new_task_input")
    if st.button("Add Task"):
        tid = generate_id("task")
        tasks_ref.document(tid).set({"id": tid, "label": new_task, "done": False})
        st.experimental_rerun()

# ----------------------------
# 🧰 Equipment
# ----------------------------

def _render_equipment_list(event_id):
    st.subheader("🔧 Equipment")

    items_ref = db.collection("events").document(event_id).collection("equipment")
    items = [doc.to_dict() for doc in items_ref.stream()]

    for eq in items:
        st.markdown(f"- **{eq['name']}** (Qty: {eq.get('quantity', 1)})")

    new_eq = st.text_input("Add equipment")
    if st.button("Add Equipment"):
        eid = generate_id("eq")
        items_ref.document(eid).set({"id": eid, "name": new_eq, "quantity": 1})

# ----------------------------
# 🥕 Grocery List
# ----------------------------

def _render_grocery_list(event_id):
    st.subheader("🛒 Groceries")

    groc_ref = db.collection("events").document(event_id).collection("groceries")
    items = [doc.to_dict() for doc in groc_ref.stream()]

    for g in items:
        checked = st.checkbox(g["item"], value=g.get("done", False), key=f"groc_{g['id']}")
        if checked != g.get("done"):
            groc_ref.document(g["id"]).update({"done": checked})

    new_groc = st.text_input("Add grocery item")
    if st.button("Add Grocery Item"):
        gid = generate_id("groc")
        groc_ref.document(gid).set({"id": gid, "item": new_groc, "done": False})
        st.experimental_rerun()
