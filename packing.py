import streamlit as st
from firebase_admin import firestore
from utils import generate_id, get_scoped_query, is_event_scoped, get_event_scope_message, get_active_event_id, delete_button
from datetime import datetime

db = firestore.client()

# ----------------------------
# 📦 Packing & Loading UI
# ----------------------------

def packing_ui():
    st.title("📦 Packing & Loading")
    
    # Show current scope
    st.info(get_event_scope_message())
    
    # Check if we're in event mode
    if not is_event_scoped():
        # Show all events' packing lists
        _show_all_events_packing()
    else:
        # Show specific event's packing list
        event_id = get_active_event_id()
        event = _get_event_info(event_id)
        if event:
            st.subheader(f"Packing for: {event.get('name', 'Unknown Event')}")
            _render_event_packing(event_id)
        else:
            st.error("Active event not found")

def _show_all_events_packing():
    """Show packing lists for all events"""
    # Get all non-deleted events
    try:
        events = db.collection("events").where("deleted", "==", False).order_by("start_date").stream()
        event_list = [doc.to_dict() | {"id": doc.id} for doc in events]
    except:
        event_list = []
    
    if not event_list:
        st.info("No events found. Create an event first!")
        return
    
    # Filter to show only upcoming or active events
    st.markdown("### Select an Event to View Packing List")
    
    # Event selector
    event_options = ["Select an event..."]
    event_mapping = {}
    
    for event in event_list:
        if event.get('status') != 'complete':  # Don't show completed events
            option = f"{event.get('name', 'Unnamed')} - {event.get('start_date', 'No date')}"
            event_options.append(option)
            event_mapping[option] = event['id']
    
    selected = st.selectbox("Choose Event", event_options)
    
    if selected != "Select an event...":
        event_id = event_mapping[selected]
        st.markdown("---")
        _render_event_packing(event_id)

def _render_event_packing(event_id):
    """Render packing lists for a specific event"""
    # Create tabs for different packing categories
    tab1, tab2, tab3, tab4 = st.tabs(["✅ Tasks", "🔧 Equipment", "🛒 Groceries", "📊 Summary"])
    
    with tab1:
        _render_task_list(event_id)
    
    with tab2:
        _render_equipment_list(event_id)
    
    with tab3:
        _render_grocery_list(event_id)
    
    with tab4:
        _render_packing_summary(event_id)

# ----------------------------
# ✅ Task Checklist
# ----------------------------

def _render_task_list(event_id):
    st.subheader("📝 Tasks")
    
    tasks_ref = db.collection("events").document(event_id).collection("tasks")
    tasks = [doc.to_dict() for doc in tasks_ref.stream()]
    
    # Group tasks by priority
    high_priority = [t for t in tasks if t.get('priority') == 'High']
    medium_priority = [t for t in tasks if t.get('priority') == 'Medium']
    low_priority = [t for t in tasks if t.get('priority') == 'Low']
    no_priority = [t for t in tasks if not t.get('priority')]
    
    # Display by priority
    if high_priority:
        st.markdown("#### 🔴 High Priority")
        for task in high_priority:
            _render_task_item(task, tasks_ref)
    
    if medium_priority:
        st.markdown("#### 🟡 Medium Priority")
        for task in medium_priority:
            _render_task_item(task, tasks_ref)
    
    if low_priority:
        st.markdown("#### 🟢 Low Priority")
        for task in low_priority:
            _render_task_item(task, tasks_ref)
    
    if no_priority:
        st.markdown("#### ⚪ Other Tasks")
        for task in no_priority:
            _render_task_item(task, tasks_ref)
    
    # Add new task
    st.markdown("---")
    with st.expander("➕ Add New Task"):
        with st.form(f"new_task_{event_id}"):
            col1, col2 = st.columns([3, 1])
            with col1:
                new_task = st.text_input("Task Description")
            with col2:
                priority = st.selectbox("Priority", ["High", "Medium", "Low"])
            
            if st.form_submit_button("Add Task"):
                if new_task:
                    tid = generate_id("task")
                    tasks_ref.document(tid).set({
                        "id": tid,
                        "label": new_task,
                        "priority": priority,
                        "done": False,
                        "created_at": datetime.utcnow()
                    })
                    st.success("Task added!")
                    st.rerun()

