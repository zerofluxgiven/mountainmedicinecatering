// Enhanced AI Action Service with Approval Flow
import { functions, db, auth } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, query, where, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { aiActionService } from './aiActionService';
import { scaleIngredient } from './recipeScaler';
import { generateMenuPDF, generateShoppingListPDF, generateRecipePDF } from './pdfGenerator';

class AIActionServiceEnhanced {
  constructor() {
    this.pendingActions = new Map();
    this.onApprovalRequired = null;
  }

  // Set the approval callback
  setApprovalCallback(callback) {
    this.onApprovalRequired = callback;
  }

  // Request approval for an action
  async requestApproval(action) {
    return new Promise((resolve, reject) => {
      const actionId = `action_${Date.now()}`;
      this.pendingActions.set(actionId, { resolve, reject });
      
      if (this.onApprovalRequired) {
        this.onApprovalRequired({
          ...action,
          actionId
        });
      } else {
        reject(new Error('No approval handler set'));
      }
    });
  }

  // Handle approval response
  handleApproval(actionId, approved, modifiedAction = null) {
    console.log('handleApproval called with:', { actionId, approved, modifiedAction });
    const pending = this.pendingActions.get(actionId);
    if (pending) {
      console.log('Found pending action for actionId:', actionId);
      this.pendingActions.delete(actionId);
      if (approved === true) {
        console.log('Approving action');
        pending.resolve(modifiedAction || true);
      } else if (approved === 'edit') {
        console.log('Edit requested - rejecting with edit_requested error');
        pending.reject(new Error('edit_requested'));
      } else {
        console.log('Rejecting action');
        pending.reject(new Error('Action rejected by user'));
      }
    } else {
      console.log('No pending action found for actionId:', actionId);
    }
  }

  // Parse and understand user intent
  async parseUserIntent(message, context) {
    // This would use AI to understand what the user wants
    // For now, we'll use pattern matching
    const patterns = {
      createRecipe: /create|add|new recipe/i,
      importRecipe: /import|parse|get recipe from/i,
      scaleRecipe: /scale|multiply|divide|adjust servings/i,
      createMenu: /create|plan|new menu/i,
      addToMenu: /add to menu|put in menu/i,
      createEvent: /create|new event|plan event/i,
      generatePDF: /export|generate|create pdf/i,
      shoppingList: /shopping list|grocery list|ingredients list/i,
      manageAllergies: /allerg|dietary|restriction/i
    };

    for (const [intent, pattern] of Object.entries(patterns)) {
      if (pattern.test(message)) {
        return { intent, message };
      }
    }

    return { intent: 'unknown', message };
  }

  // Create Recipe with Approval
  async createRecipeWithApproval(recipeData, context = {}) {
    console.log('createRecipeWithApproval called');
    const action = {
      type: 'create_recipe',
      aiMessage: `I'll create a new recipe called "${recipeData.name}" with ${recipeData.ingredients?.length || 0} ingredients and ${recipeData.instructions?.length || 0} steps. This will be saved to your recipe collection.`,
      data: {
        recipe: recipeData,
        source_url: context.source_url
      }
    };

    try {
      console.log('Requesting approval...');
      const approved = await this.requestApproval(action);
      console.log('Approval result:', approved);
      if (approved) {
        return await aiActionService.createRecipe(recipeData, context);
      }
    } catch (error) {
      console.log('Error in createRecipeWithApproval:', error.message);
      // Check if user wants to edit
      if (error.message === 'edit_requested') {
        console.log('Edit requested - saving as draft');
        // Save as draft and return with edit flag
        const draftData = {
          ...recipeData,
          status: 'draft',
          draft_source: 'ai_chat'
        };
        const result = await aiActionService.createRecipe(draftData, context);
        console.log('Draft saved, returning with edit action:', result);
        const editResult = { ...result, action: 'edit', recipeId: result.recipeId };
        console.log('Returning edit result:', editResult);
        return editResult;
      }
      throw new Error('Recipe creation cancelled');
    }
  }

  // Import Recipe from URL with Approval
  async importRecipeFromUrlWithApproval(url, context = {}) {
    // First, preview what we'll import
    const preview = await aiActionService.parseRecipeFromUrl(url, { ...context, preview: true });
    
    const action = {
      type: 'create_recipe',
      aiMessage: `I found a recipe! I'll import "${preview.recipe.name}" from ${new URL(url).hostname}. It has ${preview.recipe.servings} servings and includes ${preview.recipe.ingredients?.length || 0} ingredients.`,
      data: {
        recipe: preview.recipe,
        source_url: url
      }
    };

    const approved = await this.requestApproval(action);
    if (approved) {
      return await aiActionService.parseRecipeFromUrl(url, context);
    }
    throw new Error('Recipe import cancelled');
  }

