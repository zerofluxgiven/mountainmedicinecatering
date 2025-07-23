const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Allergen detection patterns
const ALLERGEN_PATTERNS = {
  'almond': /\b(almond|marzipan|amaretto|frangipane)\b/i,
  'cashew': /\b(cashew)\b/i,
  'walnut': /\b(walnut)\b/i,
  'pecan': /\b(pecan)\b/i,
  'hazelnut': /\b(hazelnut|filbert|praline|nutella|gianduja)\b/i,
  'macadamia': /\b(macadamia)\b/i,
  'pistachio': /\b(pistachio)\b/i,
  'brazil nut': /\b(brazil\s*nut)\b/i,
  'peanuts': /\b(peanut|groundnut|arachis)\b/i,
  'tree nuts': /\b(nut|nuts)\b/i,
  'milk': /\b(milk|cream|butter|cheese|yogurt|whey|casein|lactose|dairy)\b/i,
  'eggs': /\b(egg|eggs|albumin|mayonnaise|meringue|custard)\b/i,
  'wheat': /\b(wheat|flour|bread|pasta|couscous)\b/i,
  'gluten': /\b(gluten|seitan)\b/i,
  'soy': /\b(soy|soya|tofu|tempeh|edamame|miso)\b/i,
  'fish': /\b(fish|salmon|tuna|cod|halibut|bass|trout|anchovy|sardine)\b/i,
  'shellfish': /\b(shellfish|shrimp|prawn|crab|lobster|oyster|mussel|clam|scallop)\b/i,
  'sesame': /\b(sesame|tahini|halvah)\b/i,
  'mustard': /\b(mustard|dijon)\b/i,
  'celery': /\b(celery|celeriac)\b/i,
  'sulfites': /\b(sulfite|sulphite|wine|dried\s*fruit)\b/i
};

// Allergen hierarchy
const ALLERGEN_HIERARCHY = {
  'tree nuts': ['almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'macadamia', 'pistachio', 'brazil nut'],
  'dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein', 'lactose'],
  'gluten': ['wheat', 'barley', 'rye', 'spelt', 'kamut'],
  'seafood': ['fish', 'shellfish']
};

/**
 * Detect allergens in recipe content
 */
function detectAllergens(recipe) {
  const detectedAllergens = new Set();
  
  // Combine all text content to check
  const textToCheck = [
    recipe.name || '',
    ...(recipe.ingredients || []),
    ...(recipe.instructions || []),
    recipe.description || ''
  ].join(' ').toLowerCase();

  // Check sections if they exist
  if (recipe.sections) {
    recipe.sections.forEach(section => {
      if (section.ingredients) {
        section.ingredients.forEach(ing => {
          textToCheck += ' ' + ing.toLowerCase();
        });
      }
      if (section.instructions) {
        textToCheck += ' ' + section.instructions.toLowerCase();
      }
    });
  }

  // Check against patterns
  Object.entries(ALLERGEN_PATTERNS).forEach(([allergen, pattern]) => {
    if (pattern.test(textToCheck)) {
      detectedAllergens.add(allergen);
      
      // Also add parent allergen if exists
      Object.entries(ALLERGEN_HIERARCHY).forEach(([parent, children]) => {
        if (children.includes(allergen)) {
          detectedAllergens.add(parent);
        }
      });
    }
  });

  return Array.from(detectedAllergens);
}

/**
 * Trigger: Auto-detect allergens when recipe is created or updated
 */
exports.onRecipeWrite = functions.firestore
  .document('recipes/{recipeId}')
  .onWrite(async (change, context) => {
    try {
      // Skip if document was deleted
      if (!change.after.exists) {
        return null;
      }

      const recipe = change.after.data();
      const recipeId = context.params.recipeId;

      // Skip if recipe already has suggested allergens metadata
      if (recipe.allergen_suggestions_generated) {
        return null;
      }

      // Detect allergens
      const detectedAllergens = detectAllergens(recipe);
      
      // Get existing allergens
      const existingAllergens = recipe.allergens || [];
      
      // Find new suggestions
      const suggestions = detectedAllergens.filter(a => !existingAllergens.includes(a));

      if (suggestions.length > 0) {
        // Update recipe with suggestions metadata
        await change.after.ref.update({
          suggested_allergens: suggestions,
          allergen_suggestions_generated: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Generated ${suggestions.length} allergen suggestions for recipe ${recipeId}`);
      }

      return null;
    } catch (error) {
      console.error('Error in allergen detection trigger:', error);
      return null;
    }
  });

/**
 * Trigger: Update recipes when tree nut is selected to include specific nuts
 */
exports.onTreeNutUpdate = functions.firestore
  .document('recipes/{recipeId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();
      
      const beforeAllergens = before.allergens || [];
      const afterAllergens = after.allergens || [];
      
      // Check if 'tree nuts' was added
      if (!beforeAllergens.includes('tree nuts') && afterAllergens.includes('tree nuts')) {
        // Detect specific nuts
        const detectedAllergens = detectAllergens(after);
        const specificNuts = ALLERGEN_HIERARCHY['tree nuts'].filter(nut => 
          detectedAllergens.includes(nut) && !afterAllergens.includes(nut)
        );

        if (specificNuts.length > 0) {
          // Add specific nuts to allergens
          const updatedAllergens = [...new Set([...afterAllergens, ...specificNuts])];
          
          await change.after.ref.update({
            allergens: updatedAllergens,
            allergen_auto_expanded: true
          });

          console.log(`Added specific nuts to recipe ${context.params.recipeId}: ${specificNuts.join(', ')}`);
        }
      }

      return null;
    } catch (error) {
      console.error('Error in tree nut update trigger:', error);
      return null;
    }
  });

module.exports = {
  detectAllergens,
  ALLERGEN_PATTERNS,
  ALLERGEN_HIERARCHY
};