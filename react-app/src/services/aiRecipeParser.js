// AI Recipe Parser
// Extracts recipe data from AI chat responses

export function parseRecipeFromAIResponse(text) {
  const recipe = {
    name: '',
    servings: 0,
    ingredients: [],
    instructions: [],
    notes: '',
    source: 'AI Chat',
    tags: ['ai-generated']
  };
  
  // Remove common save instructions from the end of the text
  let cleanText = text.replace(/[\n\s]*(save\s+(that|this|it|the\s+recipe)\s+(to\s+)?my\s+(recipes?|collection)\s*please?)[\s\n]*$/i, '');
  text = cleanText;

  // Extract recipe name - look for titles in caps or after "Recipe:" or in quotes
  const namePatterns = [
    /"([^"]+)"\s+(?:salsa|soup|tacos?|recipe|dip|sauce|pasta|chicken|beef)/i, // Quoted recipe names
    /my\s+"([^"]+)"/i, // "my 'Recipe Name'"
    /^([A-Z][A-Z\s\-']+(?:[A-Z][A-Z\s\-']+)*)\s*(?:\n|$)/m, // All caps title
    /^([A-Z][\w\s\-']+(?:TACOS?|RECIPE|SOUP|SALAD|SALSA|DIP|PASTA|CHICKEN|BEEF|PORK|FISH|CAKE|PIE|BREAD|CUSTARD|DESSERT|ICE\s*CREAM|FROZEN)[\w\s\-']*)\s*(?:\n|$)/im, // Title with food keywords
    /(?:recipe|called|titled|named):\s*"?([^"\n]+)"?/i,
    /^#+ (.+?)$/m, // Markdown headers
    /^(.+?)\s*\n+(?:ingredients?:)/im, // Line before ingredients
    /(?:vanilla|chocolate|strawberry|caramel)\s+([\w\s]+(?:custard|ice\s*cream|frozen\s*dessert|pie))/i, // Flavor + dessert type
    /frozen\s+([\w\s]+)\s+recipe/i // "frozen X recipe"
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      const potentialName = match[1].trim();
      // Skip if it looks like an acknowledgment
      if (!/^(sure|okay|got it|fine|alright|i'll save|saving)/i.test(potentialName)) {
        recipe.name = potentialName;
        break;
      }
    }
  }
  
  // If no name found, try to extract from first non-empty line
  if (!recipe.name) {
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 5 && trimmed.length < 100 && 
          !/^(ingredients?|instructions?|steps?|notes?):/i.test(trimmed) &&
          !/^(sure|okay|got it|fine|alright|i'll save|saving)/i.test(trimmed)) {
        recipe.name = trimmed;
        break;
      }
    }
  }
  
  // If still no name, check for custard/ice cream/frozen dessert mentions
  if (!recipe.name) {
    const custardMatch = text.match(/(?:ninja\s+creami|frozen|vanilla|chocolate)\s+(?:custard|ice\s*cream|frozen\s+dessert)(?:\s+pie)?(?:\s+(?:ice\s+cream|recipe))?/i);
    if (custardMatch) {
      recipe.name = custardMatch[0].trim();
    }
  }
  
  // Check for specific recipe types mentioned in the text
  if (!recipe.name) {
    const recipeTypeMatch = text.match(/(?:make|making|create|creating)\s+(?:a\s+)?([^.!?\n]+?(?:custard|ice cream|dessert|pie|treat|recipe))/i);
    if (recipeTypeMatch) {
      recipe.name = recipeTypeMatch[1].trim();
    }
  }
  
  // Look for "X-inspired Y" pattern (like "vanilla custard pie-inspired frozen dessert")
  if (!recipe.name) {
    const inspiredMatch = text.match(/\b([\w\s]+-inspired\s+[\w\s]+(?:dessert|ice cream|custard|treat))/i);
    if (inspiredMatch) {
      recipe.name = inspiredMatch[1].trim();
    }
  }
  
  // Final fallback - generic name based on content
  if (!recipe.name && recipe.ingredients.length > 0) {
    recipe.name = "Frozen Custard Recipe";
  }

  // Extract servings - look for various patterns
  const servingsPatterns = [
    /(?:serves?|servings?|yield|makes?)(?:\s*:)?\s*(\d+)/i,
    /(?:makes?|yields?)(?:\s+about)?\s+(\d+)\s+(?:pieces?|servings?|portions?)/i,
    /(\d+)\s+(?:pieces?|servings?|portions?)/i,
    /(?:about|approximately|roughly)\s+(\d+)\s+(?:pieces?|candies|taffies)/i
  ];
  
  for (const pattern of servingsPatterns) {
    const match = text.match(pattern);
    if (match) {
      recipe.servings = parseInt(match[1]);
      break;
    }
  }
  
  // Default to a reasonable serving size if not found
  if (recipe.servings === 0) {
    recipe.servings = 4; // Default serving size
  }

  // Extract ingredients section - also check for "You'll need:" format
  // Allow for inline content (no newline required)
  // First normalize quotes in the text for searching
  const normalizedText = text.replace(/['']/g, "'");
  const ingredientsStart = normalizedText.search(/(?:ingredients?|you'll\s+need|you\s+will\s+need|what\s+you\s+need|you\s+need):?\s*/i);
  const instructionsStart = normalizedText.search(/(?:instructions?|steps?|directions?|method):?\s*/i);
  
  if (ingredientsStart !== -1 && instructionsStart !== -1) {
    const ingredientsSection = text.substring(ingredientsStart, instructionsStart);
    console.log('Ingredients section extracted:', ingredientsSection);
    recipe.ingredients = parseIngredients(ingredientsSection);
    console.log('Parsed ingredients:', recipe.ingredients);
  } else if (ingredientsStart !== -1) {
    // If we have ingredients but no clear instructions marker, try to extract anyway
    const ingredientsSection = text.substring(ingredientsStart);
    console.log('Ingredients section (no clear end):', ingredientsSection);
    recipe.ingredients = parseIngredients(ingredientsSection);
  }

  // Extract instructions section
  if (instructionsStart !== -1) {
    const instructionsSection = text.substring(instructionsStart);
    recipe.instructions = parseInstructions(instructionsSection);
  }

  // Extract any notes or tips
  const notesMatch = text.match(/(?:notes?|tips?|pro tips?):\s*(.+?)(?:\n\n|$)/is);
  if (notesMatch) {
    recipe.notes = notesMatch[1].trim();
  }

  return recipe;
}

function parseIngredients(text) {
  const ingredients = [];
  
  // First, remove the header part to get just the ingredients content
  // Normalize quotes first
  const normalizedText = text.replace(/['']/g, "'");
  const cleanedText = normalizedText.replace(/(?:ingredients?|you'll\s+need|you\s+will\s+need|what\s+you\s+need|you\s+need):?\s*/i, '');
  
  // Check if all ingredients are on one line (inline format)
  console.log('Checking for inline ingredients in:', cleanedText.substring(0, 100) + '...');
  
  // Handle format with dashes: "You'll need: - One cup - Two eggs"
  if (cleanedText.includes(' - ')) {
    console.log('Found dash-separated ingredients');
    const parts = cleanedText.split(/\s+-\s+/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed && trimmed.length > 0 && !trimmed.toLowerCase().includes('steps:')) {
        ingredients.push(trimmed);
      }
    }
  } 
  // Also handle format without leading dash: "You'll need: One cup heavy cream..."
  else if (!cleanedText.includes('\n') || cleanedText.indexOf('\n') > 100) {
    console.log('Trying to parse inline ingredients without dashes');
    // Look for ingredient patterns
    const inlinePattern = /(?:^|\s)((?:one|two|three|four|five|six|seven|eight|nine|ten|\d+(?:\/\d+)?)\s+(?:cup|tablespoon|teaspoon|pound|ounce|gram|tbsp|tsp|oz|lb)s?\s+[^,\n]+)/gi;
    let match;
    while ((match = inlinePattern.exec(cleanedText)) !== null) {
      ingredients.push(match[1].trim());
    }
    
    // Also add items that look like ingredients even without measurements
    if (ingredients.length === 0) {
      // Split by common separators and look for food items
      const possibleIngredients = cleanedText.split(/[,;]/);
      for (const item of possibleIngredients) {
        const trimmed = item.trim();
        if (trimmed.length > 3 && trimmed.length < 50 && !trimmed.toLowerCase().includes('steps:')) {
          ingredients.push(trimmed);
        }
      }
    }
  } else {
    // Original line-by-line parsing
    const lines = cleanedText.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Parse ingredient lines that start with -, *, •, or numbers
      if (/^[-*•·]\s*/.test(trimmed) || /^\d/.test(trimmed)) {
        const cleaned = trimmed.replace(/^[-*•·]\s*/, '').trim();
        // Just add the cleaned line as a string
        if (cleaned) ingredients.push(cleaned);
      } else if (trimmed.length > 2 && !trimmed.toLowerCase().includes('ingredient')) {
        // Also include lines that don't start with bullets but look like ingredients
        ingredients.push(trimmed);
      }
    }
  }
  
  return ingredients;
}


function parseInstructions(text) {
  const instructions = [];
  
  // First, remove the header part to get just the instructions content
  const cleanedText = text.replace(/(?:instructions?|steps?|directions?|method):?\s*/i, '');
  
  // Check if instructions are numbered inline (e.g., "1. Do this 2. Do that")
  const inlineNumberedMatch = cleanedText.match(/(\d+)\.\s*[^.]+(?:\s+(\d+)\.\s*[^.]+)*/);
  if (inlineNumberedMatch && !cleanedText.includes('\n')) {
    // Split by numbered steps for inline format
    const parts = cleanedText.split(/\s+(?=\d+\.)/);
    for (const part of parts) {
      const stepMatch = part.match(/^\d+\.\s*(.+)/);
      if (stepMatch) {
        instructions.push(stepMatch[1].trim());
      }
    }
  } else {
    // Original line-by-line parsing
    const lines = cleanedText.split('\n');
    let currentInstruction = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Check if this is a numbered step
      const numberedMatch = trimmed.match(/^(\d+)[\.\)]\s*(.+)/);
      if (numberedMatch) {
        // Save previous instruction if any
        if (currentInstruction) {
          instructions.push(currentInstruction.trim());
        }
        currentInstruction = numberedMatch[2];
      } else if (/^[-*•·]\s*/.test(trimmed)) {
        // Bullet point - new instruction
        if (currentInstruction) {
          instructions.push(currentInstruction.trim());
        }
        currentInstruction = trimmed.replace(/^[-*•·]\s*/, '');
      } else if (trimmed.length > 5) {
        // If it's a substantial line, treat it as a new instruction
        if (currentInstruction) {
          instructions.push(currentInstruction.trim());
        }
        currentInstruction = trimmed;
      } else {
        // Short line - continuation of current instruction
        currentInstruction += ' ' + trimmed;
      }
    }
    
    // Don't forget the last instruction
    if (currentInstruction) {
      instructions.push(currentInstruction.trim());
    }
  }
  
  return instructions;
}

