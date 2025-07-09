const axios = require("axios");
const cheerio = require("cheerio");

// Common allergens to detect
const COMMON_ALLERGENS = [
  "milk", "eggs", "fish", "shellfish", "tree nuts", "peanuts", 
  "wheat", "soybeans", "sesame", "gluten", "dairy", "nuts"
];

// Recipe parsing prompt
const RECIPE_PARSE_PROMPT = `
You are a recipe parsing assistant. Extract structured recipe data from the provided text.
Return a JSON object with the following structure:
{
  "name": "Recipe name",
  "serves": number (servings),
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "prep_time": "time string or null",
  "cook_time": "time string or null",
  "tags": ["tag1", "tag2", ...],
  "allergens": ["detected allergens from the common list"],
  "notes": "any special notes or tips"
}

Rules:
- Ingredients should include quantities and be clearly written
- Instructions should be clear, numbered steps
- Detect allergens from ingredients
- Tags should be relevant categories (e.g., "vegetarian", "dessert", "main course")
- If information is not available, use null
`;

async function parseRecipeFromText(text, openai) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: RECIPE_PARSE_PROMPT },
        { role: "user", content: text }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000
    });

    const parsedData = JSON.parse(response.choices[0].message.content);
    
    // Validate and clean the data
    return validateRecipeData(parsedData);
  } catch (error) {
    console.error("OpenAI parsing error:", error);
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

    if (recipeData) {
      // Convert structured data to our format
      return convertStructuredData(recipeData);
    }

    // Fallback to extracting text and using AI
    const textContent = extractRecipeText($);
    return parseRecipeFromText(textContent, openai);

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

  // Clean up the text
  return recipeText
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .substring(0, 4000); // Limit length for API
}

function convertStructuredData(data) {
  const recipe = {
    name: data.name || "Untitled Recipe",
    serves: extractServings(data.recipeYield),
    ingredients: [],
    instructions: [],
    prep_time: data.prepTime || null,
    cook_time: data.cookTime || null,
    tags: [],
    allergens: [],
    notes: data.description || null
  };

  // Extract ingredients
  if (data.recipeIngredient) {
    recipe.ingredients = Array.isArray(data.recipeIngredient) ? 
      data.recipeIngredient : [data.recipeIngredient];
  }

  // Extract instructions
  if (data.recipeInstructions) {
    const instructions = Array.isArray(data.recipeInstructions) ? 
      data.recipeInstructions : [data.recipeInstructions];
    
    recipe.instructions = instructions.map(inst => {
      if (typeof inst === "string") return inst;
      if (inst.text) return inst.text;
      if (inst.name) return inst.name;
      return String(inst);
    });
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
  // Ensure required fields
  if (!data.name || !data.ingredients || data.ingredients.length === 0) {
    throw new Error("Recipe must have a name and at least one ingredient");
  }

  // Clean and validate data
  return {
    name: data.name.substring(0, 200),
    serves: data.serves || 4,
    ingredients: data.ingredients.filter(i => i && i.trim()).slice(0, 100),
    instructions: data.instructions?.filter(i => i && i.trim()).slice(0, 50) || [],
    prep_time: data.prep_time || null,
    cook_time: data.cook_time || null,
    tags: [...new Set(data.tags?.slice(0, 20) || [])],
    allergens: [...new Set(data.allergens || [])],
    notes: data.notes?.substring(0, 1000) || null,
    ingredients_parsed: true
  };
}

module.exports = {
  parseRecipeFromText,
  parseRecipeFromURL
};