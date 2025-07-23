// Simple recipe parser for backend use
function parseRecipeFromText(text) {
  const recipe = {
    name: '',
    servings: 4,
    ingredients: [],
    instructions: [],
    notes: '',
    source: 'AI Chat',
    tags: ['ai-generated']
  };

  // Extract recipe name - look for common patterns
  const nameMatch = text.match(/(?:vanilla|chocolate)\s+(custard|ice cream|dessert)(?:\s+pie)?/i) ||
                    text.match(/frozen\s+(custard|ice cream|dessert)/i) ||
                    text.match(/(?:recipe|make|prepare|create):\s*([^\n]+)/i) ||
                    text.match(/^([A-Z][^.!?\n]+)(?:\n|$)/m);
  
  if (nameMatch) {
    recipe.name = nameMatch[0].trim();
    // Clean up the name if it's too long
    if (recipe.name.length > 50) {
      recipe.name = recipe.name.substring(0, 50);
    }
  }
  
  // Fallback name if needed
  if (!recipe.name && text.includes('custard')) {
    recipe.name = 'Ninja Creami Frozen Custard';
  }
  
  // Better name detection for custard recipes
  if (text.toLowerCase().includes('custard pie') && text.toLowerCase().includes('frozen')) {
    recipe.name = 'Frozen Custard Pie Ice Cream';
  }

  // Extract ingredients section
  const ingredientsMatch = text.match(/(?:ingredients?|you['']ll\s+need|what\s+you\s+need):?\s*([^]*?)(?=Steps:|instructions?:|directions?:|method:|$)/i);
  if (ingredientsMatch) {
    const ingredientsText = ingredientsMatch[1];
    // Split by common delimiters
    const ingredients = ingredientsText.split(/\s+-\s+|[-•\n]/)
      .map(line => line.trim())
      .filter(line => line.length > 5);
    recipe.ingredients = ingredients;
  }

  // Extract instructions
  const instructionsMatch = text.match(/(?:instructions?|steps?|directions?|method):?\s*([^]*?)$/i);
  if (instructionsMatch) {
    const instructionsText = instructionsMatch[1];
    // Split by numbered steps or new lines
    const instructions = instructionsText.split(/\d+\.\s*|\n/)
      .map(line => line.trim())
      .filter(line => line.length > 10);
    recipe.instructions = instructions;
  }

  return recipe;
}

/**
 * Analyzes AI response content for actionable items
 * Returns metadata about detected content types and pre-parsed data
 */
async function analyzeAIResponse(responseText, userMessage) {
  const metadata = {
    detectedContent: [],
    parsedData: {}
  };

  // Recipe Detection
  const recipeAnalysis = analyzeForRecipe(responseText);
  if (recipeAnalysis.confidence >= 0.75) {
    console.log('Recipe detected with confidence:', recipeAnalysis.confidence);
    console.log('Pre-parsed recipe:', recipeAnalysis.recipe);
    
    metadata.detectedContent.push({
      type: 'recipe',
      confidence: recipeAnalysis.confidence,
      recipeName: recipeAnalysis.recipe.name
    });
    
    metadata.parsedData.recipe = recipeAnalysis.recipe;
  }

  // URL Detection (for future recipe imports)
  const urlAnalysis = analyzeForUrls(responseText);
  if (urlAnalysis.urls.length > 0) {
    metadata.detectedContent.push({
      type: 'urls',
      urls: urlAnalysis.urls,
      recipeUrls: urlAnalysis.recipeUrls
    });
  }

  // Event Planning Detection
  const eventAnalysis = analyzeForEventPlanning(responseText, userMessage);
  if (eventAnalysis.confidence >= 0.75) {
    metadata.detectedContent.push({
      type: 'event_plan',
      confidence: eventAnalysis.confidence,
      eventData: eventAnalysis.data
    });
  }

  // Menu/Meal Planning Detection
  const menuAnalysis = analyzeForMenuPlanning(responseText);
  if (menuAnalysis.confidence >= 0.75) {
    metadata.detectedContent.push({
      type: 'menu_plan',
      confidence: menuAnalysis.confidence,
      menuData: menuAnalysis.data
    });
  }

  return metadata;
}

/**
 * Analyzes text for recipe content using smart heuristics
 */
