from firebase_init import get_bucket
import streamlit as st
from firebase_admin import storage
from auth import get_user_role, get_user_id
from utils import generate_id, get_active_event_id, get_scoped_query, is_event_scoped, get_event_scope_message
from datetime import datetime
import tempfile
import os
from db_client import db
from google.cloud.firestore_v1.base_query import FieldFilter
from firebase_admin import firestore
from ai_parsing_engine import parse_file

# ----------------------------
# 🔍 List Uploaded Files
# ----------------------------

def list_files(include_deleted=False):
    """List files with proper event scoping"""
    try:
        # Use scoped query
        query = get_scoped_query("files")
        query = query.order_by("created_at", direction=firestore.Query.DESCENDING)
        
        if not include_deleted:
            query = query.where(filter=FieldFilter("deleted", "==", False))
            
        docs = query.stream()
        return [doc.to_dict() | {"id": doc.id} for doc in docs]
    except Exception as e:
        st.error(f"⚠️ Could not list files: {e}")
        return []

# ----------------------------
# 📤 Upload File to Firebase Storage
# ----------------------------

def upload_file_to_storage(file_data, filename, file_id):
    """Upload file to Firebase Storage and return download URL"""
    try:
        # Get the default bucket
        bucket = get_bucket()
        
        # Create blob with organized path
        blob_path = f"files/{file_id}/{filename}"
        blob = bucket.blob(blob_path)
        
        # Upload the file data
        blob.upload_from_string(file_data)
        
        # Make the blob publicly readable (optional)
        blob.make_public()
        
        return blob.public_url
        
    except Exception as e:
        st.error(f"❌ Failed to upload file to storage: {e}")
        return None

# ----------------------------
# 💾 Save File Metadata
# ----------------------------

def save_file_metadata(file_id, filename, file_url, tags, user_id, event_id=None):
    """Save file metadata to Firestore"""
    try:
        metadata = {
            "id": file_id,
            "filename": filename,
            "url": file_url,
            "tags": tags,
            "uploaded_by": user_id,
            "event_id": event_id,
            "deleted": False,
            "created_at": datetime.utcnow(),
            "file_size": len(st.session_state.get("current_file_data", b""))
        }
        
        db.collection("files").document(file_id).set(metadata)

          # ✅ If this file is tagged 'menu' and tied to an event, store as canonical menu_html
        if "menu" in [t.lower() for t in tags] and event_id:
            try:
                db.collection("events").document(event_id).collection("meta").document("event_file").update({
                    "menu_html": st.session_state.get("current_file_data", b"").decode("utf-8")
                })
            except Exception as update_err:
                st.warning(f"Could not update event_file.menu_html: {update_err}")
        return True
        
    except Exception as e:
        st.error(f"❌ Failed to save file metadata: {e}")
        return False

# ----------------------------
# 🎯 Event Autocomplete Component
# ----------------------------
def render_event_autocomplete(default_event_id=None):
    """Render autocomplete event selector with search"""
    # Get all events for autocomplete
    try:
        events_docs = db.collection("events").where(filter=FieldFilter("deleted", "==", False)).stream()
        events = [doc.to_dict() | {"id": doc.id} for doc in events_docs]
    except Exception as e:
        st.error(f"Could not load events: {e}")
        events = []
    
    # Sort events by date (recent first)
    events.sort(key=lambda x: x.get('start_date', ''), reverse=True)
    
    # Create options for selectbox
    event_options = ["None - No event link"]
    event_mapping = {}
    
    # Auto-populate with active event if available
    active_event_id = get_active_event_id()
    default_index = 0
    
    for event in events:
        event_name = event.get('name', 'Unnamed Event')
        event_date = event.get('start_date', 'No date')
        event_status = event.get('status', 'planning')
        
        # Format option display
        option_text = f"{event_name} ({event_date}) - {event_status}"
        event_options.append(option_text)
        event_mapping[option_text] = event['id']
        
        # Set default to active event or provided default
        if (active_event_id and event['id'] == active_event_id) or (default_event_id and event['id'] == default_event_id):
            default_index = len(event_options) - 1
    
    # Render selectbox with search capability
    selected_option = st.selectbox(
        "Link to Event",
        event_options,
        index=default_index,
        help="Select an event to associate this file with. Start typing to search events."
    
    )
    
    # Return selected event ID
    if selected_option == "None - No event link":
        return None
    else:
        return event_mapping.get(selected_option)

