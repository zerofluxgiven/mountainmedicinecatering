# Fix Google Auth for Localhost Development

## The Issue
Google OAuth requires the redirect URL to be whitelisted. Your Firebase project is probably only configured for the production domain, not localhost.

## Quick Fix (2 minutes)

### 1. Add Localhost to Authorized Domains
Go to: https://console.firebase.google.com/project/mountainmedicine-6e572/authentication/settings

1. Scroll down to **"Authorized domains"**
2. Click **"Add domain"**
3. Add these domains:
   - `localhost`
   - `127.0.0.1`

### 2. Update OAuth Redirect URIs
Go to: https://console.cloud.google.com/apis/credentials?project=mountainmedicine-6e572

1. Find your OAuth 2.0 Client ID (should be named something like "Web client")
2. Click on it to edit
3. Under **"Authorized redirect URIs"**, add:
   - `http://localhost:3000/__/auth/handler`
   - `http://localhost:3000`

### 3. Clear Browser Data (Important!)
1. Open Chrome DevTools (F12)
2. Go to Application tab
3. Clear Storage → Clear site data
4. OR use incognito mode

## Alternative Solution: Email/Password Auth

If Google OAuth still doesn't work, you can use email/password:

1. Enable Email/Password in Firebase Authentication
2. Create a test user in Firebase Console
3. Use the email login option in the app

## Why This Happens

- Firebase Auth needs to know which domains are allowed to use authentication
- By default, only your production domain is authorized
- Local development needs explicit permission

## Still Having Issues?

Try:
1. Hard refresh (Ctrl+Shift+R)
2. Different browser or incognito mode
3. Check browser console for specific error messages

The app IS correctly connected to Firebase - it's just the OAuth redirect that needs configuration for localhost!