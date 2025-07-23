import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * Call OpenAI through Firebase Function
 * This provides a secure way to use OpenAI without exposing API keys on the client
 * @param {string} prompt - The prompt to send to OpenAI
 * @param {Object} options - Additional options for the API call
 * @returns {Promise<string>} The AI response
 */
export async function getOpenAIResponse(prompt, options = {}) {
  try {
    // Call the Firebase function that handles OpenAI requests
    const analyzeWithAI = httpsCallable(functions, 'analyzeWithAI');
    
    const result = await analyzeWithAI({
      prompt,
      ...options
    });

    if (result.data.error) {
      throw new Error(result.data.error);
    }

    return result.data.response;
  } catch (error) {
    console.error('Error calling AI service:', error);
    
    // Fallback to a mock response for development/testing
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using mock AI response in development');
      return getMockAIResponse(prompt);
    }
    
    throw error;
  }
}

/**
 * Mock AI response for development
 * @param {string} prompt - The prompt
 * @returns {string} Mock response
 */
function getMockAIResponse(prompt) {
  // Return a mock shopping analysis for development
  if (prompt.includes('shopping') || prompt.includes('ingredients')) {
    return JSON.stringify({
      ingredients: [
        {
          original: "2 lbs chicken breast",
          parsed: {
            quantity: 2,
            unit: "lbs",
            item: "chicken breast"
          },
          shopping: {
            quantity: 2,
            unit: "lbs",
            package_description: "2 lb package"
          },
          store_type: "conventional",
          storage: "Can freeze extra portions",
          substitutions: ["turkey breast", "pork tenderloin"],
          category: "protein"
        },
        {
          original: "3 cups all-purpose flour",
          parsed: {
            quantity: 3,
            unit: "cups",
            item: "all-purpose flour"
          },
          shopping: {
            quantity: 5,
            unit: "lbs",
            package_description: "5 lb bag"
          },
          store_type: "conventional",
          storage: "Store in airtight container",
          substitutions: ["bread flour", "whole wheat flour"],
          category: "dry_goods"
        }
      ]
    });
  }
  
  return "Mock AI response for: " + prompt;
}

/**
 * Parse recipe with AI
 * @param {string} text - Recipe text to parse
 * @returns {Promise<Object>} Parsed recipe object
 */
export async function parseRecipeWithAI(text) {
  const parseRecipe = httpsCallable(functions, 'parseRecipe');
  
  try {
    const result = await parseRecipe({ text });
    return result.data;
  } catch (error) {
    console.error('Error parsing recipe:', error);
    throw error;
  }
}

/**
 * Chat with AI assistant
 * @param {string} message - User message
 * @param {string} conversationId - Conversation ID
 * @param {Object} context - Event context
 * @returns {Promise<string>} AI response
 */
export async function chatWithAI(message, conversationId, context = {}) {
  const sendChatMessage = httpsCallable(functions, 'sendChatMessage');
  
  try {
    const result = await sendChatMessage({
      message,
      conversationId,
      eventContext: context
    });
    
    return result.data.response;
  } catch (error) {
    console.error('Error in AI chat:', error);
    throw error;
  }
}

/**
 * Analyze menu for conflicts
 * @param {Object} menuData - Menu data to analyze
 * @param {Array} allergens - Event allergens
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeMenuConflicts(menuData, allergens) {
  const analyzeMenu = httpsCallable(functions, 'analyzeMenu');
  
  try {
    const result = await analyzeMenu({
      menu: menuData,
      allergens
    });
    
    return result.data;
  } catch (error) {
    console.error('Error analyzing menu:', error);
    throw error;
  }
}