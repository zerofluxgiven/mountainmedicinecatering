import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

// Recipe parsing service using AI
// Calls Firebase Functions for actual AI parsing

const MOCK_DELAY = 1500; // Simulate API delay for development

// Function to detect multiple recipe sections
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
  
  // Check for duplicate ingredients (a key indicator of multiple sections)
  const ingredientCounts = {};
  const duplicates = [];
  
  ingredients.forEach(ing => {
    if (typeof ing !== 'string') return;
    
    // Extract the main ingredient name (ignore quantities)
    const mainIngredient = ing.replace(/^\d+[\s\S]*?\s+(?:of\s+)?/, '').toLowerCase();
    const words = mainIngredient.split(/\s+/);
    const keyIngredient = words[words.length - 1]; // Usually the last word is the key ingredient
    
    if (ingredientCounts[keyIngredient]) {
      duplicates.push(keyIngredient);
    }
    ingredientCounts[keyIngredient] = (ingredientCounts[keyIngredient] || 0) + 1;
  });
  
  // Look for section indicators in instructions
  const sectionIndicators = [
    /to\s+(?:make|prepare|create)\s+(?:the\s+)?(\w+(?:\s+\w+)?),/i,
    /for\s+(?:the\s+)?(\w+(?:\s+\w+)?):/i,
    /(\w+(?:\s+\w+)?)\s+(?:topping|filling|sauce|dressing|glaze|streusel|crust|base):/i,
    /make\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+by/i,
    /prepare\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+by/i,
    /(?:first|next|then),?\s+(?:make|prepare)\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i
  ];
  
  const sections = [];
  let foundSections = false;
  
  // Parse instructions to find section names
  const instructionLines = instructionText.split(/[.,]/).filter(line => line.trim());
  instructionLines.forEach(line => {
    for (const pattern of sectionIndicators) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const sectionName = match[1].trim();
        // Capitalize first letter
        const formattedName = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
        if (!sections.find(s => s.label === formattedName)) {
          sections.push({ label: formattedName, startIndex: instructions.indexOf(line) });
          foundSections = true;
        }
      }
    }
  });
  
  // If we found sections or have duplicate ingredients, try to split the recipe
  if (foundSections || duplicates.length > 0) {
    // Sort sections by their appearance in instructions
    sections.sort((a, b) => a.startIndex - b.startIndex);
    
    // Add main section at the beginning if needed
    if (sections.length > 0 && sections[0].startIndex > 50) {
      sections.unshift({ label: 'Main', startIndex: 0 });
    }
    
    // Split ingredients based on instruction sections
    const sectionedIngredients = [];
    const sectionedInstructions = [];
    
    sections.forEach((section, index) => {
      const nextIndex = sections[index + 1]?.startIndex || instructionText.length;
      const sectionInstructions = instructionText.substring(section.startIndex, nextIndex).trim();
      
      // Find ingredients mentioned in this section's instructions
      const sectionIngredientsList = [];
      ingredients.forEach(ing => {
        if (typeof ing !== 'string') return;
        
        // Check if this ingredient is mentioned in this section's instructions
        const ingredientWords = ing.toLowerCase().split(/\s+/);
        const keyWord = ingredientWords[ingredientWords.length - 1];
        if (sectionInstructions.toLowerCase().includes(keyWord)) {
          sectionIngredientsList.push(ing);
        }
      });
      
      sectionedIngredients.push({
        label: section.label,
        ingredients: sectionIngredientsList.length > 0 ? sectionIngredientsList : [''],
        instructions: sectionInstructions
      });
    });
    
    // If we successfully split into sections, return them
    if (sectionedIngredients.length > 1) {
      return sectionedIngredients;
    }
  }
  
  // No sections detected, return null
  return null;
}

