# Firebase Functions Deployment Investigation Report

## Current Status

Based on the `firebase functions:list` output, most functions are successfully deployed and running. However, there are deployment failures and timeouts occurring when trying to update certain functions.

## Key Findings

### 1. Build Timeout Errors
From the logs, several functions are failing with build timeouts:
- `aiUpdateRecipe`: "Build failed: Build has timed out"
- `parseRecipe`: "Build failed: Build has timed out"

These errors reference Cloud Build logs for detailed troubleshooting.

### 2. Successfully Deployed Functions
The following functions are currently active:
- All AI functions (askAI, askAIHttp, aiCreateMenu, aiCreateRecipe, etc.)
- All safety monitoring triggers (onMenuChange, onEventGuestDataChange, etc.)
- Core functions (parseEventFlyer, generateMenuPDF, etc.)

### 3. Project Configuration
- **Runtime**: Node.js 18
- **Memory allocation**: Most functions use 256MB, except:
  - `parseRecipe`: 1GB (for image processing)
  - `parseEventFlyer`: 512MB
- **Package dependencies**: Heavy dependencies including puppeteer, sharp, and multiple AI SDKs

## Root Causes

### 1. Large Dependency Tree
The `functions/package.json` includes heavy dependencies:
- `puppeteer`: ~21.5.0 (headless browser, very large)
- `sharp`: ~0.34.3 (image processing, requires native binaries)
- Multiple AI SDKs (OpenAI, Anthropic)
- PDF processing libraries

These can cause build timeouts due to:
- Large download sizes
- Native binary compilation
- Complex dependency resolution

### 2. Default Firebase CLI Timeout
The Firebase CLI has a 2-minute default timeout, but deployments often continue in the background. This explains why functions show as "deployed" in the list but the CLI reports timeout errors.

### 3. Simultaneous Deployment of Many Functions
Deploying all ~23 functions at once can overwhelm the build system and hit rate limits.

## Recommended Solutions

### Immediate Actions

1. **Set Longer Timeout for CLI**
```bash
export FUNCTIONS_DISCOVERY_TIMEOUT=300
firebase deploy --only functions
```

2. **Deploy Functions in Batches**
```bash
# Deploy core functions first
firebase deploy --only functions:parseRecipe,functions:parseEventFlyer,functions:askAI,functions:askAIHttp

# Deploy AI action functions
firebase deploy --only functions:aiCreateRecipe,functions:aiUpdateRecipe,functions:aiCreateMenu,functions:aiParseRecipeFromUrl

# Deploy triggers
firebase deploy --only functions:onMenuChange,functions:onEventGuestDataChange,functions:onAccommodationMenuCreate

# Deploy utilities
firebase deploy --only functions:generateMenuPDF,functions:generateShoppingListPDF,functions:healthCheck
```

3. **Deploy Specific Failed Functions**
```bash
# For the specific failures mentioned
firebase deploy --only functions:aiUpdateRecipe
firebase deploy --only functions:parseRecipe
```

### Long-term Solutions

1. **Optimize Dependencies**
- Consider moving heavy dependencies to a separate service
- Use Cloud Run for functions requiring puppeteer
- Implement lazy loading for large libraries

2. **Split Functions into Multiple Projects**
- Core functions in one project
- AI functions in another
- Triggers in a third

3. **Use Firebase Functions Gen2**
- Better resource allocation
- Improved build system
- Support for larger deployments

4. **Implement Build Caching**
```json
// In firebase.json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs18",
    "ignore": [
      "node_modules",
      ".git",
      "firebase-debug.log"
    ],
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run lint"
    ]
  }
}
```

## Monitoring Deployment Status

### Check Deployment Progress
```bash
# View real-time logs
firebase functions:log --follow

# Check specific function status
firebase functions:list | grep functionName

# View Google Cloud Console
# https://console.cloud.google.com/functions/list?project=mountainmedicine-6e572
```

### Verify Function Health
```bash
# Test HTTP endpoint
curl https://us-central1-mountainmedicine-6e572.cloudfunctions.net/healthCheck

# Test askAIHttp endpoint
curl -X POST https://us-central1-mountainmedicine-6e572.cloudfunctions.net/askAIHttp \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

## Critical Functions to Prioritize

Based on the application's core functionality:

1. **Must Deploy First**:
   - `askAI` / `askAIHttp` - Core AI chat functionality
   - `parseRecipe` - Recipe import feature
   - `parseEventFlyer` - Event creation feature

2. **Deploy Second**:
   - All AI action functions (aiCreateRecipe, etc.)
   - Safety monitoring triggers

3. **Deploy Last**:
   - Utility functions (PDF generation, thumbnails)
   - Scheduled functions (daily sweeps, reminders)

## Next Steps

1. Try deploying with increased timeout:
   ```bash
   export FUNCTIONS_DISCOVERY_TIMEOUT=300 && firebase deploy --only functions
   ```

2. If timeout persists, deploy in batches as shown above

3. Monitor the Google Cloud Console for actual deployment status

4. Consider optimizing the functions with heavy dependencies

5. Document any persistent failures for further investigation

## Additional Resources

- [Firebase Functions Troubleshooting](https://cloud.google.com/functions/docs/troubleshooting)
- [Cloud Build Logs](https://console.cloud.google.com/cloud-build/builds;region=us-central1?project=mountainmedicine-6e572)
- [Firebase Functions Best Practices](https://firebase.google.com/docs/functions/manage-functions)