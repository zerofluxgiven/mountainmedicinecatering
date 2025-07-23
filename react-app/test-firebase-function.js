const admin = require('firebase-admin');
const { getFunctions, httpsCallable } = require('firebase/functions');
const { initializeApp } = require('firebase/app');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyByqBZnJMeBo9CjNn111hRYWo34ipRIOwM",
  authDomain: "mountainmedicine-6e572.firebaseapp.com",
  projectId: "mountainmedicine-6e572",
  storageBucket: "mountainmedicine-6e572.appspot.com",
  messagingSenderId: "231180799717",
  appId: "1:231180799717:web:fa4d2b631e529e54173c8f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// Test the parseRecipe function
async function testParseRecipe() {
  console.log('Testing parseRecipe function...');
  
  const parseRecipe = httpsCallable(functions, 'parseRecipe');
  
  try {
    // Test with a simple text recipe
    const result = await parseRecipe({
      text: 'Chocolate Chip Cookies\nServes: 24\nIngredients:\n- 2 cups flour\n- 1 cup sugar\n- 1 cup chocolate chips\nInstructions:\n1. Mix ingredients\n2. Bake at 350F for 12 minutes',
      type: 'text'
    });
    
    console.log('Success! Result:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('Error calling function:', error.code, error.message);
    console.error('Full error:', error);
  }
}

// Run test
testParseRecipe();