# Enable Google Authentication in Firebase

## Quick Steps to Enable Google Sign-In

### 1. Open Firebase Console
Go to: https://console.firebase.google.com/project/mountainmedicine-6e572/authentication/providers

### 2. Enable Google Sign-In
1. Click on **"Google"** in the sign-in providers list
2. Toggle **"Enable"** to ON
3. For "Project support email", select your email
4. Click **"Save"**

That's it! Google sign-in is now enabled.

### 3. Test the Login
1. Go back to your React app: http://localhost:3000
2. Click "Sign in with Google"
3. You should see Google's sign-in popup
4. Select your Google account
5. You'll be redirected to the app dashboard

## What This Does

- Enables Google OAuth authentication for your Firebase project
- Allows users to sign in with their Google accounts
- Creates Firebase user records automatically for new Google users
- No code changes needed - just a configuration toggle

## Note

Since you already have the Firebase project from your Streamlit app, any users who previously signed in with Google will still have their accounts and data.

## Troubleshooting

If the Google sign-in button doesn't work:
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Check browser console for errors
3. Make sure you saved the changes in Firebase Console
4. Verify you're logged into the correct Google account