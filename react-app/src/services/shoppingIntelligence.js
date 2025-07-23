import { getOpenAIResponse } from './aiService';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Common package sizes for different ingredient types
const PACKAGE_SIZES = {
  // Proteins (usually sold in these weights)
  chicken_breast: [1, 1.5, 2, 3, 5], // lbs
  ground_beef: [1, 1.5, 2, 3, 5], // lbs
  salmon: [0.5, 1, 1.5, 2], // lbs
  
  // Dairy
  milk: [0.5, 1, 0.5, 1], // gallons, then half gallons
  heavy_cream: [0.5, 1, 2], // pints, quart, half gallon
  butter: [0.25, 0.5, 1], // lbs (sticks)
  
  // Produce (typical bunches/bags)
  herbs: [0.5, 0.75, 1], // oz for most fresh herbs
  leafy_greens: [5, 10, 16], // oz bags
  onions: [1, 3, 5, 10], // lb bags
  potatoes: [5, 10, 20], // lb bags
};

// Store profiles with their typical strengths
const STORE_PROFILES = {
  costco: {
    name: 'Costco',
    type: 'warehouse',
    strengths: ['bulk proteins', 'dairy', 'dry goods', 'oils'],
    weaknesses: ['fresh herbs', 'specialty items', 'small quantities'],
    minOrderSizes: {
      chicken: 5, // lbs
      ground_beef: 4, // lbs
      cheese: 2, // lbs
    }
  },
  whole_foods: {
    name: 'Whole Foods',
    type: 'premium',
    strengths: ['organic produce', 'specialty items', 'fresh herbs', 'quality meats'],
    weaknesses: ['price', 'bulk items'],
  },
  restaurant_depot: {
    name: 'Restaurant Depot',
    type: 'foodservice',
    strengths: ['bulk everything', 'commercial sizes', 'frozen items'],
    weaknesses: ['requires membership', 'minimum cases'],
  },
  safeway: {
    name: 'Safeway/Kroger',
    type: 'conventional',
    strengths: ['variety', 'standard sizes', 'weekly deals'],
    weaknesses: ['bulk pricing', 'specialty items'],
  },
  farmers_market: {
    name: "Farmer's Market",
    type: 'local',
    strengths: ['seasonal produce', 'local items', 'freshness'],
    weaknesses: ['availability', 'consistency', 'proteins'],
  }
};

// Shopping preferences
const SHOPPING_MODES = {
  minimize_stores: {
    name: 'Minimize Stores',
    description: 'Shop at 1-2 stores max',
    priority: 'convenience'
  },
  budget_conscious: {
    name: 'Budget Conscious',
    description: 'Optimize for bulk buying and value',
    priority: 'cost'
  },
  quality_first: {
    name: 'Quality First',
    description: 'Premium ingredients from specialty stores',
    priority: 'quality'
  },
  balanced: {
    name: 'Balanced Approach',
    description: 'Mix of quality and value',
    priority: 'balanced'
  }
};

/**
 * Analyzes ingredients and converts recipe amounts to shopping quantities
 */
