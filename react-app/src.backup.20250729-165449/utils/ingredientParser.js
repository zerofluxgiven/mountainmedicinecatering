// Utility functions for parsing and normalizing ingredient strings

// Common cooking units for parsing
const UNITS = [
  // Volume
  'cup', 'cups', 'c',
  'tablespoon', 'tablespoons', 'tbsp', 'T',
  'teaspoon', 'teaspoons', 'tsp', 't',
  'fluid ounce', 'fluid ounces', 'fl oz',
  'milliliter', 'milliliters', 'ml',
  'liter', 'liters', 'l',
  'pint', 'pints', 'pt',
  'quart', 'quarts', 'qt',
  'gallon', 'gallons', 'gal',
  
  // Weight
  'ounce', 'ounces', 'oz',
  'pound', 'pounds', 'lb', 'lbs',
  'gram', 'grams', 'g',
  'kilogram', 'kilograms', 'kg',
  
  // Count/Package
  'piece', 'pieces',
  'slice', 'slices',
  'clove', 'cloves',
  'head', 'heads',
  'bunch', 'bunches',
  'sprig', 'sprigs',
  'stick', 'sticks',
  'package', 'packages', 'pkg',
  'can', 'cans',
  'jar', 'jars',
  'box', 'boxes',
  'bag', 'bags',
  'bottle', 'bottles',
  
  // Descriptive
  'small', 'medium', 'large',
  'dash', 'pinch', 'handful',
  'to taste'
];

// Create regex pattern for units
const unitsPattern = UNITS
  .sort((a, b) => b.length - a.length) // Sort by length desc to match longer units first
  .map(unit => unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape special chars
  .join('|');

// Patterns for parsing
const FRACTION_PATTERN = /(\d+)?[\s]*([\/⁄])[\s]*(\d+)/; // Handles regular and Unicode fractions
const MIXED_NUMBER_PATTERN = /(\d+)\s+(\d+)[\s]*[\/⁄][\s]*(\d+)/;
const DECIMAL_PATTERN = /\d+\.?\d*/;
const RANGE_PATTERN = /(\d+\.?\d*)[\s]*[-–—][\s]*(\d+\.?\d*)/;
const PARENTHESES_PATTERN = /\([^)]*\)/g;

/**
 * Parse an ingredient string into its components
 * @param {string} ingredientStr - The full ingredient string
 * @returns {Object} Object containing { amount, unit, name, original }
 */
export function parseIngredient(ingredientStr) {
  if (!ingredientStr || typeof ingredientStr !== 'string') {
    return { amount: '', unit: '', name: ingredientStr || '', original: ingredientStr || '' };
  }

  const original = ingredientStr;
  let workingStr = ingredientStr.trim();
  
  // Remove parenthetical notes temporarily
  const parentheticals = [];
  workingStr = workingStr.replace(PARENTHESES_PATTERN, (match) => {
    parentheticals.push(match);
    return ' ';
  });
  
  // Extract amount
  let amount = '';
  let remaining = workingStr;
  
  // Try mixed number first (e.g., "1 1/2")
  const mixedMatch = workingStr.match(new RegExp(`^${MIXED_NUMBER_PATTERN.source}`));
  if (mixedMatch) {
    amount = mixedMatch[0];
    remaining = workingStr.substring(mixedMatch[0].length).trim();
  }
  // Try fraction (e.g., "1/2", "½")
  else if (!amount) {
    const fractionMatch = workingStr.match(new RegExp(`^${FRACTION_PATTERN.source}`));
    if (fractionMatch) {
      amount = fractionMatch[0];
      remaining = workingStr.substring(fractionMatch[0].length).trim();
    }
  }
  // Try range (e.g., "2-3")
  else if (!amount) {
    const rangeMatch = workingStr.match(new RegExp(`^${RANGE_PATTERN.source}`));
    if (rangeMatch) {
      amount = rangeMatch[0];
      remaining = workingStr.substring(rangeMatch[0].length).trim();
    }
  }
  // Try decimal/whole number
  else if (!amount) {
    const numberMatch = workingStr.match(new RegExp(`^${DECIMAL_PATTERN.source}`));
    if (numberMatch) {
      amount = numberMatch[0];
      remaining = workingStr.substring(numberMatch[0].length).trim();
    }
  }
  
  // Extract unit
  let unit = '';
  const unitMatch = remaining.match(new RegExp(`^(${unitsPattern})\\b`, 'i'));
  if (unitMatch) {
    unit = unitMatch[0];
    remaining = remaining.substring(unitMatch[0].length).trim();
  }
  
  // Clean up the remaining name
  let name = remaining;
  
  // Remove leading commas or "of"
  name = name.replace(/^(,|of)\s+/i, '');
  
  // Add back any parenthetical notes at the end
  if (parentheticals.length > 0) {
    name = name.trim() + ' ' + parentheticals.join(' ');
  }
  
  // Clean up extra whitespace
  name = name.replace(/\s+/g, ' ').trim();
  
  return {
    amount: amount.trim(),
    unit: unit.trim(),
    name: name.trim(),
    original: original
  };
}

