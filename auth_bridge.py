import streamlit as st
import streamlit.components.v1 as components
import json

def setup_auth_listener():
    """Set up listener for auth messages from JavaScript"""
    
    # JavaScript to handle postMessage communication
    bridge_script = """
    <script>
    window.addEventListener('message', function(e) {
        if (e.data.type === 'google-auth-success') {
            // Store in sessionStorage temporarily
            sessionStorage.setItem('pending_auth', JSON.stringify(e.data.user));
            // Force Streamlit to rerun
            window.location.reload();
        } else if (e.data.type === 'google-auth-error') {
            alert('Authentication failed: ' + e.data.error);
        }
    });
    
    // Check for pending auth on load
    const pendingAuth = sessionStorage.getItem('pending_auth');
    if (pendingAuth) {
        const userData = JSON.parse(pendingAuth);
        sessionStorage.removeItem('pending_auth');
        
        // Send to Streamlit
        window.parent.postMessage({
            type: 'streamlit-auth-data',
            user: userData
        }, '*');
    }
    </script>
    """
    
    components.html(bridge_script, height=0)
    
    # Check for auth data in query params (alternative approach)
    query_params = st.experimental_get_query_params()
    if "auth_data" in query_params:
        try:
            auth_data = json.loads(query_params["auth_data"][0])
            st.experimental_set_query_params()  # Clear params
            return auth_data
        except:
            pass
    
    return None