  // Scale Recipe with Approval
  async scaleRecipeWithApproval(recipeId, newServings, context = {}) {
    // Get the recipe first
    const recipeDoc = await getDoc(doc(db, 'recipes', recipeId));
    if (!recipeDoc.exists()) {
      throw new Error('Recipe not found');
    }

    const recipe = { id: recipeDoc.id, ...recipeDoc.data() };
    const scaleFactor = newServings / recipe.servings;
    const scaledIngredients = recipe.ingredients.map(ing => scaleIngredient(ing, scaleFactor));

    const action = {
      type: 'scale_recipe',
      aiMessage: `I'll scale "${recipe.name}" from ${recipe.servings} servings to ${newServings} servings. That's a ${scaleFactor}x scale factor. Want me to save this as a new version?`,
      data: {
        recipeName: recipe.name,
        recipeId: recipe.id,
        originalServings: recipe.servings,
        newServings,
        scaleFactor,
        scaledIngredients
      }
    };

    const approved = await this.requestApproval(action);
    if (approved) {
      // Create scaled version
      const scaledRecipe = {
        ...recipe,
        name: `${recipe.name} (${newServings} servings)`,
        servings: newServings,
        ingredients: scaledIngredients,
        original_recipe_id: recipe.id,
        scaled_from: recipe.servings,
        scaled_to: newServings,
        created_at: new Date()
      };
      
      delete scaledRecipe.id;
      const newRecipeRef = await addDoc(collection(db, 'recipes'), scaledRecipe);
      return { success: true, recipeId: newRecipeRef.id, recipe: scaledRecipe };
    }
    throw new Error('Recipe scaling cancelled');
  }

  // Create Menu with Approval
  async createMenuWithApproval(eventId, menuStructure, context = {}) {
    // Get event details
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const event = eventDoc.data();
    const totalMeals = menuStructure.days.reduce((sum, day) => sum + day.meals.length, 0);

    const action = {
      type: 'create_menu',
      aiMessage: `I'll create a ${menuStructure.days.length}-day menu for "${event.name}" with ${totalMeals} total meals. This will set up the structure for you to add recipes to each meal.`,
      data: {
        eventId,
        eventName: event.name,
        menuData: menuStructure,
        totalMeals
      }
    };

    const approved = await this.requestApproval(action);
    if (approved) {
      return await aiActionService.createMenu(eventId, menuStructure, context);
    }
    throw new Error('Menu creation cancelled');
  }

  // Add Recipe to Menu with Approval
  async addRecipeToMenuWithApproval(menuId, dayIndex, mealIndex, recipeId, servings, context = {}) {
    // Get menu and recipe details
    const [menuDoc, recipeDoc] = await Promise.all([
      getDoc(doc(db, 'menu_items', menuId)),
      getDoc(doc(db, 'recipes', recipeId))
    ]);

    if (!menuDoc.exists() || !recipeDoc.exists()) {
      throw new Error('Menu or recipe not found');
    }

    const menu = menuDoc.data();
    const recipe = recipeDoc.data();
    const day = menu.days[dayIndex];
    const meal = day?.meals[mealIndex];

    const action = {
      type: 'add_recipe_to_menu',
      aiMessage: `I'll add "${recipe.name}" to ${meal.type} on ${day.day_label}. The recipe will be scaled to serve ${servings} people.`,
      data: {
        menuId,
        menuName: menu.name,
        recipeId,
        recipeName: recipe.name,
        dayIndex,
        dayLabel: day.day_label,
        mealIndex,
        mealType: meal.type,
        servings
      }
    };

    const approved = await this.requestApproval(action);
    if (approved) {
      return await aiActionService.addRecipeToMenu(menuId, dayIndex, mealIndex, recipeId, servings, context);
    }
    throw new Error('Add to menu cancelled');
  }

  // Create Event with Approval
  async createEventWithApproval(eventData, context = {}) {
    const duration = Math.ceil((new Date(eventData.end_date) - new Date(eventData.start_date)) / (1000 * 60 * 60 * 24)) + 1;

    const action = {
      type: 'create_event',
      aiMessage: `I'll create a ${duration}-day event called "${eventData.name}" for ${eventData.guest_count} guests. This will be the foundation for menu planning and allergy tracking.`,
      data: {
        event: eventData
      }
    };

    const approved = await this.requestApproval(action);
    if (approved) {
      const eventRef = await addDoc(collection(db, 'events'), {
        ...eventData,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: auth.currentUser?.uid
      });
      return { success: true, eventId: eventRef.id };
    }
    throw new Error('Event creation cancelled');
  }