/**
 * Extract just the ingredient name from a full ingredient string
 * @param {string} ingredientStr - The full ingredient string
 * @returns {string} The normalized ingredient name
 */
export function extractIngredientName(ingredientStr) {
  const parsed = parseIngredient(ingredientStr);
  return parsed.name;
}

/**
 * Normalize an ingredient name for database storage
 * @param {string} name - The ingredient name
 * @returns {string} The normalized name
 */
export function normalizeIngredientName(name) {
  if (!name || typeof name !== 'string') return '';
  
  // Convert to lowercase for consistency
  let normalized = name.toLowerCase();
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Capitalize first letter of each word
  normalized = normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Common replacements
  const replacements = {
    'Baking Soda': 'Baking Soda',
    'Bi-carbonate Of Soda': 'Baking Soda',
    'Bicarbonate Of Soda': 'Baking Soda',
    'Sodium Bicarbonate': 'Baking Soda',
    'Baking Powder': 'Baking Powder',
    'Vanilla': 'Vanilla Extract',
    'Vanilla Essence': 'Vanilla Extract',
    'Sugar': 'Sugar',
    'Granulated Sugar': 'Sugar',
    'White Sugar': 'Sugar',
    'Caster Sugar': 'Sugar',
    'Superfine Sugar': 'Sugar',
    'Brown Sugar': 'Brown Sugar',
    'Light Brown Sugar': 'Brown Sugar',
    'Dark Brown Sugar': 'Dark Brown Sugar',
    'Coconut Sugar': 'Coconut Sugar',
    'Butter': 'Butter',
    'Unsalted Butter': 'Butter',
    'Salted Butter': 'Butter (Salted)',
    'Sea Salt': 'Sea Salt',
    'Table Salt': 'Salt',
    'Kosher Salt': 'Kosher Salt',
    'Fine Sea Salt': 'Sea Salt (Fine)',
    'Coarse Sea Salt': 'Sea Salt (Coarse)'
  };
  
  // Check if we have a known replacement
  for (const [pattern, replacement] of Object.entries(replacements)) {
    if (normalized.toLowerCase() === pattern.toLowerCase()) {
      return replacement;
    }
  }
  
  return normalized;
}

/**
 * Check if two ingredient names refer to the same ingredient
 * @param {string} name1 - First ingredient name
 * @param {string} name2 - Second ingredient name
 * @returns {boolean} True if they're the same ingredient
 */
export function isSameIngredient(name1, name2) {
  const normalized1 = normalizeIngredientName(name1).toLowerCase();
  const normalized2 = normalizeIngredientName(name2).toLowerCase();
  
  // Exact match
  if (normalized1 === normalized2) return true;
  
  // Check common variations
  const variations = [
    ['baking soda', 'bicarbonate of soda', 'sodium bicarbonate'],
    ['vanilla extract', 'vanilla', 'vanilla essence'],
    ['sugar', 'granulated sugar', 'white sugar', 'caster sugar'],
    ['butter', 'unsalted butter'],
    ['salt', 'table salt'],
    ['all-purpose flour', 'all purpose flour', 'plain flour', 'flour'],
    ['whole wheat flour', 'wholemeal flour', 'whole-wheat flour'],
    ['olive oil', 'extra virgin olive oil', 'extra-virgin olive oil'],
    ['vegetable oil', 'neutral oil', 'cooking oil']
  ];
  
  for (const group of variations) {
    if (group.includes(normalized1) && group.includes(normalized2)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Parse multiple ingredient strings and group duplicates
 * @param {string[]} ingredients - Array of ingredient strings
 * @returns {Object[]} Array of parsed ingredients with duplicates combined
 */
export function parseAndGroupIngredients(ingredients) {
  const grouped = new Map();
  
  for (const ingredientStr of ingredients) {
    const parsed = parseIngredient(ingredientStr);
    const normalizedName = normalizeIngredientName(parsed.name);
    
    if (grouped.has(normalizedName)) {
      // Combine with existing
      const existing = grouped.get(normalizedName);
      existing.occurrences.push(parsed);
      existing.count++;
    } else {
      // Add new
      grouped.set(normalizedName, {
        name: normalizedName,
        occurrences: [parsed],
        count: 1
      });
    }
  }
  
  return Array.from(grouped.values());
}