// Function to detect if a message contains a recipe
export function detectRecipeInMessage(message) {
  console.log('detectRecipeInMessage called, message length:', message.length);
  
  // Skip messages that are too short or are just acknowledgments
  if (message.length < 200) {
    console.log('Message too short, skipping');
    return false;
  }
  
  // Skip messages that are clearly just responses about saving
  const skipPatterns = [
    /^(sure|okay|got it|fine|alright|yeah|yes|absolutely|definitely),?\s+i'll save/i,
    /i'll save that.*for you/i,
    /saving.*recipe/i,
    /recipe.*saved/i,
    /i'll.*that recipe/i,
    /let me save/i,
    /^(done|saved|got it|stored|added)/i
  ];
  
  if (skipPatterns.some(pattern => pattern.test(message))) {
    console.log('Message matches skip pattern');
    return false;
  }
  
  // Check for both INGREDIENTS and INSTRUCTIONS sections (more flexible)
  // Look for headers with very flexible formatting
  // Handle both regular apostrophes (') and curly quotes ('')
  // Also handle inline format like "You'll need: - One cup..." where ingredients follow on same line
  const hasIngredientsHeader = /(?:ingredients?|you['']ll\s+need|you\s+will\s+need|what\s+you\s+need|you\s+need)[:.\s]/i.test(message);
  const hasInstructionsHeader = /(?:instructions?|steps?|directions?|method)[:.\s]/i.test(message);
  
  console.log('Has ingredients header:', hasIngredientsHeader);
  console.log('Has instructions header:', hasInstructionsHeader);
  
  // Check for inline ingredient format (like "You'll need: - One cup...")
  // Also check for the pattern without the dash
  const hasInlineIngredients = /you['']ll\s+need:\s*[-\s]*\w+/i.test(message);
  console.log('Has inline ingredients:', hasInlineIngredients);
  
  // Additional check for "You'll need:" anywhere in the text
  const hasYoullNeed = /you['']ll\s+need/i.test(message);
  console.log('Has "You\'ll need" phrase:', hasYoullNeed);
  
  // Debug: Check what's actually in the message
  const youllNeedIndex = message.toLowerCase().indexOf("you'll need");
  const youllNeedWithQuoteIndex = message.toLowerCase().indexOf("you'll need");
  console.log("Index of you'll need:", youllNeedIndex);
  console.log("Index of you'll need with quote:", youllNeedWithQuoteIndex);
  
  // Check for the actual unicode character
  if (message.includes("You'll")) {
    console.log("Contains You'll with curly quote (Unicode 2019)");
  }
  
  // NEW: More lenient check - if message contains "you'll need" (any variation) and "steps:", it's likely a recipe
  // Convert all types of quotes to regular quotes for comparison
  const normalizedMessage = message.toLowerCase().replace(/['']/g, "'");
  const containsYoullNeed = normalizedMessage.includes("you'll need") || 
                           normalizedMessage.includes("you will need") ||
                           normalizedMessage.includes("youll need");
  const containsSteps = normalizedMessage.includes("steps:") || 
                       normalizedMessage.includes("instructions:");
  
  console.log('Contains "you\'ll need" (any form):', containsYoullNeed);
  console.log('Contains steps/instructions:', containsSteps);
  
  // Must have both sections (or "You'll need" phrase with instructions)
  if (!((hasIngredientsHeader || hasInlineIngredients || hasYoullNeed || containsYoullNeed) && (hasInstructionsHeader || containsSteps))) {
    console.log('Missing required headers');
    return false;
  }
  
  // Check for measurement units (sign of actual ingredients)
  const hasMeasurements = /\d+\s*(cups?|tablespoons?|tbsp?|teaspoons?|tsp?|pounds?|lbs?|oz|ounces?|cloves?|medium|large|small)/i.test(message);
  console.log('Has measurements:', hasMeasurements);
  
  // Check for numbered steps or bullet points in instructions
  const hasSteps = /(?:^|\n)\s*(?:\d+[\.)]\s*|[-*•·]\s*).{10,}/m.test(message);
  console.log('Has steps:', hasSteps);
  
  // More lenient check - just need headers and some content
  return hasIngredientsHeader && hasInstructionsHeader && (hasMeasurements || hasSteps);
}

