import streamlit as st
from mobile_components import mobile_safe_columns
from mobile_layout import mobile_layout

def safe_columns(spec, gap="small"):
    """Create columns that work on both desktop and mobile"""
    if st.session_state.get("mobile_mode", False):
        return mobile_safe_columns(spec, gap)
    else:
        return st.columns(spec, gap=gap)  # Removed the key parameter

def safe_dataframe(data, use_container_width=True, **kwargs):
    """Wrapper that automatically converts tables to cards on mobile"""
    if st.session_state.get("mobile_mode", False):
        mobile_layout.optimize_table_for_mobile(
            data if isinstance(data, list) else data.to_dict('records'),
            list(data.columns) if hasattr(data, 'columns') else list(data[0].keys())
        )
    else:
        st.dataframe(data, use_container_width=use_container_width, **kwargs)  # ✅ FIXED: Direct st.dataframe call
        
def safe_file_uploader(label, **kwargs):
    """Wrapper that handles mobile file upload with camera"""
    if st.session_state.get("mobile_mode", False):
        return mobile_layout.handle_mobile_file_upload()
    else:
        return st.file_uploader(label, **kwargs)  # ✅ FIXED: Direct st.file_uploader call
