const functions = require("firebase-functions");
const admin = require("firebase-admin");
const OpenAI = require("openai");
const cors = require("cors")({ origin: true });

// Load environment variables in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Initialize Firebase Admin
admin.initializeApp();

// Initialize OpenAI with config
const openai = new OpenAI({
  apiKey: functions.config().openai?.key || process.env.OPENAI_API_KEY,
});

// Import function modules
const { parseRecipeFromText, parseRecipeFromURL, parseRecipeFromFile } = require("./recipes/parser");
const { parseEventFromFile, parseEventFromURL } = require("./events/parser");
const { generateMenuPDF, generateShoppingListPDF } = require("./pdf/generator");
const { sendEventReminder, sendMenuUpdate } = require("./email/notifications");
const { handleChatMessage } = require("./chat/assistant");
const createAskAI = require("./src/ai/askAI");

// Recipe Parsing Function - Increased memory for image processing
exports.parseRecipe = functions.https.onCall({ 
    memory: '1GB',
    timeoutSeconds: 60 
  }, async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { text, url, type, fileData, mimeType } = data;

  try {
    // Check if OpenAI is properly configured
    if (!openai.apiKey) {
      console.error("OpenAI API key is not configured");
      throw new Error("Recipe parsing service is not properly configured. Please contact support.");
    }
    
    let parsedRecipe;
    
    console.log("Parse recipe called with:", { type, hasText: !!text, hasUrl: !!url, hasFileData: !!fileData, mimeType });
    
    if (type === "url" && url) {
      parsedRecipe = await parseRecipeFromURL(url, openai);
    } else if (fileData && mimeType) {
      // Handle file upload (including images)
      const buffer = Buffer.from(fileData, 'base64');
      parsedRecipe = await parseRecipeFromFile(buffer, mimeType, openai);
    } else if (text) {
      parsedRecipe = await parseRecipeFromText(text, openai);
    } else {
      throw new Error("No valid input provided. Please provide text, URL, or file data.");
    }

    // Log the parsing for analytics
    await admin.firestore().collection("parse_logs").add({
      userId: context.auth.uid,
      type: type || "text",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      success: true,
    });

    return { success: true, recipe: parsedRecipe };
  } catch (error) {
    console.error("Recipe parsing error:", error);
    
    // Log the error
    await admin.firestore().collection("parse_logs").add({
      userId: context.auth.uid,
      type: type || "text",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      success: false,
      error: error.message,
    });

    throw new functions.https.HttpsError("internal", "Failed to parse recipe: " + error.message);
  }
});

// PDF Generation Functions
exports.generateMenuPDF = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { menuId, eventId } = data;

  try {
    // Fetch menu data
    const menuDoc = await admin.firestore().collection("menus").doc(menuId).get();
    if (!menuDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Menu not found");
    }

    // Fetch event data if provided
    let eventData = null;
    if (eventId) {
      const eventDoc = await admin.firestore().collection("events").doc(eventId).get();
      if (eventDoc.exists) {
        eventData = { id: eventDoc.id, ...eventDoc.data() };
      }
    }

    const menuData = { id: menuDoc.id, ...menuDoc.data() };

    // Generate PDF
    const pdfUrl = await generateMenuPDF(menuData, eventData);

    return { success: true, pdfUrl };
  } catch (error) {
    console.error("PDF generation error:", error);
    throw new functions.https.HttpsError("internal", "Failed to generate PDF: " + error.message);
  }
});

