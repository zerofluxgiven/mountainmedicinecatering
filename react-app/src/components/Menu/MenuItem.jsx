import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import './MenuItem.css';

export default function MenuItem({ item, onUpdate, onRemove }) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [serves, setServes] = useState(item.serves || 0);
  const [showSubRecipePicker, setShowSubRecipePicker] = useState(false);
  const [availableRecipes, setAvailableRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  
  // Update serves when item changes (for auto-scaling)
  useEffect(() => {
    setServes(item.serves || 0);
  }, [item.serves]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
  };

  const loadAvailableRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const recipesSnapshot = await getDocs(collection(db, 'recipes'));
      const recipes = recipesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableRecipes(recipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const handleAddSubRecipe = async (recipe) => {
    const subRecipe = {
      id: `sub-${Date.now()}`,
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      serves: item.serves, // Default to parent's serving size
      original_serves: recipe.serves,
      notes: '',
      allergens: recipe.allergens || []
    };
    
    const updatedItem = {
      ...item,
      sub_recipes: [...(item.sub_recipes || []), subRecipe]
    };
    
    onUpdate(updatedItem);
    setShowSubRecipePicker(false);
  };

  const handleRemoveSubRecipe = (subRecipeId) => {
    const updatedItem = {
      ...item,
      sub_recipes: (item.sub_recipes || []).filter(sr => sr.id !== subRecipeId)
    };
    onUpdate(updatedItem);
  };

  const saveChanges = () => {
    onUpdate({ ...item, notes, serves: parseInt(serves) || 0 });
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setNotes(item.notes || '');
    setServes(item.serves || 0);
    setIsEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="menu-item">
      <div className="item-main">
        <div className="drag-handle" {...attributes} {...listeners}>
          ⋮⋮
        </div>
        
        <div className="item-content">
          <div className="item-header">
            <h4 className="item-name">{item.recipe_name}</h4>
            {!isEditing ? (
              <span className="item-serves">Serves {item.serves || '?'}</span>
            ) : (
              <div className="serves-editor">
                <label>Serves:</label>
                <input
                  type="number"
                  value={serves}
                  onChange={(e) => setServes(e.target.value)}
                  min="1"
                  className="serves-input"
                />
              </div>
            )}
          </div>
          
          {item.notes && !isEditing && (
            <p className="item-notes">{item.notes}</p>
          )}
          
          {isEditing && (
            <div className="notes-editor">
              <textarea
                value={notes}
                onChange={handleNotesChange}
                placeholder="Add notes about this item..."
                rows="2"
                autoFocus
              />
              <div className="notes-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={saveChanges}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="item-actions">
          {!isEditing && (
            <button
              type="button"
              className="action-btn"
              onClick={() => setIsEditing(true)}
              title="Edit notes"
            >
              ✏️
            </button>
          )}
          
          <button
            type="button"
            className="action-btn remove"
            onClick={onRemove}
            title="Remove item"
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* Sub-recipes section */}
      <div className="sub-recipes-section">
        {item.sub_recipes && item.sub_recipes.length > 0 && (
          <div className="sub-recipes-list">
            {item.sub_recipes.map(subRecipe => (
              <div key={subRecipe.id} className="sub-recipe-item">
                <span className="sub-recipe-icon">└</span>
                <span className="sub-recipe-name">{subRecipe.recipe_name}</span>
                <span className="sub-recipe-serves">Serves {subRecipe.serves}</span>
                <button
                  type="button"
                  className="remove-sub-recipe-btn"
                  onClick={() => handleRemoveSubRecipe(subRecipe.id)}
                  title="Remove sub-recipe"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        
        {isEditing && (
          <button
            type="button"
            className="btn btn-sm btn-secondary add-sub-recipe-btn"
            onClick={() => {
              setShowSubRecipePicker(true);
              if (availableRecipes.length === 0) {
                loadAvailableRecipes();
              }
            }}
          >
            + Add Sub-Recipe (Sauce, Dressing, etc.)
          </button>
        )}
      </div>

      {/* Sub-recipe picker modal */}
      {showSubRecipePicker && (
        <div className="modal-overlay" onClick={() => setShowSubRecipePicker(false)}>
          <div className="modal-content sub-recipe-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Sub-Recipe to {item.recipe_name}</h3>
              <button 
                type="button"
                className="close-button"
                onClick={() => setShowSubRecipePicker(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="recipe-picker-content">
              {loadingRecipes ? (
                <div className="loading">Loading recipes...</div>
              ) : (
                <div className="recipe-list">
                  {availableRecipes
                    .filter(r => r.id !== item.recipe_id) // Don't show the parent recipe
                    .map(recipe => (
                      <div 
                        key={recipe.id} 
                        className="recipe-option"
                        onClick={() => handleAddSubRecipe(recipe)}
                      >
                        <h4>{recipe.name}</h4>
                        {recipe.serves && (
                          <span className="recipe-serves">Serves {recipe.serves}</span>
                        )}
                        {recipe.tags && recipe.tags.length > 0 && (
                          <div className="recipe-tags">
                            {recipe.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="tag-small">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}