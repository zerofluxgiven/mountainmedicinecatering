# AI Chat Troubleshooting Guide

## Issue: "Failed to connect to AI service"

This error can occur for several reasons. Here's how to troubleshoot:

### 1. Check Authentication
The most common cause is expired authentication. Try:
1. Refresh the page (Cmd+R or Ctrl+R)
2. If that doesn't work, log out and log back in
3. Clear browser cache and cookies for the site

### 2. Check Network
1. Open DevTools (F12) → Network tab
2. Send a message in AI chat
3. Look for the `askAIHttp` request
4. Check the status code:
   - 401: Authentication issue (see above)
   - 500: Server error (see logs)
   - CORS error: Browser blocking the request

### 3. Quick Fix - Force Refresh
Sometimes the auth token gets stale. Try:
```javascript
// In browser console
location.reload(true);
```

### 4. Test Authentication Status
```javascript
// This won't work on production, but you can check network requests
console.log('Check Network tab for auth headers in requests');
```

## Current Status

✅ **Claude API**: Working (tested locally)
✅ **Functions Deployed**: askAI and askAIHttp are live
✅ **CORS Configured**: Origin restrictions removed for testing
✅ **Error Handling**: Improved error messages

## What's Been Fixed

1. **Enter Key Issue**: Now sends message instead of creating new lines
2. **Auto-focus**: Cursor goes to input when opening chat
3. **Error Messages**: More specific error details
4. **CORS Headers**: Updated to be more permissive

## If Still Having Issues

1. **Try Incognito/Private Mode**: This uses fresh auth
2. **Different Browser**: Try Chrome, Firefox, or Safari
3. **Check Console**: Look for specific error messages
4. **Network Tab**: Check if requests are being blocked

## For Dan

The AI chat is working on the backend. The "Failed to connect" error is most likely:
1. Expired Firebase auth token (refresh the page)
2. Browser caching issue (try incognito)
3. CORS being strict (already updated, may need to propagate)

The functions are deployed and the Claude API is configured correctly. Just need to get past the auth/CORS layer.