exports.generateShoppingListPDF = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { eventId, groupBy = "category" } = data;

  try {
    // Fetch event data
    const eventDoc = await admin.firestore().collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Event not found");
    }

    const eventData = { id: eventDoc.id, ...eventDoc.data() };

    // Fetch associated menus
    const menusSnapshot = await admin.firestore()
      .collection("menus")
      .where("event_id", "==", eventId)
      .get();

    const menus = menusSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch recipes referenced in menus
    const recipeIds = new Set();
    menus.forEach(menu => {
      menu.sections?.forEach(section => {
        section.items?.forEach(item => {
          if (item.recipe_id) recipeIds.add(item.recipe_id);
        });
      });
    });

    const recipes = [];
    for (const recipeId of recipeIds) {
      const recipeDoc = await admin.firestore().collection("recipes").doc(recipeId).get();
      if (recipeDoc.exists) {
        recipes.push({ id: recipeDoc.id, ...recipeDoc.data() });
      }
    }

    // Fetch ingredients
    const ingredientsSnapshot = await admin.firestore().collection("ingredients").get();
    const ingredients = ingredientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Generate shopping list PDF
    const pdfUrl = await generateShoppingListPDF(eventData, menus, recipes, ingredients, groupBy);

    return { success: true, pdfUrl };
  } catch (error) {
    console.error("Shopping list PDF generation error:", error);
    throw new functions.https.HttpsError("internal", "Failed to generate shopping list: " + error.message);
  }
});

