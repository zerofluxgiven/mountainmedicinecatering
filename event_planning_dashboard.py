import streamlit as st
from mobile_helpers import safe_columns, safe_dataframe, safe_file_uploader
from firebase_init import db
from utils import session_get, generate_id, get_scoped_query, is_event_scoped, get_event_scope_message
from menu_viewer import menu_viewer_ui
from file_storage import save_uploaded_file
from datetime import datetime
from layout import render_event_toolbar
from auth import get_user_id

# ----------------------------
# 🧾 Load Event Data
# ----------------------------
def get_event_data(event_id):
    try:
        doc = db.collection("events").document(event_id).get()
        return doc.to_dict() if doc.exists else {}
    except Exception as e:
        st.error(f"❌ Failed to load event: {e}")
        return {}

# ----------------------------
# 💾 Save Event Data
# ----------------------------
def save_event_data(event_id, data):
    try:
        db.collection("events").document(event_id).update(data)
        return True
    except Exception as e:
        st.error(f"❌ Failed to save event: {e}")
        return False

# ----------------------------
# 📋 Event Planning Dashboard - FIXED
# ----------------------------
def event_planning_dashboard_ui(event_id):
    # Get user from Firebase session first
    user = st.session_state.get("firebase_user")
    if not user:
        # Fallback to legacy session
        user = session_get("user")
    
    if not user:
        st.warning("Login required")
        return
    
    # Ensure admin role for mistermcfarland@gmail.com
    if user.get("email") == "mistermcfarland@gmail.com" and user.get("role") != "admin":
        user["role"] = "admin"
        st.session_state["firebase_user"] = user

    event = get_event_data(event_id)
    if not event:
        st.error("Event not found")
        return

    st.markdown("<div style='margin-top: 3.5rem'></div>", unsafe_allow_html=True)
    render_event_toolbar(event_id, context="editing")

    st.markdown("# 📝 Event Planning Dashboard")
    st.info(f"Editing: **{event.get('name', 'Unnamed Event')}**")

    # ✅ FIXED: Use session state to preserve form values between reruns
    form_key = f"event_form_{event_id}"
    
    # Initialize form state if not exists
    if f"{form_key}_initialized" not in st.session_state:
        st.session_state[f"{form_key}_name"] = event.get("name", "")
        st.session_state[f"{form_key}_description"] = event.get("description", "")
        st.session_state[f"{form_key}_location"] = event.get("location", "")
        st.session_state[f"{form_key}_instructions"] = event.get("instructions", "")
        st.session_state[f"{form_key}_restrictions"] = event.get("dietary_restrictions", "")
        st.session_state[f"{form_key}_allergies"] = event.get("food_allergies", "")
        st.session_state[f"{form_key}_notes"] = event.get("internal_notes", "")
        st.session_state[f"{form_key}_initialized"] = True

    # Main event details form - FIXED
    with st.form("event_form", clear_on_submit=False):  # ✅ Don't clear on submit
        st.markdown("## 📋 Event Details")
        
        col1, col2 = safe_columns(2)
        with col1:
            # ✅ FIXED: Use session state values, not database values
            name = st.text_input(
                "Event Name", 
                value=st.session_state.get(f"{form_key}_name", ""),
                key=f"{form_key}_name_input"
            )
            description = st.text_area(
                "Description", 
                value=st.session_state.get(f"{form_key}_description", ""),
                key=f"{form_key}_description_input"
            )
            location = st.text_input(
                "Location", 
                value=st.session_state.get(f"{form_key}_location", ""),
                key=f"{form_key}_location_input"
            )
        
        with col2:
            # ✅ FIXED: Better date handling with error catching
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
            
            # ✅ FIXED: Validate dates
            if start > end:
                st.error("⚠️ Start date must be before end date")
                
            headcount = st.number_input("👥 Expected Guests", min_value=0, value=event.get("guest_count", 0))
            staff_count = st.number_input("🧑‍🍳 Staff Count", min_value=0, value=event.get("staff_count", 0))

        # Additional details - FIXED
        st.markdown("## 📝 Additional Information")
        col1, col2 = safe_columns(2)
        
        with col1:
            instructions = st.text_area(
                "🛠️ Special Instructions", 
                value=st.session_state.get(f"{form_key}_instructions", ""),
                key=f"{form_key}_instructions_input"
            )
            restrictions = st.text_area(
                "🥗 Dietary Restrictions", 
                value=st.session_state.get(f"{form_key}_restrictions", ""),
                key=f"{form_key}_restrictions_input"
            )
        
        with col2:
            allergies = st.text_area(
                "⚠️ Food Allergies", 
                value=st.session_state.get(f"{form_key}_allergies", ""),
                key=f"{form_key}_allergies_input"
            )
            notes = st.text_area(
                "📌 Internal Notes", 
                value=st.session_state.get(f"{form_key}_notes", ""),
                key=f"{form_key}_notes_input"
            )

        # ✅ FIXED: Form submission with proper validation
        if st.form_submit_button("💾 Save Event Details", type="primary"):
            if not name or not location:
                st.error("❌ Please fill in required fields: Name and Location")
            elif start > end:
                st.error("❌ Start date must be before end date")
            else:
                # Update session state with current values
                st.session_state[f"{form_key}_name"] = name
                st.session_state[f"{form_key}_description"] = description
                st.session_state[f"{form_key}_location"] = location
                st.session_state[f"{form_key}_instructions"] = instructions
                st.session_state[f"{form_key}_restrictions"] = restrictions
                st.session_state[f"{form_key}_allergies"] = allergies
                st.session_state[f"{form_key}_notes"] = notes
                
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
                
                if save_event_data(event_id, data):
                    st.success("✅ Event details updated successfully!")
                    # Reset form state to show updated values
                    st.session_state[f"{form_key}_initialized"] = False
                    st.rerun()

    # Separate sections for different components
    st.markdown("---")
    
    # Menu Planning Section - FIXED
    with st.expander("🍽️ Menu Planning", expanded=True):
        try:
            # ✅ FIXED: Properly scope the menu editor without affecting global state
            render_menu_editor_scoped(event_id, user)
        except Exception as e:
            st.error(f"Could not load menu editor: {e}")
            st.info("You can manage menus from the Recipes tab.")

    # Shopping List Section - FIXED
    with st.expander("🛒 Shopping List", expanded=False):
        _render_shopping_list_editor(event_id)

    # Equipment List Section - FIXED
    with st.expander("🎒 Equipment List", expanded=False):
        _render_equipment_list_editor(event_id)

    # Tasks Section - FIXED
    with st.expander("✅ Tasks & Checklist", expanded=False):
        _render_task_list_editor(event_id)

    # Allergies Section - FIXED
    with st.expander("🚨 Allergies & Dietary Restrictions", expanded=False):
        _render_allergies_section(event_id, user)

    # File Uploads Section - FIXED
    with st.expander("📎 Event Files", expanded=False):
        _render_file_upload_section(event_id, user)

    # AI Suggestions Section - FIXED
    if st.checkbox("🤖 Show AI Assistant Suggestions"):
        _render_ai_suggestions(event_id)

        # ✅ Show menu form if requested
        if st.session_state.get("show_menu_form"):
            _render_quick_menu_form(event_id, user)

