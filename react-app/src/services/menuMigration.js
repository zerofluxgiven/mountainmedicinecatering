// Menu structure migration utilities
// Handles migration from old 'sections' structure to new 'meals' structure

/**
 * Migrate menu from old sections structure to new meals structure
 * @param {Object} menuData - Menu data that may have old or new structure
 * @returns {Object} Menu data with consistent meals structure
 */
export function migrateMenuStructure(menuData) {
  // If already has meals, ensure it's properly structured
  if (menuData.meals && Array.isArray(menuData.meals)) {
    return {
      ...menuData,
      meals: menuData.meals.map(ensureMealStructure)
    };
  }
  
  // If has sections, migrate to meals
  if (menuData.sections && Array.isArray(menuData.sections)) {
    return {
      ...menuData,
      meals: menuData.sections.map(sectionToMeal),
      sections: undefined // Remove old structure
    };
  }
  
  // If neither, initialize with empty meals
  return {
    ...menuData,
    meals: []
  };
}

/**
 * Convert old section structure to new meal structure
 * @param {Object} section - Old section object
 * @returns {Object} New meal object
 */
function sectionToMeal(section) {
  return {
    id: section.id || `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: inferMealType(section.name),
    description: section.description || '',
    instructions: section.instructions || '',
    notes: section.notes || '',
    recipes: (section.items || section.recipes || []).map(item => ({
      id: item.id || `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recipe_id: item.recipe_id || item.id,
      servings: item.servings || item.serves || 0,
      notes: item.notes || ''
    }))
  };
}

/**
 * Ensure meal has all required fields
 * @param {Object} meal - Meal object
 * @returns {Object} Complete meal object
 */
function ensureMealStructure(meal) {
  return {
    id: meal.id || `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: meal.type || 'dinner',
    description: meal.description || '',
    instructions: meal.instructions || '',
    notes: meal.notes || '',
    recipes: (meal.recipes || []).map(recipe => ({
      id: recipe.id || `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recipe_id: recipe.recipe_id || recipe.id,
      servings: recipe.servings || recipe.serves || 0,
      notes: recipe.notes || ''
    }))
  };
}

/**
 * Infer meal type from section name
 * @param {string} sectionName - Name of the section
 * @returns {string} Meal type
 */
function inferMealType(sectionName) {
  if (!sectionName) return 'dinner';
  
  const name = sectionName.toLowerCase();
  
  if (name.includes('breakfast') || name.includes('brunch')) return 'breakfast';
  if (name.includes('lunch')) return 'lunch';
  if (name.includes('dinner') || name.includes('supper')) return 'dinner';
  if (name.includes('appetizer') || name.includes('starter')) return 'appetizer';
  if (name.includes('dessert') || name.includes('sweet')) return 'dessert';
  if (name.includes('snack')) return 'snack';
  if (name.includes('beverage') || name.includes('drink')) return 'beverage';
  if (name.includes('cocktail')) return 'cocktail';
  if (name.includes('ceremony')) return 'ceremony';
  
  return 'dinner'; // Default
}

/**
 * Validate menu structure
 * @param {Object} menuData - Menu data to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateMenuStructure(menuData) {
  const errors = [];
  
  if (!menuData.name || menuData.name.trim().length === 0) {
    errors.push('Menu name is required');
  }
  
  if (!Array.isArray(menuData.meals)) {
    errors.push('Meals must be an array');
  } else {
    menuData.meals.forEach((meal, index) => {
      if (!meal.id) {
        errors.push(`Meal at index ${index} is missing an ID`);
      }
      if (!meal.type) {
        errors.push(`Meal at index ${index} is missing a type`);
      }
      if (!Array.isArray(meal.recipes)) {
        errors.push(`Meal at index ${index} has invalid recipes array`);
      } else {
        meal.recipes.forEach((recipe, recipeIndex) => {
          if (!recipe.recipe_id) {
            errors.push(`Recipe at index ${recipeIndex} in meal ${meal.id || index} is missing recipe_id`);
          }
        });
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get all recipe IDs from a menu
 * @param {Object} menuData - Menu data
 * @returns {string[]} Array of unique recipe IDs
 */
export function getRecipeIdsFromMenu(menuData) {
  const recipeIds = new Set();
  
  if (menuData.meals && Array.isArray(menuData.meals)) {
    menuData.meals.forEach(meal => {
      if (meal.recipes && Array.isArray(meal.recipes)) {
        meal.recipes.forEach(recipe => {
          if (recipe.recipe_id) {
            recipeIds.add(recipe.recipe_id);
          }
        });
      }
    });
  }
  
  return Array.from(recipeIds);
}

/**
 * Calculate total servings for a menu
 * @param {Object} menuData - Menu data
 * @returns {number} Total servings across all meals
 */
export function calculateTotalServings(menuData) {
  let total = 0;
  
  if (menuData.meals && Array.isArray(menuData.meals)) {
    menuData.meals.forEach(meal => {
      if (meal.recipes && Array.isArray(meal.recipes)) {
        meal.recipes.forEach(recipe => {
          total += recipe.servings || 0;
        });
      }
    });
  }
  
  return total;
}