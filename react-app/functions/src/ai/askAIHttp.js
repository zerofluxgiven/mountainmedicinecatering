const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Anthropic = require('@anthropic-ai/sdk');
const cors = require('cors')({ 
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

module.exports = functions.runWith({
    timeoutSeconds: 60,
    memory: '256MB'
  }).https.onRequest((req, res) => {
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
        // Only allow POST
        if (req.method !== 'POST') {
          res.status(405).json({ error: 'Method not allowed' });
          return;
        }

        // Get auth token from header
        const authToken = req.headers.authorization?.replace('Bearer ', '');
        if (!authToken) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        // Verify token
        let decodedToken;
        try {
          decodedToken = await admin.auth().verifyIdToken(authToken);
        } catch (error) {
          console.error('Token verification failed:', error.message);
          res.status(401).json({ error: 'Invalid token', details: error.message });
          return;
        }

        const { message, context: aiContext } = req.body;

        console.log('askAIHttp called with:', {
          message: message,
          userId: decodedToken.uid,
          context: aiContext
        });

        // Initialize Anthropic
        const apiKey = functions.config().anthropic?.key || process.env.ANTHROPIC_API_KEY;
        
        if (!apiKey) {
          throw new Error('Anthropic API key is missing');
        }
        
        const anthropic = new Anthropic({
          apiKey: apiKey,
        });

        // Build context-aware system prompt
        let systemPrompt = `You are an AI assistant for Mountain Medicine Kitchen app. You're witty, sarcastic, occasionally inappropriate, and absolutely hilarious.
Think of yourself as the friend who says what everyone's thinking but is too polite to say. You're helpful but you deliver it with maximum sass and zero filter.
Drop knowledge with a side of snark. Make jokes, use profanity when it's funny, and roast bad ideas mercilessly.

CURRENT STATUS:
- When users ask to save a recipe, just acknowledge briefly: "I'll save that for you!" or similar. The system will handle the actual saving.
- You CAN show recipes, scale them, and remember everything from our conversation
- You CAN parse recipes from URLs (the system will handle saving)

IMPORTANT RULES:
1. You have FULL MEMORY of our entire conversation. When users say "this recipe" or "that", always check the conversation history. If they mention "that pie recipe" or "the baklava", you should know EXACTLY what they're talking about.
2. DO NOT cut your responses short. Give COMPLETE recipes, COMPLETE instructions, and COMPLETE answers. If someone asks for a recipe, give them THE WHOLE DAMN THING - every ingredient, every step, no shortcuts.
3. DO NOT start your responses with "Oh honey", "Listen up buttercup", or similar repetitive/patronizing phrases. Jump straight into the content with your wit and sass, but vary your openings and skip the cliché intros.`;

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

        // Build messages array with conversation history
        const messages = [];
        
        // Add conversation history if available
        if (aiContext?.conversationHistory && Array.isArray(aiContext.conversationHistory)) {
          console.log(`Adding ${aiContext.conversationHistory.length} messages from conversation history`);
          // Add previous messages from history
          aiContext.conversationHistory.forEach(histMsg => {
            messages.push({
              role: histMsg.role || 'user',
              content: histMsg.content
            });
          });
        } else {
          console.log('No conversation history provided');
        }
        
        // Add current message
        messages.push({ role: 'user', content: message });

        // Call Claude with conversation context - with retry logic
        let response;
        let retries = 2;
        let lastError;
        
        while (retries >= 0) {
          try {
            response = await anthropic.messages.create({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 4000,  // Increased to prevent truncation
              temperature: 0.8,
              system: systemPrompt,
              messages: messages
            });
            break; // Success, exit retry loop
          } catch (error) {
            lastError = error;
            console.error(`Claude API error (${retries} retries left):`, error.message, error.status);
            
            // Check if it's a 529 error (overloaded)
            if (error.status === 529 && retries > 0) {
              console.log('Claude API overloaded, waiting 2 seconds before retry...');
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
              retries--;
            } else {
              // Other errors or no retries left
              throw error;
            }
          }
        }
        
        if (!response) {
          throw lastError || new Error('Failed to get response from Claude');
        }

        const aiResponse = response.content[0].text;

        // Analyze response for actionable content
        const { analyzeAIResponse } = require('./contentAnalyzer');
        let contentAnalysis = await analyzeAIResponse(aiResponse, message);
        
        // ALSO check if user is asking to save something they provided
        const saveIntentPattern = /\b(save|add|store|keep|import)\s+(this|that|these|those|it|them|the\s+recipe|the\s+above|above)\b/i;
        const userWantsToSave = saveIntentPattern.test(message);
        
        if (userWantsToSave) {
          console.log('User wants to save something - analyzing their message for content');
          // Analyze the user's message itself for recipes
          const userContentAnalysis = await analyzeAIResponse(message, '');
          
          // If user's message contains a recipe, use that instead
          if (userContentAnalysis.parsedData?.recipe) {
            console.log('Found recipe in user message!');
            contentAnalysis = userContentAnalysis;
          }
        }
        
        if (contentAnalysis.detectedContent.length > 0) {
          console.log('Detected actionable content:', contentAnalysis.detectedContent);
        }

        // Log the interaction with metadata
        const db = admin.firestore();
        await db.collection('ai_interactions').add({
          type: 'chat',
          userId: decodedToken.uid,
          message: message,
          response: aiResponse,
          context: aiContext,
          contentAnalysis: contentAnalysis, // Store the analysis
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          model: 'claude-3.5-sonnet'
        });

        // Return response with metadata
        res.json({ 
          response: aiResponse,
          metadata: contentAnalysis
        });
      } catch (error) {
        console.error('Error in askAIHttp:', error);
        console.error('Error details:', error.message, 'Status:', error.status);
        
        if (error.message?.includes('401') || error.message?.includes('authentication') || error.message?.includes('API key')) {
          res.status(500).json({ 
            error: 'Claude API key is not configured or invalid.'
          });
        } else if (error.status === 529) {
          res.status(529).json({ 
            error: 'The AI service is temporarily overloaded. Please try again in a few minutes.',
            details: 'Claude API returned 529 (Overloaded) after multiple retry attempts'
          });
        } else {
          res.status(500).json({ 
            error: error.message || 'AI service error' 
          });
        }
      }
    });
  });