# ----------------------------
# ➕ Quick Menu Form - NEW
# ----------------------------
def _render_quick_menu_form(event_id: str, user: dict):
    """Quick menu item creation form"""
    st.markdown("### ➕ Add Menu Item")
    
    with st.form("quick_menu_form"):
        col1, col2 = safe_columns(2)
        
        with col1:
            name = st.text_input("Menu Item Name *")
            category = st.selectbox("Category", ["Appetizer", "Main Course", "Side Dish", "Dessert", "Beverage"])
        
        with col2:
            description = st.text_area("Description")
            ingredients = st.text_area("Ingredients")
        
        col1, col2 = safe_columns(2)
        with col1:
            if st.form_submit_button("Add Menu Item", type="primary"):
                if not name:
                    st.error("Please provide a menu item name")
                else:
                    try:
                        menu_id = generate_id("menu")
                        menu_data = {
                            "id": menu_id,
                            "name": name,
                            "category": category,
                            "description": description,
                            "ingredients": ingredients,
                            "event_id": event_id,
                            "created_by": user["id"],
                            "created_at": datetime.utcnow()
                        }
                        
                        db.collection("menus").document(menu_id).set(menu_data)
                        st.success(f"✅ Added: {name}")
                        st.session_state["show_menu_form"] = False
                        st.rerun()
                        
                    except Exception as e:
                        st.error(f"Failed to add menu item: {e}")
        
        with col2:
            if st.form_submit_button("Cancel"):
                st.session_state["show_menu_form"] = False
                st.rerun()

