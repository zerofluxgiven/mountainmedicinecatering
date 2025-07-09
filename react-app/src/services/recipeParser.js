// Recipe parsing service using AI
// In a production app, this would call Firebase Functions or an API endpoint

const MOCK_DELAY = 1500; // Simulate API delay

// Mock parser for development
// In production, this would call the actual AI parsing API
async function mockParseRecipe(text) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  
  // Extract recipe name (look for common patterns)
  let name = 'Imported Recipe';
  const nameMatch = text.match(/^(.+?)[\n\r]/);
  if (nameMatch) {
    name = nameMatch[1].trim();
  }
  
  // Extract serving size
  let serves = 4;
  const servingMatch = text.match(/(?:serves?|servings?|yield)\s*:?\s*(\d+)/i);
  if (servingMatch) {
    serves = parseInt(servingMatch[1]);
  }
  
  // Extract ingredients (look for bullet points or numbered lists)
  const ingredients = [];
  const ingredientSection = text.match(/ingredients?:?([\s\S]*?)(?:instructions?|directions?|method|steps?:|$)/i);
  if (ingredientSection) {
    const lines = ingredientSection[1].split('\n');
    lines.forEach(line => {
      const cleaned = line.trim().replace(/^[-•*\d.)\s]+/, '');
      if (cleaned && cleaned.length > 3) {
        ingredients.push(cleaned);
      }
    });
  }
  
  // Extract instructions
  let instructions = '';
  const instructionSection = text.match(/(?:instructions?|directions?|method|steps?):?([\s\S]*?)$/i);
  if (instructionSection) {
    instructions = instructionSection[1].trim();
  }
  
  // Extract times
  let prep_time = null;
  let cook_time = null;
  const prepMatch = text.match(/prep(?:aration)?\s*time\s*:?\s*(\d+)\s*(?:min|minute)/i);
  if (prepMatch) {
    prep_time = parseInt(prepMatch[1]);
  }
  const cookMatch = text.match(/cook(?:ing)?\s*time\s*:?\s*(\d+)\s*(?:min|minute)/i);
  if (cookMatch) {
    cook_time = parseInt(cookMatch[1]);
  }
  
  // Basic allergen detection
  const allergens = [];
  const allergenKeywords = {
    'Dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt'],
    'Eggs': ['egg', 'eggs'],
    'Gluten': ['flour', 'bread', 'pasta', 'wheat'],
    'Nuts': ['almond', 'walnut', 'pecan', 'cashew', 'pistachio'],
    'Soy': ['soy', 'tofu', 'tempeh']
  };
  
  const textLower = text.toLowerCase();
  Object.entries(allergenKeywords).forEach(([allergen, keywords]) => {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      allergens.push(allergen);
    }
  });
  
  return {
    name,
    serves,
    prep_time,
    cook_time,
    ingredients: ingredients.filter(Boolean),
    instructions,
    allergens: [...new Set(allergens)],
    tags: []
  };
}

export async function parseRecipeFromFile(file) {
  // Read file content
  const text = await readFileAsText(file);
  
  // In production, this would send the file to Firebase Storage
  // and call a Cloud Function to parse it with AI
  return mockParseRecipe(text);
}

export async function parseRecipeFromURL(url) {
  // In production, this would call a Cloud Function that:
  // 1. Fetches the URL content
  // 2. Extracts text/structured data
  // 3. Uses AI to parse recipe
  
  // For now, return a mock response
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  
  return {
    name: 'Recipe from ' + new URL(url).hostname,
    serves: 4,
    prep_time: 15,
    cook_time: 30,
    ingredients: [
      '2 cups all-purpose flour',
      '1 cup sugar',
      '3 eggs',
      '1/2 cup butter, melted',
      '1 tsp vanilla extract',
      '2 tsp baking powder',
      '1/2 tsp salt'
    ],
    instructions: `1. Preheat oven to 350°F (175°C).
2. Mix dry ingredients in a large bowl.
3. In another bowl, beat eggs and add melted butter and vanilla.
4. Combine wet and dry ingredients until just mixed.
5. Pour into prepared pan and bake for 25-30 minutes.
6. Cool before serving.`,
    allergens: ['Dairy', 'Eggs', 'Gluten'],
    tags: ['Baking', 'Dessert']
  };
}

// Helper function to read file as text
async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    
    reader.onerror = (e) => {
      reject(new Error('Failed to read file'));
    };
    
    // Handle different file types
    if (file.type.includes('image')) {
      // In production, would use OCR service
      resolve('Mock text from image file');
    } else {
      reader.readAsText(file);
    }
  });
}