// Email Notification Functions
exports.sendEventReminder = functions.pubsub.schedule("every day 09:00").onRun(async (context) => {
  // Find events happening in the next 7 days
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const eventsSnapshot = await admin.firestore()
    .collection("events")
    .where("event_date", ">=", now)
    .where("event_date", "<=", nextWeek)
    .where("reminder_sent", "!=", true)
    .get();

  const promises = eventsSnapshot.docs.map(async (doc) => {
    const event = { id: doc.id, ...doc.data() };
    
    try {
      await sendEventReminder(event);
      
      // Mark reminder as sent
      await doc.ref.update({
        reminder_sent: true,
        reminder_sent_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error(`Failed to send reminder for event ${event.id}:`, error);
    }
  });

  await Promise.all(promises);
});

// Aggregate Event Allergens (triggered by allergy changes)
exports.aggregateEventAllergens = functions.firestore
  .document("events/{eventId}/allergies/{allergyId}")
  .onWrite(async (change, context) => {
    const { eventId } = context.params;

    try {
      // Get all allergies for this event
      const allergiesSnapshot = await admin.firestore()
        .collection("events")
        .doc(eventId)
        .collection("allergies")
        .get();

      // Collect all unique allergens
      const allergenSet = new Set();
      allergiesSnapshot.docs.forEach(doc => {
        const allergy = doc.data();
        allergy.allergens?.forEach(allergen => allergenSet.add(allergen));
      });

      // Update event document with aggregated allergens
      await admin.firestore()
        .collection("events")
        .doc(eventId)
        .update({
          allergens: Array.from(allergenSet).sort(),
          allergen_count: allergenSet.size,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

    } catch (error) {
      console.error("Error aggregating allergens:", error);
    }
  });

// Clean up old parse logs (runs daily)
exports.cleanupParseLogs = functions.pubsub.schedule("every day 02:00").onRun(async (context) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const oldLogsSnapshot = await admin.firestore()
    .collection("parse_logs")
    .where("timestamp", "<", thirtyDaysAgo)
    .get();

  const batch = admin.firestore().batch();
  oldLogsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Deleted ${oldLogsSnapshot.size} old parse logs`);
});

// AI Chat Assistant Function
exports.chatAssistant = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { message, conversationId, eventContext } = data;

  try {
    // Get AI response
    const response = await handleChatMessage(
      message, 
      conversationId,
      eventContext,
      context.auth.uid,
      openai,
      admin
    );

    return { success: true, response };
  } catch (error) {
    console.error("Chat assistant error:", error);
    throw new functions.https.HttpsError("internal", "Failed to process message: " + error.message);
  }
});

// Event Flyer Parsing Function
exports.parseEventFlyer = functions.https.onCall({ 
    cors: true,
    timeoutSeconds: 60,
    memory: '512MB'
  }, async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { fileData, mimeType, url } = data;

  try {
    let parsedEvent;
    
    if (url) {
      // Parse from URL
      parsedEvent = await parseEventFromURL(url, openai);
    } else if (fileData) {
      // Parse from uploaded file
      const buffer = Buffer.from(fileData, 'base64');
      parsedEvent = await parseEventFromFile(buffer, mimeType, openai);
    } else {
      throw new functions.https.HttpsError("invalid-argument", "Either fileData or url must be provided");
    }

    // Log the parsing for analytics
    await admin.firestore().collection("parse_logs").add({
      userId: context.auth.uid,
      type: "event_flyer",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      success: true,
    });

    return { success: true, event: parsedEvent };
  } catch (error) {
    console.error("Event flyer parsing error:", error);
    
    // Log the error
    await admin.firestore().collection("parse_logs").add({
      userId: context.auth.uid,
      type: "event_flyer",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      success: false,
      error: error.message,
    });

    throw new functions.https.HttpsError("internal", "Failed to parse event flyer: " + error.message);
  }
});

// CORS-enabled HTTP endpoint for health check
exports.healthCheck = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });
});

// HTTP version of parseEventFlyer with CORS support (temporary workaround)
exports.parseEventFlyerHTTP = functions.https.onRequest((req, res) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  cors(req, res, async () => {
    try {
      // Check if it's a POST request
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Get auth token from header
      const authToken = req.headers.authorization?.split('Bearer ')[1];
      if (!authToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify the token
      const decodedToken = await admin.auth().verifyIdToken(authToken);
      
      const { fileData, mimeType } = req.body;
      
      if (!fileData || !mimeType) {
        res.status(400).json({ error: 'Missing fileData or mimeType' });
        return;
      }

      // Generate a temporary eventId for image storage
      const tempEventId = `temp_${decodedToken.uid}_${Date.now()}`;
      
      // Parse the event
      const buffer = Buffer.from(fileData, 'base64');
      const parsedEvent = await parseEventFromFile(buffer, mimeType, openai, tempEventId);
      
      res.json({ success: true, event: parsedEvent, tempEventId });
    } catch (error) {
      console.error('ParseEventFlyerHTTP error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

// Export the AI assistant function (now uses Claude)
exports.askAI = createAskAI;

// HTTP version as fallback for CORS issues
exports.askAIHttp = require("./src/ai/askAIHttp");

// HTTP version of aiCreateRecipe as temporary workaround
exports.aiCreateRecipeHttp = require("./src/ai/aiCreateRecipeHttp");

// Public HTTP version that properly handles CORS
exports.aiCreateRecipeHttpPublic = require("./src/ai/aiCreateRecipeHttpPublic");

// Export AI safety monitoring triggers
const menuSafetyTriggers = require("./src/triggers/menuSafetyTriggers");
exports.onMenuChange = menuSafetyTriggers.onMenuChange;
exports.onEventGuestDataChange = menuSafetyTriggers.onEventGuestDataChange;
exports.onAccommodationMenuCreate = menuSafetyTriggers.onAccommodationMenuCreate;
exports.onDietChange = menuSafetyTriggers.onDietChange;
exports.dailySafetySweep = menuSafetyTriggers.dailySafetySweep;

// Export image thumbnail generation functions
const { generateRecipeThumbnails, generateThumbnailsForExistingImages } = require("./images/thumbnailGenerator");
exports.generateRecipeThumbnails = generateRecipeThumbnails;
exports.generateThumbnailsForExistingImages = generateThumbnailsForExistingImages;

// Export AI Action functions
const aiActions = require("./src/ai/aiActions");
exports.aiCreateRecipe = aiActions.aiCreateRecipe;
exports.aiUpdateRecipe = aiActions.aiUpdateRecipe;
exports.aiParseRecipeFromUrl = aiActions.aiParseRecipeFromUrl;
exports.aiCreateMenu = aiActions.aiCreateMenu;
exports.aiAddRecipeToMenu = aiActions.aiAddRecipeToMenu;

// Export Complete AI Action functions
const aiActionsComplete = require("./src/ai/aiActionsComplete");
exports.aiScaleRecipe = aiActionsComplete.aiScaleRecipe;
exports.aiCreateEvent = aiActionsComplete.aiCreateEvent;
exports.aiGenerateShoppingList = aiActionsComplete.aiGenerateShoppingList;
exports.aiManageAllergies = aiActionsComplete.aiManageAllergies;
exports.aiExportPDF = aiActionsComplete.aiExportPDF;
