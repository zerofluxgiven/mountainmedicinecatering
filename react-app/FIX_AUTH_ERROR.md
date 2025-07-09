# Fix Authentication Error: auth/operation-not-allowed

## 🔴 Error Explanation
The error `Firebase: Error (auth/operation-not-allowed)` means that email/password authentication is **not enabled** in your Firebase project settings.

## ✅ Solution (Takes 2 minutes)

### Step 1: Open Firebase Console
1. Go to: https://console.firebase.google.com/project/mountainmedicine-6e572/authentication
2. Or manually navigate:
   - Firebase Console → Your Project (`mountainmedicine-6e572`)
   - Click "Authentication" in the left sidebar

### Step 2: Enable Email/Password Authentication
1. Click on the **"Sign-in method"** tab
2. Find **"Email/Password"** in the list
3. Click on it
4. Toggle **"Enable"** to ON
5. Click **"Save"**

### Step 3: (Optional) Enable Google Sign-in
While you're there, you might also want to enable Google sign-in:
1. Click on **"Google"** in the sign-in providers list
2. Toggle **"Enable"** to ON
3. Choose a project support email
4. Click **"Save"**

### Step 4: Check Authorized Domains
1. Scroll down to **"Authorized domains"**
2. Make sure these are listed:
   - `localhost` (for development)
   - `mountainmedicine-6e572.firebaseapp.com`
   - Your custom domain (if you have one)

## 🔍 How to Verify It's Working

After enabling Email/Password auth:
1. Refresh your React app (http://localhost:3000)
2. Try logging in again
3. You should now be able to log in with your existing credentials

## 📝 Common Issues

### Still getting the same error?
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Check that you saved the changes in Firebase Console
- Make sure you're in the correct Firebase project

### Can't remember your password?
- Since you own the Firebase project, you can:
  1. Go to Authentication → Users tab
  2. Find your user
  3. Click the menu (⋮) → Reset password

### Want to create a new user?
In Firebase Console:
1. Authentication → Users tab
2. Click "Add user"
3. Enter email and password

## 🤔 Why This Happened

The Streamlit app likely had email/password authentication already enabled, but when viewing the Firebase project settings, it appears this might have been disabled or the React app is trying to use a different auth method.

## 🚀 No Deployment Needed!

This is just a configuration toggle in Firebase Console - no code changes or deployment required. The change takes effect immediately.

---

**Note**: This is NOT about making the app "live" or deploying it. This is just enabling the authentication method in your Firebase project settings. The app can run locally with these settings.