// Enhanced parser that detects multiple recipe sections
async function mockParseRecipe(text) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  
  // Extract recipe name (look for common patterns)
  let name = 'Imported Recipe';
  const nameMatch = text.match(/^(.+?)[\n\r]/);
  if (nameMatch) {
    name = nameMatch[1].trim();
  }
  
  // Extract serving size
  let serves = 4;
  const servingMatch = text.match(/(?:serves?|servings?|yield)\s*:?\s*(\d+)/i);
  if (servingMatch) {
    serves = parseInt(servingMatch[1]);
  }
  
  // Extract ingredients (look for bullet points or numbered lists)
  const ingredients = [];
  const ingredientSection = text.match(/ingredients?:?([\s\S]*?)(?:instructions?|directions?|method|steps?:|$)/i);
  if (ingredientSection) {
    const lines = ingredientSection[1].split('\n');
    lines.forEach(line => {
      // Remove only bullet points and numbered list markers (like "1. ", "2. ")
      // but preserve measurements and fractions (like "1/2", "1 cup")
      const cleaned = line.trim()
        .replace(/^[-•*]\s*/, '') // Remove bullet points
        .replace(/^(\d+)\.\s+/, ''); // Remove numbered list markers (must have space after period)
      if (cleaned && cleaned.length > 3) {
        ingredients.push(cleaned);
      }
    });
  }
  
  // Extract instructions
  let instructions = '';
  const instructionSection = text.match(/(?:instructions?|directions?|method|steps?):?([\s\S]*?)$/i);
  if (instructionSection) {
    instructions = instructionSection[1].trim();
  }
  
  // Detect recipe sections
  const sections = detectRecipeSections(ingredients, instructions);
  
  // Extract times - now parsing more patterns and handling hours
  let prep_time = null;
  let cook_time = null;
  let total_time = null;
  
  // Prep time patterns
  const prepMatch = text.match(/prep(?:aration)?\s*time\s*:?\s*(?:(\d+)\s*(?:hours?|hrs?)\s*)?(?:and\s*)?(\d+)?\s*(?:min|minutes?)/i);
  if (prepMatch) {
    const hours = prepMatch[1] ? parseInt(prepMatch[1]) : 0;
    const minutes = prepMatch[2] ? parseInt(prepMatch[2]) : 0;
    prep_time = hours * 60 + minutes || (hours ? hours * 60 : null);
  }
  
  // Cook time patterns
  const cookMatch = text.match(/(?:cook(?:ing)?|bak(?:e|ing))\s*time\s*:?\s*(?:(\d+)\s*(?:hours?|hrs?)\s*)?(?:and\s*)?(\d+)?\s*(?:min|minutes?)/i);
  if (cookMatch) {
    const hours = cookMatch[1] ? parseInt(cookMatch[1]) : 0;
    const minutes = cookMatch[2] ? parseInt(cookMatch[2]) : 0;
    cook_time = hours * 60 + minutes || (hours ? hours * 60 : null);
  }
  
  // Total time patterns
  const totalMatch = text.match(/total\s*time\s*:?\s*(?:(\d+)\s*(?:hours?|hrs?)\s*)?(?:and\s*)?(\d+)?\s*(?:min|minutes?)/i);
  if (totalMatch) {
    const hours = totalMatch[1] ? parseInt(totalMatch[1]) : 0;
    const minutes = totalMatch[2] ? parseInt(totalMatch[2]) : 0;
    total_time = hours * 60 + minutes || (hours ? hours * 60 : null);
  }
  
  // If we have prep and cook but no total, calculate it
  if (prep_time && cook_time && !total_time) {
    total_time = prep_time + cook_time;
  }
  
  // Basic allergen detection
  const allergens = [];
  const allergenKeywords = {
    'Dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt'],
    'Eggs': ['egg', 'eggs'],
    'Gluten': ['flour', 'bread', 'pasta', 'wheat'],
    'Nuts': ['almond', 'walnut', 'pecan', 'cashew', 'pistachio'],
    'Soy': ['soy', 'tofu', 'tempeh']
  };
  
  const textLower = text.toLowerCase();
  Object.entries(allergenKeywords).forEach(([allergen, keywords]) => {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      allergens.push(allergen);
    }
  });
  
  // Format instructions as numbered steps
  const formattedInstructions = formatInstructionsAsSteps(instructions);
  
  return {
    name,
    serves,
    prep_time,
    cook_time,
    total_time,
    ingredients: sections ? [] : ingredients.filter(Boolean), // Empty if we have sections
    instructions: sections ? '' : formattedInstructions, // Empty if we have sections
    allergens: [...new Set(allergens)],
    tags: [],
    sections: sections // Include sections if detected
  };
}

// Function to format instructions as numbered steps
function formatInstructionsAsSteps(instructions) {
  if (!instructions) return '';
  
  // Ensure instructions is a string
  const instructionText = typeof instructions === 'string' 
    ? instructions 
    : Array.isArray(instructions) 
      ? instructions.join('\n') 
      : String(instructions || '');
  
  if (!instructionText) return '';
  
  // Split by common delimiters but preserve the content
  const steps = instructionText
    .split(/(?:[.,]\s*(?=[A-Z])|(?:\.\s*\n)|(?:\n\s*\n)|(?:\n(?=\d+[.)])))/g)
    .map(step => step.trim())
    .filter(step => step.length > 10); // Filter out very short fragments
  
  // If we got good steps, format them
  if (steps.length > 1) {
    return steps
      .map((step, index) => {
        // Remove any existing numbering
        const cleanStep = step.replace(/^\d+[.)]\s*/, '');
        // Ensure proper capitalization
        const capitalizedStep = cleanStep.charAt(0).toUpperCase() + cleanStep.slice(1);
        // Add period if missing
        const finalStep = capitalizedStep.endsWith('.') ? capitalizedStep : capitalizedStep + '.';
        return `${index + 1}. ${finalStep}`;
      })
      .join('\n');
  }
  
  // If splitting didn't work well, return original with basic formatting
  return instructions;
}

