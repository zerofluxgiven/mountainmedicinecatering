# Fix Recipe Parsing Issue

## Problem
The Firebase function is not properly loading the OpenAI API key in production. The code tries to use `process.env.OPENAI_API_KEY` first, but environment variables from `.env` files are not available in deployed Firebase Functions.

## Solution

### Option 1: Quick Fix - Update Firebase Functions Config

1. First, verify your current config:
```bash
firebase functions:config:get
```

2. If the OpenAI key is missing or incorrect, set it:
```bash
firebase functions:config:set openai.key="YOUR_OPENAI_API_KEY"
```

3. Deploy the functions:
```bash
firebase deploy --only functions
```

### Option 2: Fix the Code (Recommended)

Update `/functions/index.js` to properly handle the API key:

```javascript
// Initialize OpenAI with better error handling
let openaiKey = functions.config().openai?.key;

// In development, also check .env
if (!openaiKey && process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
  openaiKey = process.env.OPENAI_API_KEY;
}

if (!openaiKey) {
  console.error('OpenAI API key not found in Firebase config or environment');
}

const openai = new OpenAI({
  apiKey: openaiKey,
});
```

### Option 3: Debug the Actual Error

The current error handling might be hiding the real issue. Update the parseRecipe function to log more details:

In `/functions/index.js`, around line 62, update the error logging:

```javascript
} catch (error) {
  console.error("Recipe parsing error:", error);
  console.error("Error stack:", error.stack);
  console.error("OpenAI key present:", !!openai.apiKey);
  console.error("Request data:", { type, hasText: !!text, hasUrl: !!url });
  
  // ... rest of error handling
}
```

Then check the logs:
```bash
firebase functions:log --only parseRecipe --lines 100
```

## Testing the Fix

1. After deploying, test with a simple recipe:
```javascript
// In browser console when logged in
const { getFunctions, httpsCallable } = await import('firebase/functions');
const functions = getFunctions();
const parseRecipe = httpsCallable(functions, 'parseRecipe');

const result = await parseRecipe({
  url: 'https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/',
  type: 'url'
});

console.log('Result:', result);
```

2. Check the actual HTTP response in Network tab of DevTools

## Most Common Issues

1. **Expired OpenAI Key**: The key might be revoked or expired
2. **OpenAI Account Issues**: Check if your OpenAI account has:
   - Active billing
   - Available credits
   - GPT-4 access enabled
3. **CORS Issues**: Though the function has CORS enabled, check browser console
4. **URL Parsing Issues**: Some websites block scraping - try different recipe URLs

## Alternative: Test Locally

1. Set up local environment:
```bash
cd functions
npm install
```

2. Create `.env` file in functions folder with your OpenAI key

3. Run emulators:
```bash
firebase emulators:start --only functions
```

4. Update React app to use emulators (set `REACT_APP_USE_EMULATORS=true`)

5. Test parsing - you'll see detailed logs in the terminal