// Allergen management service
// Centralizes allergen tracking and aggregation across events, menus, and recipes

import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  query, 
  orderBy,
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Standard allergen list used across the application
 * DEPRECATED - Use ALLERGEN_HIERARCHY instead
 */
export const STANDARD_ALLERGENS = [
  'Dairy',
  'Eggs',
  'Fish',
  'Shellfish',
  'Tree Nuts',
  'Peanuts',
  'Wheat',
  'Soy',
  'Sesame',
  'Gluten'
];

/**
 * Comprehensive allergen hierarchy with parent-child relationships
 */
export const ALLERGEN_HIERARCHY = {
  // Top-level categories
  'tree nuts': {
    label: 'Tree Nuts',
    children: ['almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'macadamia', 'pistachio', 'brazil nut'],
    severity: 'high'
  },
  'dairy': {
    label: 'Dairy',
    children: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein', 'lactose'],
    severity: 'high'
  },
  'gluten': {
    label: 'Gluten',
    children: ['wheat', 'barley', 'rye', 'spelt', 'kamut'],
    severity: 'high'
  },
  'seafood': {
    label: 'Seafood',
    children: ['fish', 'shellfish'],
    severity: 'high'
  },
  
  // Specific allergens
  'peanuts': {
    label: 'Peanuts',
    severity: 'high',
    note: 'Not a tree nut - legume'
  },
  'almond': {
    label: 'Almond',
    parent: 'tree nuts',
    severity: 'high'
  },
  'cashew': {
    label: 'Cashew',
    parent: 'tree nuts',
    severity: 'high'
  },
  'walnut': {
    label: 'Walnut',
    parent: 'tree nuts',
    severity: 'high'
  },
  'pecan': {
    label: 'Pecan',
    parent: 'tree nuts',
    severity: 'high'
  },
  'hazelnut': {
    label: 'Hazelnut',
    parent: 'tree nuts',
    severity: 'high'
  },
  'macadamia': {
    label: 'Macadamia',
    parent: 'tree nuts',
    severity: 'high'
  },
  'pistachio': {
    label: 'Pistachio',
    parent: 'tree nuts',
    severity: 'high'
  },
  'brazil nut': {
    label: 'Brazil Nut',
    parent: 'tree nuts',
    severity: 'high'
  },
  'eggs': {
    label: 'Eggs',
    children: ['egg white', 'egg yolk', 'albumin'],
    severity: 'high'
  },
  'soy': {
    label: 'Soy',
    children: ['soybean', 'tofu', 'tempeh', 'edamame', 'soy sauce'],
    severity: 'medium'
  },
  'sesame': {
    label: 'Sesame',
    children: ['sesame seed', 'tahini', 'sesame oil'],
    severity: 'medium'
  },
  'fish': {
    label: 'Fish',
    parent: 'seafood',
    children: ['salmon', 'tuna', 'cod', 'halibut', 'bass', 'trout'],
    severity: 'high'
  },
  'shellfish': {
    label: 'Shellfish',
    parent: 'seafood',
    children: ['shrimp', 'crab', 'lobster', 'oyster', 'mussel', 'clam', 'scallop'],
    severity: 'high'
  },
  'wheat': {
    label: 'Wheat',
    parent: 'gluten',
    severity: 'high'
  },
  'milk': {
    label: 'Milk',
    parent: 'dairy',
    severity: 'high'
  },
  'mustard': {
    label: 'Mustard',
    severity: 'medium'
  },
  'celery': {
    label: 'Celery',
    severity: 'low'
  },
  'sulfites': {
    label: 'Sulfites',
    severity: 'medium',
    note: 'Common in wine and dried fruits'
  }
};

/**
 * Aggregate allergens for an event from all sources
 * @param {Object} event - Event data
 * @param {Array} menus - Array of menu objects for the event
 * @param {Array} recipes - Array of recipe objects
 * @param {Array} guestAllergies - Array of guest allergy objects
 * @returns {Array} Sorted array of unique allergens
 */
export function aggregateEventAllergens(event, menus, recipes, guestAllergies = []) {
  const allergenSet = new Set();
  
  // Add allergens from guest allergies
  guestAllergies.forEach(guest => {
    if (guest.allergens && Array.isArray(guest.allergens)) {
      guest.allergens.forEach(allergen => {
        allergenSet.add(normalizeAllergen(allergen));
      });
    }
  });
  
  // Add allergens from recipes in menus
  menus.forEach(menu => {
    if (menu.meals && Array.isArray(menu.meals)) {
      menu.meals.forEach(meal => {
        if (meal.recipes && Array.isArray(meal.recipes)) {
          meal.recipes.forEach(recipeRef => {
            const recipe = recipes.find(r => r.id === recipeRef.recipe_id);
            if (recipe && recipe.allergens && Array.isArray(recipe.allergens)) {
              recipe.allergens.forEach(allergen => {
                allergenSet.add(normalizeAllergen(allergen));
              });
            }
          });
        }
      });
    }
  });
  
  return Array.from(allergenSet).sort();
}

/**
 * Check for allergen conflicts between a menu and event
 * @param {Object} menu - Menu object
 * @param {Array} eventAllergens - Array of allergens to avoid
 * @param {Array} recipes - Array of recipe objects
 * @returns {Object} Result with conflicts array and safe boolean
 */
export function checkMenuAllergenConflicts(menu, eventAllergens, recipes) {
  const conflicts = [];
  const menuAllergens = getMenuAllergens(menu, recipes);
  
  eventAllergens.forEach(eventAllergen => {
    if (menuAllergens.includes(eventAllergen)) {
      // Find which recipes contain this allergen
      const conflictingRecipes = [];
      
      menu.meals?.forEach(meal => {
        meal.recipes?.forEach(recipeRef => {
          const recipe = recipes.find(r => r.id === recipeRef.recipe_id);
          if (recipe?.allergens?.includes(eventAllergen)) {
            conflictingRecipes.push({
              recipeName: recipe.name,
              mealType: meal.type,
              allergen: eventAllergen
            });
          }
        });
      });
      
      conflicts.push({
        allergen: eventAllergen,
        recipes: conflictingRecipes
      });
    }
  });
  
  return {
    safe: conflicts.length === 0,
    conflicts
  };
}

/**
 * Get all allergens from a menu
 * @param {Object} menu - Menu object
 * @param {Array} recipes - Array of recipe objects
 * @returns {Array} Sorted array of unique allergens
 */
export function getMenuAllergens(menu, recipes) {
  const allergenSet = new Set();
  
  if (menu.meals && Array.isArray(menu.meals)) {
    menu.meals.forEach(meal => {
      if (meal.recipes && Array.isArray(meal.recipes)) {
        meal.recipes.forEach(recipeRef => {
          const recipe = recipes.find(r => r.id === recipeRef.recipe_id);
          if (recipe && recipe.allergens && Array.isArray(recipe.allergens)) {
            recipe.allergens.forEach(allergen => {
              allergenSet.add(normalizeAllergen(allergen));
            });
          }
        });
      }
    });
  }
  
  return Array.from(allergenSet).sort();
}

/**
 * Get all allergens from a recipe
 * @param {Object} recipe - Recipe object
 * @returns {Array} Sorted array of unique allergens
 */
export function getRecipeAllergens(recipe) {
  if (!recipe.allergens || !Array.isArray(recipe.allergens)) {
    return [];
  }
  
  const allergenSet = new Set();
  recipe.allergens.forEach(allergen => {
    allergenSet.add(normalizeAllergen(allergen));
  });
  
  return Array.from(allergenSet).sort();
}

/**
 * Normalize allergen name for consistency
 * @param {string} allergen - Allergen name
 * @returns {string} Normalized allergen name
 */
export function normalizeAllergen(allergen) {
  if (!allergen || typeof allergen !== 'string') return '';
  
  // Trim and capitalize first letter
  const normalized = allergen.trim();
  if (!normalized) return '';
  
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

/**
 * Parse allergens from ingredient text
 * @param {string} ingredientText - Ingredient description
 * @returns {Array} Array of detected allergens
 */
export function parseAllergensFromIngredient(ingredientText) {
  if (!ingredientText || typeof ingredientText !== 'string') return [];
  
  const text = ingredientText.toLowerCase();
  const detectedAllergens = [];
  
  // Common allergen patterns
  const allergenPatterns = {
    'Dairy': ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'whey', 'casein', 'lactose'],
    'Eggs': ['egg', 'eggs', 'mayonnaise', 'mayo', 'meringue', 'albumin'],
    'Fish': ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'anchovy', 'anchovies'],
    'Shellfish': ['shrimp', 'lobster', 'crab', 'scallop', 'oyster', 'clam', 'mussel'],
    'Tree Nuts': ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'macadamia', 'hazelnut', 'brazil nut'],
    'Peanuts': ['peanut', 'peanuts', 'groundnut'],
    'Wheat': ['wheat', 'flour', 'bread', 'pasta', 'couscous', 'semolina', 'spelt'],
    'Soy': ['soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso'],
    'Sesame': ['sesame', 'tahini', 'hummus'],
    'Gluten': ['gluten', 'seitan']
  };
  
  Object.entries(allergenPatterns).forEach(([allergen, patterns]) => {
    if (patterns.some(pattern => text.includes(pattern))) {
      detectedAllergens.push(allergen);
    }
  });
  
  // Also add gluten if wheat is detected
  if (detectedAllergens.includes('Wheat') && !detectedAllergens.includes('Gluten')) {
    detectedAllergens.push('Gluten');
  }
  
  return [...new Set(detectedAllergens)].sort();
}