  // Generate Shopping List with Approval
  async generateShoppingListWithApproval(eventId, options = {}, context = {}) {
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const event = eventDoc.data();
    
    // Get menus for this event
    const menusQuery = query(collection(db, 'menu_items'), where('event_id', '==', eventId));
    const menusSnapshot = await getDocs(menusQuery);
    
    const recipeCount = menusSnapshot.docs.reduce((count, doc) => {
      const menu = doc.data();
      return count + menu.days.reduce((dayCount, day) => 
        dayCount + day.meals.reduce((mealCount, meal) => 
          mealCount + meal.courses.length, 0), 0);
    }, 0);

    const action = {
      type: 'generate_shopping_list',
      aiMessage: `I'll generate a shopping list for "${event.name}" covering ${recipeCount} recipes. The list will be grouped by ${options.groupBy || 'category'} and exported as a ${options.format || 'PDF'}.`,
      data: {
        eventId,
        eventName: event.name,
        groupBy: options.groupBy || 'category',
        recipeCount,
        format: options.format || 'PDF'
      }
    };

    const approved = await this.requestApproval(action);
    if (approved) {
      return await generateShoppingListPDF(eventId, options.groupBy || 'category');
    }
    throw new Error('Shopping list generation cancelled');
  }

  // Export PDF with Approval
  async exportPdfWithApproval(type, id, options = {}, context = {}) {
    let documentType, contentDescription;
    
    switch (type) {
      case 'menu':
        const menuDoc = await getDoc(doc(db, 'menu_items', id));
        const menu = menuDoc.data();
        documentType = 'Menu PDF';
        contentDescription = `Menu "${menu.name}" with all recipes and instructions`;
        break;
      case 'recipe':
        const recipeDoc = await getDoc(doc(db, 'recipes', id));
        const recipe = recipeDoc.data();
        documentType = 'Recipe Card';
        contentDescription = `Recipe for "${recipe.name}" with ingredients and instructions`;
        break;
      case 'event':
        const eventDoc = await getDoc(doc(db, 'events', id));
        const event = eventDoc.data();
        documentType = 'Event Summary';
        contentDescription = `Complete event details for "${event.name}" including menus and allergies`;
        break;
      default:
        throw new Error('Unknown document type');
    }

    const action = {
      type: 'export_pdf',
      aiMessage: `I'll generate a ${documentType} for you. This will create a beautifully formatted PDF that you can print or share.`,
      data: {
        documentType,
        contentDescription,
        type,
        id,
        options
      }
    };

    const approved = await this.requestApproval(action);
    if (approved) {
      switch (type) {
        case 'menu':
          return await generateMenuPDF(id, options.eventId);
        case 'recipe':
          // For recipe PDFs, we'd need the scaled version info
          return { success: true, message: 'Recipe PDF generation needs implementation' };
        case 'shopping':
          return await generateShoppingListPDF(id, options.groupBy || 'category');
        default:
          throw new Error(`Unknown PDF type: ${type}`);
      }
    }
    throw new Error('PDF export cancelled');
  }

  // Manage Allergies with Approval
  async manageAllergiesWithApproval(eventId, changes, context = {}) {
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const event = eventDoc.data();

    const action = {
      type: 'manage_allergies',
      aiMessage: `I'll update the allergy list for "${event.name}". This will affect menu safety checks and accommodation planning.`,
      data: {
        eventId,
        eventName: event.name,
        ...changes
      }
    };

    const approved = await this.requestApproval(action);
    if (approved) {
      const updates = {};
      if (changes.add) {
        updates.allergens = [...new Set([...(event.allergens || []), ...changes.add])];
      }
      if (changes.remove) {
        updates.allergens = (event.allergens || []).filter(a => !changes.remove.includes(a));
      }
      
      await updateDoc(doc(db, 'events', eventId), {
        ...updates,
        updated_at: new Date()
      });
      
      return { success: true, allergens: updates.allergens };
    }
    throw new Error('Allergy update cancelled');
  }

  // Batch Operations with Approval
  async executeBatchOperationsWithApproval(operations, context = {}) {
    const action = {
      type: 'batch_operation',
      aiMessage: `I'm about to perform ${operations.length} operations. This includes creating, updating, and organizing your data. Each operation will be executed in sequence.`,
      data: {
        operations: operations.map(op => ({
          type: op.type,
          description: op.description || `${op.type} operation`
        }))
      }
    };

    const approved = await this.requestApproval(action);
    if (approved) {
      const results = [];
      for (const operation of operations) {
        try {
          const result = await this.executeOperation(operation);
          results.push({ success: true, result });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }
      return results;
    }
    throw new Error('Batch operations cancelled');
  }

  // Execute a single operation (internal helper)
  async executeOperation(operation) {
    switch (operation.type) {
      case 'create_recipe':
        return await aiActionService.createRecipe(operation.data, operation.context);
      case 'update_recipe':
        return await aiActionService.updateRecipe(operation.recipeId, operation.updates, operation.context);
      case 'create_menu':
        return await aiActionService.createMenu(operation.eventId, operation.menuData, operation.context);
      // Add more operation types as needed
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }
}

export const aiActionServiceEnhanced = new AIActionServiceEnhanced();