import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import FileUpload from '../../components/FileUpload/FileUpload';
import { parseRecipeFromFile, parseRecipeFromURL } from '../../services/recipeParser';
import './RecipeImport.css';

export default function RecipeImport() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [importMode, setImportMode] = useState('file'); // 'file' or 'url'
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [parsedRecipe, setParsedRecipe] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const handleFileSelect = async (file) => {
    if (!file) {
      setParsedRecipe(null);
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      const recipe = await parseRecipeFromFile(file);
      setParsedRecipe(recipe);
      setEditMode(false);
    } catch (err) {
      console.error('Error parsing file:', err);
      setError('Failed to parse recipe from file. Please try a different format.');
      setParsedRecipe(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleURLSubmit = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const recipe = await parseRecipeFromURL(url);
      setParsedRecipe(recipe);
      setEditMode(false);
    } catch (err) {
      console.error('Error parsing URL:', err);
      setError('Failed to parse recipe from URL. Please check the URL and try again.');
      setParsedRecipe(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!parsedRecipe) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Add metadata
      const recipeData = {
        ...parsedRecipe,
        created_at: serverTimestamp(),
        created_by: currentUser.email,
        ingredients_parsed: true
      };
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, 'recipes'), recipeData);
      
      // Navigate to the new recipe
      navigate(`/recipes/${docRef.id}`);
    } catch (err) {
      console.error('Error saving recipe:', err);
      if (err.code === 'permission-denied') {
        setError('Permission denied. Please ensure you have the proper permissions to add recipes.');
      } else if (err.code === 'unauthenticated') {
        setError('You must be logged in to save recipes.');
      } else {
        setError(`Failed to save recipe: ${err.message || 'Please try again.'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    navigate('/recipes');
  };

  const updateRecipeField = (field, value) => {
    setParsedRecipe(prev => ({ ...prev, [field]: value }));
  };

  const updateIngredient = (index, value) => {
    const newIngredients = [...parsedRecipe.ingredients];
    newIngredients[index] = value;
    updateRecipeField('ingredients', newIngredients);
  };

  const addIngredient = () => {
    updateRecipeField('ingredients', [...parsedRecipe.ingredients, '']);
  };

  const removeIngredient = (index) => {
    const newIngredients = parsedRecipe.ingredients.filter((_, i) => i !== index);
    updateRecipeField('ingredients', newIngredients);
  };

  return (
    <div className="recipe-import">
      <div className="import-header">
        <h1>Import Recipe</h1>
        <div className="import-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Import Mode Selector */}
      <div className="import-mode-selector">
        <button
          className={`mode-btn ${importMode === 'file' ? 'active' : ''}`}
          onClick={() => setImportMode('file')}
        >
          📁 From File
        </button>
        <button
          className={`mode-btn ${importMode === 'url' ? 'active' : ''}`}
          onClick={() => setImportMode('url')}
        >
          🌐 From URL
        </button>
      </div>

      {/* Import Input */}
      <div className="import-input-section">
        {importMode === 'file' ? (
          <FileUpload
            onFileSelect={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
            multiple={false}
          />
        ) : (
          <form onSubmit={handleURLSubmit} className="url-form">
            <div className="url-input-group">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter recipe URL (e.g., https://example.com/recipe)"
                className="url-input"
                disabled={isProcessing}
              />
              <button 
                type="submit"
                className="btn btn-primary"
                disabled={!url.trim() || isProcessing}
              >
                {isProcessing ? 'Parsing...' : 'Parse Recipe'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="import-error">
          {error}
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="processing-indicator">
          <div className="spinner"></div>
          <p>Parsing recipe...</p>
        </div>
      )}

      {/* Parsed Recipe Preview */}
      {parsedRecipe && !isProcessing && (
        <div className="recipe-preview">
          <div className="preview-header">
            <h2>Recipe Preview</h2>
            <div className="preview-actions">
              {!editMode ? (
                <>
                  <button 
                    className="btn btn-secondary"
                    onClick={handleEdit}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={handleSave}
                  >
                    💾 Save Recipe
                  </button>
                </>
              ) : (
                <button 
                  className="btn btn-primary"
                  onClick={() => setEditMode(false)}
                >
                  ✓ Done Editing
                </button>
              )}
            </div>
          </div>

          <div className="preview-content">
            {/* Basic Info */}
            <section className="preview-section">
              <h3>Basic Information</h3>
              
              {editMode ? (
                <>
                  <div className="edit-field">
                    <label>Recipe Name</label>
                    <input
                      type="text"
                      value={parsedRecipe.name || ''}
                      onChange={(e) => updateRecipeField('name', e.target.value)}
                    />
                  </div>
                  
                  <div className="edit-row">
                    <div className="edit-field">
                      <label>Serves</label>
                      <input
                        type="number"
                        value={parsedRecipe.serves || 4}
                        onChange={(e) => updateRecipeField('serves', parseInt(e.target.value) || 4)}
                        min="1"
                      />
                    </div>
                    
                    <div className="edit-field">
                      <label>Prep Time (min)</label>
                      <input
                        type="number"
                        value={parsedRecipe.prep_time || ''}
                        onChange={(e) => updateRecipeField('prep_time', parseInt(e.target.value) || null)}
                        min="0"
                      />
                    </div>
                    
                    <div className="edit-field">
                      <label>Cook Time (min)</label>
                      <input
                        type="number"
                        value={parsedRecipe.cook_time || ''}
                        onChange={(e) => updateRecipeField('cook_time', parseInt(e.target.value) || null)}
                        min="0"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p><strong>Name:</strong> {parsedRecipe.name || 'Unnamed Recipe'}</p>
                  <p><strong>Serves:</strong> {parsedRecipe.serves || 4}</p>
                  {parsedRecipe.prep_time && <p><strong>Prep Time:</strong> {parsedRecipe.prep_time} minutes</p>}
                  {parsedRecipe.cook_time && <p><strong>Cook Time:</strong> {parsedRecipe.cook_time} minutes</p>}
                </>
              )}
            </section>

            {/* Ingredients */}
            <section className="preview-section">
              <h3>Ingredients</h3>
              
              {editMode ? (
                <div className="edit-ingredients">
                  {parsedRecipe.ingredients?.map((ingredient, index) => (
                    <div key={index} className="edit-ingredient-row">
                      <input
                        type="text"
                        value={ingredient}
                        onChange={(e) => updateIngredient(index, e.target.value)}
                      />
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeIngredient(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary add-btn"
                    onClick={addIngredient}
                  >
                    + Add Ingredient
                  </button>
                </div>
              ) : (
                <ul className="ingredient-list">
                  {parsedRecipe.ingredients?.map((ingredient, index) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                </ul>
              )}
            </section>

            {/* Instructions */}
            <section className="preview-section">
              <h3>Instructions</h3>
              
              {editMode ? (
                <textarea
                  value={parsedRecipe.instructions || ''}
                  onChange={(e) => updateRecipeField('instructions', e.target.value)}
                  rows="10"
                  className="edit-textarea"
                />
              ) : (
                <div className="instructions-preview">
                  {typeof parsedRecipe.instructions === 'string' ? (
                    parsedRecipe.instructions.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))
                  ) : Array.isArray(parsedRecipe.instructions) ? (
                    <ol>
                      {parsedRecipe.instructions.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              )}
            </section>

            {/* Tags and Allergens */}
            {(parsedRecipe.tags?.length > 0 || parsedRecipe.allergens?.length > 0) && (
              <section className="preview-section">
                <h3>Tags & Allergens</h3>
                
                {parsedRecipe.tags?.length > 0 && (
                  <div className="preview-tags">
                    <strong>Tags:</strong>
                    {parsedRecipe.tags.map(tag => (
                      <span key={tag} className="preview-tag">{tag}</span>
                    ))}
                  </div>
                )}
                
                {parsedRecipe.allergens?.length > 0 && (
                  <div className="preview-allergens">
                    <strong>Contains:</strong>
                    {parsedRecipe.allergens.map(allergen => (
                      <span key={allergen} className="preview-allergen">⚠️ {allergen}</span>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}