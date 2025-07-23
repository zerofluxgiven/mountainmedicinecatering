/**
 * Migration script to update recipes with specific allergens
 * Particularly for recipes marked with "tree nuts" that should have specific nuts like "almond"
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // You'll need to add your service account key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Import allergen detection logic
const { detectAllergens, ALLERGEN_HIERARCHY } = require('./functions/src/triggers/allergenDetectionTriggers');

async function migrateRecipeAllergens() {
  console.log('Starting allergen migration...');
  
  try {
    // Get all recipes
    const recipesSnapshot = await db.collection('recipes').get();
    
    let updatedCount = 0;
    let processedCount = 0;
    
    // Process each recipe
    for (const doc of recipesSnapshot.docs) {
      const recipe = doc.data();
      const recipeId = doc.id;
      processedCount++;
      
      console.log(`\nProcessing recipe ${processedCount}/${recipesSnapshot.size}: ${recipe.name}`);
      
      // Detect allergens in the recipe
      const detectedAllergens = detectAllergens(recipe);
      const currentAllergens = recipe.allergens || [];
      
      // Check if we need to update
      let needsUpdate = false;
      const updatedAllergens = [...currentAllergens];
      
      // 1. Add specific allergens if parent category exists
      currentAllergens.forEach(allergen => {
        if (ALLERGEN_HIERARCHY[allergen]) {
          // This is a parent category, check for specific allergens
          const specificAllergens = ALLERGEN_HIERARCHY[allergen].filter(specific => 
            detectedAllergens.includes(specific) && !currentAllergens.includes(specific)
          );
          
          if (specificAllergens.length > 0) {
            console.log(`  - Found specific allergens for ${allergen}: ${specificAllergens.join(', ')}`);
            updatedAllergens.push(...specificAllergens);
            needsUpdate = true;
          }
        }
      });
      
      // 2. Add detected allergens that are missing
      const missingAllergens = detectedAllergens.filter(a => !updatedAllergens.includes(a));
      if (missingAllergens.length > 0) {
        console.log(`  - Adding missing allergens: ${missingAllergens.join(', ')}`);
        updatedAllergens.push(...missingAllergens);
        needsUpdate = true;
      }
      
      // 3. Special case: If recipe has "tree nuts" but no specific nuts, and we detected some
      if (currentAllergens.includes('tree nuts')) {
        const specificNuts = ALLERGEN_HIERARCHY['tree nuts'].filter(nut => 
          detectedAllergens.includes(nut)
        );
        
        if (specificNuts.length > 0) {
          const newNuts = specificNuts.filter(nut => !updatedAllergens.includes(nut));
          if (newNuts.length > 0) {
            console.log(`  - Adding specific tree nuts: ${newNuts.join(', ')}`);
            updatedAllergens.push(...newNuts);
            needsUpdate = true;
          }
        }
      }
      
      // Update if needed
      if (needsUpdate) {
        const uniqueAllergens = [...new Set(updatedAllergens)].sort();
        
        await db.collection('recipes').doc(recipeId).update({
          allergens: uniqueAllergens,
          allergen_migration_completed: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`  ✓ Updated allergens: ${uniqueAllergens.join(', ')}`);
        updatedCount++;
      } else {
        console.log('  - No updates needed');
      }
    }
    
    console.log(`\nMigration completed!`);
    console.log(`Processed: ${processedCount} recipes`);
    console.log(`Updated: ${updatedCount} recipes`);
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Exit the process
    process.exit();
  }
}

// Run the migration
migrateRecipeAllergens();