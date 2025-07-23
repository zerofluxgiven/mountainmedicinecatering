// Common allergen patterns and their variations
const ALLERGEN_PATTERNS = {
  'Dairy': {
    keywords: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'whey', 'casein', 'lactose', 'ghee', 'buttermilk', 'sour cream', 'cottage cheese', 'ricotta', 'mozzarella', 'cheddar', 'parmesan', 'feta', 'goat cheese', 'cream cheese', 'ice cream', 'half and half', 'half-and-half', 'heavy cream', 'whipping cream'],
    exclude: ['coconut milk', 'almond milk', 'soy milk', 'oat milk', 'cashew milk', 'dairy-free', 'non-dairy', 'vegan cheese', 'nutritional yeast']
  },
  'Eggs': {
    keywords: ['egg', 'eggs', 'egg white', 'egg yolk', 'albumin', 'mayonnaise', 'mayo', 'meringue', 'custard', 'hollandaise', 'aioli', 'eggnog'],
    exclude: ['eggplant', 'egg replacer', 'flax egg', 'chia egg', 'aquafaba', 'vegan mayo']
  },
  'Gluten': {
    keywords: ['wheat', 'flour', 'bread', 'pasta', 'couscous', 'bulgur', 'semolina', 'spelt', 'kamut', 'rye', 'barley', 'malt', 'brewer\'s yeast', 'seitan', 'soy sauce', 'teriyaki', 'hoisin', 'panko', 'breadcrumb', 'crouton', 'pizza', 'pie crust', 'pastry', 'cake flour', 'all-purpose flour', 'bread flour', 'whole wheat'],
    exclude: ['gluten-free', 'rice flour', 'almond flour', 'coconut flour', 'cornmeal', 'corn flour', 'buckwheat', 'quinoa', 'amaranth', 'tapioca', 'potato flour', 'chickpea flour', 'tamari', 'gluten free soy sauce']
  },
  'Tree Nuts': {
    keywords: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'brazil nut', 'macadamia', 'hazelnut', 'chestnut', 'pine nut', 'nut butter', 'nut milk', 'nut flour', 'marzipan', 'nougat', 'praline', 'nutella'],
    exclude: ['coconut', 'peanut', 'water chestnut', 'nutmeg', 'butternut', 'nut-free']
  },
  'Peanuts': {
    keywords: ['peanut', 'peanuts', 'peanut butter', 'peanut oil', 'groundnut', 'arachis oil', 'mixed nuts', 'trail mix', 'satay', 'pad thai'],
    exclude: ['tree nut', 'almond', 'cashew', 'peanut-free']
  },
  'Soy': {
    keywords: ['soy', 'soya', 'soybean', 'tofu', 'tempeh', 'miso', 'edamame', 'soy sauce', 'tamari', 'teriyaki', 'hoisin', 'soy milk', 'soy protein', 'textured vegetable protein', 'tvp', 'soy lecithin', 'soybean oil'],
    exclude: ['soy-free', 'coconut aminos']
  },
  'Fish': {
    keywords: ['fish', 'salmon', 'tuna', 'cod', 'halibut', 'tilapia', 'bass', 'trout', 'sardine', 'anchovy', 'mackerel', 'herring', 'catfish', 'snapper', 'grouper', 'mahi', 'swordfish', 'fish sauce', 'worcestershire', 'caesar dressing'],
    exclude: ['shellfish', 'vegan fish sauce', 'vegetarian worcestershire']
  },
  'Shellfish': {
    keywords: ['shrimp', 'crab', 'lobster', 'prawn', 'crayfish', 'clam', 'oyster', 'mussel', 'scallop', 'squid', 'calamari', 'octopus', 'abalone', 'crawfish', 'langostino'],
    exclude: ['fish', 'imitation crab']
  },
  'Sesame': {
    keywords: ['sesame', 'tahini', 'sesame oil', 'sesame seed', 'halvah', 'hummus', 'baba ganoush', 'gomashio'],
    exclude: ['sesame-free']
  }
};

