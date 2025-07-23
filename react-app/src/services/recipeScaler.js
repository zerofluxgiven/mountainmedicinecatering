import { Fraction } from 'fraction.js';

// Common cooking units for parsing
const UNITS = [
  'cup', 'cups', 'c',
  'tablespoon', 'tablespoons', 'tbsp', 'T',
  'teaspoon', 'teaspoons', 'tsp', 't',
  'ounce', 'ounces', 'oz',
  'pound', 'pounds', 'lb', 'lbs',
  'gram', 'grams', 'g',
  'kilogram', 'kilograms', 'kg',
  'milliliter', 'milliliters', 'ml',
  'liter', 'liters', 'l',
  'pint', 'pints', 'pt',
  'quart', 'quarts', 'qt',
  'gallon', 'gallons', 'gal',
  'fluid ounce', 'fluid ounces', 'fl oz',
  'stick', 'sticks',
  'clove', 'cloves',
  'head', 'heads',
  'bunch', 'bunches',
  'package', 'packages', 'pkg',
  'can', 'cans',
  'jar', 'jars',
  'box', 'boxes',
  'bag', 'bags',
  'slice', 'slices',
  'piece', 'pieces',
  'inch', 'inches',
  'small', 'medium', 'large',
  'dash', 'pinch', 'handful'
];

// Regex patterns for parsing ingredients
const FRACTION_PATTERN = /(\d+)\s*\/\s*(\d+)/;
const MIXED_NUMBER_PATTERN = /(\d+)\s+(\d+)\s*\/\s*(\d+)/;
const DECIMAL_PATTERN = /\d+\.?\d*/;
const RANGE_PATTERN = /(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/;

export function parseIngredientAmount(ingredient) {
  // Extract quantity and unit from ingredient string
  const unitPattern = new RegExp(`\\b(${UNITS.join('|')})\\b`, 'i');
  const unitMatch = ingredient.match(unitPattern);
  const unit = unitMatch ? unitMatch[1] : '';
  
  // Extract the part before the unit (or whole string if no unit)
  const beforeUnit = unit ? ingredient.substring(0, ingredient.indexOf(unit)).trim() : ingredient;
  
  // Try to parse different number formats
  let quantity = null;
  
  // Check for mixed numbers (e.g., "1 1/2")
  const mixedMatch = beforeUnit.match(MIXED_NUMBER_PATTERN);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const numerator = parseInt(mixedMatch[2]);
    const denominator = parseInt(mixedMatch[3]);
    quantity = new Fraction(whole * denominator + numerator, denominator);
  }
  
  // Check for fractions (e.g., "1/2")
  else if (!quantity) {
    const fractionMatch = beforeUnit.match(FRACTION_PATTERN);
    if (fractionMatch) {
      quantity = new Fraction(parseInt(fractionMatch[1]), parseInt(fractionMatch[2]));
    }
  }
  
  // Check for decimals
  else if (!quantity) {
    const decimalMatch = beforeUnit.match(DECIMAL_PATTERN);
    if (decimalMatch) {
      quantity = new Fraction(parseFloat(decimalMatch[0]));
    }
  }
  
  // Check for ranges (use average)
  const rangeMatch = beforeUnit.match(RANGE_PATTERN);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    quantity = new Fraction((min + max) / 2);
  }
  
  return { quantity, unit, original: ingredient };
}

export function formatScaledAmount(fraction) {
  if (!fraction) return '';
  
  // Convert to simplified fraction
  const simplified = fraction.simplify();
  
  // Convert numerator and denominator to regular numbers
  // This handles both regular numbers and BigInt
  const n = Number(simplified.n);
  const d = Number(simplified.d);
  
  // Check if conversion resulted in Infinity (number too large)
  if (!isFinite(n) || !isFinite(d)) {
    // Fall back to decimal representation
    return fraction.valueOf().toFixed(2);
  }
  
  // If it's a whole number, return as is
  if (d === 1) {
    return n.toString();
  }
  
  // If it can be represented as a clean decimal (halves, quarters)
  const decimal = n / d;
  if (decimal === 0.5) return '½';
  if (decimal === 0.25) return '¼';
  if (decimal === 0.75) return '¾';
  if (Math.abs(decimal - 0.333) < 0.001) return '⅓';
  if (Math.abs(decimal - 0.667) < 0.001) return '⅔';
  
  // For numbers with clean decimal representations
  if (decimal % 1 === 0 || decimal.toFixed(2) == decimal.toFixed(6)) {
    return decimal.toFixed(2).replace(/\.00$/, '');
  }
  
  // Otherwise, show as mixed number or fraction
  if (n > d) {
    const whole = Math.floor(n / d);
    const remainder = n % d;
    if (remainder === 0) return whole.toString();
    return `${whole} ${remainder}/${d}`;
  }
  
  return `${n}/${d}`;
}

