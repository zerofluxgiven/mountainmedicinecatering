import streamlit as st
import streamlit.components.v1 as components
import firebase_admin
from firebase_admin import auth as firebase_auth, firestore
import json

# Initialize Firebase Admin if not already initialized
if not firebase_admin._apps:
    firebase_admin.initialize_app()

# Firestore client
firestore_client = firestore.client()

# ----------------------------
# 📲 Google Sign-In Embed
# ----------------------------
def google_login_component():
    if "user" in st.session_state:
        return  # Already signed in

    st.markdown("### 🔐 Sign in with Google")

    keep_signed_in = st.checkbox("Keep me signed in", value=True, key="persist_checkbox")
    persistence = "LOCAL" if keep_signed_in else "SESSION"

    components.html(f"""
    <!DOCTYPE html>
    <html>
    <head>
        <script src=\"https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js\"></script>
        <script src=\"https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js\"></script>
        <script>
          const firebaseConfig = {{
            apiKey: \"YOUR_API_KEY\",
            authDomain: \"YOUR_PROJECT_ID.firebaseapp.com\",
            projectId: \"YOUR_PROJECT_ID\",
            storageBucket: \"YOUR_PROJECT_ID.appspot.com\",
            messagingSenderId: \"YOUR_SENDER_ID\",
            appId: \"YOUR_APP_ID\"
          }};

          firebase.initializeApp(firebaseConfig);

          function signInWithGoogle() {{
            const provider = new firebase.auth.GoogleAuthProvider();
            const persistence = '{persistence}';
            firebase.auth().setPersistence(firebase.auth.Auth.Persistence[persistence])
              .then(() => firebase.auth().signInWithPopup(provider))
              .then((result) => {{
                const token = result.credential.idToken;
                const user = result.user;
                const payload = JSON.stringify({{ token, email: user.email, name: user.displayName }});
                const streamlit = window.parent.Streamlit;
                streamlit.setComponentValue(payload);
              }})
              .catch((error) => {{
                console.error(\"Google Sign-In Error:\", error);
              }});
          }}
        </script>
    </head>
    <body>
        <button onclick=\"signInWithGoogle()\" style=\"padding:10px 20px;font-size:16px;\">Sign in with Google</button>
    </body>
    </html>
    """, height=160)

    # Handle returned token from frontend
    token_response = st.experimental_get_query_params().get("google_token")
    if token_response:
        try:
            data = json.loads(token_response[0])
            user_info = firebase_auth.verify_id_token(data["token"])
            user_id = user_info["uid"]

            # Store or update user record
            user_data = {
                "id": user_id,
                "email": data["email"],
                "name": data["name"],
            }
            firestore_client.collection("users").document(user_id).set(user_data, merge=True)
            st.session_state["user"] = user_data
            st.success("✅ Logged in via Google.")
            st.experimental_rerun()
        except Exception as e:
            st.error(f"Failed to verify token: {e}")