export async function parseRecipeFromFile(file) {
  try {
    // Try to use Firebase Function first
    const parseRecipe = httpsCallable(functions, 'parseRecipe');
    
    // For images and PDFs, send as base64
    if (file.type.includes('image') || file.type === 'application/pdf') {
      const base64 = await fileToBase64(file);
      
      const result = await parseRecipe({
        fileData: base64,
        mimeType: file.type,
        type: 'file'
      });
      
      const recipe = result.data.recipe || result.data;
      
      // If we got a recipe, check if it needs section detection
      if (recipe && recipe.ingredients && recipe.instructions && !recipe.sections) {
        const sections = detectRecipeSections(recipe.ingredients, recipe.instructions);
        if (sections) {
          recipe.sections = sections;
          recipe.ingredients = [];
          recipe.instructions = '';
        }
      }
      
      return recipe;
    } else {
      // For text files, read as text
      const text = await readFileAsText(file);
      
      const result = await parseRecipe({
        text: text,
        type: 'text'
      });
      
      const recipe = result.data.recipe || result.data;
      
      // If we got a recipe, check if it needs section detection
      if (recipe && recipe.ingredients && recipe.instructions && !recipe.sections) {
        const sections = detectRecipeSections(recipe.ingredients, recipe.instructions);
        if (sections) {
          recipe.sections = sections;
          recipe.ingredients = [];
          recipe.instructions = '';
        }
      }
      
      return recipe;
    }
  } catch (error) {
    console.error('Recipe parsing error:', error);
    
    // Check if this is a Firebase function not found error
    if (error.code === 'functions/not-found' || error.message?.includes('not-found')) {
      throw new Error('Recipe parsing service is not available. Please try again later or contact support.');
    }
    
    // For other errors, throw with helpful message
    throw new Error(`Failed to parse recipe from file: ${error.message || 'Unknown error'}`);
  }
}

export async function parseRecipeFromURL(url) {
  try {
    // Try to use Firebase Function first
    const parseRecipe = httpsCallable(functions, 'parseRecipe');
    
    const result = await parseRecipe({
      url: url,
      type: 'url'
    });
    
    const recipe = result.data.recipe || result.data;
    
    // Validate the recipe data
    if (!recipe || typeof recipe !== 'object') {
      throw new Error('Invalid recipe data received from parser');
    }
    
    // Check for required fields
    if (!recipe.name || !recipe.ingredients || !Array.isArray(recipe.ingredients)) {
      console.error('Invalid recipe structure:', recipe);
      throw new Error('Recipe parser returned incomplete data. Please try a different URL.');
    }
    
    // If we got a recipe, check if it needs section detection
    if (recipe.ingredients && recipe.instructions && !recipe.sections) {
      const sections = detectRecipeSections(recipe.ingredients, recipe.instructions);
      if (sections) {
        recipe.sections = sections;
        recipe.ingredients = [];
        recipe.instructions = '';
      }
    }
    
    return recipe;
  } catch (error) {
    console.error('Recipe parsing error:', error);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
    
    // Check for specific error types
    if (error.code === 'unauthenticated') {
      throw new Error('You must be logged in to parse recipes. Please refresh the page and try again.');
    } else if (error.code === 'functions/not-found' || error.message?.includes('not-found')) {
      throw new Error('Recipe parsing service is not available. Please try again later or contact support.');
    } else if (error.code === 'internal' && error.message) {
      // Firebase function threw an internal error - use the actual message
      throw new Error(error.message);
    } else if (error.message?.includes('incomplete data') || error.message?.includes('Invalid recipe')) {
      throw new Error(error.message);
    } else {
      // Log the full error for debugging
      console.error('Unexpected error structure:', {
        code: error.code,
        message: error.message,
        details: error.details,
        fullError: error
      });
      throw new Error('Failed to parse recipe from URL. Please check the URL and try again.');
    }
  }
}

// Helper function to read file as text
async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    // Handle different file types
    if (file.type.includes('image')) {
      // Images can't be read as text
      reject(new Error('Image files require AI vision processing'));
    } else if (file.type === 'application/pdf') {
      // PDFs can't be read as text directly
      reject(new Error('PDF files require special processing'));
    } else {
      // Text files can be read directly
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      
      reader.onerror = (e) => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    }
  });
}

// Helper function to convert file to base64
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      // Extract base64 data after the comma
      const base64 = e.target.result.split(',')[1];
      resolve(base64);
    };
    
    reader.onerror = (e) => {
      reject(new Error('Failed to convert file to base64'));
    };
    
    reader.readAsDataURL(file);
  });
}