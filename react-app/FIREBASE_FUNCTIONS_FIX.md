# Firebase Functions CORS/403 Fix

## Problem
Firebase Callable functions are returning 403/404 errors due to CORS and authentication issues.

## Solution Applied ✅
All Firebase Functions have been made public by adding the "Cloud Functions Invoker" permission for allUsers:

```bash
# Functions made public (completed):
✅ parseEventFlyer
✅ chatAssistant  
✅ parseRecipe
✅ generateMenuPDF
✅ generateShoppingListPDF
✅ healthCheck
```

## What Was Done
Used gcloud CLI to add public invoker permissions:
```bash
gcloud functions add-iam-policy-binding [FUNCTION_NAME] \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --project=mountainmedicine-6e572 \
  --region=us-central1
```

### Option 2: Use HTTP Functions Instead
Convert `onCall` functions to `onRequest` with manual CORS handling.

### Option 3: Firebase Functions v2
Upgrade to Firebase Functions v2 which has better CORS handling:
```javascript
const {onCall} = require("firebase-functions/v2/https");

exports.parseEventFlyer = onCall({
  cors: true,
  region: "us-central1"
}, async (request) => {
  // function logic
});
```

## Current Workarounds
1. **Event Parsing**: Text files work perfectly with local parser
2. **Recipe Parsing**: Already using local parser
3. **AI Chat**: Can use enhanced mock responses
4. **PDF Generation**: Not critical for basic functionality

## Testing the Fix
The functions should now be accessible from the React app. Test by:
1. Uploading an event flyer image - should parse successfully
2. Using the AI chat - should get responses from the chatAssistant function
3. Parsing recipes from files or URLs
4. Generating PDFs for menus and shopping lists

Note: Firebase Callable functions (`onCall`) work differently than HTTP functions. They:
- Use Firebase Auth tokens automatically
- Handle CORS internally
- Are invoked through the Firebase SDK, not direct HTTP calls
- Return a 404 when accessed directly via curl

## Important Notes
- The functions are now publicly accessible (no authentication required)
- For production, consider implementing proper authentication
- The fallback to local parsers remains in place for additional reliability