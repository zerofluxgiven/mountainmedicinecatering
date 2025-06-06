import streamlit as st
import streamlit.components.v1 as components
from auth import authenticate_user, get_user, get_user_id

# ----------------------------
# 🔐 Login Page with Google Sign-In
# ----------------------------

def login_ui():
    st.set_page_config(page_title="Login | Mountain Medicine", page_icon="🔐")
    authenticate_user()

    # Clear sidebar to simulate full-page login
    st.markdown("""
        <style>
            [data-testid="stSidebar"] {
                display: none;
            }
            .block-container {
                padding-top: 2rem;
            }
        </style>
    """, unsafe_allow_html=True)

    # Header
    st.markdown("<h1 style='text-align: center;'>🔐 Welcome to Mountain Medicine</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center;'>Login to access your personalized dashboard and event tools.</p>", unsafe_allow_html=True)

    user = get_user()
    if user:
        st.success(f"✅ Logged in as {user.get('name') or user.get('email')}")
        if st.button("🔓 Log out", key="logout_btn"):
            st.session_state.pop("firebase_user", None)
            st.experimental_rerun()
        return

    # Inject Google Sign-In HTML + Firebase Web SDK
    components.html("""
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js"></script>
      <script src="https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js"></script>
      <script>
        const firebaseConfig = {
          apiKey: "YOUR_FIREBASE_API_KEY",
          authDomain: "YOUR_PROJECT.firebaseapp.com",
        };
        firebase.initializeApp(firebaseConfig);

        function signInWithGoogle() {
          const provider = new firebase.auth.GoogleAuthProvider();
          firebase.auth().signInWithPopup(provider).then((result) => {
            return result.user.getIdToken();
          }).then((idToken) => {
            window.location.href = `/?token=${idToken}`;
          }).catch((error) => {
            alert("Login failed: " + error.message);
          });
        }
      </script>
    </head>
    <body style="display: flex; justify-content: center; align-items: center; height: 200px;">
      <button onclick="signInWithGoogle()" style="padding: 12px 24px; font-size: 18px; border-radius: 8px; background-color: #4285F4; color: white; border: none;">Login with Google</button>
    </body>
    </html>
    """, height=200)
