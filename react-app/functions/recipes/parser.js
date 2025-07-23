const axios = require("axios");
const cheerio = require("cheerio");
const he = require("he");

// Common allergens to detect
const COMMON_ALLERGENS = [
  "milk", "eggs", "fish", "shellfish", "tree nuts", "peanuts", 
  "wheat", "soybeans", "sesame", "gluten", "dairy", "nuts"
];

// Function to detect multiple recipe sections - ENHANCED VERSION
function detectRecipeSections(ingredients, instructions) {
  // Ensure we have valid inputs
  if (!Array.isArray(ingredients) || !instructions) {
    return null;
  }
  
  // Convert instructions to string if needed
  const instructionText = typeof instructions === 'string' 
    ? instructions 
    : Array.isArray(instructions) 
      ? instructions.join('\n') 
      : String(instructions || '');
  
  if (!instructionText) {
    return null;
  }

  console.log("Detecting recipe sections for ingredients:", ingredients.length, "instructions length:", instructionText.length);
  
  // First, check if ingredients already have section headers
  const sectionHeaderPatterns = [
    /^(.*?)\s*(?:ingredients|:)\s*$/i,
    /^for\s+(?:the\s+)?(.*?)(?:\s*:)?$/i,
    /^(.*?)\s+(?:layer|topping|filling|sauce|dressing|glaze|streusel|crust|base|mixture)(?:\s*:)?$/i
  ];
  
  const detectedSections = [];
  let currentSection = null;
  let currentIngredients = [];
  
  // Scan ingredients for section headers
  ingredients.forEach((ing, index) => {
    if (typeof ing !== 'string') return;
    
    let isHeader = false;
    for (const pattern of sectionHeaderPatterns) {
      const match = ing.match(pattern);
      if (match && match[1]) {
        // This is a section header
        if (currentSection && currentIngredients.length > 0) {
          detectedSections.push({
            label: currentSection,
            ingredients: currentIngredients,
            startIndex: index - currentIngredients.length
          });
        }
        currentSection = match[1].trim();
        // Capitalize each word
        currentSection = currentSection.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        currentIngredients = [];
        isHeader = true;
        break;
      }
    }
    
    if (!isHeader && ing.trim() !== '') {
      currentIngredients.push(ing);
    }
  });
  
  // Add the last section
  if (currentSection && currentIngredients.length > 0) {
    detectedSections.push({
      label: currentSection,
      ingredients: currentIngredients,
      startIndex: ingredients.length - currentIngredients.length
    });
  }
  
  // If we found sections from ingredient headers, process them
  if (detectedSections.length > 0) {
    console.log("Found sections from ingredient headers:", detectedSections.map(s => s.label));
    
    // Split instructions by section mentions
    const sectionedRecipe = [];
    
    detectedSections.forEach((section, index) => {
      // Try to find where this section is mentioned in instructions
      const sectionPattern = new RegExp(`(?:${section.label}|make\\s+(?:the\\s+)?${section.label}|prepare\\s+(?:the\\s+)?${section.label})`, 'i');
      const instructionMatch = instructionText.match(sectionPattern);
      
      let sectionInstructions = '';
      if (instructionMatch) {
        const startPos = instructionText.indexOf(instructionMatch[0]);
        // Find next section mention or end of text
        let endPos = instructionText.length;
        for (let j = index + 1; j < detectedSections.length; j++) {
          const nextPattern = new RegExp(`(?:${detectedSections[j].label}|make\\s+(?:the\\s+)?${detectedSections[j].label}|prepare\\s+(?:the\\s+)?${detectedSections[j].label})`, 'i');
          const nextMatch = instructionText.match(nextPattern);
          if (nextMatch) {
            const nextPos = instructionText.indexOf(nextMatch[0]);
            if (nextPos > startPos && nextPos < endPos) {
              endPos = nextPos;
            }
          }
        }
        sectionInstructions = instructionText.substring(startPos, endPos).trim();
      }
      
      sectionedRecipe.push({
        id: `section_${index}`,
        label: section.label,
        ingredients: section.ingredients,
        instructions: sectionInstructions || ''
      });
    });
    
    // If we have a main ingredient list at the beginning without a header
    const firstSectionIndex = detectedSections[0].startIndex;
    if (firstSectionIndex > 0) {
      const mainIngredients = ingredients.slice(0, firstSectionIndex).filter(ing => ing.trim() !== '');
      if (mainIngredients.length > 0) {
        sectionedRecipe.unshift({
          id: 'section_main',
          label: 'Main',
          ingredients: mainIngredients,
          instructions: ''
        });
      }
    }
    
    return sectionedRecipe.length > 1 ? sectionedRecipe : null;
  }
  
  // Fallback: Look for section indicators in instructions
  const instructionSectionPatterns = [
    /(?:^|\n)(?:for\s+(?:the\s+)?|to\s+make\s+(?:the\s+)?|prepare\s+(?:the\s+)?)([^:,\n]+)(?:\s*:)/gim,
    /(?:^|\n)([^:,\n]+?)\s+(?:ingredients|mixture|topping|filling|sauce|dressing|glaze|streusel|crust|base)(?:\s*:)/gim,
    /(?:^|\n)(?:make|prepare)\s+(?:the\s+)?([^:,\n]+?)(?:\s+by|:)/gim
  ];
  
  const foundSections = [];
  instructionSectionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(instructionText)) !== null) {
      const sectionName = match[1].trim();
      if (sectionName && !foundSections.find(s => s.label.toLowerCase() === sectionName.toLowerCase())) {
        foundSections.push({
          label: sectionName.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' '),
          startIndex: match.index
        });
      }
    }
  });
  
  if (foundSections.length > 0) {
    console.log("Found sections from instructions:", foundSections.map(s => s.label));
    
    // Sort by appearance order
    foundSections.sort((a, b) => a.startIndex - b.startIndex);
    
    // Try to assign ingredients to sections based on keywords
    const sectionedRecipe = [];
    
    foundSections.forEach((section, index) => {
      const nextIndex = foundSections[index + 1]?.startIndex || instructionText.length;
      const sectionInstructions = instructionText.substring(section.startIndex, nextIndex).trim();
      
      // Find ingredients that likely belong to this section
      const sectionIngredients = [];
      const sectionKeywords = section.label.toLowerCase().split(/\s+/);
      
      ingredients.forEach(ing => {
        if (typeof ing !== 'string') return;
        const ingLower = ing.toLowerCase();
        
        // Check if ingredient mentions section keywords
        if (sectionKeywords.some(keyword => ingLower.includes(keyword))) {
          sectionIngredients.push(ing);
        } else {
          // Check if this ingredient is mentioned in section instructions
          const ingWords = ing.replace(/^\d+[\s\S]*?\s+(?:of\s+)?/, '').toLowerCase().split(/\s+/);
          const mainIngredient = ingWords[ingWords.length - 1];
          if (sectionInstructions.toLowerCase().includes(mainIngredient)) {
            sectionIngredients.push(ing);
          }
        }
      });
      
      if (sectionIngredients.length > 0) {
        sectionedRecipe.push({
          id: `section_${index}`,
          label: section.label,
          ingredients: sectionIngredients,
          instructions: sectionInstructions
        });
      }
    });
    
    return sectionedRecipe.length > 1 ? sectionedRecipe : null;
  }
  
  // No sections detected
  console.log("No sections detected in recipe");
  return null;
}

