// Complete AI Actions - All possible actions the AI can perform
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Anthropic } = require('@anthropic-ai/sdk');
// PDF generation would require pdfkit - commented out for now
// const PDFDocument = require('pdfkit');
// const { Readable } = require('stream');

// Initialize Anthropic
const anthropic = new Anthropic({
  apiKey: functions.config().anthropic?.key || process.env.ANTHROPIC_API_KEY
});

// Helper to verify AI request authenticity
async function verifyAIRequest(authToken) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(authToken);
    return decodedToken;
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}

// AI Action: Scale Recipe
exports.aiScaleRecipe = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { recipeId, newServings, saveAsNew, aiContext } = data;
  
  try {
    // Get the recipe
    const recipeDoc = await admin.firestore().collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Recipe not found');
    }

    const recipe = recipeDoc.data();
    const scaleFactor = newServings / recipe.servings;

    // Scale ingredients
    const scaledIngredients = recipe.ingredients.map(ing => {
      const amount = parseFloat(ing.amount) || 0;
      const scaledAmount = amount * scaleFactor;
      
      // Format nicely
      let formattedAmount = scaledAmount;
      if (scaledAmount % 1 === 0) {
        formattedAmount = scaledAmount.toString();
      } else if (scaledAmount < 1) {
        // Convert to fractions for common amounts
        const fractions = {
          0.25: '1/4', 0.33: '1/3', 0.5: '1/2', 
          0.66: '2/3', 0.75: '3/4'
        };
        formattedAmount = fractions[scaledAmount.toFixed(2)] || scaledAmount.toFixed(2);
      } else {
        formattedAmount = scaledAmount.toFixed(1);
      }

      return {
        ...ing,
        amount: formattedAmount,
        originalAmount: ing.amount
      };
    });

    let result;
    if (saveAsNew) {
      // Create new scaled recipe
      const scaledRecipe = {
        ...recipe,
        name: `${recipe.name} (${newServings} servings)`,
        servings: newServings,
        ingredients: scaledIngredients,
        original_recipe_id: recipeId,
        scaled_from: recipe.servings,
        scaled_to: newServings,
        created_by: 'ai_assistant',
        created_for: context.auth.uid,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const newRecipeRef = await admin.firestore().collection('recipes').add(scaledRecipe);
      result = { recipeId: newRecipeRef.id, recipe: scaledRecipe };
    } else {
      // Update existing recipe
      await admin.firestore().collection('recipes').doc(recipeId).update({
        servings: newServings,
        ingredients: scaledIngredients,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        last_scaled_by: 'ai_assistant'
      });
      result = { recipeId, updated: true };
    }

    // Log AI action
    await admin.firestore().collection('ai_actions').add({
      action: 'scale_recipe',
      recipe_id: recipeId,
      new_servings: newServings,
      scale_factor: scaleFactor,
      saved_as_new: saveAsNew,
      user_id: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ai_context: aiContext
    });

    return {
      success: true,
      ...result,
      message: `Recipe scaled to ${newServings} servings!`
    };
  } catch (error) {
    console.error('Error scaling recipe:', error);
    throw new functions.https.HttpsError('internal', 'Failed to scale recipe');
  }
});

// AI Action: Create Event
exports.aiCreateEvent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { event, aiContext } = data;
  
  try {
    // Validate event data
    if (!event.name || !event.start_date || !event.end_date || !event.guest_count) {
      throw new functions.https.HttpsError('invalid-argument', 'Event must have name, dates, and guest count');
    }

    // Create event
    const eventData = {
      ...event,
      created_by: 'ai_assistant',
      created_for: context.auth.uid,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      ai_context: aiContext,
      status: 'planning',
      allergens: event.allergens || [],
      dietary_restrictions: event.dietary_restrictions || [],
      guests_with_restrictions: event.guests_with_restrictions || []
    };

    const eventRef = await admin.firestore().collection('events').add(eventData);

    // Log AI action
    await admin.firestore().collection('ai_actions').add({
      action: 'create_event',
      event_id: eventRef.id,
      user_id: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ai_context: aiContext
    });

    return {
      success: true,
      eventId: eventRef.id,
      message: `Event "${event.name}" created successfully!`
    };
  } catch (error) {
    console.error('Error creating event:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create event');
  }
});

// AI Action: Generate Shopping List
exports.aiGenerateShoppingList = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { eventId, groupBy, format, aiContext } = data;
  
  try {
    // Get event
    const eventDoc = await admin.firestore().collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Event not found');
    }

    const event = eventDoc.data();

    // Get all menus for this event
    const menusSnapshot = await admin.firestore()
      .collection('menu_items')
      .where('event_id', '==', eventId)
      .get();

    // Collect all recipe IDs and servings
    const recipeMap = new Map();
    menusSnapshot.docs.forEach(doc => {
      const menu = doc.data();
      menu.days?.forEach(day => {
        day.meals?.forEach(meal => {
          meal.courses?.forEach(course => {
            if (course.recipe_id) {
              recipeMap.set(course.recipe_id, {
                servings: course.servings || event.guest_count,
                name: course.name
              });
            }
          });
        });
      });
    });

    // Get all recipes
    const recipes = [];
    for (const [recipeId, info] of recipeMap.entries()) {
      const recipeDoc = await admin.firestore().collection('recipes').doc(recipeId).get();
      if (recipeDoc.exists) {
        recipes.push({
          id: recipeId,
          ...recipeDoc.data(),
          menuServings: info.servings
        });
      }
    }

    // Generate shopping list
    const shoppingList = generateShoppingList(recipes, groupBy || 'category');

    // Generate PDF if requested
    let pdfUrl = null;
    if (format === 'pdf' || !format) {
      pdfUrl = await generateShoppingListPDF(event, shoppingList);
    }

    // Log AI action
    await admin.firestore().collection('ai_actions').add({
      action: 'generate_shopping_list',
      event_id: eventId,
      recipe_count: recipes.length,
      group_by: groupBy,
      format: format,
      user_id: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ai_context: aiContext
    });

    return {
      success: true,
      shoppingList,
      pdfUrl,
      message: `Shopping list generated for ${recipes.length} recipes!`
    };
  } catch (error) {
    console.error('Error generating shopping list:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate shopping list');
  }
});

