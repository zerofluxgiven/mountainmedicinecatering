# pages/assistant.py
import streamlit as st
from ai_chat import ai_chat_ui

def show():
    st.title("Assistant")
    ai_chat_ui()