# ----------------------------
# 🏷️ Enhanced Tag Suggestions
# ----------------------------

def suggest_tags_for_file(filename, event_id=None):
    """Enhanced tag suggestions based on filename, content type, and event context"""
    filename_lower = filename.lower()
    suggested_tags = []
    
    # File type tags
    if filename_lower.endswith(('.pdf', '.doc', '.docx')):
        suggested_tags.append("document")
    elif filename_lower.endswith(('.jpg', '.jpeg', '.png', '.gif')):
        suggested_tags.append("image")
    elif filename_lower.endswith(('.xlsx', '.xls', '.csv')):
        suggested_tags.append("spreadsheet")
    
    # Content-based tags
    content_keywords = {
        'menu': ['menu', 'recipe', 'meal', 'food'],
        'shopping': ['shop', 'grocery', 'list', 'buy'],
        'receipt': ['receipt', 'invoice', 'bill', 'purchase'],
        'equipment': ['equipment', 'gear', 'tools', 'supplies'],
        'planning': ['plan', 'schedule', 'timeline', 'prep'],
        'feedback': ['feedback', 'review', 'survey', 'notes']
    }
    
    for tag, keywords in content_keywords.items():
        if any(keyword in filename_lower for keyword in keywords):
            suggested_tags.append(tag)
    
    # Event-based tag suggestions
    if event_id:
        try:
            event_doc = db.collection("events").document(event_id).get()
            if event_doc.exists:
                event_data = event_doc.to_dict()
                event_name = event_data.get('name', '').lower()
                
                # Add event-specific tags
                if 'retreat' in event_name:
                    suggested_tags.append('retreat')
                if 'workshop' in event_name:
                    suggested_tags.append('workshop')
                if 'conference' in event_name:
                    suggested_tags.append('conference')
                
                # Add location-based tags
                location = event_data.get('location', '').lower()
                if 'mountain' in location:
                    suggested_tags.append('mountain')
                if 'beach' in location:
                    suggested_tags.append('beach')
                    
        except Exception:
            pass  # Skip event-based suggestions if error
    
    return list(set(suggested_tags))  # Remove duplicates

# ----------------------------
# 🗑️ File Management Functions
# ----------------------------

def soft_delete_file(file_id):
    """Mark file as deleted in Firestore"""
    try:
        db.collection("files").document(file_id).update({
            "deleted": True,
            "deleted_at": datetime.utcnow()
        })
        return True
    except Exception as e:
        st.error(f"❌ Failed to delete file: {e}")
        return False

def restore_file(file_id):
    """Restore a soft-deleted file"""
    try:
        db.collection("files").document(file_id).update({
            "deleted": False,
            "restored_at": datetime.utcnow()
        })
        return True
    except Exception as e:
        st.error(f"❌ Failed to restore file: {e}")
        return False

# ----------------------------
# 🖼️ Enhanced File Manager UI
# ----------------------------

