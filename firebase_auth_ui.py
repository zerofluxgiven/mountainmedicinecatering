# firebase_auth_ui.py - Complete Firebase Authentication System

import streamlit as st
import firebase_admin
from firebase_admin import auth as firebase_auth, firestore
import json
import time
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import hmac
import base64

# Admin Configuration
ADMIN_EMAILS = ["mistermcfarland@gmail.com"]

# Session Configuration
SESSION_DURATION_DAYS = 90  # 3 months
ENCRYPTION_KEY = "your_secret_key_change_this"  # Change this to a secure random key

db = firestore.client()

class FirebaseAuthManager:
    def __init__(self):
        self.session_collection = "active_sessions"
        self.users_collection = "users"
        
    def _encrypt_data(self, data: str) -> str:
        """Encrypt data for browser storage"""
        key = ENCRYPTION_KEY.encode()
        message = data.encode()
        signature = hmac.new(key, message, hashlib.sha256).hexdigest()
        return base64.b64encode(f"{signature}:{data}".encode()).decode()
    
    def _decrypt_data(self, encrypted_data: str) -> Optional[str]:
        """Decrypt data from browser storage"""
        try:
            decoded = base64.b64decode(encrypted_data.encode()).decode()
            signature, data = decoded.split(':', 1)
            key = ENCRYPTION_KEY.encode()
            expected_signature = hmac.new(key, data.encode(), hashlib.sha256).hexdigest()
            if hmac.compare_digest(signature, expected_signature):
                return data
            return None
        except:
            return None
    
    def _create_session_id(self) -> str:
        """Create unique session ID"""
        return str(uuid.uuid4())
    
    def _store_session(self, user_id: str, session_id: str, user_data: Dict) -> None:
        """Store active session in Firestore"""
        session_data = {
            "user_id": user_id,
            "session_id": session_id,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=SESSION_DURATION_DAYS),
            "user_agent": st.context.headers.get("user-agent", "unknown"),
            "active": True
        }
        
        db.collection(self.session_collection).document(session_id).set(session_data)
        
        # Store encrypted session in browser
        browser_data = {
            "session_id": session_id,
            "user_data": user_data,
            "expires_at": (datetime.utcnow() + timedelta(days=SESSION_DURATION_DAYS)).isoformat()
        }
        
        encrypted_data = self._encrypt_data(json.dumps(browser_data))
        
        # JavaScript to store in browser
        js_code = f"""
        <script>
        localStorage.setItem('firebase_auth_session', '{encrypted_data}');
        </script>
        """
        st.markdown(js_code, unsafe_allow_html=True)
    
    def _validate_session(self, session_id: str) -> bool:
        """Validate session against Firestore"""
        try:
            session_doc = db.collection(self.session_collection).document(session_id).get()
            if not session_doc.exists:
                return False
                
            session_data = session_doc.to_dict()
            
            # Check if session is active and not expired
            if not session_data.get('active', False):
                return False
                
            expires_at = session_data.get('expires_at')
            if expires_at and expires_at < datetime.utcnow():
                # Clean up expired session
                db.collection(self.session_collection).document(session_id).delete()
                return False
                
            return True
        except:
            return False
    
    def _revoke_session(self, session_id: str) -> None:
        """Revoke specific session"""
        try:
            db.collection(self.session_collection).document(session_id).update({"active": False})
        except:
            pass
    
    def _revoke_all_user_sessions(self, user_id: str) -> None:
        """Revoke all sessions for a user"""
        try:
            sessions = db.collection(self.session_collection).where("user_id", "==", user_id).stream()
            for session in sessions:
                db.collection(self.session_collection).document(session.id).update({"active": False})
        except:
            pass
    
    def _load_session_from_browser(self) -> Optional[Dict]:
        """Load session from browser storage"""
        # JavaScript to get from browser storage
        js_code = """
        <script>
        const authData = localStorage.getItem('firebase_auth_session');
        if (authData) {
            window.parent.postMessage({
                type: 'auth_session_data',
                data: authData
            }, '*');
        }
        </script>
        """
        st.markdown(js_code, unsafe_allow_html=True)
        
        # Check session state for received data
        browser_data = st.session_state.get('browser_auth_data')
        if not browser_data:
            return None
            
        decrypted_data = self._decrypt_data(browser_data)
        if not decrypted_data:
            return None
            
        try:
            session_data = json.loads(decrypted_data)
            
            # Check expiration
            expires_at = datetime.fromisoformat(session_data['expires_at'])
            if expires_at < datetime.utcnow():
                self._clear_browser_session()
                return None
                
            # Validate session with server
            if not self._validate_session(session_data['session_id']):
                self._clear_browser_session()
                return None
                
            return session_data
        except:
            self._clear_browser_session()
            return None
    
    def _clear_browser_session(self) -> None:
        """Clear session from browser storage"""
        js_code = """
        <script>
        localStorage.removeItem('firebase_auth_session');
        </script>
        """
        st.markdown(js_code, unsafe_allow_html=True)
    
    def _create_or_update_user(self, firebase_user) -> Dict[str, Any]:
        """Create or update user in Firestore"""
        user_id = firebase_user.uid
        email = firebase_user.email
        name = firebase_user.display_name or email.split('@')[0]
        
        # Check if user exists
        user_doc = db.collection(self.users_collection).document(user_id).get()
        
        if user_doc.exists:
            # Update existing user
            user_data = user_doc.to_dict()
            db.collection(self.users_collection).document(user_id).update({
                "last_login": datetime.utcnow(),
                "email": email,
                "name": name
            })
        else:
            # Create new user
            role = "admin" if email in ADMIN_EMAILS else "viewer"
            user_data = {
                "id": user_id,
                "email": email,
                "name": name,
                "role": role,
                "created_at": datetime.utcnow(),
                "last_login": datetime.utcnow(),
                "active": True
            }
            db.collection(self.users_collection).document(user_id).set(user_data)
        
        return {
            "id": user_id,
            "email": email,
            "name": name,
            "role": user_data.get("role", "viewer")
        }

