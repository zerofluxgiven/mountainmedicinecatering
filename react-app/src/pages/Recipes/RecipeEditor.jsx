import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { saveVersionHistory, createSpecialVersion } from '../../services/recipeVersions';
import './RecipeEditor.css';

// Common tags and allergens
const COMMON_TAGS = [
  'Appetizer', 'Main Course', 'Side Dish', 'Dessert', 'Breakfast',
  'Lunch', 'Dinner', 'Snack', 'Beverage', 'Vegetarian', 'Vegan',
  'Quick & Easy', 'Make Ahead', 'Freezer Friendly', 'One Pot',
  'Slow Cooker', 'Instant Pot', 'Grilled', 'Baked', 'No Cook'
];

const COMMON_ALLERGENS = [
  'Dairy', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts',
  'Wheat', 'Soy', 'Sesame', 'Gluten'
];

export default function RecipeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { selectedEventId } = useApp();
  
  const isNew = !id;
  const prefillData = location.state?.prefillData;
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    serves: 4,
    prep_time: '',
    cook_time: '',
    ingredients: [''],
    instructions: '',
    notes: '',
    tags: [],
    allergens: [],
    image_url: '',
    special_version: ''
  });
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [showAllergensDropdown, setShowAllergensDropdown] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showSpecialVersionModal, setShowSpecialVersionModal] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [isCreatingSpecialVersion, setIsCreatingSpecialVersion] = useState(false);

  useEffect(() => {
    if (isNew && prefillData) {
      // Prefill with duplicate data
      setFormData({
        ...prefillData,
        name: `${prefillData.name} (Copy)`,
        id: undefined,
        created_at: undefined,
        created_by: undefined
      });
    } else if (!isNew) {
      loadRecipe();
    }
  }, [id, isNew, prefillData]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const recipeDoc = await getDoc(doc(db, 'recipes', id));
      
      if (!recipeDoc.exists()) {
        setError('Recipe not found');
        return;
      }

      const data = recipeDoc.data();
      setFormData({
        name: data.name || '',
        serves: data.serves || 4,
        prep_time: data.prep_time || '',
        cook_time: data.cook_time || '',
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [''],
        instructions: data.instructions || '',
        notes: data.notes || '',
        tags: data.tags || [],
        allergens: data.allergens || [],
        image_url: data.image_url || '',
        special_version: data.special_version || ''
      });
    } catch (err) {
      console.error('Error loading recipe:', err);
      setError('Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleIngredientChange = (index, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = value;
    setFormData(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, '']
    }));
  };

  const removeIngredient = (index) => {
    if (formData.ingredients.length > 1) {
      const newIngredients = formData.ingredients.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, ingredients: newIngredients }));
    }
  };

  const handleTagToggle = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleAllergenToggle = (allergen) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Recipe name is required';
    }
    
    if (!formData.serves || formData.serves < 1) {
      errors.serves = 'Serving size must be at least 1';
    }
    
    const hasIngredients = formData.ingredients.some(ing => ing.trim());
    if (!hasIngredients) {
      errors.ingredients = 'At least one ingredient is required';
    }
    
    if (!formData.instructions.trim()) {
      errors.instructions = 'Instructions are required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Filter out empty ingredients
      const filteredIngredients = formData.ingredients.filter(ing => ing.trim());
      
      // Prepare recipe data
      const recipeData = {
        ...formData,
        ingredients: filteredIngredients,
        serves: parseInt(formData.serves),
        prep_time: formData.prep_time ? parseInt(formData.prep_time) : null,
        cook_time: formData.cook_time ? parseInt(formData.cook_time) : null,
        ingredients_parsed: true,
        updated_at: serverTimestamp()
      };
      
      if (isNew) {
        // Add creation metadata
        recipeData.created_at = serverTimestamp();
        recipeData.created_by = currentUser.email;
        
        // Generate ID
        const newId = doc(db, 'recipes').id;
        await setDoc(doc(db, 'recipes', newId), recipeData);
        
        navigate(`/recipes/${newId}`);
      } else {
        // Save version history before updating
        const currentDoc = await getDoc(doc(db, 'recipes', id));
        if (currentDoc.exists()) {
          await saveVersionHistory(id, currentDoc.data(), editNote || 'Recipe updated');
        }
        
        // Update existing recipe
        await updateDoc(doc(db, 'recipes', id), recipeData);
        
        // Check if user wants to create a special version
        if (!isNew && !formData.special_version) {
          setShowSpecialVersionModal(true);
        } else {
          navigate(`/recipes/${id}`);
        }
      }
    } catch (err) {
      console.error('Error saving recipe:', err);
      setError('Failed to save recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate(id ? `/recipes/${id}` : '/recipes');
    }
  };
  
  const handleCreateSpecialVersion = async () => {
    if (!formData.special_version.trim()) {
      alert('Please enter a name for the special version');
      return;
    }
    
    setIsCreatingSpecialVersion(true);
    try {
      await createSpecialVersion(
        id,
        formData,
        formData.special_version.trim(),
        `Created ${formData.special_version} version`
      );
      navigate(`/recipes/${id}`);
    } catch (err) {
      console.error('Error creating special version:', err);
      alert('Failed to create special version');
    } finally {
      setIsCreatingSpecialVersion(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading recipe...</p>
      </div>
    );
  }

  if (error && !isNew) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/recipes')}
        >
          Back to Recipes
        </button>
      </div>
    );
  }

  return (
    <div className="recipe-editor">
      <form onSubmit={handleSubmit}>
        <div className="editor-header">
          <h1>{isNew ? 'Create New Recipe' : 'Edit Recipe'}</h1>
          <div className="editor-actions">
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Recipe'}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="editor-content">
          {/* Basic Information */}
          <section className="editor-section">
            <h2>Basic Information</h2>
            
            <div className="form-group">
              <label htmlFor="name">Recipe Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter recipe name"
                className={validationErrors.name ? 'error' : ''}
              />
              {validationErrors.name && (
                <span className="field-error">{validationErrors.name}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="serves">Serves *</label>
                <input
                  id="serves"
                  type="number"
                  value={formData.serves}
                  onChange={(e) => handleInputChange('serves', e.target.value)}
                  min="1"
                  className={validationErrors.serves ? 'error' : ''}
                />
                {validationErrors.serves && (
                  <span className="field-error">{validationErrors.serves}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="prep_time">Prep Time (minutes)</label>
                <input
                  id="prep_time"
                  type="number"
                  value={formData.prep_time}
                  onChange={(e) => handleInputChange('prep_time', e.target.value)}
                  min="0"
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label htmlFor="cook_time">Cook Time (minutes)</label>
                <input
                  id="cook_time"
                  type="number"
                  value={formData.cook_time}
                  onChange={(e) => handleInputChange('cook_time', e.target.value)}
                  min="0"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="image_url">Image URL</label>
              <input
                id="image_url"
                type="url"
                value={formData.image_url}
                onChange={(e) => handleInputChange('image_url', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              {formData.image_url && (
                <div className="image-preview">
                  <img 
                    src={formData.image_url} 
                    alt="Recipe preview"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Ingredients */}
          <section className="editor-section">
            <h2>Ingredients *</h2>
            {validationErrors.ingredients && (
              <span className="field-error">{validationErrors.ingredients}</span>
            )}
            
            <div className="ingredients-list">
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="ingredient-row">
                  <span className="ingredient-number">{index + 1}.</span>
                  <input
                    type="text"
                    value={ingredient}
                    onChange={(e) => handleIngredientChange(index, e.target.value)}
                    placeholder="Enter ingredient"
                    className="ingredient-input"
                  />
                  {formData.ingredients.length > 1 && (
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeIngredient(index)}
                      title="Remove ingredient"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <button
              type="button"
              className="btn btn-secondary add-ingredient-btn"
              onClick={addIngredient}
            >
              + Add Ingredient
            </button>
          </section>

          {/* Instructions */}
          <section className="editor-section">
            <h2>Instructions *</h2>
            <div className="form-group">
              <textarea
                value={formData.instructions}
                onChange={(e) => handleInputChange('instructions', e.target.value)}
                placeholder="Enter cooking instructions..."
                rows="10"
                className={validationErrors.instructions ? 'error' : ''}
              />
              {validationErrors.instructions && (
                <span className="field-error">{validationErrors.instructions}</span>
              )}
            </div>
          </section>

          {/* Notes */}
          <section className="editor-section">
            <h2>Notes</h2>
            <div className="form-group">
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Optional notes, tips, or variations..."
                rows="4"
              />
            </div>
          </section>

          {/* Tags and Categories */}
          <section className="editor-section">
            <h2>Tags & Categories</h2>
            
            <div className="form-group">
              <label>Tags</label>
              <div className="tags-selector">
                <div className="selected-tags">
                  {formData.tags.map(tag => (
                    <span key={tag} className="selected-tag">
                      {tag}
                      <button
                        type="button"
                        className="remove-tag"
                        onClick={() => handleTagToggle(tag)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    className="add-tag-btn"
                    onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                  >
                    + Add Tag
                  </button>
                </div>
                
                {showTagsDropdown && (
                  <div className="tags-dropdown">
                    {COMMON_TAGS.filter(tag => !formData.tags.includes(tag)).map(tag => (
                      <button
                        key={tag}
                        type="button"
                        className="tag-option"
                        onClick={() => {
                          handleTagToggle(tag);
                          setShowTagsDropdown(false);
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Allergens</label>
              <div className="allergens-selector">
                <div className="selected-allergens">
                  {formData.allergens.map(allergen => (
                    <span key={allergen} className="selected-allergen">
                      ⚠️ {allergen}
                      <button
                        type="button"
                        className="remove-allergen"
                        onClick={() => handleAllergenToggle(allergen)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    className="add-allergen-btn"
                    onClick={() => setShowAllergensDropdown(!showAllergensDropdown)}
                  >
                    + Add Allergen
                  </button>
                </div>
                
                {showAllergensDropdown && (
                  <div className="allergens-dropdown">
                    {COMMON_ALLERGENS.filter(allergen => !formData.allergens.includes(allergen)).map(allergen => (
                      <button
                        key={allergen}
                        type="button"
                        className="allergen-option"
                        onClick={() => {
                          handleAllergenToggle(allergen);
                          setShowAllergensDropdown(false);
                        }}
                      >
                        {allergen}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="special_version">Special Version</label>
              <input
                id="special_version"
                type="text"
                value={formData.special_version}
                onChange={(e) => handleInputChange('special_version', e.target.value)}
                placeholder="e.g., Gluten-Free, Vegan, etc."
              />
            </div>
            
            {!isNew && (
              <div className="form-group">
                <label htmlFor="edit_note">Edit Note (for version history)</label>
                <input
                  id="edit_note"
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Brief description of changes made..."
                />
              </div>
            )}
          </section>
        </div>
      </form>
      
      {/* Special Version Modal */}
      {showSpecialVersionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Create Special Version?</h3>
            <p>Would you like to save this as a special dietary version (e.g., Gluten-Free, Vegan)?</p>
            
            <div className="form-group">
              <label>Special Version Name</label>
              <input
                type="text"
                value={formData.special_version}
                onChange={(e) => handleInputChange('special_version', e.target.value)}
                placeholder="e.g., Gluten-Free, Vegan, Dairy-Free"
                autoFocus
              />
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowSpecialVersionModal(false);
                  navigate(`/recipes/${id}`);
                }}
              >
                Skip
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateSpecialVersion}
                disabled={isCreatingSpecialVersion || !formData.special_version.trim()}
              >
                {isCreatingSpecialVersion ? 'Creating...' : 'Create Special Version'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}