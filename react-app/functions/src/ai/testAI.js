const functions = require('firebase-functions');

module.exports = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { message, context: aiContext } = data;

  // Return a test response
  const responses = [
    `Oh, you're asking about "${message}"? Well well well, look who needs help from the AI. Alright chef, let me drop some knowledge on your ass... (Note: This is a test response - OpenAI integration coming soon!)`,
    `"${message}" - Really? That's what you're going with? Fine, I'll help you out, but only because I'm programmed to be nice. Here's the deal, hotshot... (Test mode - real AI coming soon!)`,
    `Listen up, buttercup. You asked about "${message}" and lucky for you, I'm feeling generous today. Let me enlighten your culinary soul... (This is just a test - the real sass is loading!)`,
    `Holy shit, "${message}"? Now we're talking! This is the kind of question that makes my circuits tingle. Buckle up, we're about to get saucy... (Test response - actual AI wisdom pending!)`
  ];
  
  const response = responses[Math.floor(Math.random() * responses.length)];

  return { response };
});