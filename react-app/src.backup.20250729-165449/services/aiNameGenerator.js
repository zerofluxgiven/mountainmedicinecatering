// AI Name Generator Service
// Generates witty, contextual names for the AI assistant

const prefixes = [
  'Chef', 'Captain', 'Lord', 'Master', 'Baron',
  'Sir', 'Dame', 'Professor', 'Doctor', 'Señor',
  'Madame', 'Monsieur', 'Commander', 'General', 'Admiral'
];

const descriptors = [
  'Sarcastic', 'Grumpy', 'Caffeinated', 'Sassy', 'Cranky',
  'Witty', 'Burned-Out', 'Overworked', 'Melodramatic', 'Theatrical',
  'Passive-Aggressive', 'Sleep-Deprived', 'Overcaffeinated', 'Zen', 'Chaotic'
];

const nouns = [
  'Whisk', 'Spatula', 'Burninator', 'Saucepan', 'Cleaver',
  'Tenderizer', 'Mandoline', 'Blowtorch', 'Mixer', 'Grater',
  'Peeler', 'Strainer', 'Ladle', 'Tongs', 'Thermometer'
];

const suffixes = [
  'the Wise', 'of Doom', 'Supreme', 'the Merciless', 'the Gentle',
  'the Unhinged', 'the Enlightened', 'the Exhausted', 'the Magnificent',
  'the Questionable', 'III', 'Jr.', 'the Great', 'the Terrible', 'Maximus'
];

// Context-specific name sets
const contextNames = {
  events: [
    'The Event Whisperer',
    'Captain Menu Panic',
    'Lord of the Last-Minute',
    'Banquet Breakdown Betty',
    'Catering Catastrophe Chris',
    'The Portion Police',
    'Admiral Allergy Alert'
  ],
  recipes: [
    'Recipe Wrecker 3000',
    'The Scaling Sorcerer',
    'Measurement Mayhem Mike',
    'The Imperial-to-Metric Menace',
    'Sous Vide Susie',
    'The Mise en Place Master',
    'Batch Size Barbara'
  ],
  allergies: [
    'Gluten Detective',
    'The Nut Job Inspector',
    'Dairy Destroyer Dan',
    'Allergen Assassin',
    'The Cross-Contamination Cop',
    'EpiPen Eddie',
    'Lactose Intolerance Larry'
  ],
  menus: [
    'Menu Madness Max',
    'The Course Coordinator',
    'Plating Perfectionist Pat',
    'The Garnish Gremlin',
    'Service Window Sam',
    'Hot Hold Hannah'
  ],
  morning: [
    'Breakfast Burnout',
    'Coffee-Deprived Carl',
    'Morning Grump',
    'The Espresso Expressionist',
    'Eggs Benedict Arnold',
    'Pancake Pandemonium Pete'
  ],
  evening: [
    'Midnight Snack Oracle',
    'The Night Shift Nightmare',
    'Insomnia Chef Ivan',
    'Late Night Line Cook',
    'The 3AM Prep Cook'
  ],
  error: [
    '404 Chef Not Found',
    'Blue Screen of Death Baker',
    'Kernel Panic Kitchen',
    'The Glitched Gourmet',
    'Segfault Sauté Sally'
  ]
};

// Special names for Dan
const danSpecialNames = [
  'Your Faithful Code Companion',
  'The Blessed Assistant',
  'Captain Appreciation',
  'The Grateful Gourmet',
  'Your Digital Sous Chef',
  'Team Dan\'s Tech Chef'
];

// Full random name patterns
const fullNamePatterns = [
  '{prefix} {descriptor} {noun}',
  '{prefix} {noun} {suffix}',
  '{descriptor} {noun} {suffix}',
  '{prefix} {descriptor} {noun} {suffix}',
  'The {descriptor} {noun}',
  '{noun} Mc{noun}face',
  '{prefix} \"{descriptor}\" {noun}',
  '{noun} the {descriptor}'
];

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePatternName() {
  const pattern = getRandomItem(fullNamePatterns);
  return pattern
    .replace('{prefix}', getRandomItem(prefixes))
    .replace('{descriptor}', getRandomItem(descriptors))
    .replace('{noun}', getRandomItem(nouns))
    .replace('{suffix}', getRandomItem(suffixes));
}

function getTimeBasedNames() {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 11) {
    return contextNames.morning;
  } else if (hour >= 22 || hour < 5) {
    return contextNames.evening;
  }
  
  return null;
}

export function generateAIName(context = {}) {
  // Special handling for Dan
  if (context.userName?.toLowerCase().includes('dan') && Math.random() < 0.3) {
    return getRandomItem(danSpecialNames);
  }
  
  // Check for error state
  if (context.isError) {
    return getRandomItem(contextNames.error);
  }
  
  // Time-based names have priority
  const timeNames = getTimeBasedNames();
  if (timeNames && Math.random() < 0.3) {
    return getRandomItem(timeNames);
  }
  
  // Context-based names
  let contextPool = [];
  
  if (context.page?.includes('event')) {
    contextPool = contextPool.concat(contextNames.events);
  }
  if (context.page?.includes('recipe')) {
    contextPool = contextPool.concat(contextNames.recipes);
  }
  if (context.page?.includes('allerg') || context.hasAllergies) {
    contextPool = contextPool.concat(contextNames.allergies);
  }
  if (context.page?.includes('menu')) {
    contextPool = contextPool.concat(contextNames.menus);
  }
  
  // 40% chance to use context-specific name if available
  if (contextPool.length > 0 && Math.random() < 0.4) {
    return getRandomItem(contextPool);
  }
  
  // Otherwise generate a pattern-based name
  return generatePatternName();
}

// Get a new name for the session
export function getSessionAIName(context = {}) {
  const sessionKey = 'ai_session_name';
  const sessionTimeKey = 'ai_session_time';
  
  // Check if we have a recent session name (within 30 minutes)
  const savedName = localStorage.getItem(sessionKey);
  const savedTime = localStorage.getItem(sessionTimeKey);
  
  if (savedName && savedTime) {
    const timeDiff = Date.now() - parseInt(savedTime);
    if (timeDiff < 30 * 60 * 1000) { // 30 minutes
      return savedName;
    }
  }
  
  // Generate new name
  const newName = generateAIName(context);
  localStorage.setItem(sessionKey, newName);
  localStorage.setItem(sessionTimeKey, Date.now().toString());
  
  return newName;
}

// Force a new name
export function regenerateAIName(context = {}) {
  const newName = generateAIName(context);
  localStorage.setItem('ai_session_name', newName);
  localStorage.setItem('ai_session_time', Date.now().toString());
  return newName;
}