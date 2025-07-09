# Deploy Firebase Functions for AI Features

The event flyer parsing error occurs because the Firebase Functions haven't been deployed yet. Follow these steps:

## 1. Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

## 2. Login to Firebase
```bash
firebase login
```

## 3. Set OpenAI API Key
```bash
firebase functions:config:set openai.key="YOUR_OPENAI_API_KEY_HERE"
```
Replace `YOUR_OPENAI_API_KEY_HERE` with your actual OpenAI API key.

## 4. Install Function Dependencies
```bash
cd functions
npm install
```

## 5. Deploy the Functions
```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:parseEventFlyer
```

## 6. Verify Deployment
After deployment, you should see output like:
```
✔ Function parseEventFlyer deployed successfully
✔ Function parseRecipe deployed successfully
✔ Function chatAssistant deployed successfully
```

## 7. Enable Required APIs (if needed)
If using Google Cloud Vision for OCR:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Enable "Cloud Vision API"

## Troubleshooting

### If you see permission errors:
- Make sure you're logged into the correct Firebase account
- Ensure you have appropriate permissions in the Firebase project

### If deployment fails:
- Check that all dependencies in `functions/package.json` are installable
- Ensure Node.js version matches the engine requirement (Node 18)

### To test locally before deploying:
```bash
firebase emulators:start --only functions
```

## After Deployment
Once deployed, the AI event flyer parsing will work automatically. You can:
1. Upload image files (JPG, PNG) - will use OCR
2. Upload PDF files - will extract text
3. Upload text files - will parse directly
4. The AI will extract event details automatically