// Recipe parsing prompt - ENHANCED for better section and instruction detection
const RECIPE_PARSE_PROMPT = `You are an expert recipe parser. Extract structured data from recipe text.
Return ONLY a valid JSON object.

CRITICAL RULES:
1. ALWAYS include ALL instructions - never skip or summarize them
2. Look for recipe sections like "Cowboy Caviar Ingredients:", "Zesty Dressing Ingredients:"
3. Preserve exact ingredient measurements and quantities
4. Capture all steps in the instructions, even if they seem long

If the recipe has MULTIPLE SECTIONS (look for headers like "X Ingredients:", "For the X:", etc.), use:
{
  "name": "Recipe name",
  "serves": number (default 4 if not specified),
  "sections": [
    {
      "label": "Section Name (e.g., 'Cowboy Caviar', 'Zesty Dressing')",
      "ingredients": ["exact ingredient with measurement", ...],
      "instructions": "Instructions specific to this section (if mentioned separately)"
    }
  ],
  "instructions": "COMPLETE instructions - include EVERY step mentioned",
  "prep_time": number (in minutes, or null),
  "cook_time": number (in minutes, or null),
  "total_time": number (in minutes, or null),
  "tags": ["relevant tags"],
  "allergens": ["detected allergens"],
  "notes": "any special notes"
}

If NO sections exist, use:
{
  "name": "Recipe name",
  "serves": number,
  "ingredients": ["exact ingredient with measurement", ...],
  "instructions": "COMPLETE instructions - include EVERY step",
  "prep_time": number (in minutes, or null),
  "cook_time": number (in minutes, or null),
  "total_time": number (in minutes, or null),
  "tags": ["tags"],
  "allergens": ["allergens"],
  "notes": "notes"
}

Section indicators to watch for:
- "Cowboy Caviar Ingredients:", "Zesty Dressing Ingredients:"
- "For the [component name]:", "Topping:", "Base:"
- Multiple ingredient lists with headers
- Different components mentioned in instructions

REMEMBER: Include ALL instructions, don't summarize or skip any steps!`;