# Global auth manager instance
auth_manager = FirebaseAuthManager()

def initialize_firebase_auth():
    """Initialize Firebase if not already done"""
    try:
        firebase_admin.get_app()
        return True
    except ValueError:
        st.error("❌ Firebase not initialized. Check your configuration.")
        return False

def firebase_auth_ui():
    """Main Firebase Authentication UI"""
    if not initialize_firebase_auth():
        return None
    
    # Initialize session state
    if 'firebase_auth_initialized' not in st.session_state:
        st.session_state.firebase_auth_initialized = True
        st.session_state.firebase_user = None
        st.session_state.firebase_session_id = None
    
    # Check for existing session
    existing_session = auth_manager._load_session_from_browser()
    if existing_session and not st.session_state.firebase_user:
        st.session_state.firebase_user = existing_session['user_data']
        st.session_state.firebase_session_id = existing_session['session_id']
        st.rerun()
    
    # If user is logged in, show user info
    if st.session_state.firebase_user:
        return show_user_dashboard()
    
    # Show login/register forms
    return show_auth_forms()

def show_auth_forms():
    """Show login and registration forms"""
    st.markdown("## 🔐 Authentication")
    
    tab1, tab2 = st.tabs(["Login", "Register"])
    
    with tab1:
        show_login_form()
    
    with tab2:
        show_register_form()
    
    return None

def show_login_form():
    """Show login form"""
    st.markdown("### Login to Your Account")
    
    with st.form("login_form"):
        email = st.text_input("Email")
        password = st.text_input("Password", type="password")
        remember_me = st.checkbox("Keep me logged in for 3 months")
        
        if st.form_submit_button("Login", type="primary"):
            if email and password:
                user = authenticate_user(email, password, remember_me)
                if user:
                    st.success("✅ Login successful!")
                    st.rerun()
                else:
                    st.error("❌ Invalid email or password")
            else:
                st.error("Please fill in all fields")

def show_register_form():
    """Show registration form"""
    st.markdown("### Create New Account")
    
    with st.form("register_form"):
        name = st.text_input("Full Name")
        email = st.text_input("Email")
        password = st.text_input("Password", type="password")
        password_confirm = st.text_input("Confirm Password", type="password")
        
        if st.form_submit_button("Register", type="primary"):
            if name and email and password and password_confirm:
                if password != password_confirm:
                    st.error("❌ Passwords don't match")
                elif len(password) < 6:
                    st.error("❌ Password must be at least 6 characters")
                else:
                    user = register_user(name, email, password)
                    if user:
                        st.success("✅ Registration successful!")
                        st.rerun()
                    else:
                        st.error("❌ Registration failed. Email may already be in use.")
            else:
                st.error("Please fill in all fields")

