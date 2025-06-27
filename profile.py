import streamlit as st
from auth import load_user_session, get_user_id, get_user_role
from firebase_admin import firestore

db = firestore.client()
COLLECTION_USERS = "users"
COLLECTION_EVENTS = "events"
COLLECTION_RECIPES = "recipes"