def _render_task_item(task, tasks_ref):
    """Render a single task item"""
    col1, col2 = st.columns([5, 1])
    
    with col1:
        checked = st.checkbox(
            task.get("label", "Unknown task"),
            value=task.get("done", False),
            key=f"task_{task['id']}"
        )
        if checked != task.get("done"):
            tasks_ref.document(task["id"]).update({"done": checked})
    
    with col2:
        if delete_button("🗑️", key=f"del_task_{task['id']}"):
            tasks_ref.document(task["id"]).delete()
            st.rerun()

# ----------------------------
# 🧰 Equipment
# ----------------------------

def _render_equipment_list(event_id):
    st.subheader("🔧 Equipment")
    
    items_ref = db.collection("events").document(event_id).collection("equipment")
    items = [doc.to_dict() for doc in items_ref.stream()]
    
    # Group by category
    categories = {}
    for item in items:
        cat = item.get('category', 'Other')
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(item)
    
    # Display by category
    for category, cat_items in categories.items():
        st.markdown(f"#### {category}")
        for eq in cat_items:
            col1, col2, col3, col4 = st.columns([3, 1, 1, 1])
            
            with col1:
                st.write(f"• {eq.get('name', 'Unknown')}")
            with col2:
                st.write(f"Qty: {eq.get('quantity', 1)}")
            with col3:
                packed = st.checkbox(
                    "Packed",
                    value=eq.get('packed', False),
                    key=f"eq_packed_{eq['id']}"
                )
                if packed != eq.get('packed'):
                    items_ref.document(eq['id']).update({"packed": packed})
            with col4:
                if delete_button("🗑️", key=f"del_eq_{eq['id']}"):
                    items_ref.document(eq['id']).delete()
                    st.rerun()
    
    # Add new equipment
    st.markdown("---")
    with st.expander("➕ Add New Equipment"):
        with st.form(f"new_equipment_{event_id}"):
            col1, col2, col3 = st.columns([3, 1, 1])
            with col1:
                new_eq = st.text_input("Equipment Name")
            with col2:
                quantity = st.number_input("Quantity", min_value=1, value=1)
            with col3:
                category = st.selectbox("Category", ["Cooking", "Serving", "Storage", "Transport", "Safety", "Other"])
            
            if st.form_submit_button("Add Equipment"):
                if new_eq:
                    eid = generate_id("eq")
                    items_ref.document(eid).set({
                        "id": eid,
                        "name": new_eq,
                        "quantity": quantity,
                        "category": category,
                        "packed": False,
                        "created_at": datetime.utcnow()
                    })
                    st.success("Equipment added!")
                    st.rerun()

# ----------------------------
# 🥕 Grocery List
# ----------------------------

def _render_grocery_list(event_id):
    st.subheader("🛒 Groceries")
    
    # Use shopping_items collection instead of groceries for consistency
    groc_ref = db.collection("events").document(event_id).collection("shopping_items")
    items = [doc.to_dict() for doc in groc_ref.stream()]
    
    # Group by category
    categories = {}
    for item in items:
        cat = item.get('category', 'Other')
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(item)
    
    # Display by category
    for category, cat_items in categories.items():
        st.markdown(f"#### {category}")
        for g in cat_items:
            col1, col2, col3, col4 = st.columns([3, 1, 1, 1])
            
            with col1:
                st.write(f"• {g.get('name', 'Unknown')}")
            with col2:
                qty_text = f"{g.get('quantity', '')} {g.get('unit', '')}".strip()
                st.write(qty_text if qty_text else "-")
            with col3:
                checked = st.checkbox(
                    "Got it",
                    value=g.get('purchased', False),
                    key=f"groc_{g['id']}"
                )
                if checked != g.get('purchased'):
                    groc_ref.document(g['id']).update({"purchased": checked})
            with col4:
                if delete_button("🗑️", key=f"del_groc_{g['id']}"):
                    groc_ref.document(g['id']).delete()
                    st.rerun()
    
    # Add new grocery item
    st.markdown("---")
    with st.expander("➕ Add New Grocery Item"):
        with st.form(f"new_grocery_{event_id}"):
            col1, col2, col3 = st.columns([3, 1, 1])
            with col1:
                new_groc = st.text_input("Item Name")
            with col2:
                quantity = st.text_input("Quantity")
            with col3:
                unit = st.selectbox("Unit", ["", "lbs", "kg", "oz", "cups", "pieces", "dozen", "cases"])
            
            category = st.selectbox("Category", ["Produce", "Protein", "Dairy", "Dry Goods", "Beverages", "Supplies", "Other"])
            
            if st.form_submit_button("Add Item"):
                if new_groc:
                    gid = generate_id("shop")
                    groc_ref.document(gid).set({
                        "id": gid,
                        "name": new_groc,
                        "quantity": quantity,
                        "unit": unit,
                        "category": category,
                        "purchased": False,
                        "created_at": datetime.utcnow()
                    })
                    st.success("Item added!")
                    st.rerun()

