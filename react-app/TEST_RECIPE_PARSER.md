# Testing Recipe Parser

## Quick Test
Open your browser console on the deployed app (while logged in) and run:

```javascript
// Test with a simple recipe URL
const testUrl = "https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/";

// Get Firebase functions
const { getFunctions, httpsCallable } = await import('firebase/functions');
const parseRecipe = httpsCallable(getFunctions(), 'parseRecipe');

try {
  console.log('Testing recipe parser...');
  const result = await parseRecipe({
    url: testUrl,
    type: 'url'
  });
  console.log('Success! Parsed recipe:', result.data.recipe);
} catch (error) {
  console.error('Error:', error.message);
  console.error('Details:', error);
}
```

## What to Check

1. **If you get "Recipe parsing service is not properly configured"**
   - The OpenAI API key is missing or invalid
   - Run: `firebase functions:config:set openai.key="YOUR_API_KEY"`
   - Then redeploy: `firebase deploy --only functions:parseRecipe`

2. **If you get "Failed to parse recipe with AI: 401"**
   - Your OpenAI API key is invalid or expired
   - Get a new key from https://platform.openai.com/api-keys

3. **If you get "Failed to parse recipe with AI: 429"**
   - Rate limit exceeded or no credits
   - Check your OpenAI account billing

4. **If it works**
   - You should see the parsed recipe data with name, ingredients, instructions, etc.

## Update Your API Key

1. Get your API key from OpenAI:
   - Go to https://platform.openai.com/api-keys
   - Create a new key
   - Make sure you have billing set up

2. Set it in Firebase:
   ```bash
   firebase functions:config:set openai.key="sk-proj-YOUR_ACTUAL_KEY"
   ```

3. Redeploy:
   ```bash
   firebase deploy --only functions:parseRecipe
   ```

## Test with Simple Text
If URL parsing fails, test with simple text:

```javascript
const result = await parseRecipe({
  text: 'Chocolate Cake\nServes: 8\nIngredients:\n- 2 cups flour\n- 1 cup sugar\nInstructions:\nMix and bake at 350F for 30 minutes.',
  type: 'text'
});
console.log('Result:', result.data.recipe);
```