// Common tags based on ingredient and recipe analysis
const TAG_PATTERNS = {
  // Dietary tags
  'Vegetarian': {
    exclude: ['meat', 'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'fish', 'seafood', 'bacon', 'prosciutto', 'ham', 'sausage', 'anchovy', 'gelatin', 'lard', 'tallow'],
    confidence: 0.9
  },
  'Vegan': {
    exclude: ['meat', 'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'fish', 'seafood', 'egg', 'milk', 'cheese', 'butter', 'cream', 'yogurt', 'honey', 'gelatin', 'whey', 'casein', 'lactose'],
    confidence: 0.9
  },
  'Gluten-Free': {
    exclude: ['wheat', 'flour', 'bread', 'pasta', 'couscous', 'bulgur', 'semolina', 'spelt', 'kamut', 'rye', 'barley', 'malt'],
    confidence: 0.9
  },
  'Dairy-Free': {
    exclude: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein', 'lactose', 'ghee'],
    confidence: 0.9
  },
  
  // Meal type tags
  'Breakfast': {
    keywords: ['pancake', 'waffle', 'french toast', 'oatmeal', 'porridge', 'cereal', 'granola', 'muffin', 'scone', 'bagel', 'eggs benedict', 'omelet', 'frittata', 'breakfast', 'brunch'],
    confidence: 0.8
  },
  'Dessert': {
    keywords: ['cake', 'cookie', 'brownie', 'pie', 'tart', 'pudding', 'ice cream', 'sorbet', 'mousse', 'cheesecake', 'tiramisu', 'chocolate', 'candy', 'sweet', 'dessert', 'frosting', 'icing', 'ganache'],
    confidence: 0.8
  },
  'Appetizer': {
    keywords: ['dip', 'spread', 'bruschetta', 'crostini', 'canape', 'finger food', 'starter', 'appetizer', 'small plate', 'tapas', 'mezze', 'antipasto'],
    confidence: 0.7
  },
  'Main Course': {
    keywords: ['entree', 'main dish', 'dinner', 'lunch', 'pasta', 'rice', 'curry', 'stir fry', 'roast', 'grilled', 'baked'],
    confidence: 0.7
  },
  'Side Dish': {
    keywords: ['side', 'accompaniment', 'salad', 'coleslaw', 'potato', 'vegetable', 'rice', 'pilaf', 'beans'],
    confidence: 0.7
  },
  'Soup': {
    keywords: ['soup', 'stew', 'chowder', 'bisque', 'broth', 'consomme', 'gazpacho', 'minestrone'],
    confidence: 0.9
  },
  'Salad': {
    keywords: ['salad', 'vinaigrette', 'dressing', 'lettuce', 'greens', 'coleslaw'],
    confidence: 0.9
  },
  
  // Cooking method tags
  'Baked': {
    keywords: ['bake', 'oven', 'roast', 'degrees'],
    confidence: 0.7
  },
  'Grilled': {
    keywords: ['grill', 'bbq', 'barbecue', 'char', 'flame'],
    confidence: 0.8
  },
  'No-Cook': {
    keywords: ['no cook', 'no-cook', 'raw', 'refrigerate', 'chill', 'overnight'],
    exclude: ['bake', 'cook', 'simmer', 'boil', 'fry', 'saute', 'roast'],
    confidence: 0.8
  },
  'Quick & Easy': {
    maxTotalTime: 30,
    confidence: 0.9
  },
  'Slow Cooker': {
    keywords: ['slow cooker', 'crock pot', 'crockpot'],
    confidence: 0.95
  },
  'Instant Pot': {
    keywords: ['instant pot', 'pressure cooker', 'pressure cook'],
    confidence: 0.95
  }
};

/**
 * Detects allergens in a recipe based on ingredients
 * @param {Array<string>} ingredients - Array of ingredient strings
 * @returns {Array<string>} - Array of detected allergens
 */
export function detectAllergens(ingredients) {
  if (!ingredients || !Array.isArray(ingredients)) {
    return [];
  }
  
  const detectedAllergens = new Set();
  const ingredientsText = ingredients.join(' ').toLowerCase();
  
  // Check each allergen pattern
  Object.entries(ALLERGEN_PATTERNS).forEach(([allergen, pattern]) => {
    // Check if any keywords match
    const hasAllergen = pattern.keywords.some(keyword => {
      // Create word boundary regex to avoid false matches
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(ingredientsText);
    });
    
    // Check if any exclusions match (which would negate the allergen)
    const hasExclusion = pattern.exclude.some(exclude => {
      const regex = new RegExp(`\\b${exclude}\\b`, 'i');
      return regex.test(ingredientsText);
    });
    
    if (hasAllergen && !hasExclusion) {
      detectedAllergens.add(allergen);
    }
  });
  
  return Array.from(detectedAllergens).sort();
}

/**
 * Suggests tags for a recipe based on various factors
 * @param {Object} recipe - Recipe object with name, ingredients, instructions, times
 * @returns {Array<string>} - Array of suggested tags
 */
export function suggestTags(recipe) {
  if (!recipe) {
    return [];
  }
  
  const suggestedTags = new Set();
  
  // Get all ingredients from recipe (handles both old and new format)
  let allIngredients = [];
  if (recipe.sections && Array.isArray(recipe.sections)) {
    // New format with sections
    allIngredients = recipe.sections.flatMap(section => section.ingredients || []);
  } else if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    // Old format with flat ingredients array
    allIngredients = recipe.ingredients;
  }
  
  const fullText = [
    recipe.name || '',
    ...allIngredients,
    recipe.instructions || '',
    recipe.notes || ''
  ].join(' ').toLowerCase();
  
  // Check each tag pattern
  Object.entries(TAG_PATTERNS).forEach(([tag, pattern]) => {
    let shouldAddTag = false;
    
    // Check for keyword matches
    if (pattern.keywords) {
      const hasKeyword = pattern.keywords.some(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(fullText);
      });
      if (hasKeyword) {
        shouldAddTag = true;
      }
    }
    
    // Check for exclusions (for dietary tags)
    if (pattern.exclude) {
      const hasExclusion = pattern.exclude.some(exclude => {
        const regex = new RegExp(`\\b${exclude}\\b`, 'i');
        return regex.test(fullText);
      });
      // For dietary tags, only add if NO exclusions are found
      if (!hasExclusion && tag.includes('-Free')) {
        shouldAddTag = true;
      } else if (tag === 'Vegetarian' || tag === 'Vegan') {
        shouldAddTag = !hasExclusion;
      }
    }
    
    // Check time-based tags
    if (pattern.maxTotalTime && recipe.total_time) {
      if (recipe.total_time <= pattern.maxTotalTime) {
        shouldAddTag = true;
      }
    }
    
    if (shouldAddTag) {
      suggestedTags.add(tag);
    }
  });
  
  // Remove conflicting tags
  if (suggestedTags.has('Vegan')) {
    suggestedTags.delete('Vegetarian'); // Vegan implies vegetarian
  }
  
  return Array.from(suggestedTags).sort();
}

/**
 * Analyzes a recipe and returns both allergens and suggested tags
 * @param {Object} recipe - Recipe object
 * @returns {Object} - Object with allergens and tags arrays
 */
export function analyzeRecipe(recipe) {
  // Get all ingredients from recipe (handles both old and new format)
  let allIngredients = [];
  if (recipe.sections && Array.isArray(recipe.sections)) {
    // New format with sections
    allIngredients = recipe.sections.flatMap(section => section.ingredients || []);
  } else if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    // Old format with flat ingredients array
    allIngredients = recipe.ingredients;
  }
  
  const allergens = detectAllergens(allIngredients);
  const tags = suggestTags(recipe);
  
  return {
    allergens,
    tags
  };
}