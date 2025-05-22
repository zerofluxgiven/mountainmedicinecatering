import streamlit as st
from firebase_admin import storage
from auth import get_user_role, get_user_id
from utils import generate_id
from datetime import datetime
import tempfile
import os
from db_client import db

# ----------------------------
# 🔍 List Uploaded Files
# ----------------------------

def list_files(include_deleted=False):
    """List files from Firestore metadata"""
    try:
        ref = db.collection("files").order_by("created_at", direction=db.query.DESCENDING)
        if not include_deleted:
            ref = ref.where("deleted", "==", False)
        docs = ref.stream()
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
        bucket = storage.bucket()
        
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
        return True
        
    except Exception as e:
        st.error(f"❌ Failed to save file metadata: {e}")
        return False

# ----------------------------
# 🗑️ Soft Delete a File
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

# ----------------------------
# 🔄 Restore Deleted File
# ----------------------------

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
# 🏷️ Suggest Tags for File
# ----------------------------

def suggest_tags_for_file(filename):
    """Suggest tags based on filename and content type"""
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
    if any(word in filename_lower for word in ['menu', 'recipe']):
        suggested_tags.append("menu")
    if any(word in filename_lower for word in ['shop', 'grocery', 'list']):
        suggested_tags.append("shopping")
    if any(word in filename_lower for word in ['receipt', 'invoice']):
        suggested_tags.append("receipt")
    if any(word in filename_lower for word in ['equipment', 'gear']):
        suggested_tags.append("equipment")
    
    return suggested_tags

# ----------------------------
# 🖼️ File Manager UI
# ----------------------------

def file_manager_ui(user):
    st.subheader("📁 File Manager")

    if not user:
        st.warning("Please log in to manage files.")
        return

    role = get_user_role(user)
    user_id = get_user_id(user)
    
    # Show upload section
    st.markdown("### 📤 Upload New File")
    
    uploaded_file = st.file_uploader(
        "Choose a file to upload",
        type=["pdf", "png", "jpg", "jpeg", "txt", "doc", "docx", "xlsx", "xls", "csv"],
        help="Supported formats: PDF, Images, Documents, Spreadsheets"
    )
    
    if uploaded_file:
        # Store file data in session state temporarily
        file_data = uploaded_file.read()
        st.session_state["current_file_data"] = file_data
        
        # File info
        st.info(f"📄 **{uploaded_file.name}** ({len(file_data):,} bytes)")
        
        # Event association
        event_id = st.text_input("🎪 Link to Event ID (optional)", 
                                help="Associate this file with a specific event")
        
        # Tag suggestions and input
        suggested_tags = suggest_tags_for_file(uploaded_file.name)
        if suggested_tags:
            st.write("💡 **Suggested tags:**", ", ".join(f"`{tag}`" for tag in suggested_tags))
        
        tags_input = st.text_input(
            "🏷️ Tags (comma-separated)", 
            value=", ".join(suggested_tags),
            help="Add tags to help organize and find this file later"
        )
        
        # Upload button
        if st.button("📤 Upload File", type="primary"):
            if file_data:
                with st.spinner("Uploading file..."):
                    file_id = generate_id("file")
                    
                    # Upload to Firebase Storage
                    file_url = upload_file_to_storage(file_data, uploaded_file.name, file_id)
                    
                    if file_url:
                        # Process tags
                        tags = [tag.strip() for tag in tags_input.split(",") if tag.strip()]
                        
                        # Save metadata
                        if save_file_metadata(file_id, uploaded_file.name, file_url, tags, user_id, event_id):
                            st.success(f"✅ Successfully uploaded: **{uploaded_file.name}**")
                            
                            # Update tag usage counts
                            try:
                                from tags import increment_tag_usage
                                for tag in tags:
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
    st.markdown("### 📋 Uploaded Files")
    
    # Filter options
    col1, col2 = st.columns(2)
    with col1:
        show_deleted = st.checkbox("Show deleted files", value=False) if role in ["admin", "manager"] else False
    with col2:
        search_term = st.text_input("🔍 Search files", placeholder="Search by filename or tags")

    files = list_files(include_deleted=show_deleted)
    
    # Filter files based on search
    if search_term:
        search_lower = search_term.lower()
        files = [f for f in files if 
                search_lower in f.get('filename', '').lower() or 
                any(search_lower in tag.lower() for tag in f.get('tags', []))]
    
    if not files:
        st.info("No files found." + (" Try adjusting your search." if search_term else ""))
        return

    # Display files
    for file_data in files:
        with st.container():
            # File header
            file_status = "🗑️ " if file_data.get('deleted') else "📄 "
            st.markdown(f"### {file_status}{file_data.get('filename', 'Unnamed File')}")
            
            col1, col2 = st.columns([3, 1])
            
            with col1:
                # File details
                st.markdown(f"👤 **Uploaded by:** {file_data.get('uploaded_by', 'Unknown')}")
                st.markdown(f"📅 **Date:** {file_data.get('created_at', 'Unknown')}")
                
                if file_data.get('event_id'):
                    st.markdown(f"🎪 **Event:** `{file_data.get('event_id')}`")
                
                # Tags
                tags = file_data.get('tags', [])
                if tags:
                    tag_html = " ".join([f"<span style='background:#edeafa;color:#6C4AB6;padding:0.2rem 0.5rem;border-radius:12px;font-size:0.8rem;margin:0.1rem;'>{tag}</span>" for tag in tags])
                    st.markdown(f"🏷️ **Tags:** {tag_html}", unsafe_allow_html=True)
            
            with col2:
                # Action buttons
                if file_data.get('url'):
                    st.link_button("📥 Download", file_data['url'])
                
                if not file_data.get('deleted'):
                    if role in ["admin", "manager"] or file_data.get('uploaded_by') == user_id:
                        if st.button(f"🗑️ Delete", key=f"del_{file_data['id']}"):
                            if soft_delete_file(file_data['id']):
                                st.success("File deleted")
                                st.rerun()
                else:
                    # Restore option for deleted files
                    if role == "admin":
                        if st.button(f"🔄 Restore", key=f"restore_{file_data['id']}"):
                            if restore_file(file_data['id']):
                                st.success("File restored")
                                st.rerun()

            st.markdown("---")

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
        # Save metadata
        if save_file_metadata(file_id, uploaded_file.name, file_url, [], uploaded_by, event_id):
            return file_id
    
    return None
