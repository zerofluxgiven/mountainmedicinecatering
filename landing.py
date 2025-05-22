# landing.py

import streamlit as st
from firebase_admin import firestore

def show():
    st.set_page_config(page_title="Mountain Medicine", layout="centered")

    db = firestore.client()

    # 📊 Replace these with live Firestore queries if needed
    meals_cooked = 3240
    recipes_shared = 182
    retreats_catered = 29
    guests_served = 1875

    # 🔐 Top-right login button
    st.markdown("""
        <div style="position: absolute; top: 1rem; right: 1rem;">
            <a href='/?signin=true' style='text-decoration: none; font-weight: bold; color: white; background: #6C4AB6; padding: 0.5rem 1rem; border-radius: 8px;'>Login</a>
        </div>
    """, unsafe_allow_html=True)

    # 🎨 Centered logo + title + tagline
    st.markdown("""
        <div style="text-align: center; margin-top: 4rem;">
            <div style="width: 100px; height: 100px; background-color: #ccc; border-radius: 50%; margin: 0 auto 1rem;">
                <!-- Logo Placeholder -->
            </div>
            <h1 style="color: #6C4AB6;">Mountain Medicine</h1>
            <p style="font-size: 1.2rem; font-style: italic; color: #555;">
                Bringing humanity closer through man's original primal ceremony
            </p>
        </div>
    """, unsafe_allow_html=True)

    st.markdown("### 🍲 Impact Snapshot")
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Meals Cooked", meals_cooked)
    col2.metric("Recipes", recipes_shared)
    col3.metric("Retreats", retreats_catered)
    col4.metric("Guests Served", guests_served)

    st.markdown("---")
    st.info("Want to participate or help cook? Log in to view events, menus, and more.")
