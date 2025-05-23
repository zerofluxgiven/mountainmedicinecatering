import streamlit as st
from db_client import db
from utils import session_get, generate_id, get_scoped_query, is_event_scoped, get_event_scope_message
from menu_editor import render_menu_editor
from file_storage import save_uploaded_file
from datetime import datetime
from layout import render_event_toolbar
from auth import get_user_id

# ----------------------------
# 🧾 Load Event Data
# ----------------------------
def get_event_data(event_id):
    doc = db.collection("events").document(event_id).get()
    return doc.to_dict() if doc.exists else {}

# ----------------------------
# 💾 Save Event Data
# ----------------------------
def save_event_data(event_id, data):
    db.collection("events").document(event_id).update(data)

# ----------------------------
# 📋 Event Planning Dashboard
# ----------------------------
def event_planning_dashboard_ui(event_id):
    user = session_get("user")
    if not user:
        st.warning("Login required")
        return

    event = get_event_data(event_id)
    if not event:
        st.error("Event not found")
        return

    st.markdown("<div style='margin-top: 3.5rem'></div>", unsafe_allow_html=True)  # Spacer for sticky nav
    render_event_toolbar(event_id, context="editing")

    st.markdown("# 📝 Event Planning Dashboard")
    st.info(f"Editing: **{event.get('name', 'Unnamed Event')}**")

    # Main event details form
    with st.form("event_form"):
        st.markdown("## 📋 Event Details")
        
        col1, col2 = st.columns(2)
        with col1:
            name = st.text_input("Event Name", value=event.get("name", ""))
            description = st.text_area("Description", value=event.get("description", ""))
            location = st.text_input("Location", value=event.get("location", ""))
        
        with col2:
            # Date handling
            try:
                start_default = datetime.strptime(event.get("start_date", "2025-01-01"), "%Y-%m-%d").date()
            except (ValueError, TypeError):
                start_default = datetime.now().date()
                
            try:
                end_default = datetime.strptime(event.get("end_date", "2025-01-02"), "%Y-%m-%d").date()
            except (ValueError, TypeError):
                end_default = datetime.now().date()
                
            start = st.date_input("Start Date", value=start_default)
            end = st.date_input("End Date", value=end_default)
            headcount = st.number_input("👥 Expected Guests", min_value=0, value=event.get("guest_count", 0))
            staff_count = st.number_input("🧑‍🍳 Staff Count", min_value=0, value=event.get("staff_count", 0))

        # Additional details
        st.markdown("## 📝 Additional Information")
        col1, col2 = st.columns(2)
        
        with col1:
            instructions = st.text_area("🛠️ Special Instructions", value=event.get("instructions", ""))
            restrictions = st.text_area("🥗 Dietary Restrictions", value=event.get("dietary_restrictions", ""))
        
        with col2:
            allergies = st.text_area("⚠️ Food Allergies", value=event.get("food_allergies", ""))
            notes = st.text_area("📌 Internal Notes", value=event.get("internal_notes", ""))

        if st.form_submit_button("💾 Save Event Details", type="primary"):
            data = {
                "name": name,
                "description": description,
                "location": location,
                "start_date": str(start),
                "end_date": str(end),
                "instructions": instructions,
                "dietary_restrictions": restrictions,
                "food_allergies": allergies,
                "guest_count": headcount,
                "staff_count": staff_count,
                "internal_notes": notes,
                "updated_at": datetime.utcnow()
            }
            save_event_data(event_id, data)
            st.success("✅ Event details updated successfully!")

    # Separate sections for different components
    st.markdown("---")
    
    # Menu Planning Section
    with st.expander("🍽️ Menu Planning", expanded=True):
        # Temporarily set the event context for the menu editor
        old_event = st.session_state.get("active_event")
        st.session_state["active_event"] = event_id
        
        try:
            # Use the embedded menu editor
            render_menu_editor(event_id, user)
        except Exception as e:
            st.error(f"Could not load menu editor: {e}")
            st.info("You can manage menus from the Recipes tab.")
        finally:
            # Restore original event context
            if old_event:
                st.session_state["active_event"] = old_event
            elif "active_event" in st.session_state:
                del st.session_state["active_event"]

    # Shopping List Section
    with st.expander("🛒 Shopping List", expanded=False):
        _render_shopping_list_editor(event_id)

    # Equipment List Section
    with st.expander("🎒 Equipment List", expanded=False):
        _render_equipment_list_editor(event_id)

    # Tasks Section
    with st.expander("✅ Tasks & Checklist", expanded=False):
        _render_task_list_editor(event_id)

    # Allergies Section
    with st.expander("🚨 Allergies & Dietary Restrictions", expanded=False):
        _render_allergies_section(event_id, user)

    # File Uploads Section
    with st.expander("📎 Event Files", expanded=False):
        _render_file_upload_section(event_id, user)

    # AI Suggestions Section (if available)
    if st.checkbox("🤖 Show AI Assistant Suggestions"):
        _render_ai_suggestions(event_id)

