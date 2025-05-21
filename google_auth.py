import streamlit as st
import streamlit.components.v1 as components

# ----------------------------
# 📲 Google Sign-In Embed
# ----------------------------
def google_login_component():
    st.markdown("### 🔐 Sign in with Google")

    components.html("""
    <!DOCTYPE html>
    <html>
    <head>
        <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js"></script>
        <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js"></script>
        <script>
          const firebaseConfig = {
            apiKey: "YOUR_API_KEY",
            authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
            projectId: "YOUR_PROJECT_ID",
            storageBucket: "YOUR_PROJECT_ID.appspot.com",
            messagingSenderId: "YOUR_SENDER_ID",
            appId: "YOUR_APP_ID"
          };

          firebase.initializeApp(firebaseConfig);

          function signInWithGoogle() {
            const provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider)
              .then((result) => {
                const token = result.credential.idToken;
                const user = result.user;
                window.parent.postMessage({ type: 'google-login', token: token, user: user }, '*');
              })
              .catch((error) => {
                console.error("Google Sign-In Error:", error);
              });
          }
        </script>
    </head>
    <body>
        <button onclick="signInWithGoogle()" style="padding:10px 20px;font-size:16px;">Sign in with Google</button>
    </body>
    </html>
    """, height=120)

    # Listen for token from iframe (handled in app logic)
    st.markdown("<script>
    window.addEventListener("message", (event) => {
        if (event.data.type === 'google-login') {
            const token = event.data.token;
            const user = event.data.user;
            Streamlit.setComponentValue(JSON.stringify({token, user}));
        }
    });
    </script>", unsafe_allow_html=True)
