# Firebase Deployment Tips

## Handling Deployment Timeouts

The Firebase CLI has a 2-minute default timeout, but deployments often continue in the background. Here's how to handle this:

### 1. Set Longer Timeout
```bash
# Increase timeout to 5 minutes
export FUNCTIONS_DISCOVERY_TIMEOUT=300
firebase deploy --only functions
```

### 2. Deploy Specific Functions
```bash
# Deploy only what changed
firebase deploy --only functions:askAIHttp
firebase deploy --only functions:parseRecipe
```

### 3. Check Status After Timeout
```bash
# List all deployed functions
firebase functions:list

# Check specific function
firebase functions:list | grep askAI

# View deployment logs
firebase functions:log
```

### 4. Separate Deployments
```bash
# Deploy hosting and functions separately
firebase deploy --only hosting
firebase deploy --only functions

# Or deploy in batches
firebase deploy --only functions:askAI,functions:askAIHttp
firebase deploy --only functions:parseRecipe,functions:parseEventFlyer
```

### 5. Monitor in Console
Check deployment status at: https://console.cloud.google.com/functions

## Quick Commands

```bash
# For future deployments, use:
export FUNCTIONS_DISCOVERY_TIMEOUT=300 && firebase deploy --only functions:askAIHttp

# Or deploy everything with longer timeout:
export FUNCTIONS_DISCOVERY_TIMEOUT=300 && firebase deploy
```

## Remember
- Timeouts are usually just the CLI, not actual deployment failure
- Deployments often succeed in the background
- Always check with `firebase functions:list` after timeout