async function parseRecipeFromText(text, openai) {
  try {
    console.log("Attempting to parse recipe with OpenAI...");
    console.log("Text length:", text?.length || 0);
    console.log("OpenAI client exists:", !!openai);
    console.log("OpenAI has apiKey:", !!openai?.apiKey);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: RECIPE_PARSE_PROMPT },
        { role: "user", content: text }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000
    });

    const parsedData = JSON.parse(response.choices[0].message.content);
    
    // Log the parsed data for debugging
    console.log("OpenAI parsed recipe data:", JSON.stringify(parsedData, null, 2));
    console.log("Serves value from OpenAI:", parsedData.serves, "Type:", typeof parsedData.serves);
    
    // Validate and clean the data
    return validateRecipeData(parsedData);
  } catch (error) {
    console.error("OpenAI parsing error:", error);
    console.error("Error status:", error.status);
    console.error("Error type:", error.type);
    
    if (error.status === 401) {
      throw new Error("OpenAI API authentication failed. The API key may be invalid.");
    } else if (error.status === 429) {
      throw new Error("OpenAI API rate limit exceeded. Please try again later.");
    } else if (error.status === 400) {
      throw new Error("Invalid request to OpenAI API: " + error.message);
    }
    
    throw new Error("Failed to parse recipe with AI: " + error.message);
  }
}

async function parseRecipeFromURL(url, openai) {
  try {
    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Try to find JSON-LD structured data first
    let recipeData = null;
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const json = JSON.parse($(elem).html());
        if (json["@type"] === "Recipe" || (Array.isArray(json["@graph"]) && 
            json["@graph"].some(item => item["@type"] === "Recipe"))) {
          recipeData = json["@type"] === "Recipe" ? json : 
                      json["@graph"].find(item => item["@type"] === "Recipe");
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    });

    let parsedRecipe;
    
    if (recipeData) {
      // Convert structured data to our format
      parsedRecipe = convertStructuredData(recipeData);
    } else {
      // Fallback to extracting text and using AI
      const textContent = extractRecipeText($);
      parsedRecipe = await parseRecipeFromText(textContent, openai);
    }
    
    // Add image URL if found
    const imageUrl = extractImageFromHtml($);
    if (imageUrl && !parsedRecipe.image_url) {
      parsedRecipe.image_url = imageUrl;
    }
    
    // Apply section detection if not already done and not skipped
    // Also check for _needsSectionDetection flag from structured data
    if ((!parsedRecipe._skipSectionDetection || parsedRecipe._needsSectionDetection) && 
        !parsedRecipe.sections && parsedRecipe.ingredients && parsedRecipe.instructions) {
      const sections = detectRecipeSections(parsedRecipe.ingredients, parsedRecipe.instructions);
      if (sections) {
        console.log("Detected recipe sections:", sections);
        parsedRecipe.sections = sections;
      }
    }
    
    // Remove internal flags before returning
    delete parsedRecipe._skipSectionDetection;
    delete parsedRecipe._needsSectionDetection;
    
    return parsedRecipe;

  } catch (error) {
    console.error("URL parsing error:", error);
    throw new Error("Failed to fetch or parse URL: " + error.message);
  }
}

