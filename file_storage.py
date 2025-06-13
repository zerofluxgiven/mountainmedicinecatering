
import streamlit as st
from firebase_init import db
from firebase_admin import storage
from utils import format_date, get_active_event_id, session_get, session_set, get_event_by_id
from datetime import datetime
import uuid

# ----------------------------
# 📁 File Manager UI
# ----------------------------

def file_manager_ui(user):
    st.subheader("📁 File Manager")
    user_id = user.get("id")

    query = db.collection("files").where("deleted", "==", False)
    files = list(query.stream())
    file_data = [doc.to_dict() | {"id": doc.id} for doc in files]

    if 'view_mode' not in st.session_state:
        st.session_state['view_mode'] = 'all'
    if 'search_term' not in st.session_state:
        st.session_state['search_term'] = ''

    view_col, search_col = st.columns([1, 3])
    with view_col:
        st.selectbox("View", ["all", "linked", "unlinked"], key="view_mode")
    with search_col:
        st.text_input("Search files", key="search_term")

    filtered = []
    for file in file_data:
        matches_view = (
            st.session_state.view_mode == "all" or
            (st.session_state.view_mode == "linked" and file.get("event_id")) or
            (st.session_state.view_mode == "unlinked" and not file.get("event_id"))
        )
        matches_search = st.session_state.search_term.lower() in file.get("name", "").lower()
        if matches_view and matches_search:
            filtered.append(file)

    grouped = {}
    for file in filtered:
        event_id = file.get("event_id") or "No Event"
        grouped.setdefault(event_id, []).append(file)

    for group_id, files in grouped.items():
        with st.expander(f"📦 {group_id} ({len(files)} files)"):
            for file in files:
                file_name = file.get("name", "Unnamed")
                st.markdown(f"- **{file_name}** ({file.get('type', '-')})")
                if st.button("Edit Metadata", key=f"edit_{file['id']}"):
                    st.session_state["editing_file"] = file
                if st.button("Delete", key=f"delete_{file['id']}"):
                    db.collection("files").document(file["id"]).update({"deleted": True})
                    st.rerun()

    if "editing_file" in st.session_state:
        file = st.session_state["editing_file"]
        st.markdown(f"### ✏️ Editing File: {file.get('name', '')}")
        tags = st.text_input("Tags (comma-separated)", value=", ".join(file.get("tags", [])))
        event_id = st.text_input("Linked Event ID", value=file.get("event_id", ""))
        if st.button("Save Changes", key="save_changes"):
            db.collection("files").document(file["id"]).update({
                "tags": [tag.strip() for tag in tags.split(",") if tag.strip()],
                "event_id": event_id
            })
            st.success("✅ File updated.")
            del st.session_state["editing_file"]
            st.rerun()
        if st.button("Cancel", key="cancel_edit"):
            del st.session_state["editing_file"]
            st.rerun()

# ----------------------------
# 📊 File Analytics
# ----------------------------

def show_file_analytics():
    st.subheader("📊 File Analytics")
    query = db.collection("files").where("deleted", "==", False)
    files = list(query.stream())
    file_data = [doc.to_dict() | {"id": doc.id} for doc in files]

    total_files = len(file_data)
    linked = len([f for f in file_data if f.get("event_id")])
    unlinked = total_files - linked
    types = {}
    contributors = set()

    for file in file_data:
        contributors.add(file.get("uploaded_by", "Unknown"))
        ftype = file.get("type", "other")
        types[ftype] = types.get(ftype, 0) + 1

    st.metric("📁 Total Files", total_files)
    st.metric("🔗 Linked to Events", linked)
    st.metric("❌ Unlinked", unlinked)
    st.metric("🙋 Contributors", len(contributors))

    st.markdown("### 📂 File Type Breakdown")
    for ftype, count in types.items():
        st.markdown(f"- **{ftype}**: {count}")


from firebase_init import get_db, get_bucket
from utils import generate_id
from datetime import datetime
import mimetypes
from ai_parsing_engine import parse_file, extract_text
from io import BytesIO

def save_uploaded_file(file, event_id: str, uploaded_by: str):
    """
    Uploads file to Firebase Storage, logs metadata in Firestore,
    auto-runs AI parsing, and returns relevant data.
    """
    db = get_db()
    bucket = get_bucket()

    file_id = generate_id("file")
    content = file.getvalue()
    filename = file.name
    mimetype, _ = mimetypes.guess_type(filename)
    mimetype = mimetype or "application/octet-stream"

    folder = event_id or "unlinked"
    storage_path = f"uploads/{folder}/{file_id}_{filename}"
    blob = bucket.blob(storage_path)
    blob.upload_from_string(content, content_type=mimetype)
    blob.make_public()

    raw_text = None
    parsed = {}
    try:
        fcopy = BytesIO(content)
        fcopy.name = filename
        fcopy.type = mimetype
        raw_text = extract_text(fcopy)
        parsed = parse_file(fcopy, target_type="all", user_id=uploaded_by, file_id=file_id)
    except Exception as e:
        print(f"AI parsing failed: {e}")

    metadata = {
        "name": filename,
        "size": len(content),
        "type": mimetype,
        "uploaded_by": uploaded_by,
        "event_id": event_id,
        "created_at": datetime.utcnow(),
        "storage_path": storage_path,
        "public_url": blob.public_url,
        "deleted": False,
        "raw_text": raw_text,
        "parsed_data": {
            "parsed": parsed,
            "version": 1,
            "status": "pending_review",
            "last_updated": datetime.utcnow(),
            "user_id": uploaded_by
        } if parsed else {},
    }

    db.collection("files").document(file_id).set(metadata)
    return {
        "file_id": file_id,
        "parsed": parsed,
        "raw_text": raw_text
    }
