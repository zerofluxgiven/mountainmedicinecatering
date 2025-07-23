# Deployment Guide: AI Features

## Overview
This guide covers deploying the new AI features including diet management, AI monitoring, chat interface, and history tracking.

## Pre-Deployment Checklist

### 1. Code Review
- [ ] All changes committed to git
- [ ] Code reviewed for security issues
- [ ] No hardcoded credentials or API keys
- [ ] Console.log statements removed

### 2. Dependencies
Ensure all new dependencies are installed:
```bash
npm install
```

### 3. Environment Variables
Verify `.env.local` contains:
```
REACT_APP_OPENAI_API_KEY=your_openai_api_key
```

### 4. Firebase Configuration
No new Firebase configuration needed - uses existing Firestore collections.

## Deployment Steps

### Option 1: Firebase Hosting (Recommended)

1. **Build the React app:**
   ```bash
   cd react-app
   npm run build
   ```

2. **Deploy to Firebase:**
   ```bash
   firebase deploy --only hosting
   ```

3. **Verify deployment:**
   - Visit your Firebase hosting URL
   - Check all new features are accessible

### Option 2: Manual Server Deployment

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Copy build files to server:**
   ```bash
   scp -r build/* user@server:/path/to/web/root
   ```

3. **Set up nginx/Apache to serve the build folder**

## Post-Deployment Testing

### 1. Quick Smoke Tests

**Test AI Chat Interface:**
1. Navigate to any event page
2. Click the purple chat bubble in bottom right
3. If there are pending questions, they should appear
4. Try answering a question
5. Verify the chat minimizes/maximizes properly

**Test Diet Management:**
1. Go to Events → Select an event → Allergies/Diet tab
2. Click "Manage Allergies/Diets"
3. Add a new special diet:
   - Guest Name: "Test Guest"
   - Diet Type: "Vegan"
   - Click "Add Diet"
4. Verify it appears in the list

**Test AI History:**
1. Click "AI History" in the main navigation
2. Verify the page loads
3. Check filters work (Type dropdown, Event dropdown)
4. Look for any answered questions from testing

**Test Recipe Diet Integration:**
1. Go to Recipes → Edit any recipe
2. Scroll to "Tags & Categories"
3. Verify "Dietary Types" section appears
4. Select some diet types and save

### 2. AI Monitoring Service Test

1. **Create a conflict scenario:**
   - Add a guest with "Dairy" allergy to an event
   - Create/edit a recipe with "Dairy" in ingredients
   - Add that recipe to the event's menu
   - Within 30 seconds, the AI chat should pop up with a question about the conflict

2. **Verify real-time updates:**
   - Keep the AI History page open
   - Perform the conflict scenario above
   - The history page should update in real-time

### 3. Performance Checks

- [ ] Pages load within 3 seconds
- [ ] AI chat responds within 2 seconds
- [ ] No console errors in browser
- [ ] Mobile responsive (test on phone/tablet)

## Monitoring After Deployment

### 1. Check Firebase Console
- Monitor Firestore usage for new collections:
  - `ai_questions`
  - `ai_interactions`
  - `events/{eventId}/diets`
- Check for any security rule violations

### 2. Error Monitoring
Watch for:
- Failed AI API calls (OpenAI rate limits)
- Firestore permission errors
- JavaScript errors in browser console

### 3. User Feedback
Monitor for:
- AI chat not appearing
- Questions not being generated
- Slow response times
- Mobile layout issues

## Rollback Plan

If issues arise:

1. **Quick Rollback:**
   ```bash
   # Revert to previous deployment
   firebase hosting:rollback
   ```

2. **Manual Rollback:**
   - Keep a backup of the previous build
   - Replace current build with backup
   - Clear browser caches

## Feature Flags (Optional)

To deploy safely, you could add feature flags:

```javascript
// In App.jsx or a config file
const FEATURES = {
  AI_CHAT: process.env.REACT_APP_AI_CHAT_ENABLED === 'true',
  AI_HISTORY: process.env.REACT_APP_AI_HISTORY_ENABLED === 'true',
  DIET_MANAGEMENT: process.env.REACT_APP_DIET_MANAGEMENT_ENABLED === 'true'
};
```

Then conditionally render features based on flags.

## Troubleshooting

### AI Chat Not Appearing
1. Check browser console for errors
2. Verify AIChat component is imported in EventViewer
3. Check if AI monitoring service is initializing

### AI Questions Not Generating
1. Verify OpenAI API key is set
2. Check network tab for failed API calls
3. Look for rate limiting errors
4. Check Firestore permissions

### Diet Management Not Saving
1. Check Firestore rules allow subcollection writes
2. Verify user has proper role (user/admin)
3. Check for validation errors

### Performance Issues
1. Check if AI monitoring is creating too many listeners
2. Verify proper cleanup in useEffect hooks
3. Monitor Firestore read/write counts

## Security Considerations

1. **API Keys:**
   - OpenAI key should only be in backend/Cloud Functions
   - Never expose in client-side code

2. **Firestore Rules:**
   - Ensure proper authentication checks
   - Validate data structure
   - Rate limit writes if needed

3. **Input Validation:**
   - Sanitize all user inputs
   - Prevent XSS in chat messages
   - Validate diet/allergy data

## Next Steps

After successful deployment:

1. Monitor usage for 24-48 hours
2. Gather user feedback
3. Plan any necessary optimizations
4. Document any issues for future reference

## Contact

For deployment issues:
- Check Firebase Console logs
- Review browser console errors
- Test in incognito mode to rule out cache issues