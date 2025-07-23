# AI Integration Test Instructions

## 🚀 Quick Start Testing Guide

The app is now running at http://localhost:3000. Follow these steps to test the AI integration:

### 1. Browser Test Script (Automated)

1. Open http://localhost:3000 in your browser
2. Log in to the app
3. Open Developer Console (F12 → Console tab)
4. Copy and run this complete test script:

```javascript
// Fixed AI Integration Test - Copy this entire block
console.log('%c🧪 AI Integration Test (Fixed)', 'font-size: 20px; color: #4CAF50; font-weight: bold;');

// Quick Firebase test
if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
  console.log('✅ Logged in as:', firebase.auth().currentUser.email);
  
  // Test Firestore
  firebase.firestore().collection('events').limit(1).get().then(snap => {
    console.log('✅ Firestore working:', snap.size, 'event(s) found');
  });
  
  // Test AI Chat
  firebase.auth().currentUser.getIdToken().then(token => {
    console.log('   Testing AI Chat...');
    return fetch('https://us-central1-mountainmedicine-6e572.cloudfunctions.net/askAIHttp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: "Tell me a quick joke about cooking",
        context: { type: 'test' }
      })
    });
  }).then(r => r.json()).then(data => {
    if (data.response) {
      console.log('✅ AI Chat working:', data.response.substring(0, 80) + '...');
    } else {
      console.error('❌ AI Chat error:', data);
    }
    console.log('\n📋 Now test manually:');
    console.log('1. Click AI chat bubble (bottom right)');
    console.log('2. Import a recipe with multiple sections');
    console.log('3. Create menu with allergen conflicts');
  }).catch(e => console.error('❌ AI test failed:', e));
} else {
  console.error('❌ Not logged in! Please log in first.');
}
```

### 2. Manual Testing Checklist

After running the automated tests, perform these manual checks:

#### AI Chat Testing
1. **Open AI Chat**
   - Click the purple "AI" bubble in bottom right
   - Verify chat window opens smoothly
   - Check welcome message shows Claude's personality

2. **Test Conversations**
   - Send: "What's the best way to scale a recipe for 100 people?"
   - Send: "Tell me about any allergen concerns for the current event"
   - Verify responses are contextual and witty

#### Recipe Parsing Testing
1. **Navigate to Recipes → Import Recipe**

2. **Test Multi-Section Recipe** (Critical Test)
   Create a text file with:
   ```
   Cowboy Caviar
   
   Cowboy Caviar Ingredients:
   • 1 can black beans
   • 1 can corn
   • 1 red onion, diced
   • 2 bell peppers, diced
   
   Zesty Dressing Ingredients:
   • 1/4 cup olive oil
   • 1/4 cup vinegar
   • 1 tsp chili powder
   
   Instructions:
   1. Mix all salsa ingredients
   2. Whisk dressing ingredients
   3. Combine and chill for 2 hours
   ```
   
   **Expected Results:**
   - ✅ Two sections detected: "Cowboy Caviar" and "Zesty Dressing"
   - ✅ ALL 3 instructions captured
   - ✅ Ingredients properly distributed to sections

3. **Test URL Import**
   - Try a recipe from any cooking website
   - Verify all instructions are captured

#### AI Safety Monitoring Testing
1. **Create Safety Trigger**
   - Go to an event with guest allergens (e.g., gluten, dairy)
   - Add a menu with recipes containing those allergens
   - Within 30 seconds, AI chat should pop up with safety question
   - Answer the question and verify it's logged

#### Image Upload Testing
1. **Recipe Image**
   - Take/use a photo of a recipe
   - Upload via Import Recipe
   - Verify text is extracted and parsed

2. **Event Flyer**
   - Use an event flyer image
   - Upload when creating event
   - Verify details are extracted

### 3. Performance Benchmarks

| Feature | Target | Pass/Fail |
|---------|--------|-----------|
| AI Chat Response | < 5 seconds | |
| Recipe Parse (Text) | < 15 seconds | |
| Recipe Parse (Image) | < 15 seconds | |
| Safety Trigger | < 30 seconds | |
| Page Load | < 2 seconds | |

### 4. Known Issues & Fixes Applied

#### ✅ Fixed Issues:
1. **CORS Error on AI Functions**
   - Fixed by using HTTP endpoint with explicit CORS headers
   - Frontend now uses askAIHttp instead of callable function

2. **Recipe Parsing Missing Instructions**
   - Fixed by enhancing section detection algorithm
   - Now properly detects headers like "Ingredients:", "Dressing:", etc.
   - All instructions are captured

3. **Firebase Storage Permissions**
   - Fixed by updating rules to allow any authenticated user
   - Image uploads should work for all logged-in users

#### ⚠️ Minor Issues Remaining:
1. Some ESLint warnings (not affecting functionality)
2. React hooks dependency warnings

### 5. Debugging Tips

If tests fail, check:

1. **Console Errors**
   ```javascript
   // Check authentication
   firebase.auth().currentUser
   
   // Check for any red errors in console
   ```

2. **Network Tab**
   - Look for failed requests (red)
   - Check response times
   - Verify correct endpoints

3. **Firebase Console**
   - Check Functions logs for errors
   - Verify API keys are set:
     - anthropic.key (for Claude)
     - openai.key (for recipe parsing)

### 6. Quick Test Summary

Run this in console for a quick health check:
```javascript
// Quick health check
console.log('Auth:', !!firebase.auth().currentUser);
console.log('App loaded:', !!window.React);
console.log('Firebase connected:', !!window.firebase);
```

## Next Steps

1. Complete all manual tests
2. Document any new issues found
3. Update AI_TEST_RESULTS.md with findings
4. If all tests pass, proceed with deployment per DEPLOYMENT_AI_FEATURES.md

Happy Testing! 🚀