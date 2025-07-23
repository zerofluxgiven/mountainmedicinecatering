# 🚨 MANUAL PERMISSIONS GUIDE - IMPORTANT! 🚨

This guide lists all the manual permissions and settings that need to be configured in Firebase Console or Google Cloud Console. Claude/AI cannot make these changes - only you can!

## When You See These Errors, Check This Guide:

### Error: "403 Forbidden" or "CORS error"
**You need to**: Set IAM permissions for Cloud Functions
```bash
# Claude can run these for you, but ASK Claude to run them:
gcloud functions add-iam-policy-binding FUNCTION_NAME --member="allUsers" --role="roles/cloudfunctions.invoker" --project=mountainmedicine-6e572
```

### Error: "Missing or insufficient permissions" 
**You need to**: Update Firestore Security Rules in Firebase Console
- Go to: Firebase Console → Firestore → Rules
- Add the missing collection rules (see below)

### Error: "API key not configured" or "OpenAI/Anthropic error"
**You need to**: Set environment variables
```bash
# Ask Claude to help you run these with your actual keys:
firebase functions:config:set anthropic.key="YOUR_KEY_HERE"
firebase functions:config:set openai.key="YOUR_KEY_HERE"
```

### Error: "The query requires an index"
**You need to**: Create Firestore composite indexes
- Click the link in the error message to auto-create the index
- Or manually create indexes in Firebase Console → Firestore → Indexes

## Complete List of Required Permissions

### 1. Firestore Security Rules (Firebase Console)
These collections need rules in Firestore:
```javascript
// Core collections
- recipes (public read, auth write)
- events (auth required)
- menus (auth required)
- ingredients (auth required)
- users (auth required)

// AI collections
- ai_actions (auth required)
- ai_questions (auth required)
- ai_interactions (auth required)
- ai_monitoring (auth required)
- ai_conversations (auth + user check)
- conversations (auth + user check)

// Other collections
- accommodation_menus (auth required)
- meal_types (auth required)
- files, receipts, suggestions, tags, logs, config (all auth required)
```

### 2. Cloud Functions IAM Permissions
These functions need public invoke permissions:
```bash
# HTTP endpoints that need allUsers invoker role:
- askAIHttp
- aiCreateRecipeHttp
- parseEventFlyerHTTP
- aiCreateRecipeHttpPublic
```

### 3. Firebase Storage Rules (Firebase Console → Storage → Rules)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;  // Public read
      allow write: if request.auth != null;  // Auth write
    }
  }
}
```

### 4. Environment Variables (Firebase Functions Config)
```bash
# Required API keys:
anthropic.key = "sk-ant-..."  # For AI chat
openai.key = "sk-..."         # For recipe/event parsing
```

### 5. Firestore Composite Indexes
These queries require composite indexes:
```
Collection: conversations
- Fields: userId (Ascending) + lastMessageAt (Descending)
- Fields: userId (Ascending) + status (Ascending) + createdAt (Descending)

Collection: ai_actions
- Fields: metadata.performed_by (Ascending) + timestamp (Descending)
```

### 6. Google Cloud APIs to Enable
In Google Cloud Console, these APIs must be enabled:
- Cloud Functions API
- Cloud Build API
- Artifact Registry API
- Cloud Scheduler API (for scheduled functions)

## Common Permission Issues and Solutions

### Issue: Recipe saving fails with 403
**Solution**: 
1. Check Firestore rules for `recipes` and `ai_actions` collections
2. Run: `gcloud functions add-iam-policy-binding aiCreateRecipe --member="allUsers" --role="roles/cloudfunctions.invoker"`

### Issue: AI chat returns "unauthenticated"
**Solution**:
1. Check if user is logged in
2. Verify Firestore rules allow authenticated access
3. Check Firebase Auth is properly configured

### Issue: Image upload fails
**Solution**:
1. Check Storage rules allow authenticated writes
2. Verify storage bucket name in code matches Firebase

### Issue: PDF generation fails
**Solution**:
1. Usually a code issue, not permissions
2. But check if `menus` and `events` collections are readable

## How to Test Permissions

1. **Test Firestore Rules**:
   - Use Rules Playground in Firebase Console
   - Test with authenticated and unauthenticated requests

2. **Test Function Permissions**:
   ```bash
   curl https://us-central1-mountainmedicine-6e572.cloudfunctions.net/FUNCTION_NAME
   ```
   - Should return data, not 403

3. **Test Storage**:
   - Try uploading an image while logged in
   - Try viewing an image URL while logged out

## When to Ask Claude for Help

**Claude CAN help with**:
- Running gcloud commands (with your approval)
- Writing Firestore rules syntax
- Debugging which permissions are missing
- Creating fallback code for permission issues

**Claude CANNOT do**:
- Access Firebase Console
- Set API keys without you providing them
- Enable Google Cloud APIs
- Change billing or quotas

## Important Notes

1. **Always deploy functions after config changes**:
   ```bash
   firebase deploy --only functions
   ```

2. **CORS issues often mask permission problems** - check both!

3. **Some changes take 5-10 minutes to propagate** - be patient

4. **Keep this file updated** when you discover new permission requirements

---

Remember: When you see a permission error, check this guide first! It will save hours of debugging.