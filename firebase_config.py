import firebase_admin
from firebase_admin import credentials

def initialize_firebase():
    if not firebase_admin._apps:
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": st.secrets["firebase_project_id"],
            "private_key": st.secrets["private_key"].replace("\\n", "\n"),
            "client_email": st.secrets["client_email"],
            "token_uri": "https://oauth2.googleapis.com/token"
        })
        firebase_admin.initialize_app(cred)
