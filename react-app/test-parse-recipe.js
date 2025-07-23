// Test script to verify parseRecipe Firebase function
const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBNJJZUlGqDekO6xqpL7v_iAZNkZBqAMds",
  authDomain: "mountainmedicine-6e572.firebaseapp.com",
  projectId: "mountainmedicine-6e572",
  storageBucket: "mountainmedicine-6e572.appspot.com",
  messagingSenderId: "691887351097",
  appId: "1:691887351097:web:f5b7a97bb48e77d8c14e9b",
  measurementId: "G-2KTLM7LBL5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
const auth = getAuth(app);

async function testParseRecipe() {
  try {
    // First, we need to authenticate (you'll need to use a test account)
    console.log('Please run this test with a valid user account...');
    
    // Test URL parsing
    const parseRecipe = httpsCallable(functions, 'parseRecipe');
    
    console.log('Testing parseRecipe function with a simple text...');
    const result = await parseRecipe({
      text: `Chocolate Chip Cookies
      
      Serves: 24 cookies
      
      Ingredients:
      - 2 cups all-purpose flour
      - 1 tsp baking soda
      - 1 tsp salt
      - 1 cup butter, softened
      - 3/4 cup granulated sugar
      - 3/4 cup brown sugar
      - 2 large eggs
      - 2 tsp vanilla extract
      - 2 cups chocolate chips
      
      Instructions:
      1. Preheat oven to 375°F.
      2. Mix flour, baking soda, and salt in a bowl.
      3. In another bowl, cream butter and sugars until fluffy.
      4. Beat in eggs and vanilla.
      5. Gradually blend in flour mixture.
      6. Stir in chocolate chips.
      7. Drop by spoonfuls onto ungreased cookie sheets.
      8. Bake 9-11 minutes or until golden brown.
      
      Prep time: 15 minutes
      Cook time: 10 minutes`,
      type: 'text'
    });
    
    console.log('Success! Parsed recipe:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('Error testing parseRecipe:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    if (error.details) {
      console.error('Error details:', error.details);
    }
  }
}

// Note: To run this test, you need to be authenticated
console.log(`
To test the parseRecipe function:
1. Make sure you're authenticated in the React app
2. Open the browser console
3. Run the parseRecipe function from there using the app's auth context
`);

// Export for use in browser console if needed
if (typeof window !== 'undefined') {
  window.testParseRecipe = testParseRecipe;
}