# ----------------------------
# 🛒 Shopping List Editor
# ----------------------------
def _render_shopping_list_editor(event_id):
    st.subheader("Shopping List Management")
    
    # Get existing shopping items
    try:
        shopping_ref = db.collection("events").document(event_id).collection("shopping_items")
        items = [doc.to_dict() for doc in shopping_ref.stream()]
    except:
        items = []
    
    # Display existing items
    if items:
        st.markdown("#### Current Shopping List")
        for item in items:
            col1, col2, col3, col4 = st.columns([3, 1, 1, 1])
            
            with col1:
                st.write(f"• {item.get('name', 'Unknown')}")
            with col2:
                st.write(f"{item.get('quantity', '')} {item.get('unit', '')}")
            with col3:
                if st.checkbox("Got it", value=item.get('purchased', False), key=f"shop_{item['id']}"):
                    shopping_ref.document(item['id']).update({"purchased": True})
            with col4:
                if st.button("🗑️", key=f"del_shop_{item['id']}"):
                    shopping_ref.document(item['id']).delete()
                    st.rerun()
    
    # Add new item
    st.markdown("#### Add Shopping Item")
    with st.form(f"add_shopping_{event_id}"):
        col1, col2, col3 = st.columns([3, 1, 1])
        
        with col1:
            item_name = st.text_input("Item Name")
        with col2:
            quantity = st.text_input("Quantity")
        with col3:
            unit = st.selectbox("Unit", ["", "lbs", "kg", "oz", "cups", "pieces", "dozen", "cases"])
        
        category = st.selectbox("Category", ["Produce", "Protein", "Dairy", "Dry Goods", "Beverages", "Supplies", "Other"])
        
        if st.form_submit_button("Add Item"):
            if item_name:
                item_id = generate_id("shop")
                shopping_ref.document(item_id).set({
                    "id": item_id,
                    "name": item_name,
                    "quantity": quantity,
                    "unit": unit,
                    "category": category,
                    "purchased": False,
                    "created_at": datetime.utcnow()
                })
                st.success(f"Added: {item_name}")
                st.rerun()

# ----------------------------
# 🎒 Equipment List Editor
# ----------------------------
def _render_equipment_list_editor(event_id):
    st.subheader("Equipment Management")
    
    # Get existing equipment
    try:
        equipment_ref = db.collection("events").document(event_id).collection("equipment")
        items = [doc.to_dict() for doc in equipment_ref.stream()]
    except:
        items = []
    
    # Display existing items
    if items:
        st.markdown("#### Current Equipment List")
        for item in items:
            col1, col2, col3, col4 = st.columns([3, 1, 1, 1])
            
            with col1:
                st.write(f"• {item.get('name', 'Unknown')}")
            with col2:
                st.write(f"Qty: {item.get('quantity', 1)}")
            with col3:
                if st.checkbox("Packed", value=item.get('packed', False), key=f"eq_{item['id']}"):
                    equipment_ref.document(item['id']).update({"packed": True})
            with col4:
                if st.button("🗑️", key=f"del_eq_{item['id']}"):
                    equipment_ref.document(item['id']).delete()
                    st.rerun()
    
    # Add new equipment
    st.markdown("#### Add Equipment")
    with st.form(f"add_equipment_{event_id}"):
        col1, col2 = st.columns([3, 1])
        
        with col1:
            equipment_name = st.text_input("Equipment Name")
        with col2:
            quantity = st.number_input("Quantity", min_value=1, value=1)
        
        category = st.selectbox("Category", ["Cooking", "Serving", "Storage", "Transport", "Safety", "Other"])
        
        if st.form_submit_button("Add Equipment"):
            if equipment_name:
                eq_id = generate_id("eq")
                equipment_ref.document(eq_id).set({
                    "id": eq_id,
                    "name": equipment_name,
                    "quantity": quantity,
                    "category": category,
                    "packed": False,
                    "created_at": datetime.utcnow()
                })
                st.success(f"Added: {equipment_name}")
                st.rerun()

# ----------------------------
# ✅ Task List Editor
# ----------------------------
def _render_task_list_editor(event_id):
    st.subheader("Task Management")
    
    # Get existing tasks
    try:
        tasks_ref = db.collection("events").document(event_id).collection("tasks")
        tasks = [doc.to_dict() for doc in tasks_ref.stream()]
    except:
        tasks = []
    
    # Display existing tasks
    if tasks:
        st.markdown("#### Current Tasks")
        for task in tasks:
            col1, col2 = st.columns([4, 1])
            
            with col1:
                done = st.checkbox(
                    task.get('label', 'Unknown task'),
                    value=task.get('done', False),
                    key=f"task_{task['id']}"
                )
                if done != task.get('done'):
                    tasks_ref.document(task['id']).update({"done": done})
            
            with col2:
                if st.button("🗑️", key=f"del_task_{task['id']}"):
                    tasks_ref.document(task['id']).delete()
                    st.rerun()
    
    # Add new task
    st.markdown("#### Add Task")
    with st.form(f"add_task_{event_id}"):
        task_label = st.text_input("Task Description")
        priority = st.selectbox("Priority", ["High", "Medium", "Low"])
        
        if st.form_submit_button("Add Task"):
            if task_label:
                task_id = generate_id("task")
                tasks_ref.document(task_id).set({
                    "id": task_id,
                    "label": task_label,
                    "priority": priority,
                    "done": False,
                    "created_at": datetime.utcnow()
                })
                st.success(f"Added task: {task_label}")
                st.rerun()