function extractRecipeText($) {
  // Remove script and style elements
  $("script, style").remove();

  // Try to find recipe-specific content
  const recipeSelectors = [
    ".recipe-content",
    ".recipe-container",
    "[itemtype*='Recipe']",
    ".recipe-card",
    "#recipe",
    "main"
  ];

  let recipeText = "";
  for (const selector of recipeSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      recipeText = element.text();
      break;
    }
  }

  // If no recipe-specific content found, get main content
  if (!recipeText) {
    recipeText = $("body").text();
  }

  // Decode HTML entities
  recipeText = he.decode(recipeText);

  // Clean up the text
  return recipeText
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .substring(0, 6000); // Limit length for API - matching old parser
}

function extractImageFromHtml($) {
  // Try various selectors for recipe images
  const imageSelectors = [
    // Schema.org markup
    '[itemprop="image"] img',
    '[itemprop="image"]',
    '[property="og:image"]',
    
    // Common recipe image classes/IDs
    '.recipe-image img',
    '.recipe-photo img',
    '.recipe-img img',
    '#recipe-image img',
    '#recipe-photo img',
    '.wprm-recipe-image img',
    '.tasty-recipe-image img',
    '.mv-create-image img',
    '.recipe-hero img',
    '.recipe-featured-image img',
    
    // Generic but likely candidates
    'article img:first',
    'main img:first',
    '.entry-content img:first',
    '.post-content img:first'
  ];
  
  for (const selector of imageSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      // Try to get src, data-src, or content attribute
      const src = element.attr('src') || element.attr('data-src') || element.attr('content');
      if (src && (src.startsWith('http') || src.startsWith('//'))) {
        // Ensure it's a full URL
        if (src.startsWith('//')) {
          return 'https:' + src;
        }
        return src;
      }
    }
  }
  
  // Try meta tags
  const metaImage = $('meta[property="og:image"]').attr('content') ||
                    $('meta[name="twitter:image"]').attr('content');
  if (metaImage) {
    return metaImage;
  }
  
  // Try to find images in JavaScript data (for sites like peachie.recipes)
  const scriptTags = $('script:not([src])');
  for (let i = 0; i < scriptTags.length; i++) {
    const scriptContent = $(scriptTags[i]).html();
    if (scriptContent) {
      // Look for Cloudinary URLs or other image URLs in JavaScript
      // Match both http and https URLs
      const imageUrlMatch = scriptContent.match(/(https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^"'\s]*)?)/i);
      if (imageUrlMatch) {
        // Convert http to https for security
        return imageUrlMatch[1].replace(/^http:/, 'https:');
      }
      
      // Look for image properties in JSON-like structures
      const imagePropertyMatch = scriptContent.match(/["'](?:image|imageUrl|photo|picture)["']\s*:\s*["'](https?:\/\/[^"']+)["']/i);
      if (imagePropertyMatch) {
        return imagePropertyMatch[1].replace(/^http:/, 'https:');
      }
      
      // Look for window.__remixContext pattern (peachie.recipes specific)
      const remixContextMatch = scriptContent.match(/window\.__remixContext.*?"image"\s*:\s*"([^"]+)"/);
      if (remixContextMatch) {
        return remixContextMatch[1].replace(/^http:/, 'https:');
      }
    }
  }
  
  return null;
}

function convertStructuredData(data) {
  const recipe = {
    name: he.decode(data.name || "Untitled Recipe"),
    serves: extractServings(data.recipeYield),
    ingredients: [],
    instructions: '', // Change to string to match the rest of the system
    prep_time: parseDurationToMinutes(data.prepTime),
    cook_time: parseDurationToMinutes(data.cookTime),
    total_time: parseDurationToMinutes(data.totalTime),
    tags: [],
    allergens: [],
    notes: data.description ? he.decode(data.description) : null,
    image_url: extractImageUrl(data),
    _needsSectionDetection: true // Flag to force section detection
  };

  // Extract ingredients and decode HTML entities
  if (data.recipeIngredient) {
    const rawIngredients = Array.isArray(data.recipeIngredient) ? 
      data.recipeIngredient : [data.recipeIngredient];
    recipe.ingredients = rawIngredients.map(ing => he.decode(ing));
  }

  // Extract instructions and decode HTML entities
  if (data.recipeInstructions) {
    const instructions = Array.isArray(data.recipeInstructions) ? 
      data.recipeInstructions : [data.recipeInstructions];
    
    const instructionSteps = instructions.map(inst => {
      let text = "";
      if (typeof inst === "string") text = inst;
      else if (inst.text) text = inst.text;
      else if (inst.name) text = inst.name;
      else text = String(inst);
      return he.decode(text);
    });
    
    // Join the instructions with proper formatting
    recipe.instructions = instructionSteps.join('\n').trim();
  }

  // Extract tags from keywords or categories
  if (data.keywords) {
    recipe.tags = data.keywords.split(",").map(k => k.trim());
  }
  if (data.recipeCategory) {
    const categories = Array.isArray(data.recipeCategory) ? 
      data.recipeCategory : [data.recipeCategory];
    recipe.tags.push(...categories);
  }
  if (data.recipeCuisine) {
    recipe.tags.push(data.recipeCuisine);
  }

  // Detect allergens
  recipe.allergens = detectAllergens(recipe.ingredients.join(" "));

  return validateRecipeData(recipe);
}

function extractServings(yieldData) {
  if (!yieldData) return 4; // Default

  // If it's a number, return it
  if (typeof yieldData === "number") return yieldData;

  // If it's a string, try to extract number
  const match = String(yieldData).match(/\d+/);
  return match ? parseInt(match[0]) : 4;
}

// Extract image URL from structured data
function extractImageUrl(data) {
  // Check for direct image property
  if (data.image) {
    if (typeof data.image === 'string') {
      return data.image;
    } else if (data.image.url) {
      return data.image.url;
    } else if (Array.isArray(data.image) && data.image[0]) {
      return typeof data.image[0] === 'string' ? data.image[0] : data.image[0].url;
    }
  }
  
  // Check for thumbnailUrl
  if (data.thumbnailUrl) {
    return data.thumbnailUrl;
  }
  
  return null;
}

// Parse ISO 8601 duration (PT30M, PT1H30M) to minutes
function parseDurationToMinutes(duration) {
  if (!duration) return null;
  if (typeof duration === 'number') return duration;
  
  // Handle already numeric strings
  const numericMatch = String(duration).match(/^\d+$/);
  if (numericMatch) return parseInt(numericMatch[0]);
  
  // Parse ISO 8601 duration
  const match = String(duration).match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return null;
  
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  
  return hours * 60 + minutes;
}

// Format instructions with bullet points
function formatInstructionsWithBullets(instructions) {
  if (!instructions) return '';
  
  // Ensure instructions is a string
  const instructionText = typeof instructions === 'string' 
    ? instructions 
    : Array.isArray(instructions) 
      ? instructions.join('\n') 
      : String(instructions || '');
  
  if (!instructionText.trim()) return '';
  
  // Split by common delimiters but preserve the content
  const steps = instructionText
    .split(/(?:[.]\s*(?=[A-Z])|(?:\.\s*\n)|(?:\n\s*\n)|(?:\n(?=\d+[.)])))/g)
    .map(step => step.trim())
    .filter(step => step.length > 10); // Filter out very short fragments
  
  // If we got good steps, format them with bullet points
  if (steps.length > 1) {
    return steps
      .map(step => {
        // Remove any existing numbering or bullet points
        const cleanStep = step.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
        // Ensure proper capitalization
        const capitalizedStep = cleanStep.charAt(0).toUpperCase() + cleanStep.slice(1);
        // Add period if missing
        const finalStep = capitalizedStep.endsWith('.') ? capitalizedStep : capitalizedStep + '.';
        return `• ${finalStep}`;
      })
      .join('\n');
  }
  
  // If splitting didn't work well, try to at least add bullet points to existing lines
  const lines = instructionText.split('\n').filter(line => line.trim().length > 5);
  if (lines.length > 1) {
    return lines
      .map(line => {
        const trimmedLine = line.trim();
        // Check if line already has a bullet or number
        if (trimmedLine.match(/^[-•*]\s*/) || trimmedLine.match(/^\d+[.)]\s*/)) {
          return trimmedLine;
        }
        return `• ${trimmedLine}`;
      })
      .join('\n');
  }
  
  // If all else fails, return the original text as a single bullet point
  return `• ${instructionText.trim()}`;
}

function detectAllergens(text) {
  const lowerText = text.toLowerCase();
  const detected = [];

  for (const allergen of COMMON_ALLERGENS) {
    // Check for allergen and common variations
    const variations = [allergen];
    if (allergen === "milk") variations.push("dairy", "cheese", "cream", "butter");
    if (allergen === "eggs") variations.push("egg");
    if (allergen === "tree nuts") variations.push("almond", "cashew", "walnut", "pecan");
    if (allergen === "wheat") variations.push("flour", "bread");

    if (variations.some(v => lowerText.includes(v))) {
      detected.push(allergen);
    }
  }

  return [...new Set(detected)]; // Remove duplicates
}

function validateRecipeData(data) {
  // Log the data being validated
  console.log("Validating recipe data:", {
    hasName: !!data.name,
    nameValue: data.name,
    hasIngredients: !!data.ingredients,
    hasSections: !!data.sections,
    sectionsLength: data.sections?.length || 0,
    ingredientsLength: data.ingredients?.length || 0,
    ingredientsType: Array.isArray(data.ingredients) ? 'array' : typeof data.ingredients
  });

  // Create default values if missing
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    data.name = 'Untitled Recipe';
  }
  
  // Handle sections format
  if (data.sections && Array.isArray(data.sections) && data.sections.length > 0) {
    console.log("Processing recipe with sections:", data.sections.length);
    
    // Validate each section
    data.sections = data.sections.map((section, index) => {
      return {
        id: section.id || `section_${index}`,
        label: section.label || `Section ${index + 1}`,
        ingredients: Array.isArray(section.ingredients) 
          ? section.ingredients.filter(ing => ing && typeof ing === 'string' && ing.trim() !== '')
          : [],
        instructions: section.instructions || ''
      };
    });
    
    // Create flattened ingredients for backward compatibility ONLY if ingredients don't already exist
    if (!data.ingredients || data.ingredients.length === 0) {
      data.ingredients = [];
      data.sections.forEach(section => {
        data.ingredients.push(...section.ingredients);
      });
    }
    
    // Create concatenated instructions for backward compatibility
    // But only if instructions don't already exist from the AI parse
    if (!data.instructions || data.instructions.trim() === '') {
      const instructionParts = [];
      data.sections.forEach((section, index) => {
        if (section.instructions) {
          if (section.label) {
            instructionParts.push(`${section.label}:\n${section.instructions}`);
          } else if (data.sections.length > 1) {
            instructionParts.push(`Part ${index + 1}:\n${section.instructions}`);
          } else {
            instructionParts.push(section.instructions);
          }
        }
      });
      data.instructions = instructionParts.join('\n\n');
    }
  } else {
    // Traditional format - ensure ingredients is at least an empty array
    if (!data.ingredients || !Array.isArray(data.ingredients)) {
      data.ingredients = [];
    }
    
    // Filter out empty ingredients
    data.ingredients = data.ingredients.filter(ing => ing && typeof ing === 'string' && ing.trim() !== '');
  }
  
  // Only fail validation if we have absolutely no useful data
  if (data.name === 'Untitled Recipe' && data.ingredients.length === 0 && !data.instructions && !data.sections) {
    throw new Error('Recipe validation failed: No recipe content could be extracted');
  }

  // Clean and validate data
  const validatedServes = (typeof data.serves === 'number' && data.serves > 0 && data.serves <= 1000) ? data.serves : 4;
  
  console.log('Validating serves:', {
    original: data.serves,
    validated: validatedServes,
    type: typeof data.serves
  });
  
  // Validate and convert time fields to numbers
  const prepTime = typeof data.prep_time === 'number' && data.prep_time > 0 ? data.prep_time : null;
  const cookTime = typeof data.cook_time === 'number' && data.cook_time > 0 ? data.cook_time : null;
  let totalTime = typeof data.total_time === 'number' && data.total_time > 0 ? data.total_time : null;
  
  // Calculate total_time if not provided but we have prep and cook times
  if (!totalTime && prepTime && cookTime) {
    totalTime = prepTime + cookTime;
  }
  
  // Process instructions - keep as string to match old parser behavior
  let processedInstructions = '';
  if (data.instructions) {
    if (typeof data.instructions === 'string') {
      processedInstructions = formatInstructionsWithBullets(data.instructions.trim());
    } else if (Array.isArray(data.instructions)) {
      // Join array into string if needed
      const joinedInstructions = data.instructions
        .filter(i => i && typeof i === 'string' && i.trim())
        .map(i => i.trim())
        .join('\n');
      processedInstructions = formatInstructionsWithBullets(joinedInstructions);
    }
  }
  
  const result = {
    name: data.name.substring(0, 200),
    serves: validatedServes,
    ingredients: data.ingredients.slice(0, 100),
    instructions: processedInstructions,
    prep_time: prepTime,
    cook_time: cookTime,
    total_time: totalTime,
    tags: [...new Set(data.tags?.slice(0, 20) || [])],
    allergens: [...new Set(data.allergens || [])],
    notes: data.notes?.substring(0, 1000) || null,
    ingredients_parsed: true,
    image_url: data.image_url || null
  };
  
  // Include sections if they exist
  if (data.sections && data.sections.length > 0) {
    result.sections = data.sections;
  }
  
  return result;
}