export function scaleIngredient(ingredient, scaleFactor) {
  const { quantity, unit, original } = parseIngredientAmount(ingredient);
  
  // If no quantity found, return original
  if (!quantity) return ingredient;
  
  // Scale the quantity
  const scaledQuantity = quantity.mul(scaleFactor);
  const formattedAmount = formatScaledAmount(scaledQuantity);
  
  // Reconstruct the ingredient string
  const restOfIngredient = original
    .replace(MIXED_NUMBER_PATTERN, '')
    .replace(FRACTION_PATTERN, '')
    .replace(DECIMAL_PATTERN, '')
    .replace(RANGE_PATTERN, '')
    .trim();
  
  return `${formattedAmount} ${restOfIngredient}`.trim();
}

export function scaleRecipe(recipe, targetServings) {
  const originalServings = recipe.serves || 4;
  const scaleFactor = targetServings / originalServings;
  
  // Create a copy of the recipe
  const scaledRecipe = { ...recipe };
  
  // Update servings
  scaledRecipe.serves = targetServings;
  
  // Scale sections if they exist
  if (recipe.sections && Array.isArray(recipe.sections)) {
    scaledRecipe.sections = recipe.sections.map(section => ({
      ...section,
      ingredients: section.ingredients.map(ingredient =>
        scaleIngredient(ingredient, scaleFactor)
      )
    }));
    
    // Also update flattened ingredients for backward compatibility
    scaledRecipe.ingredients = [];
    scaledRecipe.sections.forEach(section => {
      scaledRecipe.ingredients.push(...section.ingredients);
    });
  } else {
    // Scale traditional format ingredients
    if (recipe.ingredients) {
      if (Array.isArray(recipe.ingredients)) {
        scaledRecipe.ingredients = recipe.ingredients.map(ingredient => {
          if (typeof ingredient === 'string') {
            return scaleIngredient(ingredient, scaleFactor);
          } else if (ingredient && typeof ingredient === 'object') {
            // Handle object format {item, amount, unit}
            const ingredientString = `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.item || ''}`.trim();
            const scaledString = scaleIngredient(ingredientString, scaleFactor);
            
            // Parse the scaled string back to extract the new amount
            const { quantity, unit: parsedUnit, original } = parseIngredientAmount(scaledString);
            
            if (quantity) {
              // The quantity is already scaled from scaleIngredient, just format it
              return {
                ...ingredient,
                amount: formatScaledAmount(quantity),
                unit: parsedUnit || ingredient.unit,
                item: ingredient.item
              };
            }
            
            // If parsing failed, return the original with a scaled amount if numeric
            if (ingredient.amount && !isNaN(ingredient.amount)) {
              return {
                ...ingredient,
                amount: (parseFloat(ingredient.amount) * scaleFactor).toString()
              };
            }
            
            return ingredient;
          }
          return ingredient;
        });
      } else if (typeof recipe.ingredients === 'string') {
        // Handle string ingredients (split by newlines)
        const ingredientLines = recipe.ingredients.split('\n').filter(line => line.trim());
        scaledRecipe.ingredients = ingredientLines.map(ingredient => 
          scaleIngredient(ingredient, scaleFactor)
        );
      }
    }
  }
  
  // Add scaling notes
  if (scaleFactor < 0.5) {
    scaledRecipe.scaling_notes = "Note: When scaling down significantly, cooking times may need to be reduced. Check for doneness earlier than the original recipe suggests.";
  } else if (scaleFactor > 2) {
    scaledRecipe.scaling_notes = "Note: When scaling up significantly, cooking times may need to be increased. Use multiple pans if necessary to maintain proper cooking conditions.";
  }
  
  // Adjust cooking times if they exist
  if (recipe.cook_time) {
    if (scaleFactor > 2) {
      scaledRecipe.cook_time_note = "Cooking time may need to be increased by 10-25%";
    } else if (scaleFactor < 0.5) {
      scaledRecipe.cook_time_note = "Cooking time may need to be reduced by 10-25%";
    }
  }
  
  return scaledRecipe;
}