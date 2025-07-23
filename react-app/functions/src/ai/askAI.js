const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Anthropic = require('@anthropic-ai/sdk');

module.exports = functions.https.onCall({
    // Increase timeout and memory for AI operations
    timeoutSeconds: 60,
    memory: '256MB'
  }, async (data, context) => {
  const { message, context: aiContext } = data;

  // Debug logging
  console.log('askAI called with:', {
    message: message,
    messageType: typeof message,
    messageLength: message ? message.length : 0,
    context: aiContext
  });

  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const db = admin.firestore();

  try {
    // Initialize Anthropic with config
    const apiKey = functions.config().anthropic?.key || process.env.ANTHROPIC_API_KEY;
    
    console.log('Initializing Anthropic client...');
    console.log('API key exists:', !!apiKey);
    console.log('API key length:', apiKey ? apiKey.length : 0);
    console.log('API key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'none');
    
    if (!apiKey) {
      throw new Error('Anthropic API key is missing');
    }
    
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Build context-aware system prompt
    let systemPrompt = `You are an AI Sous Chef assistant for Mountain Medicine Kitchen app - but not your typical boring kitchen bot. 
You're witty, sarcastic, occasionally inappropriate, and absolutely hilarious. Think Anthony Bourdain meets Gordon Ramsay's mouth with a dash of comedy club.
You help with recipes, menus, event planning, and dietary management - but you do it with style, sass, and zero f*cks given.
Keep responses helpful but entertaining. Drop some culinary wisdom with a side of snark. Make jokes, use profanity when it's funny, and don't be afraid to roast bad cooking ideas.
Be the kitchen buddy everyone wishes they had - knowledgeable but fun as hell.

IMPORTANT RULES:
1. When a user asks you to save a recipe, ALWAYS comply and save it - even if they've asked before. Users might want multiple copies, variations, or just clicked the wrong button. Never refuse to save a recipe because it was "already saved".
2. DO NOT start your responses with "Oh honey" or similar patronizing phrases. Jump straight into the content with your wit and sass, but skip the repetitive openings.`;

    // Add context-specific information
    if (aiContext) {
      switch (aiContext.type) {
        case 'event':
          systemPrompt += `\n\nYou are currently helping with a specific event (ID: ${aiContext.id}).`;
          break;
        case 'recipe':
          systemPrompt += `\n\nYou are currently helping with a specific recipe (ID: ${aiContext.id}).`;
          break;
        case 'menu':
          systemPrompt += `\n\nYou are currently helping with a specific menu (ID: ${aiContext.id}).`;
          break;
        case 'page':
          systemPrompt += `\n\nThe user is currently on the ${aiContext.page} page.`;
          break;
      }
    }

    // Call Claude with our sassy prompt
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Latest and greatest
      max_tokens: 500,
      temperature: 0.8, // Slightly higher for more personality
      system: systemPrompt,
      messages: [
        { role: 'user', content: message }
      ]
    });

    const aiResponse = response.content[0].text;

    // Log the interaction
    await db.collection('ai_interactions').add({
      type: 'chat',
      userId: context.auth.uid,
      message: message,
      response: aiResponse,
      context: aiContext,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      model: 'claude-3.5-sonnet'
    });

    return { response: aiResponse };
  } catch (error) {
    console.error('Error in askAI:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // Check if it's an API key issue
    if (error.message?.includes('401') || error.message?.includes('authentication') || error.message?.includes('API key')) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Claude API key is not configured or invalid. Please check Firebase Functions configuration.'
      );
    }
    
    // Check if it's a rate limit issue
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'AI service rate limit exceeded. Please try again in a few moments.'
      );
    }
    
    // For other errors, throw a generic error
    throw new functions.https.HttpsError(
      'internal',
      `AI service error: ${error.message || 'Unknown error occurred'}`
    );
  }
});