# Recipe Parsing Debug Guide

## Issue Summary
The recipe parsing Firebase function is failing with "Failed to parse recipe from URL" errors.

## Investigation Results

### 1. Firebase Function Status
- ✅ Function `parseRecipe` is deployed to Firebase
- ✅ Function is configured with correct region (us-central1)
- ✅ OpenAI API key is configured in Firebase functions config
- ✅ Function code looks correct and handles URL parsing

### 2. Function Configuration
- **Project ID**: mountainmedicine-6e572
- **Region**: us-central1
- **Runtime**: nodejs18
- **OpenAI Key**: Configured in both `.env` file and Firebase config

### 3. Potential Issues and Solutions

#### A. OpenAI API Key Issues
The OpenAI API key might be:
1. **Expired or Invalid**: The key in the functions might be old
2. **Rate Limited**: Too many requests
3. **Insufficient Permissions**: Key might not have access to GPT-4

**To Debug:**
```bash
# Check current function config
firebase functions:config:get

# Update OpenAI key if needed
firebase functions:config:set openai.key="YOUR_NEW_KEY"
firebase deploy --only functions
```

#### B. CORS Issues
The function might be rejecting requests from the frontend.

**To Debug:**
1. Open browser DevTools Network tab
2. Look for the parseRecipe request
3. Check if it's failing with CORS errors

#### C. Authentication Issues
The function requires authentication (`context.auth`).

**To Debug:**
1. Ensure user is logged in when making requests
2. Check if auth token is being passed correctly

### 4. Quick Test in Browser Console

Once logged into the app, run this in the browser console:

```javascript
// Test the parseRecipe function directly
async function testParseRecipe() {
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const functions = getFunctions();
  const parseRecipe = httpsCallable(functions, 'parseRecipe');
  
  try {
    const result = await parseRecipe({
      text: `Simple Test Recipe
      Serves: 4
      Ingredients:
      - 2 cups flour
      - 1 cup sugar
      Instructions:
      Mix and bake.`,
      type: 'text'
    });
    
    console.log('Success:', result.data);
  } catch (error) {
    console.error('Error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  }
}

testParseRecipe();
```

### 5. Check Function Logs

To see actual error messages from the function:

```bash
# View recent function logs
firebase functions:log --only parseRecipe

# Or use Google Cloud Console
# https://console.cloud.google.com/logs/query
```

### 6. Most Likely Fixes

1. **Update OpenAI API Key**:
   ```bash
   # Get a new key from https://platform.openai.com/api-keys
   firebase functions:config:set openai.key="sk-..."
   firebase deploy --only functions
   ```

2. **Check OpenAI Account**:
   - Ensure billing is active
   - Check API usage limits
   - Verify key has GPT-4 access

3. **Redeploy Functions**:
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```

### 7. Test with cURL

Test the function directly (you'll need an auth token):

```bash
# Get your auth token from browser (in DevTools, Application > Local Storage > look for firebase:authUser)

curl -X POST https://us-central1-mountainmedicine-6e572.cloudfunctions.net/parseRecipe \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "text": "Test recipe\nServes: 4\nIngredients:\n- 1 cup flour\nInstructions:\nMix well.",
      "type": "text"
    }
  }'
```

### 8. Alternative: Use Emulators for Testing

Run functions locally to debug:

```bash
# In the functions directory
npm run serve

# This will start emulators and show detailed logs
```

Then update the React app to use emulators by setting:
```
REACT_APP_USE_EMULATORS=true
```