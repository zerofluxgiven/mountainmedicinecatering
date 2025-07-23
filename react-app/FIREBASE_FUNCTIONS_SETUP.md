# Firebase Functions Setup Guide

## Prerequisites

1. Firebase CLI installed (`npm install -g firebase-tools`)
2. Firebase project created and configured
3. OpenAI API key for AI parsing features

## Setting Up Environment Variables

### For Local Development

1. Create a `.env` file in the `functions` directory:
```bash
cd functions
touch .env
```

2. Add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### For Production Deployment

Set the configuration using Firebase CLI:

```bash
firebase functions:config:set openai.key="sk-your-openai-api-key-here"
```

## Deploying Functions

### Deploy All Functions
```bash
firebase deploy --only functions
```

### Deploy Specific Function
```bash
firebase deploy --only functions:parseEventFlyer
```

## CORS Configuration

The `parseEventFlyer` function has been configured with CORS support:

```javascript
exports.parseEventFlyer = functions
  .runWith({ 
    cors: true,
    timeoutSeconds: 60,
    memory: '512MB'
  })
  .https.onCall(async (data, context) => {
    // Function implementation
  });
```

## Testing Functions Locally

1. Start the Firebase emulators:
```bash
firebase emulators:start --only functions
```

2. The functions will be available at:
- Callable functions: `http://localhost:5001/[project-id]/us-central1/[function-name]`

## Troubleshooting

### CORS Errors
If you encounter CORS errors:
1. Ensure the function has `cors: true` in `runWith` configuration
2. Check that the client is using the correct Firebase Functions URL
3. Verify authentication tokens are being sent correctly

### Authentication Errors
1. Ensure the user is logged in before calling the function
2. Check that Firebase Auth is properly initialized
3. Verify the ID token is valid and not expired

### Function Not Found
1. Check that the function is deployed: `firebase functions:list`
2. Verify the function name matches in both client and server code
3. Ensure you're calling the function from the correct region

### OpenAI API Errors
1. Verify your API key is set correctly
2. Check your OpenAI account has sufficient credits
3. Ensure the API key has the necessary permissions for GPT-4 and Vision API

## Function Endpoints

### parseEventFlyer
- **Purpose**: Parse event details from uploaded flyers (images, PDFs, text files)
- **Authentication**: Required
- **Input**: 
  - `fileData`: Base64 encoded file data
  - `mimeType`: File MIME type
  - `url`: (Optional) URL to parse instead of file
- **Output**: Parsed event details object

### parseRecipe
- **Purpose**: Parse recipe details from various sources
- **Authentication**: Required
- **Input**: 
  - `text`: Recipe text
  - `url`: Recipe URL
  - `fileData`: Base64 encoded file
  - `mimeType`: File MIME type
- **Output**: Parsed recipe object

## Security Considerations

1. **API Key Security**: Never commit API keys to version control
2. **Authentication**: All parsing functions require authentication
3. **Rate Limiting**: Consider implementing rate limiting for production
4. **File Size Limits**: Functions have a 10MB request size limit
5. **Timeout**: Functions timeout after 60 seconds

## Monitoring

Monitor function usage and errors in the Firebase Console:
1. Go to Firebase Console > Functions
2. View logs, metrics, and health status
3. Set up alerts for errors or high usage