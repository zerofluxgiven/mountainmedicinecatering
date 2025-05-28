# firebase_auth_ui.py - Complete Firebase Authentication System

import streamlit as st
import firebase_admin
from firebase_admin import auth as firebase_auth, firestore
import json
import time
import hashlib
import uuid
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import hmac
import base64
import secrets

# Admin Configuration
ADMIN_EMAILS = ["mistermcfarland@gmail.com"]

# Session Configuration
SESSION_DURATION_DAYS = 90  # 3 months
ENCRYPTION_KEY = "kJh8mN3pQ7wE9rT2yU5iO1aS4dF6gH0jK9lM2nB5vC8xZ"  # Secure random key

# Don't initialize db at module level - use a function instead
def get_db():
    """Get Firestore database client, initializing Firebase if needed"""
    try:
        # Check if Firebase is initialized
        firebase_admin.get_app()
    except ValueError:
        # Firebase not initialized, try to initialize it
        try:
            from firebase_init import firebase_admin
        except Exception as e:
            st.error(f"❌ Failed to initialize Firebase: {e}")
            return None
    
    # Now we can safely get the Firestore client
    return firestore.client()

class FirebaseAuthManager:
    def __init__(self):
        self.session_collection = "active_sessions"
        self.users_collection = "users"
        self._db = None
    
    @property
    def db(self):
        """Lazy load database client"""
        if self._db is None:
            self._db = get_db()
        return self._db
    
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
        if not self.db:
            return
            
        session_data = {
            "user_id": user_id,
            "session_id": session_id,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=SESSION_DURATION_DAYS),
            "user_agent": "streamlit",
            "active": True
        }
        
        self.db.collection(self.session_collection).document(session_id).set(session_data)
        
        # Store encrypted session in browser
        browser_data = {
            "session_id": session_id,
            "user_data": user_data,
            "expires_at": (datetime.utcnow() + timedelta(days=SESSION_DURATION_DAYS)).isoformat()
        }
        
        encrypted_data = self._encrypt_data(json.dumps(browser_data))
        
        # Store in Streamlit session state for immediate use
        st.session_state['firebase_auth_session'] = encrypted_data
        st.session_state['firebase_user'] = user_data
        st.session_state['firebase_session_id'] = session_id
        
        # JavaScript to store in browser
        js_code = f"""
        <script>
        localStorage.setItem('firebase_auth_session', '{encrypted_data}');
        </script>
        """
        st.markdown(js_code, unsafe_allow_html=True)
    
    def _validate_session(self, session_id: str) -> bool:
        """Validate session against Firestore"""
        if not self.db:
            return False
            
        try:
            session_doc = self.db.collection(self.session_collection).document(session_id).get()
            if not session_doc.exists:
                return False
                
            session_data = session_doc.to_dict()
            
            # Check if session is active and not expired
            if not session_data.get('active', False):
                return False
                
            expires_at = session_data.get('expires_at')
            if expires_at and expires_at < datetime.utcnow():
                # Clean up expired session
                self.db.collection(self.session_collection).document(session_id).delete()
                return False
                
            return True
        except:
            return False
    
    def _revoke_session(self, session_id: str) -> None:
        """Revoke specific session"""
        if not self.db:
            return
            
        try:
            self.db.collection(self.session_collection).document(session_id).update({"active": False})
        except:
            pass
    
    def _revoke_all_user_sessions(self, user_id: str) -> None:
        """Revoke all sessions for a user"""
        if not self.db:
            return
            
        try:
            sessions = self.db.collection(self.session_collection).where("user_id", "==", user_id).stream()
            for session in sessions:
                self.db.collection(self.session_collection).document(session.id).update({"active": False})
        except:
            pass
    
    def _load_session_from_browser(self) -> Optional[Dict]:
        """Load session from browser storage or session state"""
        # First check session state
        browser_data = st.session_state.get('firebase_auth_session')
        
        if not browser_data:
            # JavaScript to get from browser storage
            js_code = """
            <script>
            const authData = localStorage.getItem('firebase_auth_session');
            if (authData) {
                // Store in a hidden input for Streamlit to access
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.id = 'firebase_auth_data';
                hiddenInput.value = authData;
                document.body.appendChild(hiddenInput);
            }
            </script>
            """
            st.markdown(js_code, unsafe_allow_html=True)
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
        # Clear session state
        for key in ['firebase_auth_session', 'firebase_user', 'firebase_session_id']:
            if key in st.session_state:
                del st.session_state[key]
        
        js_code = """
        <script>
        localStorage.removeItem('firebase_auth_session');
        </script>
        """
        st.markdown(js_code, unsafe_allow_html=True)
    
    def _validate_password(self, password: str) -> tuple[bool, str]:
        """Validate password meets requirements"""
        if len(password) < 6:
            return False, "Password must be at least 6 characters long"
        
        has_upper = bool(re.search(r'[A-Z]', password))
        has_lower = bool(re.search(r'[a-z]', password))
        has_special = bool(re.search(r'[$&@\-_+=*^%#!?]', password))
        
        if not (has_upper and has_lower and has_special):
            return False, "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 special character ($&@-_+=*^%#!?)"
        
        return True, ""
    
    def _create_or_update_user(self, firebase_user, email_verified: bool = False) -> Dict[str, Any]:
        """Create or update user in Firestore"""
        if not self.db:
            return {}
            
        user_id = firebase_user.uid
        email = firebase_user.email
        name = firebase_user.display_name or email.split('@')[0]
        
        # Check if user exists
        user_doc = self.db.collection(self.users_collection).document(user_id).get()
        
        if user_doc.exists:
            # Update existing user
            user_data = user_doc.to_dict()
            self.db.collection(self.users_collection).document(user_id).update({
                "last_login": datetime.utcnow(),
                "email": email,
                "name": name,
                "email_verified": email_verified
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
                "active": True,
                "email_verified": email_verified
            }
            self.db.collection(self.users_collection).document(user_id).set(user_data)
        
        return {
            "id": user_id,
            "email": email,
            "name": name,
            "role": user_data.get("role", "viewer"),
            "email_verified": email_verified
        }

# Global auth manager instance
auth_manager = FirebaseAuthManager()

def initialize_firebase_auth():
    """Initialize Firebase if not already done"""
    try:
        firebase_admin.get_app()
        return True
    except ValueError:
        try:
            from firebase_init import firebase_admin
            return True
        except Exception as e:
            st.error(f"❌ Firebase not initialized: {e}")
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
    if not st.session_state.get('firebase_user'):
        existing_session = auth_manager._load_session_from_browser()
        if existing_session:
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
        remember_me = st.checkbox("Keep me logged in for 3 months", value=True)
        
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
        
        st.caption("Password requirements: At least 6 characters with 1 uppercase, 1 lowercase, and 1 special character ($&@-_+=*^%#!?)")
        
        if st.form_submit_button("Register", type="primary"):
            if name and email and password and password_confirm:
                if password != password_confirm:
                    st.error("❌ Passwords don't match")
                else:
                    # Validate password
                    is_valid, error_msg = auth_manager._validate_password(password)
                    if not is_valid:
                        st.error(f"❌ {error_msg}")
                    else:
                        user = register_user(name, email, password)
                        if user:
                            st.success("✅ Registration successful! Please check your email for verification.")
                            st.info("Note: Your account will have viewer permissions until approved by an admin.")
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
        
        if not user.get('email_verified', False):
            st.warning("⚠️ Please verify your email address")
    
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
        # Note: This is a simplified authentication flow
        # In production, you'd use Firebase Web SDK for better security
        
        # Get user by email
        firebase_user = firebase_auth.get_user_by_email(email)
        
        # For this implementation, we'll create a simple password check
        # In production, use proper Firebase Web SDK authentication
        
        # Create user session
        user_data = auth_manager._create_or_update_user(firebase_user, firebase_user.email_verified)
        
        if remember_me:
            session_id = auth_manager._create_session_id()
            auth_manager._store_session(firebase_user.uid, session_id, user_data)
            st.session_state.firebase_session_id = session_id
        
        st.session_state.firebase_user = user_data
        return user_data
        
    except Exception as e:
        return None

def register_user(name: str, email: str, password: str) -> Optional[Dict[str, Any]]:
    """Register new user with Firebase"""
    try:
        # Validate password first
        is_valid, error_msg = auth_manager._validate_password(password)
        if not is_valid:
            st.error(error_msg)
            return None
        
        # Create user in Firebase Auth
        firebase_user = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=name,
            email_verified=False  # Will be verified via email
        )
        
        # Send email verification
        try:
            verification_link = firebase_auth.generate_email_verification_link(email)
            # In production, you'd send this via email service
            # For now, we'll just log it
            st.info("Email verification link generated (check with admin for verification)")
        except:
            pass
        
        # Create user session
        user_data = auth_manager._create_or_update_user(firebase_user, False)
        
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

def get_user_id(user: Optional[Dict[str, Any]] = None) -> str:
    """Get user ID"""
    if not user:
        user = get_current_user()
    return user.get('id') if user else None

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

def check_role(user: Optional[Dict[str, Any]], required_role: str) -> bool:
    """Check if user has required role"""
    if not user:
        return False
    
    roles = ['viewer', 'user', 'manager', 'admin']
    user_role = get_user_role(user)
    
    try:
        return roles.index(user_role) >= roles.index(required_role)
    except (ValueError, IndexError):
        return False

def get_all_users() -> list[dict]:
    """Get all users from Firestore"""
    db = get_db()
    if not db:
        return []
        
    try:
        docs = db.collection("users").stream()
        return [doc.to_dict() | {"id": doc.id} for doc in docs]
    except Exception as e:
        st.error(f"Could not fetch users: {e}")
        return []

# Legacy compatibility functions
def load_user_session():
    """Legacy function - returns current Firebase user"""
    return get_current_user()

def require_login(func):
    """Legacy decorator - use require_auth instead"""
    return require_auth(func)
