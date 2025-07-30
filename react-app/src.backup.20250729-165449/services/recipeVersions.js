import { 
  collection, 
  doc, 
  addDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Generate unique version ID
function generateVersionId() {
  return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Save a new version (either history or special version)
export async function saveRecipeVersion(recipeId, versionData, editNote = '', isSpecialVersion = false) {
  try {
    const versionId = generateVersionId();
    const versionDoc = {
      ...versionData,
      id: versionId,
      parent_id: recipeId,
      timestamp: serverTimestamp(),
      edit_note: editNote,
      is_special_version: isSpecialVersion,
      // Keep special_version field for backward compatibility
      special_version: isSpecialVersion ? versionData.special_version : ''
    };

    // Save to versions subcollection
    await addDoc(collection(db, 'recipes', recipeId, 'versions'), versionDoc);
    
    return versionId;
  } catch (error) {
    console.error('Error saving recipe version:', error);
    throw error;
  }
}

// Get all versions for a recipe
export async function getRecipeVersions(recipeId) {
  try {
    const versionsRef = collection(db, 'recipes', recipeId, 'versions');
    const q = query(versionsRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching recipe versions:', error);
    return [];
  }
}

// Get special versions only
export async function getSpecialVersions(recipeId) {
  try {
    const versionsRef = collection(db, 'recipes', recipeId, 'versions');
    const q = query(
      versionsRef, 
      where('is_special_version', '==', true),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching special versions:', error);
    return [];
  }
}

// Get version history only (non-special versions)
export async function getVersionHistory(recipeId) {
  try {
    const versionsRef = collection(db, 'recipes', recipeId, 'versions');
    const q = query(
      versionsRef, 
      where('is_special_version', '==', false),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching version history:', error);
    return [];
  }
}

// Get a specific version
export async function getRecipeVersion(recipeId, versionId) {
  try {
    const versionDoc = await getDoc(doc(db, 'recipes', recipeId, 'versions', versionId));
    if (versionDoc.exists()) {
      return {
        id: versionDoc.id,
        ...versionDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching recipe version:', error);
    return null;
  }
}

// Create a special dietary version
export async function createSpecialVersion(recipeId, recipeData, specialVersionName, editNote = '') {
  const versionData = {
    ...recipeData,
    special_version: specialVersionName,
    name: `${recipeData.name} (${specialVersionName})`
  };
  
  return saveRecipeVersion(recipeId, versionData, editNote, true);
}

// Save version history when recipe is updated
export async function saveVersionHistory(recipeId, recipeData, editNote = '') {
  // Don't include the special_version field in history
  const { special_version, ...historyData } = recipeData;
  return saveRecipeVersion(recipeId, historyData, editNote, false);
}

// Get all recipes with their special versions
export async function getRecipesWithVersions() {
  try {
    // Get all base recipes
    const recipesSnapshot = await getDocs(collection(db, 'recipes'));
    const recipes = [];
    
    // For each recipe, get its special versions
    for (const recipeDoc of recipesSnapshot.docs) {
      const recipeData = {
        id: recipeDoc.id,
        ...recipeDoc.data(),
        versions: []
      };
      
      // Get special versions
      const specialVersions = await getSpecialVersions(recipeDoc.id);
      recipeData.versions = specialVersions;
      
      recipes.push(recipeData);
    }
    
    return recipes;
  } catch (error) {
    console.error('Error fetching recipes with versions:', error);
    return [];
  }
}

// Compare two versions to show differences
export function compareVersions(version1, version2) {
  const differences = [];
  
  // Fields to compare
  const fields = ['name', 'ingredients', 'instructions', 'serves', 'prep_time', 'cook_time', 'tags', 'allergens'];
  
  fields.forEach(field => {
    const val1 = version1[field];
    const val2 = version2[field];
    
    // Handle array comparison
    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        differences.push({
          field,
          oldValue: val1,
          newValue: val2
        });
      }
    } else if (val1 !== val2) {
      differences.push({
        field,
        oldValue: val1,
        newValue: val2
      });
    }
  });
  
  return differences;
}