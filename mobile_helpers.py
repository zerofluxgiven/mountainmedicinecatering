import streamlit as st
from mobile_components import mobile_safe_columns, detect_mobile
from mobile_layout import mobile_layout

def safe_columns(spec, gap="small", key=None):
    """Wrapper that automatically handles mobile/desktop columns"""
    if detect_mobile():
        return mobile_safe_columns(spec, gap)
    else:
        return st.columns(spec, gap=gap, key=key)

def safe_dataframe(data, use_container_width=True, **kwargs):
    """Wrapper that automatically converts tables to cards on mobile"""
    if detect_mobile():
        mobile_layout.optimize_table_for_mobile(
            data.to_dict('records') if hasattr(data, 'to_dict') else data,
            list(data.columns) if hasattr(data, 'columns') else list(data[0].keys())
        )
    else:
        st.dataframe(data, use_container_width=use_container_width, **kwargs)

def safe_file_uploader(label, **kwargs):
    """Wrapper that handles mobile file upload with camera"""
    if detect_mobile():
        return mobile_layout.handle_mobile_file_upload()
    else:
        return st.file_uploader(label, **kwargs)