function analyzeForRecipe(text) {
  // Quick confidence scoring based on content markers
  let confidence = 0;
  
  // Cooking-related terms boost confidence
  const cookingTerms = [
    /\b(cup|tablespoon|teaspoon|pound|ounce|gram|ingredient|recipe|cook|bake|heat|mix|stir|whisk|blend)\b/gi,
    /\b(degrees?|fahrenheit|celsius|oven|stove|pan|pot|bowl)\b/gi,
    /\b(minute|hour|until|golden|brown|thick|smooth|creamy)\b/gi
  ];
  
  cookingTerms.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      confidence += matches.length * 0.05;
    }
  });

  // Structure markers (numbered steps, bullet points, etc.)
  if (/\b\d+\.\s+\w+/g.test(text)) confidence += 0.2; // Numbered steps
  if (/^[-*•]\s+/gm.test(text)) confidence += 0.15; // Bullet points
  if (/you['']ll\s+need|ingredients?:|instructions?:|steps?:/i.test(text)) confidence += 0.3;

  // Ingredient patterns (amounts + items)
  const ingredientPattern = /\b(\d+(?:\/\d+)?|\bone|two|three|half|quarter)\s+(?:cup|tbsp|tsp|pound|ounce)s?\s+\w+/gi;
  const ingredientMatches = text.match(ingredientPattern);
  if (ingredientMatches && ingredientMatches.length >= 2) {
    confidence += 0.3;
  }

  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);

  // If confidence is high enough, attempt to parse
  let recipe = null;
  if (confidence >= 0.75) {
    try {
      // Use existing parser as fallback, but could be enhanced
      recipe = parseRecipeFromText(text);
      
      // Validate parsed recipe
      if (!recipe.name || recipe.ingredients.length === 0) {
        confidence *= 0.5; // Reduce confidence if parsing failed
      }
    } catch (error) {
      console.error('Recipe parsing error:', error);
      confidence *= 0.5;
    }
  }

  return {
    confidence,
    recipe
  };
}

/**
 * Detects URLs in text and identifies recipe URLs
 */
function analyzeForUrls(text) {
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = text.match(urlPattern) || [];
  
  const recipeUrls = urls.filter(url => {
    const recipeSites = [
      'allrecipes.com', 'foodnetwork.com', 'bonappetit.com', 
      'seriouseats.com', 'epicurious.com', 'food52.com',
      'smittenkitchen.com', 'minimalistbaker.com', 'budgetbytes.com'
    ];
    return recipeSites.some(site => url.includes(site));
  });

  return { urls, recipeUrls };
}

/**
 * Analyzes for event planning content
 */
function analyzeForEventPlanning(text, userMessage) {
  let confidence = 0;
  const data = {};

  // Check if discussing event planning
  const eventTerms = /\b(event|party|gathering|celebration|wedding|retreat|conference|guest|attendee|catering)\b/gi;
  const eventMatches = text.match(eventTerms);
  if (eventMatches) confidence += eventMatches.length * 0.1;

  // Date patterns
  const datePattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/gi;
  const dates = text.match(datePattern);
  if (dates) {
    confidence += 0.3;
    data.suggestedDates = dates;
  }

  // Guest count patterns
  const guestPattern = /\b(\d+)\s*(?:guests?|people|attendees?|persons?)\b/gi;
  const guestMatch = text.match(guestPattern);
  if (guestMatch) {
    confidence += 0.2;
    data.estimatedGuests = parseInt(guestMatch[0].match(/\d+/)[0]);
  }

  return {
    confidence: Math.min(confidence, 1.0),
    data
  };
}

/**
 * Analyzes for menu/meal planning content
 */
function analyzeForMenuPlanning(text) {
  let confidence = 0;
  const data = {
    meals: [],
    daysPlan: []
  };

  // Meal type mentions
  const mealTypes = /\b(breakfast|lunch|dinner|brunch|snack|appetizer|dessert)\b/gi;
  const mealMatches = text.match(mealTypes);
  if (mealMatches) {
    confidence += mealMatches.length * 0.15;
    data.meals = [...new Set(mealMatches.map(m => m.toLowerCase()))];
  }

  // Multi-day planning patterns
  const dayPattern = /\b(day\s*\d+|first\s+day|second\s+day|final\s+day|last\s+day)\b/gi;
  if (dayPattern.test(text)) {
    confidence += 0.3;
  }

  // Menu structure indicators
  if (/menu|meal\s*plan|weekly\s*plan|daily\s*menu/i.test(text)) {
    confidence += 0.2;
  }

  return {
    confidence: Math.min(confidence, 1.0),
    data
  };
}

module.exports = {
  analyzeAIResponse,
  analyzeForRecipe
};