def file_manager_ui(user):
    st.subheader("📁 File Manager")
    
    # Show current scope
    st.info(get_event_scope_message())

    if not user:
        st.warning("Please log in to manage files.")
        return

    role = get_user_role(user)
    user_id = get_user_id(user)
    
    # Show upload section
    st.markdown("### Upload New File")
    
    uploaded_file = st.file_uploader(
        "Choose a file to upload",
        type=["pdf", "png", "jpg", "jpeg", "txt", "doc", "docx", "xlsx", "xls", "csv"],
        help="Supported formats: PDF, Images, Documents, Spreadsheets"
    )
    
    if uploaded_file:
        # Store file data in session state temporarily
        file_data = uploaded_file.read()
        st.session_state["current_file_data"] = file_data
        st.session_state["uploaded_file_obj"] = uploaded_file

        
        # File info with enhanced styling
        file_size_mb = len(file_data) / (1024 * 1024)
        st.markdown(f"""
        <div class="card">
            <h4>📄 {uploaded_file.name}</h4>
            <p><strong>Size:</strong> {file_size_mb:.2f} MB</p>
            <p><strong>Type:</strong> {uploaded_file.type}</p>
        </div>
        """, unsafe_allow_html=True)
        
        # Enhanced event association with autocomplete
        st.markdown("#### Link to Event")
        # If in event mode, auto-select current event
        if is_event_scoped():
            active_event_id = get_active_event_id()
            st.info(f"File will be linked to the current event")
            selected_event_id = active_event_id
        else:
            selected_event_id = render_event_autocomplete()
        
        # Enhanced tag suggestions and input
        suggested_tags = suggest_tags_for_file(uploaded_file.name, selected_event_id)
        
        if suggested_tags:
            st.markdown("**💡 Suggested tags:**")
            # Create clickable tag buttons
            tag_cols = st.columns(min(len(suggested_tags), 4))
            selected_suggested_tags = []
            
            for i, tag in enumerate(suggested_tags):
                with tag_cols[i % 4]:
                    if st.checkbox(tag, key=f"tag_suggest_{tag}"):
                        selected_suggested_tags.append(tag)
        else:
            selected_suggested_tags = []
        
        # Manual tag input
        additional_tags = st.text_input(
            "Additional tags (comma-separated)", 
            placeholder="Add custom tags...",
            help="Add additional tags beyond the suggested ones"
        )
        
        # Combine all tags
        all_tags = selected_suggested_tags.copy()
        if additional_tags:
            manual_tags = [tag.strip() for tag in additional_tags.split(",") if tag.strip()]
            all_tags.extend(manual_tags)
        
        # Show final tag preview
        if all_tags:
            tag_preview = " ".join([f"<span class='tag'>{tag}</span>" for tag in all_tags])
            st.markdown(f"**Tags to apply:** {tag_preview}", unsafe_allow_html=True)
        
        # Upload button
        if st.button("Upload File", type="primary"):
            if file_data:
                with st.spinner("Uploading file..."):
                    file_id = generate_id("file")
                    
                    # Upload to Firebase Storage
                    file_url = upload_file_to_storage(file_data, uploaded_file.name, file_id)
                    
                    if file_url:
                        # Save metadata with enhanced tags
                        if save_file_metadata(file_id, uploaded_file.name, file_url, all_tags, user_id, selected_event_id):
                            st.success(f"✅ Successfully uploaded: **{uploaded_file.name}**")
                            
                            # Update tag usage counts
                            try:
                                from tags import increment_tag_usage
                                for tag in all_tags:
                                    increment_tag_usage(tag)
                            except ImportError:
                                pass  # Tag system not available
                            
                            # Clear session state
                            if "current_file_data" in st.session_state:
                                del st.session_state["current_file_data"]
                            
                            st.rerun()
                        else:
                            st.error("❌ Failed to save file metadata")
                    else:
                        st.error("❌ Failed to upload file")
            else:
                st.error("❌ No file data available")

    # Show existing files
    st.markdown("---")
    st.markdown("### Uploaded Files")
    
    # Enhanced filter options
    col1, col2, col3 = st.columns(3)
    with col1:
        show_deleted = st.checkbox("Show deleted files", value=False) if role in ["admin", "manager"] else False
    with col2:
        search_term = st.text_input("Search files", placeholder="Search by filename or tags")
    with col3:
        # Only show event filter if not in event mode
        if not is_event_scoped():
            event_filter = st.selectbox("Filter by event", ["All events"] + _get_event_filter_options())
        else:
            event_filter = None

    files = list_files(include_deleted=show_deleted)
    
    # Apply filters
    if search_term:
        search_lower = search_term.lower()
        files = [f for f in files if 
                search_lower in f.get('filename', '').lower() or 
                any(search_lower in tag.lower() for tag in f.get('tags', []))]
    
    if event_filter and event_filter != "All events":
        if event_filter == "No event linked":
            files = [f for f in files if not f.get('event_id')]
        else:
            # Extract event ID from filter option
            event_id = event_filter.split(" (")[0] if " (" in event_filter else event_filter
            files = [f for f in files if f.get('event_id') == event_id]
    
    if not files:
        if is_event_scoped():
            st.info("No files found for this event. Upload your first file above!")
        else:
            st.info("No files found." + (" Try adjusting your search or filters." if search_term or (event_filter and event_filter != "All events") else ""))
        return

    # Group files by event if not in event mode
    if not is_event_scoped():
        st.markdown(f"### All Files ({len(files)} total)")
        
        # Group by event
        files_by_event = {}
        for file in files:
            event_id = file.get("event_id", "No Event")
            if event_id not in files_by_event:
                files_by_event[event_id] = []
            files_by_event[event_id].append(file)
        
        # Display grouped files
        for event_id, event_files in files_by_event.items():
            if event_id != "No Event":
                event_info = _get_event_info(event_id)
                if event_info:
                    st.markdown(f"#### 🎪 {event_info['name']}")
                else:
                    st.markdown(f"#### 🎪 Event ID: {event_id}")
            else:
                st.markdown("#### 📁 Unassigned Files")
            
            _display_files(event_files, role, user_id)
    else:
        # In event mode, just show the files
        st.markdown(f"### Event Files ({len(files)} files)")
        _display_files(files, role, user_id)

