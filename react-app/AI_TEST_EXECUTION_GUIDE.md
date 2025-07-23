# AI Integration Test Execution Guide

## Overview
This guide explains how to test the AI integration features in Mountain Medicine Kitchen. We have three testing approaches available.

## Testing Options

### 1. 🖥️ Browser Console Test (Quickest)
**Best for**: Quick smoke testing, verifying basic functionality

1. Open Mountain Medicine Kitchen in your browser
2. Log in to your account
3. Open DevTools Console (F12 or right-click → Inspect → Console)
4. Copy the entire contents of `browser-ai-test.js`
5. Paste into console and press Enter
6. Watch the automated tests run

**What it tests**:
- Firebase connection
- AI chat service (Claude API)
- Recipe parsing
- AI monitoring service
- AI history

### 2. 📋 Manual Testing Checklist
**Best for**: Thorough testing, UI/UX validation, finding edge cases

1. Open `AI_MANUAL_TEST_CHECKLIST.md`
2. Print or have it open on another screen
3. Go through each section systematically
4. Check off items as you complete them
5. Document any issues found

**Key areas**:
- AI chat interactions
- Recipe parsing (text, image, URL)
- Event parsing
- Safety monitoring triggers
- Real-time updates
- Mobile responsiveness

### 3. 🔧 Node.js Test Script
**Best for**: Automated regression testing, CI/CD integration

1. Set up environment variables:
   ```bash
   cp .env.example .env.test
   # Edit .env.test with your Firebase config
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the test script:
   ```bash
   node test-ai-integration.js
   ```

**Note**: Requires test user credentials and may create test data in your database.

## Key Test Scenarios

### 1. AI Chat Testing
- Send various queries about recipes, events, and menus
- Test context awareness (knows current page/event)
- Verify Claude's witty personality comes through
- Check error handling for network issues

### 2. Recipe Parsing
- **Text**: Multi-section recipes (e.g., Cowboy Caviar)
- **Images**: Photos of recipe cards or cookbook pages
- **URLs**: Various recipe websites
- **PDFs**: Recipe documents

**Critical**: Verify ALL instructions are captured and sections are properly detected.

### 3. Event Parsing
- Text files with event details
- Event flyer images
- Various date/time formats
- Multiple day events

### 4. Safety Monitoring
Create scenarios that trigger AI monitoring:
1. Add recipe with allergens to a menu where guests have those allergies
2. Update guest allergen data after menu is created
3. Create accommodation menus

**Expected**: AI chat should pop up within 30 seconds with safety questions.

## Success Criteria

### ✅ All Tests Pass When:
1. **AI Chat**: Responds within 5 seconds with contextual, personality-driven responses
2. **Recipe Parser**: Correctly identifies sections and captures complete instructions
3. **Event Parser**: Extracts all key fields (date, time, venue, guest count)
4. **Safety Monitoring**: Triggers within 30 seconds of conflicts
5. **History**: Shows all interactions with correct timestamps
6. **Performance**: No operations take longer than 15 seconds
7. **Mobile**: All features work on mobile devices

### ⚠️ Common Issues to Watch For:
- CORS errors (usually fixed by using HTTP endpoints)
- Missing API keys (check Firebase Functions config)
- Parsing missing instructions (check AI prompts)
- Safety triggers not firing (check Firebase Function logs)
- Real-time updates lagging (check Firestore listeners)

## Debugging Tips

### Check Console for Errors
```javascript
// In browser console
console.log(window.firebase); // Should exist
console.log(firebase.auth().currentUser); // Should show user
```

### Check Network Tab
- Look for failed API calls
- Check response times
- Verify correct endpoints are called

### Firebase Console
1. Check Functions logs for errors
2. Verify Firestore data is being created
3. Check Firebase Auth for user issues

## Test Data Cleanup

After testing, clean up test data:

### In Firestore:
1. Delete test events
2. Remove test menus
3. Clear test AI interactions
4. Remove test recipes

### Using Firebase Console:
1. Go to Firestore Database
2. Find collections: events, menus, ai_interactions, recipes
3. Delete documents with "Test" in the name

## Reporting Issues

When reporting issues, include:
1. **What you did**: Exact steps
2. **What happened**: Actual result
3. **What should happen**: Expected result
4. **Console errors**: Any errors from DevTools
5. **Screenshots**: If UI-related
6. **Browser/Device**: Chrome/Firefox/Safari, Desktop/Mobile

## Next Steps

After testing:
1. Document all issues found
2. Prioritize critical vs minor issues
3. Create GitHub issues for bugs
4. Update test cases for new scenarios
5. Plan fixes and retesting

Remember: The goal is to ensure the AI features enhance the user experience and maintain food safety standards!