import streamlit as st
from utils import session_get, format_date, get_event_by_id, get_active_event

# ----------------------------
# 🎨 Inject Custom CSS + JS
# ----------------------------
def inject_custom_css():
    """Inject custom CSS styling for the application"""
    css_content = """
    <style>
    /* Base Styling */
    .stApp {
        font-family: 'Inter', sans-serif;
    }
    
    /* Button Styling */
    .stButton > button {
        background-color: #6C4AB6 !important;
        color: white !important;
        border: none !important;
        border-radius: 8px !important;
        padding: 0.5rem 1rem !important;
        font-weight: 500 !important;
        transition: background-color 0.2s ease !important;
    }
    
    .stButton > button:hover {
        background-color: #563a9d !important;
    }
    
    /* Input Styling */
    .stTextInput input, .stTextArea textarea {
        border: 1px solid #ccc !important;
        border-radius: 6px !important;
        font-size: 1rem !important;
    }
    
    /* Card Styling */
    .card {
        background: #ffffff;
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.05);
        margin-bottom: 1rem;
    }
    
    /* Tag Styling */
    .tag {
        background: #edeafa;
        color: #6C4AB6;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        font-size: 0.85rem;
        display: inline-block;
        margin-right: 0.5rem;
        margin-bottom: 0.3rem;
    }
    
    /* Event Mode Banner */
    .event-mode-banner {
        background-color: #fff8e1;
        padding: 12px;
        border-radius: 10px;
        margin: 12px 0;
        border: 1px solid #ffecb3;
    }
    
    /* Event Toolbar */
    .event-toolbar {
        position: sticky;
        top: 0;
        background: white;
        padding: 1rem;
        border-bottom: 1px solid #eee;
        z-index: 100;
        margin-bottom: 1rem;
    }
    
    /* Notification Badge */
    .sidebar-badge {
        margin-top: 10px;
        color: #B00020;
        font-weight: bold;
        font-size: 0.9rem;
    }
    
    /* Assistant Styling */
    .assistant-box {
        background-color: #f5f5f5;
        padding: 12px;
        border-radius: 12px;
        margin-bottom: 1rem;
    }
    
    .assistant-suggestion {
        background: #eae3f9;
        color: #4B0082;
        padding: 0.3rem 0.8rem;
        border-radius: 6px;
        margin: 0 0.25rem 0.5rem 0;
        display: inline-block;
        font-size: 0.85rem;
        cursor: pointer;
        transition: background 0.2s;
    }
    
    .assistant-suggestion:hover {
        background: #d4c4f4;
    }
    
    /* Tab Styling */
    .stTabs [role="tab"] {
        background-color: #6C4AB6;
        color: white;
        margin-right: 8px;
        border-radius: 8px 8px 0 0;
        padding: 0.5rem 1rem;
        transition: background 0.2s ease;
        font-weight: 500;
    }
    
    .stTabs [role="tab"][aria-selected="true"] {
        background-color: #563a9d;
        font-weight: bold;
    }
    
    /* Scrollbar Styling */
    ::-webkit-scrollbar {
        width: 8px;
    }
    ::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 4px;
    }
    
    /* Modal Styling */
    .stModalContent {
        padding: 1.5rem;
        background: #ffffff;
        border-radius: 1rem;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    
    /* Color Utility Classes */
    .accent-purple { color: #6C4AB6; }
    .accent-grey { color: #666666; }
    .accent-black { color: #000000; }
    
    /* Status Indicators */
    .status-planning { 
        backgr
