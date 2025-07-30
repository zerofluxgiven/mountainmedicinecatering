import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import MenuItem from './MenuItem';
import './MealCard.css';

const DEFAULT_MEAL_TYPES = ['breakfast', 'brunch', 'lunch', 'dinner', 'ceremony'];

export default function MealCard({ 
  meal, 
  onUpdate, 
  onRemove, 
  onAddRecipe, 
  onRemoveRecipe 
}) {
  const [mealTypes, setMealTypes] = useState([...DEFAULT_MEAL_TYPES]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customMealType, setCustomMealType] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: meal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    // Subscribe to meal types collection
    const unsubscribe = onSnapshot(collection(db, 'meal_types'), (snapshot) => {
      const customTypes = snapshot.docs.map(doc => doc.id);
      setMealTypes([...DEFAULT_MEAL_TYPES, ...customTypes, 'Add New']);
    });

    return () => unsubscribe();
  }, []);

  const handleFieldChange = (field, value) => {
    if (field === 'type' && value === 'Add New') {
      setShowCustomInput(true);
    } else {
      onUpdate({ [field]: value });
    }
  };

  const handleAddCustomType = async () => {
    if (customMealType.trim()) {
      const cleanType = customMealType.trim().toLowerCase();
      
      // Save to Firestore
      try {
        await setDoc(doc(db, 'meal_types', cleanType), {
          name: customMealType.trim(),
          created_at: new Date()
        });
        
        // Update this meal with the new type
        onUpdate({ type: cleanType });
        
        // Reset custom input
        setCustomMealType('');
        setShowCustomInput(false);
      } catch (error) {
        console.error('Error adding custom meal type:', error);
      }
    }
  };


  const updateRecipe = (recipeId, updates) => {
    const newRecipes = meal.recipes.map(recipe =>
      recipe.id === recipeId ? { ...recipe, ...updates } : recipe
    );
    onUpdate({ recipes: newRecipes });
  };

  return (
    <div ref={setNodeRef} style={style} className="meal-card">
      <div className="meal-header">
        <div className="drag-handle" {...attributes} {...listeners}>
          ⋮⋮
        </div>
        
        {showCustomInput ? (
          <div className="custom-type-input">
            <input
              type="text"
              value={customMealType}
              onChange={(e) => setCustomMealType(e.target.value)}
              placeholder="Enter meal type"
              className="meal-type-input"
              autoFocus
            />
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleAddCustomType}
            >
              Add
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setShowCustomInput(false);
                setCustomMealType('');
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <select
            value={meal.type}
            onChange={(e) => handleFieldChange('type', e.target.value)}
            className="meal-type-select"
          >
            {mealTypes.map(type => (
              <option key={type} value={type}>
                {type === 'Add New' ? '+ Add New' : type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        )}
        
        <div className="meal-actions">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={onAddRecipe}
          >
            + Add Recipe
          </button>
          
          <button
            type="button"
            className="remove-meal-btn"
            onClick={onRemove}
            title="Remove meal"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="meal-fields">
        <div className="field-group">
          <label>Description</label>
          <textarea
            value={meal.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Brief description of this meal..."
            rows="2"
          />
        </div>

        <div className="field-group">
          <label>Instructions</label>
          <textarea
            value={meal.instructions || ''}
            onChange={(e) => handleFieldChange('instructions', e.target.value)}
            placeholder="Special instructions for preparing or serving this meal..."
            rows="3"
          />
        </div>

        <div className="field-group">
          <label>Notes</label>
          <textarea
            value={meal.notes || ''}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Additional notes about dietary restrictions, timing, etc..."
            rows="2"
          />
        </div>
      </div>

      <div className="meal-recipes">
        <h4>Recipes</h4>
        {meal.recipes.length > 0 ? (
          <SortableContext
            items={meal.recipes.map(recipe => recipe.id)}
            strategy={verticalListSortingStrategy}
          >
            {meal.recipes.map((recipe) => (
              <MenuItem
                key={recipe.id}
                item={recipe}
                onUpdate={(updates) => updateRecipe(recipe.id, updates)}
                onRemove={() => onRemoveRecipe(recipe.id)}
              />
            ))}
          </SortableContext>
        ) : (
          <div className="empty-recipes">
            <p>No recipes in this meal</p>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={onAddRecipe}
            >
              Add First Recipe
            </button>
          </div>
        )}
      </div>
    </div>
  );
}