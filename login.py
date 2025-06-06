import streamlit as st
import streamlit.components.v1 as components
from auth import authenticate_user

# ----------------------------
# 🔐 Login Page with Google Sign-In
# ----------------------------

def login_ui():
    st.set_page_config(page_title="Login | Mountain Medicine", page_icon="🔐")
    st.title("🔐 Welcome to Mountain Medicine")
    st.markdown("Login to access your personalized dashboard and event tools.")

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
    <body>
      <button onclick="signInWithGoogle()" style="padding: 12px 24px; font-size: 18px; border-radius: 8px; background-color: #4285F4; color: white; border: none;">Login with Google</button>
    </body>
    </html>
    """, height=160)

    # Handle token in query param
    authenticate_user()