def _display_files(files, role, user_id):
    """Display a list of files"""
    for file_data in files:
        with st.container():
            # Enhanced file header with status indicators
            file_status_icon = "🗑️" if file_data.get('deleted') else "📄"
            file_name = file_data.get('filename', 'Unnamed File')
            
            # Create columns for file display
            col_main, col_actions = st.columns([4, 1])
            
            with col_main:
                st.markdown(f"### {file_status_icon} {file_name}")
                
                # Enhanced file details in columns
                detail_col1, detail_col2 = st.columns(2)
                
                with detail_col1:
                    st.markdown(f"**👤 Uploaded by:** {file_data.get('uploaded_by', 'Unknown')}")
                    st.markdown(f"**📅 Date:** {file_data.get('created_at', 'Unknown')}")
                    
                    # File size if available
                    file_size = file_data.get('file_size', 0)
                    if file_size > 0:
                        size_mb = file_size / (1024 * 1024)
                        st.markdown(f"**📊 Size:** {size_mb:.2f} MB")
                
                with detail_col2:
                    # Only show event info if not in event mode
                    if not is_event_scoped():
                        if file_data.get('event_id'):
                            event_info = _get_event_info(file_data['event_id'])
                            if event_info:
                                st.markdown(f"**🎪 Event:** {event_info['name']}")
                                st.markdown(f"**📍 Location:** {event_info.get('location', 'Unknown')}")
                            else:
                                st.markdown(f"**🎪 Event:** `{file_data['event_id']}` (not found)")
                        else:
                            st.markdown("**🎪 Event:** Not linked")
                
                # Enhanced tags display
                tags = file_data.get('tags', [])
                if tags:
                    tag_html = " ".join([f"<span class='tag'>{tag}</span>" for tag in tags])
                    st.markdown(f"**🏷️ Tags:** {tag_html}", unsafe_allow_html=True)
                else:
                    st.markdown("**🏷️ Tags:** None")
            
            with col_actions:
                # Action buttons with enhanced styling
                if file_data.get('url'):
                    st.link_button("Download", file_data['url'], use_container_width=True)
                
                # Edit tags button
                if st.button("Edit Tags", key=f"edit_tags_{file_data['id']}", use_container_width=True):
                    _show_edit_tags_modal(file_data)
                
                if not file_data.get('deleted'):
                    if role in ["admin", "manager"] or file_data.get('uploaded_by') == user_id:
                        if st.button("Delete", key=f"del_{file_data['id']}", use_container_width=True):
                            if soft_delete_file(file_data['id']):
                                st.success("File deleted")
                                st.rerun()
                else:
                    # Restore option for deleted files
                    if role == "admin":
                        if st.button("Restore", key=f"restore_{file_data['id']}", use_container_width=True):
                            if restore_file(file_data['id']):
                                st.success("File restored")
                                st.rerun()

            st.markdown("---")

# ----------------------------
# 🎛️ Helper Functions
# ----------------------------

def _get_event_filter_options():
    """Get event options for filtering"""
    try:
        events_docs = db.collection("events").where(filter=FieldFilter("deleted", "==", False)).stream()
        events = [doc.to_dict() | {"id": doc.id} for doc in events_docs]
        
        options = ["No event linked"]
        for event in events:
            event_name = event.get('name', 'Unnamed Event')
            event_date = event.get('start_date', 'No date')
            options.append(f"{event_name} ({event_date})")
        
        return options
    except Exception:
        return ["No event linked"]

def _get_event_info(event_id):
    """Get event information for display"""
    try:
        event_doc = db.collection("events").document(event_id).get()
        if event_doc.exists:
            return event_doc.to_dict()
        return None
    except Exception:
        return None