export async function analyzeShoppingNeeds(ingredients, servingSize, shoppingMode = 'balanced') {
  const prompt = `
    As a professional catering shopping assistant, analyze these ingredients and suggest optimal shopping quantities.
    Consider standard package sizes, waste reduction, and practical shopping.
    
    Ingredients for ${servingSize} servings:
    ${ingredients.join('\n')}
    
    Shopping Mode: ${SHOPPING_MODES[shoppingMode]?.description || 'Balanced'}
    
    For each ingredient, provide:
    1. Parsed ingredient (quantity, unit, item name)
    2. Suggested shopping quantity (considering standard package sizes)
    3. Store recommendation (Costco, Whole Foods, Regular Grocery, etc.)
    4. Storage notes if buying extra
    5. Possible substitutions
    
    Format as JSON array with objects containing:
    {
      "original": "original ingredient text",
      "parsed": {
        "quantity": number,
        "unit": "unit",
        "item": "item name"
      },
      "shopping": {
        "quantity": number,
        "unit": "unit",
        "package_description": "e.g., '2 lb package' or '3-pack'"
      },
      "store_type": "warehouse|premium|conventional",
      "storage": "storage advice if buying extra",
      "substitutions": ["list of possible substitutions"],
      "category": "produce|protein|dairy|dry_goods|spices|other"
    }
  `;

  try {
    const response = await getOpenAIResponse(prompt, {
      model: 'gpt-4',
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response);
    return parsed.ingredients || [];
  } catch (error) {
    console.error('Error analyzing shopping needs:', error);
    throw error;
  }
}

/**
 * Groups ingredients by store based on shopping mode
 */
export function optimizeShoppingRoute(analyzedIngredients, shoppingMode = 'minimize_stores') {
  const storeGroups = {};
  
  // Group by store type first
  analyzedIngredients.forEach(item => {
    const storeType = item.store_type || 'conventional';
    if (!storeGroups[storeType]) {
      storeGroups[storeType] = [];
    }
    storeGroups[storeType].push(item);
  });

  // Apply shopping mode logic
  if (shoppingMode === 'minimize_stores') {
    // Consolidate to 1-2 stores max
    const consolidated = consolidateStores(storeGroups);
    return consolidated;
  } else if (shoppingMode === 'budget_conscious') {
    // Prioritize warehouse stores for bulk items
    return prioritizeBulkStores(storeGroups);
  } else if (shoppingMode === 'quality_first') {
    // Keep specialty stores separate
    return storeGroups;
  }
  
  return storeGroups;
}

/**
 * Consolidates shopping to minimum stores
 */
function consolidateStores(storeGroups) {
  const consolidated = {
    primary: [],
    specialty: []
  };

  // Move most items to primary (conventional) store
  Object.entries(storeGroups).forEach(([type, items]) => {
    if (type === 'premium' && items.some(i => i.category === 'produce' || i.category === 'spices')) {
      // Keep specialty produce/spices separate if needed
      consolidated.specialty.push(...items);
    } else {
      consolidated.primary.push(...items);
    }
  });

  // If specialty has very few items, consolidate everything
  if (consolidated.specialty.length < 3) {
    consolidated.primary.push(...consolidated.specialty);
    delete consolidated.specialty;
  }

  return consolidated;
}

/**
 * Prioritizes bulk stores for eligible items
 */
function prioritizeBulkStores(storeGroups) {
  const optimized = {
    warehouse: [],
    conventional: []
  };

  Object.entries(storeGroups).forEach(([type, items]) => {
    items.forEach(item => {
      // Move bulk-eligible items to warehouse
      if (item.shopping.quantity > 3 && ['protein', 'dairy', 'dry_goods'].includes(item.category)) {
        optimized.warehouse.push({
          ...item,
          store_type: 'warehouse'
        });
      } else {
        optimized.conventional.push(item);
      }
    });
  });

  return optimized;
}

/**
 * Calculates smart quantities considering package sizes and waste
 */
export function calculateSmartQuantity(needed, packageSizes, allowExtra = true) {
  // Sort package sizes
  const sizes = packageSizes.sort((a, b) => a - b);
  
  // Find the most efficient combination
  let bestOption = {
    packages: [],
    total: 0,
    waste: Infinity
  };

  // Try single package options
  for (const size of sizes) {
    const count = Math.ceil(needed / size);
    const total = count * size;
    const waste = total - needed;
    
    if (waste < bestOption.waste && (allowExtra || waste === 0)) {
      bestOption = {
        packages: [{ size, count }],
        total,
        waste
      };
    }
  }

  // For large quantities, try combinations
  if (needed > sizes[sizes.length - 1]) {
    const largeSize = sizes[sizes.length - 1];
    const largeCount = Math.floor(needed / largeSize);
    const remainder = needed - (largeCount * largeSize);
    
    if (remainder > 0) {
      const smallSize = sizes.find(s => s >= remainder) || sizes[0];
      const total = (largeCount * largeSize) + smallSize;
      const waste = total - needed;
      
      if (waste < bestOption.waste) {
        bestOption = {
          packages: [
            { size: largeSize, count: largeCount },
            { size: smallSize, count: 1 }
          ],
          total,
          waste
        };
      }
    }
  }

  return bestOption;
}

/**
 * Generates shopping list summary with store routing
 */
export function generateShoppingSummary(optimizedList, eventDetails) {
  const summary = {
    event: eventDetails.name,
    servings: eventDetails.guest_count,
    generated: new Date().toISOString(),
    stores: [],
    totalItems: 0,
    notes: []
  };

  Object.entries(optimizedList).forEach(([storeType, items]) => {
    const storeInfo = {
      type: storeType,
      name: getStoreName(storeType),
      items: items.map(item => ({
        ...item,
        display: formatShoppingItem(item)
      })),
      categories: groupByCategory(items)
    };

    summary.stores.push(storeInfo);
    summary.totalItems += items.length;
  });

  // Add shopping tips based on the list
  summary.notes = generateShoppingTips(summary);

  return summary;
}

function getStoreName(storeType) {
  const storeMap = {
    warehouse: 'Costco/Restaurant Depot',
    premium: 'Whole Foods/Specialty',
    conventional: 'Safeway/Kroger',
    primary: 'Main Grocery Store',
    specialty: 'Specialty Stores'
  };
  return storeMap[storeType] || storeType;
}

function formatShoppingItem(item) {
  const { shopping, parsed } = item;
  if (shopping.package_description) {
    return `${shopping.package_description} of ${parsed.item}`;
  }
  return `${shopping.quantity} ${shopping.unit} ${parsed.item}`;
}

function groupByCategory(items) {
  const groups = {};
  items.forEach(item => {
    const category = item.category || 'other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
  });
  return groups;
}

function generateShoppingTips(summary) {
  const tips = [];
  
  // Check if shopping at warehouse stores
  if (summary.stores.some(s => s.type === 'warehouse')) {
    tips.push('🏪 Remember to bring your membership card for warehouse stores');
    tips.push('📦 Bring boxes/bags for bulk items from warehouse stores');
  }

  // Check for perishables
  const hasPerishables = summary.stores.some(s => 
    s.items.some(i => ['produce', 'protein', 'dairy'].includes(i.category))
  );
  if (hasPerishables) {
    tips.push('❄️ Shop for frozen/refrigerated items last');
    tips.push('🧊 Bring coolers if shopping at multiple stores');
  }

  // Add seasonal tip
  const month = new Date().getMonth();
  if (month >= 5 && month <= 8) {
    tips.push('☀️ Summer produce is at peak - consider local farmers markets');
  } else if (month >= 11 || month <= 2) {
    tips.push('❄️ Winter season - some fresh herbs may be pricier');
  }

  return tips;
}

/**
 * Main function to generate a shopping list from an event
 */
export async function generateShoppingList(eventId, options = {}) {
  try {
    // Get event data
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }
    
    const eventData = { id: eventDoc.id, ...eventDoc.data() };
    
    // Get all menus for this event
    const menusQuery = query(collection(db, 'menus'), where('event_id', '==', eventId));
    const menusSnapshot = await getDocs(menusQuery);
    
    // Collect all ingredients from all menus
    const allIngredients = [];
    
    for (const menuDoc of menusSnapshot.docs) {
      const menu = menuDoc.data();
      
      // Process each day in the menu
      if (menu.days && Array.isArray(menu.days)) {
        for (const day of menu.days) {
          if (day.meals && Array.isArray(day.meals)) {
            for (const meal of day.meals) {
              if (meal.courses && Array.isArray(meal.courses)) {
                for (const course of meal.courses) {
                  if (course.recipe_id) {
                    // Get recipe data
                    const recipeDoc = await getDoc(doc(db, 'recipes', course.recipe_id));
                    if (recipeDoc.exists()) {
                      const recipe = recipeDoc.data();
                      
                      // Scale ingredients based on servings
                      if (recipe.ingredients) {
                        const scaleFactor = course.servings / recipe.serves;
                        
                        recipe.ingredients.forEach(ing => {
                          if (typeof ing === 'string') {
                            allIngredients.push({
                              name: ing,
                              quantity: '',
                              unit: '',
                              category: 'Other',
                              recipe: recipe.name,
                              meal: `${day.day_label} - ${meal.type}`
                            });
                          } else if (ing.item) {
                            const quantity = ing.amount ? ing.amount * scaleFactor : '';
                            allIngredients.push({
                              name: ing.item,
                              quantity: quantity.toString(),
                              unit: ing.unit || '',
                              category: ing.category || 'Other',
                              recipe: recipe.name,
                              meal: `${day.day_label} - ${meal.type}`
                            });
                          }
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Consolidate similar ingredients
    const consolidatedItems = consolidateIngredients(allIngredients, options.groupBy || 'category');
    
    return {
      success: true,
      items: consolidatedItems,
      event_name: eventData.name,
      guest_count: eventData.guest_count
    };
    
  } catch (error) {
    console.error('Error generating shopping list:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Consolidates similar ingredients into single items
 */
function consolidateIngredients(ingredients, groupBy) {
  const consolidated = {};
  
  ingredients.forEach(ing => {
    const key = ing.name.toLowerCase().trim();
    
    if (!consolidated[key]) {
      consolidated[key] = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: ing.name,
        quantity: '',
        unit: ing.unit || '',
        category: ing.category || 'Other',
        sources: [],
        checked: false
      };
    }
    
    // Add source info
    consolidated[key].sources.push({
      recipe: ing.recipe,
      meal: ing.meal,
      quantity: ing.quantity,
      unit: ing.unit
    });
    
    // Try to sum quantities if units match
    if (ing.quantity && consolidated[key].unit === ing.unit) {
      const currentQty = parseFloat(consolidated[key].quantity) || 0;
      const newQty = parseFloat(ing.quantity) || 0;
      consolidated[key].quantity = (currentQty + newQty).toString();
    }
  });
  
  // Convert to array and add notes about sources
  return Object.values(consolidated).map(item => {
    if (item.sources.length > 1) {
      item.notes = `Used in: ${item.sources.map(s => s.recipe).join(', ')}`;
    }
    delete item.sources;
    return item;
  });
}

/**
 * Exports shopping list to various formats
 */
export function exportShoppingList(summary, format = 'text') {
  if (format === 'text') {
    return generateTextList(summary);
  } else if (format === 'csv') {
    return generateCSVList(summary);
  }
  return summary;
}

function generateTextList(summary) {
  let text = `Shopping List for ${summary.event}\n`;
  text += `Servings: ${summary.servings}\n`;
  text += `Generated: ${new Date(summary.generated).toLocaleDateString()}\n\n`;

  summary.stores.forEach(store => {
    text += `\n${store.name.toUpperCase()}\n`;
    text += '='.repeat(store.name.length) + '\n\n';

    Object.entries(store.categories).forEach(([category, items]) => {
      text += `${category.charAt(0).toUpperCase() + category.slice(1)}:\n`;
      items.forEach(item => {
        text += `  □ ${item.display}\n`;
        if (item.storage) {
          text += `     Storage: ${item.storage}\n`;
        }
      });
      text += '\n';
    });
  });

  if (summary.notes.length > 0) {
    text += '\nShopping Tips:\n';
    summary.notes.forEach(note => {
      text += `${note}\n`;
    });
  }

  return text;
}

function generateCSVList(summary) {
  const rows = [
    ['Store', 'Category', 'Item', 'Quantity', 'Unit', 'Notes']
  ];

  summary.stores.forEach(store => {
    store.items.forEach(item => {
      rows.push([
        store.name,
        item.category,
        item.parsed.item,
        item.shopping.quantity,
        item.shopping.unit,
        item.storage || ''
      ]);
    });
  });

  return rows.map(row => row.map(cell => 
    `"${String(cell).replace(/"/g, '""')}"`
  ).join(',')).join('\n');
}