# ----------------------------
# 🚨 Allergies Section
# ----------------------------
def _render_allergies_section(event_id, user):
    """Render allergies management within event planning"""
    from allergies import get_event_allergies, add_allergy_to_event, delete_allergy
    
    st.subheader("Allergy Management")
    
    # Get existing allergies
    allergies = get_event_allergies(event_id)
    
    if allergies:
        st.markdown(f"#### {len(allergies)} People with Allergies")
        
        for allergy in allergies:
            col1, col2, col3 = st.columns([3, 1, 1])
            
            with col1:
                st.write(f"**{allergy.get('person_name', 'Unknown')}**")
                allergens = ", ".join(allergy.get('allergies', []))
                st.caption(f"Allergies: {allergens}")
                st.caption(f"Severity: {allergy.get('severity', 'Unknown')}")
            
            with col2:
                if allergy.get('notes'):
                    st.caption(f"Notes: {allergy.get('notes')}")
            
            with col3:
                if st.button("🗑️", key=f"del_allergy_{allergy['id']}"):
                    if delete_allergy(event_id, allergy['id']):
                        st.success("Allergy removed")
                        st.rerun()
    else:
        st.info("No allergies recorded yet")
    
    # Quick add allergy form
    st.markdown("#### Quick Add Allergy")
    with st.form(f"quick_allergy_{event_id}"):
        col1, col2 = st.columns(2)
        
        with col1:
            person_name = st.text_input("Person's Name")
            severity = st.selectbox("Severity", ["Mild", "Moderate", "Severe", "Life-threatening"])
        
        with col2:
            allergies_text = st.text_input("Allergies (comma-separated)")
            notes = st.text_input("Notes (optional)")
        
        if st.form_submit_button("Add Allergy"):
            if person_name and allergies_text:
                allergy_list = [a.strip() for a in allergies_text.split(',') if a.strip()]
                
                allergy_data = {
                    'person_name': person_name,
                    'allergies': allergy_list,
                    'severity': severity,
                    'notes': notes,
                    'ingredient_ids': [],  # Would need ingredient search for full functionality
                    'tags': [],
                    'created_by': user['id']
                }
                
                if add_allergy_to_event(event_id, allergy_data):
                    st.success(f"Added allergy info for {person_name}")
                    st.rerun()
            else:
                st.error("Please provide name and allergies")
    
    # Link to full allergy management
    if st.button("🔍 Advanced Allergy Management"):
        st.session_state["active_event_id"] = event_id
        st.session_state["top_nav"] = "Allergies"
        st.rerun()

# ----------------------------
# 📎 File Upload Section
# ----------------------------
def _render_file_upload_section(event_id, user):
    st.subheader("Event Files")
    
    # Show existing files for this event
    try:
        files = db.collection("files").where("event_id", "==", event_id).where("deleted", "==", False).stream()
        file_list = [doc.to_dict() for doc in files]
        
        if file_list:
            st.markdown("#### Current Files")
            for file in file_list:
                col1, col2 = st.columns([4, 1])
                with col1:
                    st.write(f"📄 {file.get('filename', 'Unknown')}")
                    if file.get('tags'):
                        st.caption(f"Tags: {', '.join(file['tags'])}")
                with col2:
                    if file.get('url'):
                        st.link_button("📥", file['url'])
    except:
        pass
    
    # Upload new file
    st.markdown("#### Upload New File")
    uploaded_file = st.file_uploader(
        "Choose file",
        type=["pdf", "png", "jpg", "jpeg", "txt", "doc", "docx", "xlsx", "xls", "csv"],
        key=f"upload_{event_id}"
    )
    
    if uploaded_file:
        if st.button("Upload to Event", key=f"upload_btn_{event_id}"):
            try:
                file_id = save_uploaded_file(uploaded_file, event_id, get_user_id(user))
                if file_id:
                    st.success("File uploaded successfully!")
                    st.rerun()
            except Exception as e:
                st.error(f"Upload failed: {e}")

# ----------------------------
# 🤖 AI Suggestions
# ----------------------------
def _render_ai_suggestions(event_id):
    st.subheader("🤖 AI Assistant Suggestions")
    st.info("AI suggestions based on your event details will appear here.")
    
    # Placeholder for AI integration
    suggestions = [
        "Consider adding vegetarian options to accommodate dietary restrictions",
        "Equipment list seems incomplete - you may need serving utensils",
        "Shopping list could be organized by store sections for efficiency"
    ]
    
    for i, suggestion in enumerate(suggestions):
        with st.expander(f"💡 Suggestion {i+1}"):
            st.write(suggestion)
            col1, col2 = st.columns(2)
            with col1:
                if st.button("Apply", key=f"apply_sugg_{i}"):
                    st.info("Suggestion applied (placeholder)")
            with col2:
                if st.button("Dismiss", key=f"dismiss_sugg_{i}"):
                    st.info("Suggestion dismissed")
