// HTTP version of aiCreateRecipe as a temporary workaround for deployment issues
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

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
      const authToken = req.headers.authorization?.split('Bearer ')[1];
      if (!authToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify the token
      const decodedToken = await admin.auth().verifyIdToken(authToken);
      
      const { recipe, aiContext } = req.body;
      
      // Validate recipe data
      if (!recipe || !recipe.name || !recipe.ingredients || !recipe.instructions) {
        res.status(400).json({ 
          error: 'Recipe must have name, ingredients, and instructions' 
        });
        return;
      }

      // Add metadata
      const recipeData = {
        ...recipe,
        created_by: 'ai_assistant',
        created_for: decodedToken.uid,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        ai_context: aiContext || {},
        status: recipe.status || 'active'
      };

      // Create recipe in Firestore
      const recipeRef = await admin.firestore().collection('recipes').add(recipeData);
      
      // Log AI action
      await admin.firestore().collection('ai_actions').add({
        action: 'create_recipe',
        recipe_id: recipeRef.id,
        user_id: decodedToken.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ai_context: aiContext
      });

      res.json({
        success: true,
        recipeId: recipeRef.id,
        message: `Recipe "${recipe.name}" created successfully!`
      });
    } catch (error) {
      console.error('Error creating recipe:', error);
      res.status(500).json({ 
        error: 'Failed to create recipe', 
        details: error.message 
      });
    }
  });
});