# ----------------------------
# 🛒 Shopping List Editor - FIXED
# ----------------------------
def _render_shopping_list_editor(event_id):
    st.subheader("Shopping List Management")
    
    # ✅ FIXED: Better error handling
    try:
        shopping_ref = db.collection("events").document(event_id).collection("shopping_items")
        items = [doc.to_dict() | {"id": doc.id} for doc in shopping_ref.stream()]
    except Exception as e:
        st.error(f"Failed to load shopping items: {e}")
        items = []
    
    # Display existing items - FIXED
    if items:
        st.markdown("#### Current Shopping List")
        for item in items:
            col1, col2, col3, col4 = safe_columns([3, 1, 1, 1])
            
            with col1:
                st.write(f"• {item.get('name', 'Unknown')}")
            with col2:
                st.write(f"{item.get('quantity', '')} {item.get('unit', '')}")
            with col3:
                # ✅ FIXED: Checkbox state persistence with unique keys
                current_state = item.get('purchased', False)
                new_state = st.checkbox(
                    "Got it", 
                    value=current_state, 
                    key=f"shop_{item['id']}_{event_id}"
                )
                if new_state != current_state:
                    try:
                        shopping_ref.document(item['id']).update({"purchased": new_state})
                        st.rerun()
                    except Exception as e:
                        st.error(f"Failed to update: {e}")
            with col4:
                if st.button("🗑️", key=f"del_shop_{item['id']}_{event_id}"):
                    try:
                        shopping_ref.document(item['id']).delete()
                        st.success("Item deleted")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Failed to delete: {e}")
    
    # Add new item - FIXED
    st.markdown("#### Add Shopping Item")
    with st.form(f"add_shopping_{event_id}"):
        col1, col2, col3 = safe_columns([3, 1, 1])
        
        with col1:
            item_name = st.text_input("Item Name *")
        with col2:
            quantity = st.text_input("Quantity")
        with col3:
            unit = st.selectbox("Unit", ["", "lbs", "kg", "oz", "cups", "pieces", "dozen", "cases"])
        
        category = st.selectbox("Category", ["Produce", "Protein", "Dairy", "Dry Goods", "Beverages", "Supplies", "Other"])
        
        if st.form_submit_button("Add Item"):
            if not item_name:
                st.error("Please enter an item name")
            else:
                try:
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
                except Exception as e:
                    st.error(f"Failed to add item: {e}")

# ----------------------------
# 🎒 Equipment List Editor - FIXED
# ----------------------------
def _render_equipment_list_editor(event_id):
    st.subheader("Equipment Management")
    
    # ✅ FIXED: Better error handling
    try:
        equipment_ref = db.collection("events").document(event_id).collection("equipment")
        items = [doc.to_dict() | {"id": doc.id} for doc in equipment_ref.stream()]
    except Exception as e:
        st.error(f"Failed to load equipment: {e}")
        items = []
    
    # Display existing items - FIXED
    if items:
        st.markdown("#### Current Equipment List")
        for item in items:
            col1, col2, col3, col4 = safe_columns([3, 1, 1, 1])
            
            with col1:
                st.write(f"• {item.get('name', 'Unknown')}")
            with col2:
                st.write(f"Qty: {item.get('quantity', 1)}")
            with col3:
                # ✅ FIXED: Checkbox state persistence
                current_state = item.get('packed', False)
                new_state = st.checkbox(
                    "Packed", 
                    value=current_state, 
                    key=f"eq_{item['id']}_{event_id}"
                )
                if new_state != current_state:
                    try:
                        equipment_ref.document(item['id']).update({"packed": new_state})
                        st.rerun()
                    except Exception as e:
                        st.error(f"Failed to update: {e}")
            with col4:
                if st.button("🗑️", key=f"del_eq_{item['id']}_{event_id}"):
                    try:
                        equipment_ref.document(item['id']).delete()
                        st.success("Equipment removed")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Failed to delete: {e}")
    
    # Add new equipment - FIXED
    st.markdown("#### Add Equipment")
    with st.form(f"add_equipment_{event_id}"):
        col1, col2 = safe_columns([3, 1])
        
        with col1:
            equipment_name = st.text_input("Equipment Name *")
        with col2:
            quantity = st.number_input("Quantity", min_value=1, value=1)
        
        category = st.selectbox("Category", ["Cooking", "Serving", "Storage", "Transport", "Safety", "Other"])
        
        if st.form_submit_button("Add Equipment"):
            if not equipment_name:
                st.error("Please enter equipment name")
            else:
                try:
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
                except Exception as e:
                    st.error(f"Failed to add equipment: {e}")

