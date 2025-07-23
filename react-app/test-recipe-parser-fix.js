const admin = require('firebase-admin');
const { parseRecipeFromURL } = require('./functions/recipes/parser');
const OpenAI = require('openai');

// Test recipe parser with Cowboy Caviar URL
async function testRecipeParser() {
  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || require('./functions/config.json').openai.key
    });
    
    // Test URL from user's example
    const testUrl = 'https://damndelicious.net/2014/05/01/cowboy-caviar/';
    
    console.log('\n🔍 Testing recipe parser with Cowboy Caviar recipe...\n');
    
    const parsedRecipe = await parseRecipeFromURL(testUrl, openai);
    
    console.log('✅ Recipe parsed successfully!\n');
    console.log('📋 Recipe Name:', parsedRecipe.name);
    console.log('🍽️  Serves:', parsedRecipe.serves);
    
    if (parsedRecipe.sections) {
      console.log('\n📑 Sections found:', parsedRecipe.sections.length);
      parsedRecipe.sections.forEach((section, index) => {
        console.log(`\n  Section ${index + 1}: ${section.label}`);
        console.log(`  Ingredients: ${section.ingredients.length} items`);
        if (section.ingredients.length > 0) {
          console.log(`  First ingredient: ${section.ingredients[0]}`);
        }
      });
    } else {
      console.log('\n📋 Ingredients:', parsedRecipe.ingredients?.length || 0);
      if (parsedRecipe.ingredients?.length > 0) {
        console.log('First 3 ingredients:');
        parsedRecipe.ingredients.slice(0, 3).forEach(ing => {
          console.log(`  - ${ing}`);
        });
      }
    }
    
    console.log('\n📝 Instructions:');
    if (parsedRecipe.instructions) {
      console.log(parsedRecipe.instructions.substring(0, 200) + '...');
      console.log(`Total instructions length: ${parsedRecipe.instructions.length} characters`);
    } else {
      console.log('❌ No instructions found!');
    }
    
    console.log('\n🏷️  Tags:', parsedRecipe.tags?.join(', ') || 'None');
    console.log('⚠️  Allergens:', parsedRecipe.allergens?.join(', ') || 'None');
    
  } catch (error) {
    console.error('❌ Error testing recipe parser:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testRecipeParser();