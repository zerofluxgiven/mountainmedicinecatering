import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Calculate the proper serving size for a recipe in a menu
 * @param {Object} recipe - The recipe object
 * @param {Object} event - The event object
 * @param {Array} eventAllergies - Array of allergy objects for the event
 * @returns {Object} Scaling information with warnings
 */
export async function calculateRecipeServings(recipe, event, eventAllergies = []) {
  // Base calculation: guests + staff
  const totalPeople = (event.guest_count || 0) + (event.staff_count || 0);
  
  // Find guests who have allergies that conflict with this recipe
  const recipeAllergens = recipe.allergens || [];
  const conflictingGuests = [];
  let withheldServings = 0;
  
  if (recipeAllergens.length > 0 && eventAllergies.length > 0) {
    eventAllergies.forEach(allergyEntry => {
      const guestAllergens = allergyEntry.allergens || [];
      const hasConflict = recipeAllergens.some(recipeAllergen => 
        guestAllergens.includes(recipeAllergen)
      );
      
      if (hasConflict) {
        conflictingGuests.push({
          name: allergyEntry.guest_name,
          allergens: guestAllergens.filter(a => recipeAllergens.includes(a))
        });
        // Count 1 serving per conflicting guest
        withheldServings += 1;
      }
    });
  }
  
  // Calculate adjusted servings
  const adjustedServings = Math.max(1, totalPeople - withheldServings);
  
  // Calculate scale factor based on recipe's base servings
  const baseServings = recipe.serves || 1;
  const scaleFactor = adjustedServings / baseServings;
  
  // Build warning message if servings were withheld
  let warning = null;
  if (withheldServings > 0) {
    const allergenList = [...new Set(conflictingGuests.flatMap(g => g.allergens))].join(', ');
    warning = {
      message: `⚠️ ${withheldServings} servings withheld due to ${allergenList} allergies (+${event.staff_count || 0} staff)`,
      withheldCount: withheldServings,
      staffCount: event.staff_count || 0,
      conflictingGuests: conflictingGuests,
      allergens: allergenList
    };
  }
  
  return {
    totalPeople,
    adjustedServings,
    withheldServings,
    scaleFactor,
    baseServings,
    warning,
    conflictingGuests
  };
}

/**
 * Get all allergies for an event
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>} Array of allergy entries
 */
export async function getEventAllergies(eventId) {
  try {
    const allergiesRef = collection(db, 'events', eventId, 'allergies');
    const snapshot = await getDocs(allergiesRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching event allergies:', error);
    return [];
  }
}

/**
 * Scale recipe ingredients based on serving calculations
 * @param {Object} recipe - Recipe to scale
 * @param {number} scaleFactor - Scale factor
 * @returns {Object} Recipe with scaled ingredients
 */
export function scaleRecipeIngredients(recipe, scaleFactor) {
  if (!recipe.ingredients || scaleFactor === 1) {
    return recipe;
  }
  
  // Import the smart scaler logic
  const scaledIngredients = recipe.ingredients.map(ingredient => {
    // This is a simplified version - in production, use the full scaleIngredient logic
    // from recipeScaler.js
    return scaleIngredientString(ingredient, scaleFactor);
  });
  
  return {
    ...recipe,
    ingredients: scaledIngredients,
    scaled: true,
    scaleFactor
  };
}

/**
 * Simple ingredient scaling (should use full parser in production)
 * @param {string} ingredient - Ingredient string
 * @param {number} scaleFactor - Scale factor
 * @returns {string} Scaled ingredient string
 */
function scaleIngredientString(ingredient, scaleFactor) {
  // Extract number at the beginning
  const match = ingredient.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)\s+(.*)$/);
  
  if (!match) {
    // No quantity found, return as is
    return ingredient;
  }
  
  const [, quantityStr, rest] = match;
  let quantity = 0;
  
  // Handle fractions
  if (quantityStr.includes('/')) {
    const [num, den] = quantityStr.split('/').map(Number);
    quantity = num / den;
  } else {
    quantity = Number(quantityStr);
  }
  
  // Scale the quantity
  const scaledQuantity = quantity * scaleFactor;
  
  // Format the scaled quantity
  const formatted = formatQuantity(scaledQuantity);
  
  return `${formatted} ${rest}`;
}

/**
 * Format a decimal quantity as a fraction or mixed number
 * @param {number} quantity - Decimal quantity
 * @returns {string} Formatted quantity
 */
function formatQuantity(quantity) {
  if (Number.isInteger(quantity)) {
    return quantity.toString();
  }
  
  // Convert to fraction
  const tolerance = 0.01;
  const fractions = [
    { value: 0.25, display: '1/4' },
    { value: 0.333, display: '1/3' },
    { value: 0.5, display: '1/2' },
    { value: 0.667, display: '2/3' },
    { value: 0.75, display: '3/4' }
  ];
  
  const wholePart = Math.floor(quantity);
  const decimalPart = quantity - wholePart;
  
  // Find closest fraction
  let closestFraction = null;
  let minDiff = 1;
  
  for (const fraction of fractions) {
    const diff = Math.abs(decimalPart - fraction.value);
    if (diff < minDiff && diff < tolerance) {
      minDiff = diff;
      closestFraction = fraction;
    }
  }
  
  if (closestFraction) {
    if (wholePart > 0) {
      return `${wholePart} ${closestFraction.display}`;
    } else {
      return closestFraction.display;
    }
  }
  
  // Fall back to decimal with 2 decimal places
  return quantity.toFixed(2).replace(/\.00$/, '');
}