/**
 * Suggest allergen-free alternatives for recipes
 * @param {Object} recipe - Recipe object
 * @param {Array} allergensToAvoid - Array of allergens to avoid
 * @returns {Array} Array of substitution suggestions
 */
export function suggestAllergenFreeAlternatives(recipe, allergensToAvoid) {
  const suggestions = [];
  
  const substitutions = {
    'Dairy': {
      'milk': 'non-dairy milk (almond, oat, soy)',
      'butter': 'vegan butter or oil',
      'cheese': 'nutritional yeast or vegan cheese',
      'cream': 'coconut cream or cashew cream',
      'yogurt': 'coconut yogurt or soy yogurt'
    },
    'Eggs': {
      'egg': 'flax egg (1 tbsp ground flax + 3 tbsp water per egg)',
      'eggs': 'chia eggs or aquafaba',
      'egg wash': 'plant milk or maple syrup'
    },
    'Wheat': {
      'flour': 'gluten-free flour blend',
      'bread': 'gluten-free bread',
      'pasta': 'rice pasta or gluten-free pasta'
    },
    'Gluten': {
      'flour': 'almond flour, rice flour, or GF blend',
      'soy sauce': 'tamari or coconut aminos'
    }
  };
  
  if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    recipe.ingredients.forEach(ingredient => {
      const detectedAllergens = parseAllergensFromIngredient(ingredient);
      const conflictingAllergens = detectedAllergens.filter(a => allergensToAvoid.includes(a));
      
      if (conflictingAllergens.length > 0) {
        conflictingAllergens.forEach(allergen => {
          if (substitutions[allergen]) {
            Object.entries(substitutions[allergen]).forEach(([original, substitute]) => {
              if (ingredient.toLowerCase().includes(original)) {
                suggestions.push({
                  ingredient,
                  allergen,
                  suggestion: `Replace with ${substitute}`
                });
              }
            });
          }
        });
      }
    });
  }
  
  return suggestions;
}

