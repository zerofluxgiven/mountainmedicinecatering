import streamlit as st
import streamlit.components.v1 as components

def render_google_auth_button():
    """Render Google Sign-In button using Firebase Auth"""
    
    # Firebase Auth configuration from secrets
    firebase_config = st.secrets["firebase"]
    
    # HTML/JS component for Google Sign-In
    auth_html = f"""
    <div id="google-auth-container">
        <button id="google-signin-btn" class="google-signin-button">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
            Sign in with Google
        </button>
    </div>
    
    <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-auth-compat.js"></script>
    
    <script>
        // Initialize Firebase
        const firebaseConfig = {{
            apiKey: "{firebase_config['apiKey']}",
            authDomain: "{firebase_config['authDomain']}",
            projectId: "{firebase_config['projectId']}",
            storageBucket: "{firebase_config['storageBucket']}",
            messagingSenderId: "{firebase_config['messagingSenderId']}",
            appId: "{firebase_config['appId']}"
        }};
        
        firebase.initializeApp(firebaseConfig);
        
        // Google Auth Provider
        const provider = new firebase.auth.GoogleAuthProvider();
        
        document.getElementById('google-signin-btn').addEventListener('click', () => {{
            firebase.auth().signInWithPopup(provider)
                .then((result) => {{
                    // Send user data to Streamlit
                    const user = result.user;
                    window.parent.postMessage({{
                        type: 'google-auth-success',
                        user: {{
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL
                        }}
                    }}, '*');
                }})
                .catch((error) => {{
                    console.error('Auth error:', error);
                    window.parent.postMessage({{
                        type: 'google-auth-error',
                        error: error.message
                    }}, '*');
                }});
        }});
    </script>
    
    <style>
        .google-signin-button {{
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 24px;
            background: white;
            border: 1px solid #dadce0;
            border-radius: 8px;
            font-family: 'Roboto', sans-serif;
            font-size: 16px;
            font-weight: 500;
            color: #3c4043;
            cursor: pointer;
            transition: all 0.2s;
        }}
        
        .google-signin-button:hover {{
            background: #f8f9fa;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }}
        
        .google-signin-button img {{
            width: 20px;
            height: 20px;
        }}
    </style>
    """
    
    # Render component and handle response
    response = components.html(auth_html, height=80)
    return response