# ----------------------------
# 📊 Packing Summary
# ----------------------------

def _render_packing_summary(event_id):
    st.subheader("📊 Packing Summary")
    
    # Get all data
    tasks_ref = db.collection("events").document(event_id).collection("tasks")
    equipment_ref = db.collection("events").document(event_id).collection("equipment")
    shopping_ref = db.collection("events").document(event_id).collection("shopping_items")
    
    tasks = [doc.to_dict() for doc in tasks_ref.stream()]
    equipment = [doc.to_dict() for doc in equipment_ref.stream()]
    shopping = [doc.to_dict() for doc in shopping_ref.stream()]
    
    # Calculate completion percentages
    tasks_done = len([t for t in tasks if t.get('done')])
    tasks_total = len(tasks)
    tasks_pct = (tasks_done / tasks_total * 100) if tasks_total > 0 else 0
    
    equipment_packed = len([e for e in equipment if e.get('packed')])
    equipment_total = len(equipment)
    equipment_pct = (equipment_packed / equipment_total * 100) if equipment_total > 0 else 0
    
    shopping_done = len([s for s in shopping if s.get('purchased')])
    shopping_total = len(shopping)
    shopping_pct = (shopping_done / shopping_total * 100) if shopping_total > 0 else 0
    
    # Display metrics
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Tasks Complete", f"{tasks_done}/{tasks_total}", f"{tasks_pct:.0f}%")
        if tasks_pct < 100 and tasks_total > 0:
            st.progress(tasks_pct / 100)
    
    with col2:
        st.metric("Equipment Packed", f"{equipment_packed}/{equipment_total}", f"{equipment_pct:.0f}%")
        if equipment_pct < 100 and equipment_total > 0:
            st.progress(equipment_pct / 100)
    
    with col3:
        st.metric("Shopping Done", f"{shopping_done}/{shopping_total}", f"{shopping_pct:.0f}%")
        if shopping_pct < 100 and shopping_total > 0:
            st.progress(shopping_pct / 100)
    
    # Overall readiness
    overall_pct = (tasks_pct + equipment_pct + shopping_pct) / 3
    
    st.markdown("---")
    st.markdown("### Overall Readiness")
    st.progress(overall_pct / 100)
    
    if overall_pct == 100:
        st.success("🎉 Everything is ready! You're all set for the event.")
    elif overall_pct >= 75:
        st.info("📦 Almost there! Just a few more items to complete.")
    elif overall_pct >= 50:
        st.warning("⚡ Halfway done. Keep up the momentum!")
    else:
        st.warning("🚧 Still lots to do. Focus on high-priority items first.")
    
    # Export checklist button
    if st.button("📄 Export Packing Checklist"):
        _export_packing_checklist(event_id, tasks, equipment, shopping)

def _export_packing_checklist(event_id, tasks, equipment, shopping):
    """Generate a printable packing checklist"""
    # This would generate a PDF or text file
    st.info("Export functionality coming soon!")

# ----------------------------
# 🔧 Helper Functions
# ----------------------------

def _get_event_info(event_id):
    """Get event information"""
    try:
        doc = db.collection("events").document(event_id).get()
        if doc.exists:
            return doc.to_dict()
    except:
        pass
    return None