# ----------------------------
# ✅ Task List Editor - FIXED
# ----------------------------
def _render_task_list_editor(event_id):
    st.subheader("Task Management")
    
    # ✅ FIXED: Better error handling
    try:
        tasks_ref = db.collection("events").document(event_id).collection("tasks")
        tasks = [doc.to_dict() | {"id": doc.id} for doc in tasks_ref.stream()]
    except Exception as e:
        st.error(f"Failed to load tasks: {e}")
        tasks = []
    
    # Display existing tasks - FIXED
    if tasks:
        st.markdown("#### Current Tasks")
        for task in tasks:
            col1, col2 = safe_columns([4, 1])
            
            with col1:
                # ✅ FIXED: Task checkbox state persistence
                current_state = task.get('done', False)
                new_state = st.checkbox(
                    task.get('label', 'Unknown task'),
                    value=current_state,
                    key=f"task_{task['id']}_{event_id}"
                )
                if new_state != current_state:
                    try:
                        tasks_ref.document(task['id']).update({"done": new_state})
                        st.rerun()
                    except Exception as e:
                        st.error(f"Failed to update task: {e}")
            
            with col2:
                if st.button("🗑️", key=f"del_task_{task['id']}_{event_id}"):
                    try:
                        tasks_ref.document(task['id']).delete()
                        st.success("Task deleted")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Failed to delete task: {e}")
    
    # Add new task - FIXED
    st.markdown("#### Add Task")
    with st.form(f"add_task_{event_id}"):
        task_label = st.text_input("Task Description *")
        priority = st.selectbox("Priority", ["High", "Medium", "Low"])
        
        if st.form_submit_button("Add Task"):
            if not task_label:
                st.error("Please enter a task description")
            else:
                try:
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
                except Exception as e:
                    st.error(f"Failed to add task: {e}")

# ----------------------------
# 🚨 Allergies Section - FIXED
# ----------------------------
def _render_allergies_section(event_id, user):
    """Render allergies management within event planning - FIXED"""
    try:
        # ✅ FIXED: Try importing allergies functions, with fallback
        try:
            from allergies import get_event_allergies, add_allergy_to_event, delete_allergy
            allergies_available = True
        except ImportError:
            allergies_available = False
            st.warning("⚠️ Allergies module not available")
    
        st.subheader("Allergy Management")
        
        if not allergies_available:
            st.info("Allergies management is not available. Check the Allergies tab.")
            return
        
        # Get existing allergies
        allergies = get_event_allergies(event_id)
        
        if allergies:
            st.markdown(f"#### {len(allergies)} People with Allergies")
            
            for allergy in allergies:
                col1, col2, col3 = safe_columns([3, 1, 1])
                
                with col1:
                    st.write(f"**{allergy.get('person_name', 'Unknown')}**")
                    allergens = ", ".join(allergy.get('allergies', []))
                    st.caption(f"Allergies: {allergens}")
                    st.caption(f"Severity: {allergy.get('severity', 'Unknown')}")
                
                with col2:
                    if allergy.get('notes'):
                        st.caption(f"Notes: {allergy.get('notes')}")
                
                with col3:
                    if st.button("🗑️", key=f"del_allergy_{allergy['id']}_{event_id}"):
                        try:
                            if delete_allergy(event_id, allergy['id']):
                                st.success("Allergy removed")
                                st.rerun()
                        except Exception as e:
                            st.error(f"Failed to delete allergy: {e}")
        else:
            st.info("No allergies recorded yet")
        
        # Quick add allergy form - FIXED
        st.markdown("#### Quick Add Allergy")
        with st.form(f"quick_allergy_{event_id}"):
            col1, col2 = safe_columns(2)
            
            with col1:
                person_name = st.text_input("Person's Name *")
                severity = st.selectbox("Severity", ["Mild", "Moderate", "Severe", "Life-threatening"])
            
            with col2:
                allergies_text = st.text_input("Allergies (comma-separated) *")
                notes = st.text_input("Notes (optional)")
            
            if st.form_submit_button("Add Allergy"):
                if not person_name or not allergies_text:
                    st.error("Please provide name and allergies")
                else:
                    try:
                        allergy_list = [a.strip() for a in allergies_text.split(',') if a.strip()]
                        
                        allergy_data = {
                            'person_name': person_name,
                            'allergies': allergy_list,
                            'severity': severity,
                            'notes': notes,
                            'ingredient_ids': [],
                            'tags': [],
                            'created_by': user['id']
                        }
                        
                        if add_allergy_to_event(event_id, allergy_data):
                            st.success(f"Added allergy info for {person_name}")
                            st.rerun()
                    except Exception as e:
                        st.error(f"Failed to add allergy: {e}")
        
        # Link to full allergy management - FIXED
        if st.button("🔍 Advanced Allergy Management", key=f"advanced_allergies_{event_id}"):
            st.session_state["active_event_id"] = event_id
            st.session_state["top_nav"] = "Allergies"
            st.rerun()
            
    except Exception as e:
        st.error(f"Error in allergies section: {e}")

