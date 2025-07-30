// AI Actions - Firebase Functions that allow AI to perform actions in the app
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Anthropic } = require('@anthropic-ai/sdk');

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

// AI Action: Create Recipe
exports.aiCreateRecipe = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { recipe, aiContext } = data;
  
  try {
    // Validate recipe data
    if (!recipe.name || !recipe.ingredients || !recipe.instructions) {
      throw new functions.https.HttpsError('invalid-argument', 'Recipe must have name, ingredients, and instructions');
    }

    // Add metadata
    const recipeData = {
      ...recipe,
      created_by: 'ai_assistant',
      created_for: context.auth.uid,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      ai_context: aiContext || {},
      status: 'active'
    };

    // Create recipe in Firestore
    const recipeRef = await admin.firestore().collection('recipes').add(recipeData);
    
    // Log AI action
    await admin.firestore().collection('ai_actions').add({
      action: 'create_recipe',
      recipe_id: recipeRef.id,
      user_id: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ai_context: aiContext
    });

    return {
      success: true,
      recipeId: recipeRef.id,
      message: `Recipe "${recipe.name}" created successfully!`
    };
  } catch (error) {
    console.error('Error creating recipe:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create recipe');
  }
});

// AI Action: Update Recipe
exports.aiUpdateRecipe = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { recipeId, updates, aiContext } = data;
  
  try {
    // Verify recipe exists
    const recipeDoc = await admin.firestore().collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Recipe not found');
    }

    // Update recipe
    const updateData = {
      ...updates,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      last_modified_by: 'ai_assistant'
    };

    await admin.firestore().collection('recipes').doc(recipeId).update(updateData);

    // Log AI action
    await admin.firestore().collection('ai_actions').add({
      action: 'update_recipe',
      recipe_id: recipeId,
      user_id: context.auth.uid,
      updates: Object.keys(updates),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ai_context: aiContext
    });

    return {
      success: true,
      message: `Recipe updated successfully!`
    };
  } catch (error) {
    console.error('Error updating recipe:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update recipe');
  }
});

// AI Action: Parse Recipe from URL
exports.aiParseRecipeFromUrl = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { url, aiContext } = data;
  
  try {
    // First, fetch the webpage content
    const axios = require('axios');
    const response = await axios.get(url);
    const html = response.data;

    // Use Claude to parse the recipe
    const completion = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Parse this recipe webpage and extract the recipe in JSON format. Include name, servings, ingredients (with amounts and units), and instructions.

URL: ${url}
HTML Content (first 10000 chars): ${html.substring(0, 10000)}

Return ONLY valid JSON with this structure:
{
  "name": "Recipe Name",
  "servings": "number",
  "ingredients": [
    {"item": "ingredient", "amount": "1", "unit": "cup"}
  ],
  "instructions": ["Step 1", "Step 2"],
  "notes": "any additional notes"
}`
      }]
    });

    // Parse the response
    const recipeJson = JSON.parse(completion.content[0].text);
    
    // Create the recipe
    const recipeData = {
      ...recipeJson,
      source_url: url,
      created_by: 'ai_assistant',
      created_for: context.auth.uid,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      ai_context: {
        ...aiContext,
        parsed_from_url: url
      },
      status: 'active'
    };

    const recipeRef = await admin.firestore().collection('recipes').add(recipeData);

    // Log AI action
    await admin.firestore().collection('ai_actions').add({
      action: 'parse_recipe_from_url',
      recipe_id: recipeRef.id,
      user_id: context.auth.uid,
      source_url: url,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ai_context: aiContext
    });

    return {
      success: true,
      recipeId: recipeRef.id,
      recipe: recipeJson,
      message: `Recipe "${recipeJson.name}" imported successfully from ${url}!`
    };
  } catch (error) {
    console.error('Error parsing recipe from URL:', error);
    throw new functions.https.HttpsError('internal', 'Failed to parse recipe from URL');
  }
});

// AI Action: Create Menu
exports.aiCreateMenu = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { eventId, menuData, aiContext } = data;
  
  try {
    // Verify event exists
    const eventDoc = await admin.firestore().collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Event not found');
    }

    // Create menu
    const menu = {
      ...menuData,
      event_id: eventId,
      created_by: 'ai_assistant',
      created_for: context.auth.uid,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      ai_context: aiContext
    };

    const menuRef = await admin.firestore().collection('menu_items').add(menu);

    // Log AI action
    await admin.firestore().collection('ai_actions').add({
      action: 'create_menu',
      menu_id: menuRef.id,
      event_id: eventId,
      user_id: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ai_context: aiContext
    });

    return {
      success: true,
      menuId: menuRef.id,
      message: `Menu created successfully for ${eventDoc.data().name}!`
    };
  } catch (error) {
    console.error('Error creating menu:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create menu');
  }
});

// AI Action: Add Recipe to Menu
exports.aiAddRecipeToMenu = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { menuId, dayIndex, mealIndex, recipeId, servings, aiContext } = data;
  
  try {
    // Get menu and recipe
    const [menuDoc, recipeDoc] = await Promise.all([
      admin.firestore().collection('menu_items').doc(menuId).get(),
      admin.firestore().collection('recipes').doc(recipeId).get()
    ]);

    if (!menuDoc.exists || !recipeDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Menu or recipe not found');
    }

    const menu = menuDoc.data();
    const recipe = recipeDoc.data();

    // Add recipe to menu
    if (!menu.days[dayIndex] || !menu.days[dayIndex].meals[mealIndex]) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid day or meal index');
    }

    const newCourse = {
      id: `course_${Date.now()}`,
      name: recipe.name,
      recipe_id: recipeId,
      servings: servings || recipe.servings,
      allergens: recipe.allergens || [],
      dietary_tags: recipe.dietary_tags || []
    };

    menu.days[dayIndex].meals[mealIndex].courses.push(newCourse);
    menu.updated_at = admin.firestore.FieldValue.serverTimestamp();

    await admin.firestore().collection('menu_items').doc(menuId).update(menu);

    // Log AI action
    await admin.firestore().collection('ai_actions').add({
      action: 'add_recipe_to_menu',
      menu_id: menuId,
      recipe_id: recipeId,
      day_index: dayIndex,
      meal_index: mealIndex,
      user_id: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ai_context: aiContext
    });

    return {
      success: true,
      message: `Added "${recipe.name}" to the menu!`
    };
  } catch (error) {
    console.error('Error adding recipe to menu:', error);
    throw new functions.https.HttpsError('internal', 'Failed to add recipe to menu');
  }
});

// Export all AI actions
module.exports = {
  aiCreateRecipe: exports.aiCreateRecipe,
  aiUpdateRecipe: exports.aiUpdateRecipe,
  aiParseRecipeFromUrl: exports.aiParseRecipeFromUrl,
  aiCreateMenu: exports.aiCreateMenu,
  aiAddRecipeToMenu: exports.aiAddRecipeToMenu
};