/**
 * Create allergen summary for display
 * @param {Array} allergens - Array of allergen names
 * @returns {string} Formatted allergen summary
 */
export function formatAllergenSummary(allergens) {
  if (!allergens || allergens.length === 0) {
    return 'No known allergens';
  }
  
  if (allergens.length === 1) {
    return `Contains: ${allergens[0]}`;
  }
  
  if (allergens.length === 2) {
    return `Contains: ${allergens[0]} and ${allergens[1]}`;
  }
  
  const lastAllergen = allergens[allergens.length - 1];
  const otherAllergens = allergens.slice(0, -1).join(', ');
  return `Contains: ${otherAllergens}, and ${lastAllergen}`;
}

/**
 * AllergenManager class for managing custom allergens and hierarchy
 */
class AllergenManager {
  constructor() {
    this.customAllergens = [];
    this.allergenCache = null;
    this.unsubscribe = null;
  }

  // Initialize and subscribe to custom allergens
  async initialize() {
    // Load custom allergens from Firestore
    this.unsubscribe = onSnapshot(
      query(collection(db, 'custom_allergens'), orderBy('name')),
      (snapshot) => {
        this.customAllergens = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        this.allergenCache = null; // Clear cache when data changes
      }
    );

    // Initialize default allergens if needed
    await this.ensureDefaultAllergens();
  }