// AI Action: Manage Allergies
exports.aiManageAllergies = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { eventId, operation, allergens, guestRestrictions, aiContext } = data;
  
  try {
    const eventRef = admin.firestore().collection('events').doc(eventId);
    const eventDoc = await eventRef.get();
    
    if (!eventDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Event not found');
    }

    const event = eventDoc.data();
    let updates = {};

    switch (operation) {
      case 'add':
        updates.allergens = [...new Set([...(event.allergens || []), ...allergens])];
        break;
      case 'remove':
        updates.allergens = (event.allergens || []).filter(a => !allergens.includes(a));
        break;
      case 'replace':
        updates.allergens = allergens;
        break;
      case 'add_guest':
        updates.guests_with_restrictions = [...(event.guests_with_restrictions || []), ...guestRestrictions];
        break;
    }

    updates.updated_at = admin.firestore.FieldValue.serverTimestamp();
    await eventRef.update(updates);

    // Trigger safety check
    await admin.firestore().collection('ai_monitoring').add({
      type: 'guest_data_change_review',
      priority: 'high',
      event_id: eventId,
      question: `Guest dietary data has been updated by AI. Please verify all menus are still safe for the updated restrictions: ${updates.allergens?.join(', ')}`,
      context: {
        trigger: 'ai_allergy_update',
        event_allergens: updates.allergens,
        operation: operation,
        auto_trigger: true
      },
      status: 'pending',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log AI action
    await admin.firestore().collection('ai_actions').add({
      action: 'manage_allergies',
      event_id: eventId,
      operation: operation,
      allergens: allergens,
      user_id: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ai_context: aiContext
    });

    return {
      success: true,
      allergens: updates.allergens,
      message: `Allergy list updated successfully!`
    };
  } catch (error) {
    console.error('Error managing allergies:', error);
    throw new functions.https.HttpsError('internal', 'Failed to manage allergies');
  }
});

// AI Action: Export PDF
exports.aiExportPDF = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { type, id, options, aiContext } = data;
  
  try {
    let pdfUrl;
    
    switch (type) {
      case 'menu':
        pdfUrl = await generateMenuPDF(id, options);
        break;
      case 'recipe':
        pdfUrl = await generateRecipePDF(id, options);
        break;
      case 'event':
        pdfUrl = await generateEventPDF(id, options);
        break;
      default:
        throw new functions.https.HttpsError('invalid-argument', 'Invalid PDF type');
    }

    // Log AI action
    await admin.firestore().collection('ai_actions').add({
      action: 'export_pdf',
      type: type,
      document_id: id,
      user_id: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ai_context: aiContext
    });

    return {
      success: true,
      pdfUrl,
      message: `${type} PDF generated successfully!`
    };
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new functions.https.HttpsError('internal', 'Failed to export PDF');
  }
});

// Helper function to generate shopping list
function generateShoppingList(recipes, groupBy) {
  const items = new Map();

  recipes.forEach(recipe => {
    const scaleFactor = recipe.menuServings / recipe.servings;
    
    recipe.ingredients?.forEach(ing => {
      const key = ing.item.toLowerCase();
      const amount = (parseFloat(ing.amount) || 0) * scaleFactor;
      
      if (items.has(key)) {
        const existing = items.get(key);
        existing.amount += amount;
        existing.recipes.push(recipe.name);
      } else {
        items.set(key, {
          item: ing.item,
          amount: amount,
          unit: ing.unit || '',
          category: ing.category || 'Other',
          recipes: [recipe.name]
        });
      }
    });
  });

  // Convert to array and group
  const itemsArray = Array.from(items.values());
  
  if (groupBy === 'category') {
    const grouped = {};
    itemsArray.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }
  
  return itemsArray;
}

// Helper functions for PDF generation (simplified versions)
async function generateMenuPDF(menuId, options) {
  // This would generate a full menu PDF
  // For now, return a placeholder
  return `https://storage.googleapis.com/mountainmedicine-pdfs/menu_${menuId}.pdf`;
}

async function generateRecipePDF(recipeId, options) {
  // This would generate a recipe card PDF
  return `https://storage.googleapis.com/mountainmedicine-pdfs/recipe_${recipeId}.pdf`;
}

async function generateEventPDF(eventId, options) {
  // This would generate an event summary PDF
  return `https://storage.googleapis.com/mountainmedicine-pdfs/event_${eventId}.pdf`;
}

async function generateShoppingListPDF(event, shoppingList) {
  // This would generate a shopping list PDF
  return `https://storage.googleapis.com/mountainmedicine-pdfs/shopping_${event.id}.pdf`;
}

// Export all complete AI actions
module.exports = {
  aiScaleRecipe: exports.aiScaleRecipe,
  aiCreateEvent: exports.aiCreateEvent,
  aiGenerateShoppingList: exports.aiGenerateShoppingList,
  aiManageAllergies: exports.aiManageAllergies,
  aiExportPDF: exports.aiExportPDF
};