// Function to check if user wants to save a recipe
export function detectSaveIntent(message) {
  const savePatterns = [
    /save\s+(this|that|the)?\s*recipe/i,
    /save\s+(this|that|it)?\s*to\s*(my)?\s*recipes?/i,  // "save that to my recipes"
    /save\s+(this|that|it)?\s*for\s*me/i,  // "save that for me"
    /add\s+(this|that|it)?\s*to\s*(my)?\s*recipes?/i,
    /keep\s+(this|that|the)?\s*recipe/i,
    /store\s+(this|that|the)?\s*recipe/i,
    /yes\s*please\s*save/i,
    /please\s*save\s*(this|that|it)?/i,  // "please save that"
    /save\s*(this|that|it)?$/i,  // just "save" or "save it" at end
    /^save\s*(this|that|it)?/i,  // just "save" or "save it" at start
    /can\s*you\s*save\s*(this|that|it)?/i,  // "can you save this"
    /would\s*you\s*save\s*(this|that|it)?/i,  // "would you save that"
    /add\s*(this|that|it)?\s*to\s*(my)?\s*collection/i,  // "add to my collection"
    /put\s*(this|that|it)?\s*in\s*(my)?\s*recipes?/i  // "put it in my recipes"
  ];
  
  return savePatterns.some(pattern => pattern.test(message));
}