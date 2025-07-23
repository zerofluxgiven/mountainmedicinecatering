// AI Action Service - Allows AI to perform actions in the app
import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

class AIActionService {
  constructor() {
    // Initialize Firebase Functions
    this.aiCreateRecipe = httpsCallable(functions, 'aiCreateRecipe');
    this.aiUpdateRecipe = httpsCallable(functions, 'aiUpdateRecipe');
    this.aiParseRecipeFromUrl = httpsCallable(functions, 'aiParseRecipeFromUrl');
    this.aiCreateMenu = httpsCallable(functions, 'aiCreateMenu');
    this.aiAddRecipeToMenu = httpsCallable(functions, 'aiAddRecipeToMenu');
  }

  // Create a new recipe
  async createRecipe(recipeData, aiContext = {}) {
    try {
      console.log('Calling aiCreateRecipe with:', { recipe: recipeData, aiContext });
      const result = await this.aiCreateRecipe({ recipe: recipeData, aiContext });
      console.log('aiCreateRecipe result:', result);
      return result.data;
    } catch (error) {
      console.error('Error creating recipe:', error);
      console.error('Error details:', error.code, error.message, error.details);
      
      // If the callable function fails with 404 or CORS issues, try the HTTP endpoint as fallback
      if (error.code === 'functions/not-found' || 
          error.code === 'not-found' || 
          error.code === 'functions/internal' || // 403/CORS errors often show as internal
          error.message?.includes('404') ||
          error.message?.includes('NOT_FOUND') ||
          error.message?.includes('Cannot POST') ||
          error.message?.includes('403') ||
          error.message?.includes('Preflight') ||
          error.message?.includes('access control')) {
        console.log('Falling back to HTTP endpoint for aiCreateRecipe due to:', error.code || error.message);
        return await this.createRecipeViaHttp(recipeData, aiContext);
      }
      
      throw error;
    }
  }

  // Fallback HTTP method for creating recipes
  async createRecipeViaHttp(recipeData, aiContext = {}) {
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser.getIdToken();
      
      // Try multiple endpoints in case one is down
      const endpoints = [
        'https://us-central1-mountainmedicine-6e572.cloudfunctions.net/aiCreateRecipeHttp',
        'https://us-central1-mountainmedicine-6e572.cloudfunctions.net/aiCreateRecipeHttpPublic'
      ];
      
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ recipe: recipeData, aiContext })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Endpoint ${endpoint} failed:`, response.status, errorText);
            
            // Try to parse as JSON, fall back to text
            let error;
            try {
              error = JSON.parse(errorText);
            } catch {
              error = { error: errorText };
            }
            
            throw new Error(error.error || `HTTP ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          console.log('Recipe created successfully via HTTP');
          return data;
          
        } catch (error) {
          console.error(`Failed with endpoint ${endpoint}:`, error);
          lastError = error;
          // Continue to next endpoint
        }
      }
      
      // If all endpoints failed, throw the last error
      throw lastError || new Error('All endpoints failed');
      
    } catch (error) {
      console.error('HTTP fallback completely failed:', error);
      
      // Provide user-friendly error message
      if (error.message?.includes('403') || error.message?.includes('CORS')) {
        throw new Error('Recipe creation service is unavailable due to permissions. Dan: Check MANUAL_PERMISSIONS_GUIDE.md and run the gcloud commands listed there.');
      }
      
      throw error;
    }
  }

  // Update an existing recipe
  async updateRecipe(recipeId, updates, aiContext = {}) {
    try {
      const result = await this.aiUpdateRecipe({ recipeId, updates, aiContext });
      return result.data;
    } catch (error) {
      console.error('Error updating recipe:', error);
      throw error;
    }
  }

  // Parse recipe from URL
  async parseRecipeFromUrl(url, aiContext = {}) {
    try {
      const result = await this.aiParseRecipeFromUrl({ url, aiContext });
      return result.data;
    } catch (error) {
      console.error('Error parsing recipe from URL:', error);
      throw error;
    }
  }

  // Create a menu for an event
  async createMenu(eventId, menuData, aiContext = {}) {
    try {
      const result = await this.aiCreateMenu({ eventId, menuData, aiContext });
      return result.data;
    } catch (error) {
      console.error('Error creating menu:', error);
      throw error;
    }
  }

  // Add recipe to menu
  async addRecipeToMenu(menuId, dayIndex, mealIndex, recipeId, servings, aiContext = {}) {
    try {
      const result = await this.aiAddRecipeToMenu({ 
        menuId, 
        dayIndex, 
        mealIndex, 
        recipeId, 
        servings, 
        aiContext 
      });
      return result.data;
    } catch (error) {
      console.error('Error adding recipe to menu:', error);
      throw error;
    }
  }

  // Helper to check if a URL is a recipe
  isRecipeUrl(url) {
    const recipePatterns = [
      /recipes?\//i,
      /recipe\-/i,
      /\/food\//i,
      /\/cooking\//i,
      /allrecipes\.com/i,
      /foodnetwork\.com/i,
      /seriouseats\.com/i,
      /bonappetit\.com/i,
      /epicurious\.com/i,
      /peachie\.recipes/i
    ];
    
    return recipePatterns.some(pattern => pattern.test(url));
  }
}

export const aiActionService = new AIActionService();