// Parse recipe from file (including images)
async function parseRecipeFromFile(fileBuffer, mimeType, openai) {
  let text = '';
  
  try {
    console.log("parseRecipeFromFile called with mimeType:", mimeType);
    console.log("Buffer size:", fileBuffer?.length || 0);
    console.log("OpenAI client exists:", !!openai);
    
    if (mimeType.includes('image')) {
      // Use OpenAI Vision API for images
      console.log("Processing image with OpenAI Vision API...");
      const base64Image = fileBuffer.toString('base64');
      console.log("Base64 image length:", base64Image.length);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract recipe information from this image. Look for MULTIPLE SECTIONS (like base, filling, topping, crust, sauce, etc.)

CRITICAL: Many recipes have multiple components. Look for:
- Section headers like "For the [component name]:", "Filling:", "Topping:", "Crust:", etc.
- Ingredient lists that repeat (e.g., butter appears multiple times for different components)
- Instructions that say "make the filling" or "prepare the topping"

Extract:
1. Recipe name/title
2. Number of servings (Look for 'Serves', 'Servings', 'Yield', 'Makes')
3. Recipe sections if they exist:
   - If you see section headers (e.g., "Almond Shortbread:", "Cherry Filling:", "Streusel Topping:"), organize ingredients under each section
   - Format as: 
     Section: [Section Name]
     Ingredients:
     - [ingredient with measurement]
     - [ingredient with measurement]
     
4. If NO sections are visible, just list all ingredients together
5. All cooking instructions/steps (preserve section references if mentioned)
6. Times (convert to minutes): Prep time, Cook time, Total time
7. Any notes or tips

IMPORTANT: 
- Include EXACT measurements (1/2 cup, 2 tablespoons, etc.)
- If a recipe has multiple components, ALWAYS separate them into sections
- Look for visual cues like headers, spacing, or grouping that indicate sections`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000
      });
      text = response.choices[0].message.content;
      console.log("Extracted text from image:", text.substring(0, 500) + "...");
    } else if (mimeType === 'application/pdf') {
      // Parse PDF to extract text
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(fileBuffer);
      text = pdfData.text;
    } else {
      // For text files, convert buffer to string
      text = fileBuffer.toString('utf-8');
    }
    
    if (!text) {
      throw new Error('No text could be extracted from the file');
    }
    
    // Parse the extracted text
    const parsedRecipe = await parseRecipeFromText(text, openai);
    
    // For image/file parsing, don't apply additional section detection as the AI already parsed correctly
    if (parsedRecipe) {
      parsedRecipe._skipSectionDetection = true;
    }
    
    return parsedRecipe;
    
  } catch (error) {
    console.error('Error parsing recipe file:', error);
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Provide more specific error messages
    if (error.message?.includes('API key')) {
      throw new Error('OpenAI API key issue: ' + error.message);
    } else if (error.message?.includes('rate limit')) {
      throw new Error('OpenAI rate limit exceeded. Please try again later.');
    } else if (error.message?.includes('model')) {
      throw new Error('OpenAI model error: ' + error.message);
    } else {
      throw new Error('Failed to parse recipe from file: ' + error.message);
    }
  }
}

module.exports = {
  parseRecipeFromText,
  parseRecipeFromURL,
  parseRecipeFromFile
};