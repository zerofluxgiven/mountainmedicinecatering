/**
 * Test script for multi-section recipe parsing
 * Tests the Almond Cherry Streusel Bars recipe from screenshots
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Import the parser
const { parseRecipeFromFile } = require('./functions/recipes/parser');
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || require('./functions/.env').OPENAI_API_KEY
});

async function testRecipeParsing() {
  console.log('Testing multi-section recipe parsing...\n');
  
  try {
    // Test 1: Parse the first page (main recipe)
    console.log('TEST 1: Parsing IMG_2167 2.jpeg (Page 1 - Recipe)');
    console.log('='*50);
    
    const imagePath1 = path.join(__dirname, 'screenshots', 'IMG_2167 2.jpeg');
    const imageBuffer1 = fs.readFileSync(imagePath1);
    
    const result1 = await parseRecipeFromFile(imageBuffer1, 'image/jpeg', openai);
    
    console.log('Recipe Name:', result1.name);
    console.log('Serves:', result1.serves);
    console.log('Number of Sections:', result1.sections ? result1.sections.length : 0);
    
    if (result1.sections) {
      result1.sections.forEach((section, index) => {
        console.log(`\nSection ${index + 1}: ${section.label}`);
        console.log('Ingredients:', section.ingredients.length);
        section.ingredients.forEach(ing => console.log(`  - ${ing}`));
      });
    } else {
      console.log('\nNo sections detected - Regular ingredient list:');
      console.log('Total Ingredients:', result1.ingredients?.length || 0);
    }
    
    // Test 2: Parse the second page (instructions)
    console.log('\n\nTEST 2: Parsing IMG_2168.jpeg (Page 2 - Instructions)');
    console.log('='*50);
    
    const imagePath2 = path.join(__dirname, 'screenshots', 'IMG_2168.jpeg');
    const imageBuffer2 = fs.readFileSync(imagePath2);
    
    const result2 = await parseRecipeFromFile(imageBuffer2, 'image/jpeg', openai);
    
    console.log('Instructions found:', !!result2.instructions);
    if (result2.instructions) {
      console.log('Instructions preview:', result2.instructions.substring(0, 200) + '...');
    }
    
    // Verify expected sections
    console.log('\n\nVERIFICATION:');
    console.log('='*50);
    
    const expectedSections = ['Almond Shortbread', 'Cherry Filling', 'Streusel'];
    if (result1.sections) {
      expectedSections.forEach(expected => {
        const found = result1.sections.some(s => 
          s.label.toLowerCase().includes(expected.toLowerCase())
        );
        console.log(`${expected}: ${found ? '✓ FOUND' : '✗ MISSING'}`);
      });
    }
    
    // Check for proper ingredient parsing
    console.log('\nIngredient Quality Check:');
    const sampleIngredients = result1.ingredients || [];
    const hasQuantities = sampleIngredients.some(ing => 
      /\d+|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞/.test(ing)
    );
    const hasUnits = sampleIngredients.some(ing => 
      /cup|tablespoon|teaspoon|tbsp|tsp|oz|pound|lb/i.test(ing)
    );
    
    console.log(`Has quantities: ${hasQuantities ? '✓' : '✗'}`);
    console.log(`Has units: ${hasUnits ? '✓' : '✗'}`);
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testRecipeParsing().then(() => {
  console.log('\nTest completed');
  process.exit(0);
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});