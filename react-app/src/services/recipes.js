import { doc, getDoc, collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Fetch multiple recipes by their IDs
 * @param {string[]} recipeIds - Array of recipe IDs to fetch
 * @returns {Promise<Object[]>} Array of recipe objects with their IDs
 */
export async function getRecipesByIds(recipeIds) {
  if (!recipeIds || recipeIds.length === 0) {
    return [];
  }

  try {
    // Firebase has a limit of 10 for 'in' queries, so we need to batch
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < recipeIds.length; i += batchSize) {
      const batch = recipeIds.slice(i, i + batchSize);
      batches.push(batch);
    }

    const allRecipes = [];

    // Fetch each batch
    for (const batch of batches) {
      const q = query(
        collection(db, 'recipes'),
        where(documentId(), 'in', batch)
      );
      
      const snapshot = await getDocs(q);
      const recipes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      allRecipes.push(...recipes);
    }

    return allRecipes;
  } catch (error) {
    console.error('Error fetching recipes by IDs:', error);
    throw error;
  }
}

/**
 * Fetch a single recipe by ID
 * @param {string} recipeId - Recipe ID to fetch
 * @returns {Promise<Object|null>} Recipe object or null if not found
 */
export async function getRecipeById(recipeId) {
  try {
    const recipeDoc = await getDoc(doc(db, 'recipes', recipeId));
    
    if (!recipeDoc.exists()) {
      return null;
    }

    return { id: recipeDoc.id, ...recipeDoc.data() };
  } catch (error) {
    console.error('Error fetching recipe:', error);
    throw error;
  }
}

/**
 * Get all recipes (with optional filters)
 * @param {Object} filters - Optional filters for recipes
 * @returns {Promise<Object[]>} Array of recipe objects
 */
export async function getAllRecipes(filters = {}) {
  try {
    let q = collection(db, 'recipes');
    
    // Add any filters here if needed in the future
    // For example: where('tags', 'array-contains', 'vegetarian')
    
    const snapshot = await getDocs(q);
    const recipes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return recipes;
  } catch (error) {
    console.error('Error fetching all recipes:', error);
    throw error;
  }
}