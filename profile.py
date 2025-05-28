import streamlit as st
from auth import load_user_session, get_user_id, get_user_role
from firebase_init import db

db = db
COLLECTION_USERS = "users"
COLLECTION_EVENTS = "events"
COLLECTION_RECIPES = "recipes"

# ----------------------------
# 👤 Profile Page
# ----------------------------

def profile_page():
    user = load_user_session()
    if not user:
        st.warning("Please log in to view your profile.")
        return

    user_id = get_user_id(user)
    role = get_user_role(user)

    st.title("👤 Your Profile")

    # Load user doc
    user_doc = db.collection(COLLECTION_USERS).document(user_id).get()
    profile = user_doc.to_dict() if user_doc.exists else {}

    # Sidebar
    with st.sidebar:
        st.image("https://www.gravatar.com/avatar?d=identicon", width=100)  # Optional: support real profile images
        st.markdown(f"**{profile.get('name', 'Unknown')}**")
        st.caption(f"{profile.get('email', '')}")
        st.caption(f"Role: `{role}`")

    # Editable Bio Section
    st.subheader("📝 Bio")
    bio = st.text_area("Tell us a bit about yourself", value=profile.get("bio", ""))
    if st.button("Update Bio"):
        db.collection(COLLECTION_USERS).document(user_id).update({"bio": bio})
        st.success("✅ Bio updated.")

    # Participation Analytics
    st.subheader("📊 Your Activity")

    # Events
    created = db.collection(COLLECTION_EVENTS).where("created_by", "==", user_id).stream()
    created_events = [doc.to_dict() for doc in created]

    participated = db.collection(COLLECTION_EVENTS).where("participants", "array_contains", user_id).stream()
    participated_events = [doc.to_dict() for doc in participated]

    recipes = db.collection(COLLECTION_RECIPES).where("author_id", "==", user_id).stream()
    recipe_count = len(list(recipes))

    st.metric("Events Hosted", len(created_events))
    st.metric("Events Participated", len(participated_events))
    st.metric("Recipes Contributed", recipe_count)
    st.metric("Estimated Hours Worked", len(participated_events) * 4)  # placeholder logic

    st.markdown("---")
    st.info("More profile features coming soon, including profile pictures, preferences, and badges.")