# ----------------------------
# 📎 File Upload Section - FIXED
# ----------------------------
def _render_file_upload_section(event_id, user):
    st.subheader("Event Files")
    
    # Show existing files for this event - FIXED
    try:
        files = db.collection("files").where("event_id", "==", event_id).where("deleted", "==", False).stream()
        file_list = [doc.to_dict() | {"id": doc.id} for doc in files]
        
        if file_list:
            st.markdown("#### Current Files")
            for file in file_list:
                col1, col2 = safe_columns([4, 1])
                with col1:
                    st.write(f"📄 {file.get('filename', 'Unknown')}")
                    if file.get('tags'):
                        st.caption(f"Tags: {', '.join(file['tags'])}")
                with col2:
                    if file.get('url'):
                        st.link_button("📥", file['url'], key=f"download_{file['id']}")
    except Exception as e:
        st.error(f"Failed to load files: {e}")
    
    # Upload new file - FIXED
    st.markdown("#### Upload New File")
    uploaded_file = safe_file_uploader(
        "Choose file",
        type=["pdf", "png", "jpg", "jpeg", "txt", "doc", "docx", "xlsx", "xls", "csv"],
        key=f"upload_{event_id}"
    )
    
    if uploaded_file:
        col1, col2 = safe_columns(2)
        
        with col1:
            st.write(f"**File:** {uploaded_file.name}")
            st.write(f"**Size:** {len(uploaded_file.getvalue()) / 1024:.1f} KB")
        
        with col2:
            if st.button("Upload to Event", key=f"upload_btn_{event_id}"):
                try:
                    # ✅ FIXED: Proper file upload with error handling
                    file_id = save_uploaded_file(uploaded_file, event_id, get_user_id(user))
                    if file_id:
                        st.success("File uploaded successfully!")
                        st.rerun()
                    else:
                        st.error("Failed to upload file")
                except Exception as e:
                    st.error(f"Upload failed: {e}")

# ----------------------------
# 🤖 AI Suggestions - FIXED
# ----------------------------
def _render_ai_suggestions(event_id):
    st.subheader("🤖 AI Assistant Suggestions")
    
    # ✅ FIXED: More realistic AI suggestions based on event data
    try:
        event = get_event_data(event_id)
        guest_count = event.get('guest_count', 0)
        dietary_restrictions = event.get('dietary_restrictions', '')
        
        suggestions = []
        
        # Generate contextual suggestions
        if guest_count > 50:
            suggestions.append("Consider adding additional serving stations for large group")
        
        if dietary_restrictions:
            suggestions.append(f"Remember to accommodate dietary restrictions: {dietary_restrictions}")
        
        if not event.get('staff_count'):
            suggestions.append("Don't forget to set your staff count for proper planning")
            
        # Get menu count
        try:
            menu_count = len(list(db.collection("menus").where("event_id", "==", event_id).stream()))
            if menu_count == 0:
                suggestions.append("No menu items yet - start planning your menu")
        except:
            pass
            
        # Default suggestions if none generated
        if not suggestions:
            suggestions = [
                "Consider adding vegetarian options to accommodate all guests",
                "Equipment list seems incomplete - check serving utensils",
                "Shopping list could be organized by store sections for efficiency"
            ]
        
        for i, suggestion in enumerate(suggestions):
            with st.expander(f"💡 Suggestion {i+1}"):
                st.write(suggestion)
                col1, col2 = safe_columns(2)
                with col1:
                    if st.button("✅ Helpful", key=f"helpful_sugg_{i}_{event_id}"):
                        st.success("Thanks for the feedback!")
                with col2:
                    if st.button("❌ Dismiss", key=f"dismiss_sugg_{i}_{event_id}"):
                        st.info("Suggestion dismissed")
                        
    except Exception as e:
        st.error(f"Failed to generate suggestions: {e}")
        st.info("AI suggestions temporarily unavailable")
