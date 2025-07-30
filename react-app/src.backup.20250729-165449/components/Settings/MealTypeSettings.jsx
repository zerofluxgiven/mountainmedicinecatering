import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  doc,
  getDocs, 
  setDoc,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import ColorPicker from './ColorPicker';
import './MealTypeSettings.css';

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

export default function MealTypeSettings() {
  const [mealTypes, setMealTypes] = useState([]);
  const [localMealTypes, setLocalMealTypes] = useState([]); // Local copy for editing
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [selectedMealTypeId, setSelectedMealTypeId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [newMealTypeName, setNewMealTypeName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    subscribeToMealTypes();
  }, []);
  
  // Initialize localMealTypes when mealTypes change and there are no unsaved changes
  useEffect(() => {
    if (!hasChanges && mealTypes.length > 0) {
      setLocalMealTypes(mealTypes);
    }
  }, [mealTypes, hasChanges]);

  const subscribeToMealTypes = () => {
    console.log('Subscribing to meal types...');
    
    // Subscribe to meal types collection
    const unsubscribe = onSnapshot(
      collection(db, 'meal_types'),
      async (snapshot) => {
        console.log('Meal types snapshot received:', snapshot.size);
        
        if (snapshot.empty) {
          // Initialize with default meal types
          console.log('No meal types found, initializing defaults...');
          await initializeDefaultMealTypes();
        } else {
          const types = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setMealTypes(types);
          
          // Only update local copy if there are no unsaved changes
          if (!hasChanges) {
            setLocalMealTypes(types);
          }
          
          // Update the selected meal type
          if (selectedMealTypeId) {
            const updatedSelected = localMealTypes.find(t => t.id === selectedMealTypeId) || 
                                   types.find(t => t.id === selectedMealTypeId);
            if (updatedSelected) {
              setSelectedMealType(updatedSelected);
            }
          } else if (!selectedMealType && types.length > 0) {
            // Only select the first one if nothing is selected
            setSelectedMealType(types[0]);
            setSelectedMealTypeId(types[0].id);
          }
        }
      },
      (error) => {
        console.error('Error subscribing to meal types:', error);
        showMessage('Error loading meal types', 'error');
      }
    );

    return unsubscribe;
  };

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
      console.log('Default meal types initialized');
    } catch (error) {
      console.error('Error initializing default meal types:', error);
    }
  };

  const handleColorChange = (color, opacity) => {
    if (!selectedMealType) return;
    
    // Update local state only
    const updatedMealType = {
      ...selectedMealType,
      color: color,
      opacity: opacity
    };
    
    setSelectedMealType(updatedMealType);
    
    // Update the local meal types array
    setLocalMealTypes(prevTypes => 
      prevTypes.map(t => 
        t.id === selectedMealType.id ? updatedMealType : t
      )
    );
    
    setHasChanges(true);
  };
  
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      // Save all changes to Firestore
      const batch = [];
      
      for (const mealType of localMealTypes) {
        const originalMealType = mealTypes.find(mt => mt.id === mealType.id);
        
        // Only update if there are actual changes
        if (!originalMealType || 
            originalMealType.color !== mealType.color || 
            originalMealType.opacity !== mealType.opacity ||
            originalMealType.name !== mealType.name) {
          
          batch.push(
            setDoc(doc(db, 'meal_types', mealType.id), {
              ...mealType,
              updated_at: serverTimestamp()
            }, { merge: true })
          );
        }
      }
      
      await Promise.all(batch);
      
      setHasChanges(false);
      showMessage('All changes saved successfully', 'success');
    } catch (error) {
      console.error('Error saving changes:', error);
      showMessage('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const handleCancelChanges = () => {
    // Revert to original data
    setLocalMealTypes(mealTypes);
    
    // Update selected meal type if it was changed
    if (selectedMealTypeId) {
      const originalSelected = mealTypes.find(t => t.id === selectedMealTypeId);
      if (originalSelected) {
        setSelectedMealType(originalSelected);
      }
    }
    
    setHasChanges(false);
    showMessage('Changes cancelled', 'info');
  };

  const handleAddMealType = async () => {
    if (!newMealTypeName.trim()) return;

    try {
      setSaving(true);
      
      // Create ID from name (lowercase, replace spaces with underscores)
      const id = newMealTypeName.toLowerCase().replace(/\s+/g, '_');
      
      // Check if already exists
      const existing = localMealTypes.find(mt => mt.id === id);
      if (existing) {
        showMessage('Meal type already exists', 'error');
        return;
      }

      // Add new meal type
      await setDoc(doc(db, 'meal_types', id), {
        name: newMealTypeName.trim(),
        color: '#F0F0F0', // Default gray
        opacity: 1,
        is_default: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      setNewMealTypeName('');
      showMessage('Meal type added successfully', 'success');
    } catch (error) {
      console.error('Error adding meal type:', error);
      showMessage('Failed to add meal type', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const getMealTypeStyle = (mealType) => {
    return {
      backgroundColor: mealType.color,
      opacity: mealType.opacity,
      border: selectedMealType?.id === mealType.id ? '3px solid var(--primary-color)' : '2px solid transparent'
    };
  };

  return (
    <div className="meal-type-settings">
      <div className="settings-section-header">
        <h2>
          Meal Type Color Configuration
          {hasChanges && <span className="unsaved-indicator"> • Unsaved Changes</span>}
        </h2>
        <p>Customize the colors used for different meal types throughout the application</p>
      </div>

      {message && (
        <div className={`settings-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="meal-type-container">
        {/* Meal Type List */}
        <div className="meal-type-list">
          <h3>Meal Types</h3>
          
          <div className="meal-type-items">
            {localMealTypes.map(mealType => (
              <div
                key={mealType.id}
                className={`meal-type-item ${selectedMealType?.id === mealType.id ? 'selected' : ''}`}
                onClick={() => {
                  const localMealType = localMealTypes.find(mt => mt.id === mealType.id);
                  setSelectedMealType(localMealType || mealType);
                  setSelectedMealTypeId(mealType.id);
                }}
              >
                <div 
                  className="meal-type-preview"
                  style={getMealTypeStyle(mealType)}
                />
                <span className="meal-type-name">{mealType.name}</span>
                {mealType.is_default && (
                  <span className="default-badge">Default</span>
                )}
              </div>
            ))}
          </div>

          {/* Add New Meal Type */}
          <div className="add-meal-type">
            <h4>Add Custom Meal Type</h4>
            <div className="add-meal-type-form">
              <input
                type="text"
                value={newMealTypeName}
                onChange={(e) => setNewMealTypeName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddMealType();
                  }
                }}
                placeholder="Enter meal type name"
                disabled={saving}
              />
              <button
                className="btn btn-primary"
                onClick={handleAddMealType}
                disabled={saving || !newMealTypeName.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Color Picker */}
        <div className="color-picker-section">
          {selectedMealType ? (
            <>
              <h3>Color Settings for {selectedMealType.name}</h3>
              <ColorPicker
                color={selectedMealType.color}
                opacity={selectedMealType.opacity}
                onChange={handleColorChange}
                disabled={saving}
              />
              
              <div className="preview-section">
                <h4>Preview</h4>
                <div 
                  className="meal-preview-card"
                  style={{
                    backgroundColor: selectedMealType.color,
                    opacity: selectedMealType.opacity
                  }}
                >
                  <div className="preview-meal-type">{selectedMealType.name}</div>
                  <div className="preview-content">
                    <div className="preview-time">7:00 AM - 9:00 AM</div>
                    <div className="preview-items">
                      Sample Recipe 1<br/>
                      Sample Recipe 2<br/>
                      Sample Recipe 3
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select a meal type to configure its color</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Save/Cancel buttons */}
      {hasChanges && (
        <div className="settings-actions">
          <button 
            className="btn btn-primary"
            onClick={handleSaveChanges}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleCancelChanges}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}