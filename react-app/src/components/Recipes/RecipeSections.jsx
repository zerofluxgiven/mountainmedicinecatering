import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import InstructionsEditor from './InstructionsEditor';
import './RecipeSections.css';

export default function RecipeSections({ sections, onChange, editMode = true }) {
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [pickerSectionIndex, setPickerSectionIndex] = useState(null);
  const [availableRecipes, setAvailableRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [linkedRecipes, setLinkedRecipes] = useState({});

  // Ensure we always have at least one section
  const ensuredSections = sections && sections.length > 0 ? sections : [{
    id: 'main',
    label: '',
    ingredients: [''],
    instructions: ''
  }];

  // Load available recipes when picker opens
  useEffect(() => {
    if (showRecipePicker && availableRecipes.length === 0) {
      loadAvailableRecipes();
    }
  }, [showRecipePicker]);

  // Load linked recipes on mount
  useEffect(() => {
    loadLinkedRecipes();
  }, [ensuredSections]);

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

  const loadLinkedRecipes = async () => {
    const linkedIds = ensuredSections
      .filter(s => s.linked_recipe_id)
      .map(s => ({ sectionId: s.id, recipeId: s.linked_recipe_id }));
    
    if (linkedIds.length === 0) return;

    const linkedData = {};
    for (const { sectionId, recipeId } of linkedIds) {
      try {
        const recipeDoc = await getDoc(doc(db, 'recipes', recipeId));
        if (recipeDoc.exists()) {
          linkedData[sectionId] = {
            id: recipeDoc.id,
            ...recipeDoc.data()
          };
        }
      } catch (error) {
        console.error(`Error loading linked recipe ${recipeId}:`, error);
      }
    }
    setLinkedRecipes(linkedData);
  };

  const handleLinkRecipe = async (recipeId) => {
    const recipe = availableRecipes.find(r => r.id === recipeId);
    if (!recipe || pickerSectionIndex === null) return;

    const newSections = [...ensuredSections];
    newSections[pickerSectionIndex] = {
      ...newSections[pickerSectionIndex],
      label: recipe.name,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || '',
      linked_recipe_id: recipeId
    };
    
    onChange(newSections);
    setShowRecipePicker(false);
    setPickerSectionIndex(null);
  };

  const handleUnlinkRecipe = (sectionIndex) => {
    const newSections = [...ensuredSections];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      linked_recipe_id: null
    };
    onChange(newSections);
  };

  const handleAddSection = () => {
    // Copy data from the main section (first section)
    const mainSection = ensuredSections[0];
    const newSection = {
      id: `section_${Date.now()}`,
      label: '',
      ingredients: mainSection.ingredients || [''],
      instructions: mainSection.instructions || '',
      linked_recipe_id: null
    };
    onChange([...ensuredSections, newSection]);
  };

  const handleDeleteSection = (index) => {
    if (ensuredSections.length <= 1) return; // Keep at least one section
    const newSections = ensuredSections.filter((_, i) => i !== index);
    onChange(newSections);
  };

  const handleSectionChange = (index, field, value) => {
    const newSections = [...ensuredSections];
    newSections[index] = {
      ...newSections[index],
      [field]: value
    };
    onChange(newSections);
  };

  const handleIngredientChange = (sectionIndex, ingredientIndex, value) => {
    const newSections = [...ensuredSections];
    const newIngredients = [...newSections[sectionIndex].ingredients];
    newIngredients[ingredientIndex] = value;
    newSections[sectionIndex].ingredients = newIngredients;
    onChange(newSections);
  };

  const handleAddIngredient = (sectionIndex) => {
    const newSections = [...ensuredSections];
    newSections[sectionIndex].ingredients = [...newSections[sectionIndex].ingredients, ''];
    onChange(newSections);
  };

  const handleRemoveIngredient = (sectionIndex, ingredientIndex) => {
    const newSections = [...ensuredSections];
    const newIngredients = newSections[sectionIndex].ingredients.filter((_, i) => i !== ingredientIndex);
    // Keep at least one empty ingredient
    newSections[sectionIndex].ingredients = newIngredients.length > 0 ? newIngredients : [''];
    onChange(newSections);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // If dropped in same position, do nothing
    if (source.droppableId === destination.droppableId && 
        source.index === destination.index) {
      return;
    }
    
    // Parse section indices from droppable IDs
    const sourceSectionIndex = parseInt(source.droppableId.split('-')[1]);
    const destSectionIndex = parseInt(destination.droppableId.split('-')[1]);

    // Create deep copy of sections to avoid mutation issues
    const newSections = ensuredSections.map(section => ({
      ...section,
      ingredients: [...section.ingredients]
    }));
    
    // Remove ingredient from source
    const [movedIngredient] = newSections[sourceSectionIndex].ingredients.splice(source.index, 1);
    
    // Add ingredient to destination
    newSections[destSectionIndex].ingredients.splice(destination.index, 0, movedIngredient);
    
    // Ensure source section has at least one ingredient
    if (newSections[sourceSectionIndex].ingredients.length === 0) {
      newSections[sourceSectionIndex].ingredients = [''];
    }
    
    onChange(newSections);
  };

  if (!editMode) {
    // Read-only view
    return (
      <div className="recipe-sections-view">
        {ensuredSections.map((section, sectionIndex) => (
          <div key={section.id} className="section-view">
            {ensuredSections.length > 1 && section.label && (
              <h3 className="section-label">{section.label}</h3>
            )}
            
            <div className="ingredients-list">
              {section.ingredients.filter(ing => ing.trim()).map((ingredient, index) => (
                <div key={index} className="ingredient-item">
                  {ingredient}
                </div>
              ))}
            </div>

            {section.instructions && (
              <div className="instructions-view">
                {ensuredSections.length > 1 && (
                  <h4>{section.label ? `${section.label} Instructions` : `Part ${sectionIndex + 1} Instructions`}</h4>
                )}
                <div className="instructions-text">
                  {section.instructions.split('\n').map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Edit mode
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="recipe-sections-editor">
        {ensuredSections.length === 1 && (
          <div className="sections-info-banner">
            💡 Recipe sections let you organize complex recipes with multiple components (e.g., a salad with its dressing, 
            a dish with a sauce, or a dessert with a topping). Click "+ Add Section" to add additional components.
          </div>
        )}
        
        <div className="sections-header">
          <h3>Recipe Sections</h3>
        </div>

        <div className="sections-grid">
          {ensuredSections.map((section, sectionIndex) => (
            <div 
              key={section.id} 
              className="section-column"
            >
              <div className="section-header">
                {ensuredSections.length > 1 && (
                  <button
                    type="button"
                    className="delete-section-btn"
                    onClick={() => handleDeleteSection(sectionIndex)}
                    title="Remove section"
                  >
                    ×
                  </button>
                )}
                <input
                  type="text"
                  value={section.label}
                  onChange={(e) => handleSectionChange(sectionIndex, 'label', e.target.value)}
                  placeholder={sectionIndex === 0 ? "Main Recipe" : "Section name (e.g., Dressing, Sauce)"}
                  className="section-name-input"
                  disabled={section.linked_recipe_id}
                />
              </div>
              
              {/* Show linked recipe info if applicable */}
              {section.linked_recipe_id && linkedRecipes[section.id] && (
                <div className="recipe-link-controls">
                  <span className="linked-recipe-badge">
                    ✓ Linked: {linkedRecipes[section.id].name}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => handleUnlinkRecipe(sectionIndex)}
                  >
                    Unlink
                  </button>
                </div>
              )}

              <div className="ingredients-section">
                <h4>Ingredients</h4>
                <Droppable droppableId={`section-${sectionIndex}`}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="ingredients-list"
                    >
                      {section.ingredients.map((ingredient, ingredientIndex) => (
                        <Draggable
                          key={`${section.id}-ing-${ingredientIndex}`}
                          draggableId={`${section.id}-ing-${ingredientIndex}`}
                          index={ingredientIndex}
                          isDragDisabled={!!section.linked_recipe_id}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`ingredient-row ${snapshot.isDragging ? 'dragging' : ''}`}
                            >
                              {ensuredSections.length > 1 && !section.linked_recipe_id && (
                                <span 
                                  {...provided.dragHandleProps}
                                  className="drag-handle"
                                >
                                  ⋮⋮
                                </span>
                              )}
                              <input
                                type="text"
                                value={ingredient}
                                onChange={(e) => handleIngredientChange(sectionIndex, ingredientIndex, e.target.value)}
                                placeholder="Enter ingredient"
                                className="ingredient-input"
                                disabled={section.linked_recipe_id}
                              />
                              <button
                                type="button"
                                className="remove-btn"
                                onClick={() => handleRemoveIngredient(sectionIndex, ingredientIndex)}
                                disabled={section.ingredients.length === 1 && !ingredient || section.linked_recipe_id}
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                {!section.linked_recipe_id && (
                  <button
                    type="button"
                    className="btn btn-secondary add-ingredient-btn"
                    onClick={() => handleAddIngredient(sectionIndex)}
                  >
                    + Add Ingredient
                  </button>
                )}
              </div>

              <div className="instructions-section">
                {section.linked_recipe_id ? (
                  <>
                    <h4>Instructions</h4>
                    <textarea
                      value={section.instructions}
                      onChange={(e) => handleSectionChange(sectionIndex, 'instructions', e.target.value)}
                      placeholder="Enter instructions for this section..."
                      rows={10}
                      className="instructions-textarea"
                      disabled={true}
                    />
                  </>
                ) : (
                  <InstructionsEditor
                    key={`${section.id}-instructions`}
                    instructions={section.instructions || ''}
                    onChange={(value) => handleSectionChange(sectionIndex, 'instructions', value)}
                    placeholder="Enter instructions for this section..."
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Add Section button */}
        <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={handleAddSection}>
            + Add Section
          </button>
        </div>
        
        {/* Recipe linking option for all sections */}
        {ensuredSections.length > 1 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="sections-info-banner">
              💡 Tip: You can also add sections from your existing recipes. Choose a section above and click the button below.
            </div>
            <select 
              onChange={(e) => {
                const sectionIndex = parseInt(e.target.value);
                if (!isNaN(sectionIndex)) {
                  setPickerSectionIndex(sectionIndex);
                  setShowRecipePicker(true);
                  e.target.value = '';
                }
              }}
              className="section-selector"
              style={{ marginTop: '0.75rem', padding: '0.5rem', borderRadius: '0.375rem', border: '2px solid var(--border)' }}
            >
              <option value="">Add from existing recipe to...</option>
              {ensuredSections.map((section, index) => (
                <option key={index} value={index}>
                  {section.label || (index === 0 ? "Main Recipe" : `Section ${index + 1}`)}
                  {section.linked_recipe_id ? ' (currently linked)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Recipe Picker Modal */}
      {showRecipePicker && (
        <div className="modal-overlay" onClick={() => setShowRecipePicker(false)}>
          <div className="modal-content recipe-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Choose Existing Recipe</h3>
              <button 
                type="button"
                className="close-button"
                onClick={() => setShowRecipePicker(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="recipe-picker-content">
              {loadingRecipes ? (
                <div className="loading">Loading recipes...</div>
              ) : (
                <div className="recipe-list">
                  {availableRecipes.map(recipe => (
                    <div 
                      key={recipe.id} 
                      className="recipe-option"
                      onClick={() => handleLinkRecipe(recipe.id)}
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
    </DragDropContext>
  );
}