// Script to clean up malformed ingredient names in the database
// This fixes ingredients like "/2 Teaspoon Baking Soda" that should be "Baking Soda"

import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { extractIngredientName, normalizeIngredientName, isSameIngredient } from './ingredientParser';

/**
 * Clean up malformed ingredient names in the database
 * @returns {Promise<Object>} Results of the cleanup operation
 */
export async function cleanupIngredientNames() {
  console.log('Starting ingredient cleanup...');
  
  const results = {
    total: 0,
    fixed: 0,
    merged: 0,
    errors: [],
    changes: []
  };
  
  try {
    // Get all ingredients
    const ingredientsSnapshot = await getDocs(collection(db, 'ingredients'));
    const ingredients = [];
    
    ingredientsSnapshot.forEach(doc => {
      ingredients.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    results.total = ingredients.length;
    console.log(`Found ${results.total} ingredients to check`);
    
    // Group ingredients by their normalized name
    const normalizedGroups = new Map();
    
    for (const ingredient of ingredients) {
      const currentName = ingredient.name || '';
      
      // Check if this looks like a malformed ingredient (starts with / or contains measurement)
      const isMalformed = currentName.match(/^\/\d+|^\d*\/\d+\s+\w+|^\d+\s+\w+/);
      
      // Extract the clean ingredient name
      const cleanName = extractIngredientName(currentName);
      const normalizedName = normalizeIngredientName(cleanName);
      
      // Skip if we couldn't extract a meaningful name
      if (!normalizedName || normalizedName.length < 2) {
        console.warn(`Skipping ingredient with invalid name: "${currentName}"`);
        continue;
      }
      
      // Add to normalized groups
      if (!normalizedGroups.has(normalizedName)) {
        normalizedGroups.set(normalizedName, []);
      }
      normalizedGroups.get(normalizedName).push({
        ...ingredient,
        cleanName,
        normalizedName,
        isMalformed
      });
    }
    
    // Process each group
    for (const [normalizedName, group] of normalizedGroups.entries()) {
      if (group.length === 1) {
        // Single ingredient, just fix the name if needed
        const ingredient = group[0];
        if (ingredient.isMalformed) {
          try {
            await updateDoc(doc(db, 'ingredients', ingredient.id), {
              name: ingredient.normalizedName,
              original_name: ingredient.name // Keep original for reference
            });
            
            results.fixed++;
            results.changes.push({
              type: 'fixed',
              id: ingredient.id,
              from: ingredient.name,
              to: ingredient.normalizedName
            });
            
            console.log(`Fixed: "${ingredient.name}" -> "${ingredient.normalizedName}"`);
          } catch (error) {
            results.errors.push({
              id: ingredient.id,
              name: ingredient.name,
              error: error.message
            });
          }
        }
      } else {
        // Multiple ingredients with same normalized name - merge them
        console.log(`Found ${group.length} ingredients for "${normalizedName}"`);
        
        // Find the best candidate to keep (prefer non-malformed, then most complete data)
        const primary = group.reduce((best, current) => {
          // Prefer non-malformed names
          if (!best.isMalformed && current.isMalformed) return best;
          if (best.isMalformed && !current.isMalformed) return current;
          
          // Prefer ingredients with more data
          const bestDataCount = Object.values(best).filter(v => v && v !== '').length;
          const currentDataCount = Object.values(current).filter(v => v && v !== '').length;
          
          return currentDataCount > bestDataCount ? current : best;
        });
        
        // Update the primary ingredient with the clean name
        try {
          const updateData = {
            name: normalizedName
          };
          
          // Merge data from other ingredients if primary is missing it
          for (const other of group) {
            if (other.id === primary.id) continue;
            
            // Merge non-empty fields
            for (const [key, value] of Object.entries(other)) {
              if (key === 'id' || key === 'name' || key === 'cleanName' || 
                  key === 'normalizedName' || key === 'isMalformed') continue;
              
              if (value && (!primary[key] || primary[key] === '')) {
                updateData[key] = value;
              }
            }
          }
          
          // Update primary ingredient
          await updateDoc(doc(db, 'ingredients', primary.id), updateData);
          
          // Delete duplicates
          for (const other of group) {
            if (other.id === primary.id) continue;
            
            try {
              await deleteDoc(doc(db, 'ingredients', other.id));
              results.merged++;
              results.changes.push({
                type: 'merged',
                deleted: other.id,
                deletedName: other.name,
                mergedInto: primary.id,
                mergedName: normalizedName
              });
              
              console.log(`Merged: "${other.name}" -> "${normalizedName}" (kept ${primary.id})`);
            } catch (error) {
              results.errors.push({
                id: other.id,
                name: other.name,
                error: `Failed to delete duplicate: ${error.message}`
              });
            }
          }
          
          if (primary.isMalformed) {
            results.fixed++;
          }
        } catch (error) {
          results.errors.push({
            id: primary.id,
            name: primary.name,
            error: error.message
          });
        }
      }
    }
    
    console.log('Cleanup complete!');
    console.log(`Total ingredients: ${results.total}`);
    console.log(`Fixed malformed names: ${results.fixed}`);
    console.log(`Merged duplicates: ${results.merged}`);
    console.log(`Errors: ${results.errors.length}`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    results.errors.push({
      general: error.message
    });
  }
  
  return results;
}

/**
 * Dry run to preview what changes would be made
 * @returns {Promise<Object>} Preview of changes
 */
export async function previewIngredientCleanup() {
  console.log('Previewing ingredient cleanup...');
  
  const preview = {
    total: 0,
    wouldFix: [],
    wouldMerge: [],
    noChange: []
  };
  
  try {
    // Get all ingredients
    const ingredientsSnapshot = await getDocs(collection(db, 'ingredients'));
    const ingredients = [];
    
    ingredientsSnapshot.forEach(doc => {
      ingredients.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    preview.total = ingredients.length;
    
    // Group ingredients by their normalized name
    const normalizedGroups = new Map();
    
    for (const ingredient of ingredients) {
      const currentName = ingredient.name || '';
      const isMalformed = currentName.match(/^\/\d+|^\d*\/\d+\s+\w+|^\d+\s+\w+/);
      const cleanName = extractIngredientName(currentName);
      const normalizedName = normalizeIngredientName(cleanName);
      
      if (!normalizedName || normalizedName.length < 2) continue;
      
      if (!normalizedGroups.has(normalizedName)) {
        normalizedGroups.set(normalizedName, []);
      }
      normalizedGroups.get(normalizedName).push({
        id: ingredient.id,
        name: currentName,
        normalizedName,
        isMalformed
      });
    }
    
    // Analyze each group
    for (const [normalizedName, group] of normalizedGroups.entries()) {
      if (group.length === 1) {
        const ingredient = group[0];
        if (ingredient.isMalformed) {
          preview.wouldFix.push({
            id: ingredient.id,
            from: ingredient.name,
            to: ingredient.normalizedName
          });
        } else if (ingredient.name !== ingredient.normalizedName) {
          preview.wouldFix.push({
            id: ingredient.id,
            from: ingredient.name,
            to: ingredient.normalizedName,
            reason: 'normalization'
          });
        } else {
          preview.noChange.push({
            id: ingredient.id,
            name: ingredient.name
          });
        }
      } else {
        // Would merge duplicates
        preview.wouldMerge.push({
          normalizedName,
          ingredients: group.map(ing => ({
            id: ing.id,
            name: ing.name
          }))
        });
      }
    }
    
  } catch (error) {
    console.error('Error during preview:', error);
  }
  
  return preview;
}