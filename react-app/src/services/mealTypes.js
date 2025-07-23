import { 
  collection, 
  doc,
  getDocs,
  setDoc,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Cache for meal types
let mealTypesCache = null;
let unsubscribe = null;

// Default meal types
const DEFAULT_MEAL_TYPES = [
  { id: 'breakfast', name: 'Breakfast', color: '#FFF8DC', opacity: 1 },
  { id: 'lunch', name: 'Lunch', color: '#F0F8FF', opacity: 1 },
  { id: 'dinner', name: 'Dinner', color: '#F5F5DC', opacity: 1 },
  { id: 'snack', name: 'Snack', color: '#FFE4E1', opacity: 1 },
  { id: 'beverage', name: 'Beverage', color: '#E6E6FA', opacity: 1 },
  { id: 'ceremony', name: 'Ceremony', color: '#FFF0F5', opacity: 1 },
  { id: 'celebration', name: 'Celebration', color: '#FFEFD5', opacity: 1 }
];

/**
 * Subscribe to meal types and keep cache updated
 */
export const subscribeMealTypes = (callback) => {
  console.log('Subscribing to meal types service...');
  
  if (unsubscribe) {
    unsubscribe();
  }
  
  unsubscribe = onSnapshot(
    collection(db, 'meal_types'),
    async (snapshot) => {
      if (snapshot.empty) {
        // Initialize with defaults
        await initializeDefaultMealTypes();
      } else {
        const types = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        mealTypesCache = types;
        if (callback) callback(types);
      }
    },
    (error) => {
      console.error('Error subscribing to meal types:', error);
    }
  );
  
  return () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
};

/**
 * Initialize default meal types in Firestore
 */
const initializeDefaultMealTypes = async () => {
  try {
    const batch = [];
    
    for (const mealType of DEFAULT_MEAL_TYPES) {
      batch.push(
        setDoc(doc(db, 'meal_types', mealType.id), {
          name: mealType.name,
          color: mealType.color,
          opacity: mealType.opacity,
          is_default: true,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        })
      );
    }
    
    await Promise.all(batch);
    
    // Update cache
    const snapshot = await getDocs(collection(db, 'meal_types'));
    mealTypesCache = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('Default meal types initialized');
  } catch (error) {
    console.error('Error initializing default meal types:', error);
  }
};

/**
 * Get all meal types (from cache if available)
 */
export const getMealTypes = async () => {
  if (mealTypesCache) {
    return mealTypesCache;
  }
  
  try {
    const snapshot = await getDocs(collection(db, 'meal_types'));
    
    if (snapshot.empty) {
      await initializeDefaultMealTypes();
      return mealTypesCache || DEFAULT_MEAL_TYPES;
    }
    
    const types = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    mealTypesCache = types;
    return types;
  } catch (error) {
    console.error('Error getting meal types:', error);
    return DEFAULT_MEAL_TYPES;
  }
};

/**
 * Get meal type style (color and opacity)
 */
export const getMealTypeStyle = async (mealTypeId) => {
  const mealTypes = await getMealTypes();
  const mealType = mealTypes.find(mt => mt.id === mealTypeId);
  
  if (!mealType) {
    // Return a default style for unknown meal types
    return {
      backgroundColor: '#F0F0F0',
      opacity: 1
    };
  }
  
  return {
    backgroundColor: mealType.color,
    opacity: mealType.opacity
  };
};

/**
 * Add a new custom meal type
 */
export const addMealType = async (name) => {
  if (!name || !name.trim()) {
    throw new Error('Meal type name is required');
  }
  
  try {
    // Create ID from name (lowercase, replace spaces with underscores)
    const id = name.toLowerCase().replace(/\s+/g, '_');
    
    // Check if already exists
    const mealTypes = await getMealTypes();
    const existing = mealTypes.find(mt => mt.id === id);
    
    if (existing) {
      console.log('Meal type already exists:', id);
      return existing;
    }
    
    // Add new meal type
    const newMealType = {
      name: name.trim(),
      color: '#F0F0F0', // Default gray
      opacity: 1,
      is_default: false,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };
    
    await setDoc(doc(db, 'meal_types', id), newMealType);
    
    console.log('Added new meal type:', id);
    return { id, ...newMealType };
  } catch (error) {
    console.error('Error adding meal type:', error);
    throw error;
  }
};

/**
 * Get meal type by ID
 */
export const getMealTypeById = async (mealTypeId) => {
  const mealTypes = await getMealTypes();
  return mealTypes.find(mt => mt.id === mealTypeId);
};

/**
 * Get meal type names for dropdown options
 */
export const getMealTypeOptions = async () => {
  const mealTypes = await getMealTypes();
  return mealTypes.map(mt => ({
    value: mt.id,
    label: mt.name
  }));
};

/**
 * Clear cache (useful for testing)
 */
export const clearMealTypesCache = () => {
  mealTypesCache = null;
};