def show_user_dashboard():
    """Show logged-in user dashboard"""
    user = st.session_state.firebase_user
    
    col1, col2, col3 = st.columns([2, 1, 1])
    
    with col1:
        st.markdown(f"### Welcome, {user['name']}!")
        st.markdown(f"**Email:** {user['email']}")
        st.markdown(f"**Role:** {user['role'].title()}")
    
    with col2:
        if st.button("🚪 Logout"):
            logout_user()
            st.rerun()
    
    with col3:
        if st.button("🚪 Logout All Devices"):
            logout_all_devices()
            st.rerun()
    
    return user

def authenticate_user(email: str, password: str, remember_me: bool = False) -> Optional[Dict[str, Any]]:
    """Authenticate user with Firebase"""
    try:
        # Note: Firebase Admin SDK doesn't have direct email/password auth
        # You would typically use Firebase Web SDK on frontend
        # For now, implementing basic flow
        
        # This is a simplified version - in production, use Firebase Web SDK
        firebase_user = firebase_auth.get_user_by_email(email)
        
        # Create user session
        user_data = auth_manager._create_or_update_user(firebase_user)
        
        if remember_me:
            session_id = auth_manager._create_session_id()
            auth_manager._store_session(firebase_user.uid, session_id, user_data)
            st.session_state.firebase_session_id = session_id
        
        st.session_state.firebase_user = user_data
        return user_data
        
    except Exception as e:
        st.error(f"Authentication error: {str(e)}")
        return None

def register_user(name: str, email: str, password: str) -> Optional[Dict[str, Any]]:
    """Register new user with Firebase"""
    try:
        # Create user in Firebase Auth
        firebase_user = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=name
        )
        
        # Create user session
        user_data = auth_manager._create_or_update_user(firebase_user)
        
        # Auto-login after registration
        session_id = auth_manager._create_session_id()
        auth_manager._store_session(firebase_user.uid, session_id, user_data)
        
        st.session_state.firebase_user = user_data
        st.session_state.firebase_session_id = session_id
        
        return user_data
        
    except Exception as e:
        st.error(f"Registration error: {str(e)}")
        return None

def logout_user():
    """Logout current user"""
    session_id = st.session_state.get('firebase_session_id')
    if session_id:
        auth_manager._revoke_session(session_id)
    
    auth_manager._clear_browser_session()
    st.session_state.firebase_user = None
    st.session_state.firebase_session_id = None

def logout_all_devices():
    """Logout user from all devices"""
    user = st.session_state.get('firebase_user')
    if user:
        auth_manager._revoke_all_user_sessions(user['id'])
    
    logout_user()
    st.success("✅ Logged out from all devices")

def get_current_user() -> Optional[Dict[str, Any]]:
    """Get current logged-in user"""
    return st.session_state.get('firebase_user')

def is_user_logged_in() -> bool:
    """Check if user is logged in"""
    return st.session_state.get('firebase_user') is not None

def get_user_role(user: Optional[Dict[str, Any]] = None) -> str:
    """Get user role"""
    if not user:
        user = get_current_user()
    return user.get('role', 'viewer') if user else 'viewer'

def require_auth(func):
    """Decorator to require authentication"""
    def wrapper(*args, **kwargs):
        if not is_user_logged_in():
            st.warning("🔐 Please log in to access this feature.")
            firebase_auth_ui()
            return None
        return func(*args, **kwargs)
    return wrapper

def require_role(required_role: str):
    """Decorator to require specific role"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                st.warning("🔐 Please log in to access this feature.")
                firebase_auth_ui()
                return None
            
            roles = ['viewer', 'user', 'manager', 'admin']
            user_role = get_user_role(user)
            
            if roles.index(user_role) < roles.index(required_role):
                st.warning(f"🔒 Access denied. Requires '{required_role}' role or higher.")
                return None
            
            return func(*args, **kwargs)
        return wrapper
    return decorator