def _show_edit_tags_modal(file_data):
    """Show modal for editing file tags"""
    # This would be enhanced with a proper modal in a real implementation
    # For now, show in sidebar or use session state
    st.sidebar.markdown(f"### Edit Tags for {file_data.get('filename', 'Unknown')}")
    
    current_tags = file_data.get('tags', [])
    
    # Show current tags with remove buttons
    if current_tags:
        st.sidebar.markdown("**Current tags:**")
        for tag in current_tags:
            col1, col2 = st.sidebar.columns([3, 1])
            col1.write(tag)
            if col2.button("×", key=f"remove_tag_{tag}_{file_data['id']}"):
                _remove_tag_from_file(file_data['id'], tag)
                st.rerun()
    
    # Add new tag input
    new_tag = st.sidebar.text_input("Add new tag", key=f"new_tag_{file_data['id']}")
    if st.sidebar.button("Add Tag", key=f"add_tag_btn_{file_data['id']}") and new_tag:
        _add_tag_to_file(file_data['id'], new_tag.strip())
        st.rerun()

def _remove_tag_from_file(file_id, tag_to_remove):
    """Remove a tag from a file"""
    try:
        file_doc = db.collection("files").document(file_id).get()
        if file_doc.exists:
            current_tags = file_doc.to_dict().get('tags', [])
            updated_tags = [tag for tag in current_tags if tag != tag_to_remove]
            db.collection("files").document(file_id).update({"tags": updated_tags})
            st.success(f"Removed tag: {tag_to_remove}")
    except Exception as e:
        st.error(f"Failed to remove tag: {e}")

def _add_tag_to_file(file_id, new_tag):
    """Add a tag to a file"""
    try:
        file_doc = db.collection("files").document(file_id).get()
        if file_doc.exists:
            current_tags = file_doc.to_dict().get('tags', [])
            if new_tag not in current_tags:
                updated_tags = current_tags + [new_tag]
                db.collection("files").document(file_id).update({"tags": updated_tags})
                
                # Update tag usage count
                try:
                    from tags import increment_tag_usage
                    increment_tag_usage(new_tag)
                except ImportError:
                    pass
                
                st.success(f"Added tag: {new_tag}")
            else:
                st.warning("Tag already exists")
    except Exception as e:
        st.error(f"Failed to add tag: {e}")

# ----------------------------
# 📊 File Analytics
# ----------------------------

def show_file_analytics():
    """Display file upload analytics"""
    try:
        # Get both scoped and all files for comparison
        scoped_files = list_files(include_deleted=False)
        
        if not scoped_files and is_event_scoped():
            st.info("No files uploaded for this event yet.")
            return
        elif not scoped_files:
            st.info("No files uploaded yet.")
            return
        
        st.markdown("### File Analytics")
        
        # Show scope-aware metrics
        if is_event_scoped():
            st.info(f"Showing analytics for current event only")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Files", len(scoped_files))
        
        with col2:
            linked_files = len([f for f in scoped_files if f.get('event_id')])
            st.metric("Event-Linked Files", linked_files)
        
        with col3:
            total_size = sum(f.get('file_size', 0) for f in scoped_files)
            size_mb = total_size / (1024 * 1024)
            st.metric("Total Storage", f"{size_mb:.1f} MB")
        
        with col4:
            unique_uploaders = len(set(f.get('uploaded_by') for f in scoped_files if f.get('uploaded_by')))
            st.metric("Active Contributors", unique_uploaders)
        
        # File type breakdown
        file_types = {}
        for file in scoped_files:
            filename = file.get('filename', '')
            ext = filename.split('.')[-1].lower() if '.' in filename else 'unknown'
            file_types[ext] = file_types.get(ext, 0) + 1
        
        if file_types:
            st.markdown("#### File Types")
            for file_type, count in sorted(file_types.items(), key=lambda x: x[1], reverse=True):
                percentage = (count / len(scoped_files)) * 100
                st.write(f"**{file_type.upper()}:** {count} files ({percentage:.1f}%)")
        
    except Exception as e:
        st.error(f"Could not load file analytics: {e}")

# For backward compatibility
def save_uploaded_file(uploaded_file, event_id, uploaded_by):
    """Legacy function for backward compatibility"""
    if not uploaded_file:
        return None
        
    file_data = uploaded_file.read()
    file_id = generate_id("file")
    
    # Upload to storage
    file_url = upload_file_to_storage(file_data, uploaded_file.name, file_id)
    
    if file_url:
        # Save metadata with basic tags
        basic_tags = suggest_tags_for_file(uploaded_file.name, event_id)
        if save_file_metadata(file_id, uploaded_file.name, file_url, basic_tags, uploaded_by, event_id):
            return file_id
    
    return None