  // Ensure default allergens exist in Firestore
  async ensureDefaultAllergens() {
    const allergensDoc = doc(db, 'settings', 'allergens');
    const docSnap = await getDoc(allergensDoc);
    
    if (!docSnap.exists()) {
      // Create default allergens document
      await setDoc(allergensDoc, {
        hierarchy: ALLERGEN_HIERARCHY,
        updated_at: serverTimestamp()
      });
    }
  }

  // Get all allergens (predefined + custom)
  getAllAllergens() {
    if (this.allergenCache) {
      return this.allergenCache;
    }

    // Combine predefined and custom allergens
    const allAllergens = [];
    
    // Add predefined allergens
    Object.keys(ALLERGEN_HIERARCHY).forEach(key => {
      allAllergens.push({
        id: key,
        name: ALLERGEN_HIERARCHY[key].label,
        type: 'predefined',
        parent: ALLERGEN_HIERARCHY[key].parent,
        children: ALLERGEN_HIERARCHY[key].children || [],
        severity: ALLERGEN_HIERARCHY[key].severity
      });
    });

    // Add custom allergens
    this.customAllergens.forEach(allergen => {
      allAllergens.push({
        ...allergen,
        type: 'custom'
      });
    });

    // Sort by name
    allAllergens.sort((a, b) => a.name.localeCompare(b.name));
    
    this.allergenCache = allAllergens;
    return allAllergens;
  }

  // Add a custom allergen
  async addCustomAllergen(name, severity = 'medium') {
    // Check if allergen already exists
    const normalized = name.toLowerCase().trim();
    const exists = this.getAllAllergens().some(a => 
      a.id.toLowerCase() === normalized || a.name.toLowerCase() === normalized
    );

    if (exists) {
      throw new Error(`Allergen "${name}" already exists`);
    }

    // Add to Firestore
    const allergenData = {
      name: name,
      id: normalized,
      severity: severity,
      created_at: serverTimestamp(),
      type: 'custom'
    };

    await addDoc(collection(db, 'custom_allergens'), allergenData);
    return allergenData;
  }

  // Check if recipe contains allergens (including hierarchy)
  checkRecipeAllergens(recipeAllergens, filterAllergens) {
    // For each allergen we're filtering by
    for (const filterAllergen of filterAllergens) {
      // Check if recipe contains this specific allergen
      if (recipeAllergens.includes(filterAllergen)) {
        return true;
      }

      // Check if recipe contains parent category
      const allergenInfo = ALLERGEN_HIERARCHY[filterAllergen];
      if (allergenInfo?.parent && recipeAllergens.includes(allergenInfo.parent)) {
        return true;
      }

      // Check if recipe contains any child allergens
      const parentInfo = ALLERGEN_HIERARCHY[filterAllergen];
      if (parentInfo?.children) {
        for (const child of parentInfo.children) {
          if (recipeAllergens.includes(child)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  // Cleanup subscription
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

// Create singleton instance
const allergenManager = new AllergenManager();

export default allergenManager;