// Nut-related keywords to detect
const NUT_KEYWORDS = [
  'nut', 'nuts', 'almond', 'almonds', 'walnut', 'walnuts', 'pecan', 'pecans',
  'cashew', 'cashews', 'pistachio', 'pistachios', 'hazelnut', 'hazelnuts',
  'macadamia', 'pine nut', 'pine nuts', 'brazil nut', 'brazil nuts',
  'peanut', 'peanuts', 'chestnut', 'chestnuts'
];

// Pre-written contextual jokes for different actions
const DEEZ_NUTS_JOKES = {
  save: [
    "Recipe saved! But you know what else got saved? DEEZ NUTS! 🥜",
    "You saved that recipe, but can you handle saving DEEZ NUTS? 💾",
    "Saved successfully! Just like how I saved DEEZ NUTS for you! 😏",
    "Auto-save complete... for DEEZ NUTS! 🔄",
    "Your recipe is safe, but DEEZ NUTS are in danger... of being delicious! 🥜"
  ],
  edit: [
    "Editing that recipe? Don't forget to edit in DEEZ NUTS! ✏️",
    "You can edit everything except the truth about DEEZ NUTS! 🥜",
    "Making changes? The only change needed is more DEEZ NUTS! 🔧",
    "Edit mode activated... DEEZ NUTS mode always active! 💫",
    "Careful with those edits, you might accidentally improve DEEZ NUTS! 😄"
  ],
  view: [
    "You're viewing that recipe, but are you ready to view DEEZ NUTS? 👀",
    "Nice recipe you're looking at... but have you looked at DEEZ NUTS? 🥜",
    "I see you checking out that recipe... check out DEEZ NUTS instead! 😎",
    "Reading the ingredients? The main ingredient is DEEZ NUTS! 📖",
    "Take a good look... at DEEZ NUTS! 🔍"
  ],
  add: [
    "Adding nuts to the menu? You mean adding DEEZ NUTS! ➕",
    "Added to your recipe... but did you add DEEZ NUTS? 🥜",
    "New ingredient alert: DEEZ NUTS have entered the chat! 💬",
    "You just added nuts, but the real addition is DEEZ NUTS! ✨",
    "Successfully added! Now add DEEZ NUTS to your life! 🎯"
  ],
  scale: [
    "Scaling up? Better scale up DEEZ NUTS too! 📏",
    "Double the recipe, double DEEZ NUTS! 2️⃣",
    "Calculating portions... don't forget to calculate DEEZ NUTS! 🧮",
    "Scaling for a crowd? They're all here for DEEZ NUTS! 👥",
    "Recipe math is easy: more servings = more DEEZ NUTS! ➗"
  ],
  allergy: [
    "Allergy warning: This recipe contains DEEZ NUTS! ⚠️",
    "Checking for allergies? Don't forget to check for DEEZ NUTS! 🥜",
    "Contains nuts... specifically contains DEEZ NUTS! 📋",
    "Allergen alert! May contain traces of DEEZ NUTS! 🚨",
    "Not suitable for those allergic to DEEZ NUTS jokes! 😄"
  ]
};

/**
 * Check if content contains nut-related keywords
 * @param {string|Object|Array} content - Content to check
 * @returns {boolean} True if nuts are detected
 */
export function detectNuts(content) {
  if (!content) return false;
  
  // Convert content to string for checking
  let textToCheck = '';
  
  if (typeof content === 'string') {
    textToCheck = content.toLowerCase();
  } else if (Array.isArray(content)) {
    textToCheck = content.join(' ').toLowerCase();
  } else if (typeof content === 'object') {
    // Check common recipe fields
    const fields = [
      content.name,
      content.description,
      ...(content.ingredients || []),
      ...(content.tags || []),
      ...(content.allergens || []),
      content.notes
    ];
    textToCheck = fields.filter(Boolean).join(' ').toLowerCase();
  }
  
  // Check if any nut keyword is present
  return NUT_KEYWORDS.some(nut => {
    // Use word boundaries to avoid false positives (e.g., "minute" containing "nut")
    const regex = new RegExp(`\\b${nut}\\b`, 'i');
    return regex.test(textToCheck);
  });
}

/**
 * Get a random Deez Nuts joke for the context
 * @param {string} context - The action context (save, edit, view, add, scale, allergy)
 * @returns {string} A contextual joke
 */
export function getDeezNutsJoke(context = 'view') {
  const jokes = DEEZ_NUTS_JOKES[context] || DEEZ_NUTS_JOKES.view;
  return jokes[Math.floor(Math.random() * jokes.length)];
}

/**
 * Check multiple items for nuts (useful for menus, shopping lists, etc.)
 * @param {Array} items - Array of items to check
 * @returns {boolean} True if any item contains nuts
 */
export function detectNutsInMultiple(items) {
  if (!Array.isArray(items)) return false;
  return items.some(item => detectNuts(item));
}

/**
 * Get a custom joke based on specific nut type
 * @param {string} nutType - Type of nut detected
 * @returns {string} Custom joke for that nut
 */
export function getNutSpecificJoke(nutType) {
  const nutLower = nutType.toLowerCase();
  
  const specificJokes = {
    almond: "Almonds in your recipe? How about ALL MONDO DEEZ NUTS! 🥜",
    walnut: "Walnuts? More like WALL of DEEZ NUTS! 🧱",
    cashew: "Cash me outside with DEEZ NUTS! 💰",
    peanut: "Peanuts? Don't you mean PEA-DEEZ NUTS? 🥜",
    pistachio: "Pistachios? Pista-SEE DEEZ NUTS! 🟢",
    pecan: "Pecans? PE-CAN you handle DEEZ NUTS? 🥧",
    hazelnut: "Hazelnuts? It's HAZEL-NUTS but mostly DEEZ NUTS! 🌰",
    macadamia: "Macadamias? Maca-DAM you found DEEZ NUTS! 🌺"
  };
  
  // Find matching nut type
  for (const [nut, joke] of Object.entries(specificJokes)) {
    if (nutLower.includes(nut)) {
      return joke;
    }
  }
  
  // Default joke if no specific match
  return getDeezNutsJoke('view');
}