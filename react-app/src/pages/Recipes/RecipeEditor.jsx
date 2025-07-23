import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useDeezNuts } from '../../contexts/DeezNutsContext';
import { saveVersionHistory, createSpecialVersion } from '../../services/recipeVersions';
import { uploadRecipeImage, deleteRecipeImage, downloadAndUploadImage } from '../../services/storageService';
import { analyzeRecipe } from '../../services/allergenDetector';
import allergenManager from '../../services/allergenManager';
import RecipeSections from '../../components/Recipes/RecipeSections';
import InstructionsEditor from '../../components/Recipes/InstructionsEditor';
import './RecipeEditor.css';

// Common tags
const COMMON_TAGS = [
  'Appetizer', 'Main Course', 'Side Dish', 'Dessert', 'Breakfast',
  'Lunch', 'Dinner', 'Snack', 'Beverage', 'Vegetarian', 'Vegan',
  'Quick & Easy', 'Make Ahead', 'Freezer Friendly', 'One Pot',
  'Slow Cooker', 'Instant Pot', 'Grilled', 'Baked', 'No Cook'
];

const DIET_TYPES = [
  'Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-Free', 'Dairy-Free',
  'Keto', 'Paleo', 'Whole30', 'Low-Carb', 'Mediterranean',
  'Halal', 'Kosher', 'Low-FODMAP', 'Sugar-Free', 'Nut-Free'
];

export default function RecipeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { selectedEventId } = useApp();
  const { checkForNuts } = useDeezNuts();
  
  const isNew = !id;
  const prefillData = location.state?.prefillData;
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    serves: 4,
    prep_time: '',
    cook_time: '',
    total_time: '',
    ingredients: [''],
    instructions: '',
    sections: isNew ? [{ // Default to sections for new recipes
      id: 'main',
      label: '',
      ingredients: [''],
      instructions: ''
    }] : null,
    notes: '',
    tags: [],
    allergens: [],
    diets: [],
    image_url: '',
    special_version: ''
  });
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [showAllergensDropdown, setShowAllergensDropdown] = useState(false);
  const [showDietsDropdown, setShowDietsDropdown] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [editNote, setEditNote] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [customAllergenInput, setCustomAllergenInput] = useState('');
  const [availableAllergens, setAvailableAllergens] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isNew && prefillData) {
      // Prefill with duplicate data, ensuring all required fields exist
      setFormData({
        name: `${prefillData.name} (Copy)`,
        serves: prefillData.serves || 4,
        prep_time: prefillData.prep_time || '',
        cook_time: prefillData.cook_time || '',
        total_time: prefillData.total_time || '',
        ingredients: prefillData.ingredients || [''],
        instructions: prefillData.instructions || '',
        sections: prefillData.sections || null,
        notes: prefillData.notes || '',
        tags: prefillData.tags || [],
        allergens: prefillData.allergens || [],
        diets: prefillData.diets || [], // Ensure diets is always an array
        image_url: prefillData.image_url || '',
        special_version: prefillData.special_version || '',
        // Don't copy these fields
        id: undefined,
        created_at: undefined,
        created_by: undefined,
        updated_at: undefined
      });
    } else if (!isNew) {
      loadRecipe();
    }
  }, [id, isNew, prefillData]);

  // Initialize allergen manager
  useEffect(() => {
    const initAllergens = async () => {
      await allergenManager.initialize();
      setAvailableAllergens(allergenManager.getAllAllergens());
    };
    initAllergens();

    return () => allergenManager.cleanup();
  }, []);

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
        total_time: data.total_time || '',
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [''],
        instructions: data.instructions || '',
        sections: data.sections || null,
        notes: data.notes || '',
        tags: data.tags || [],
        allergens: data.allergens || [],
        diets: data.diets || [],
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
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate total_time if user hasn't manually set it
      if ((field === 'prep_time' || field === 'cook_time') && !prev.total_time) {
        const prepTime = field === 'prep_time' ? parseInt(value) || 0 : parseInt(prev.prep_time) || 0;
        const cookTime = field === 'cook_time' ? parseInt(value) || 0 : parseInt(prev.cook_time) || 0;
        
        if (prepTime > 0 && cookTime > 0) {
          updated.total_time = prepTime + cookTime;
        }
      }
      
      return updated;
    });
    
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
    
    // Auto-detect allergens and tags when ingredients change
    if (autoDetectEnabled) {
      const tempRecipe = { ...formData, ingredients: newIngredients };
      const { allergens, tags } = analyzeRecipe(tempRecipe);
      
      // Update allergens (merge with existing to preserve manual additions)
      const manualAllergens = formData.allergens.filter(a => !allergens.includes(a));
      setFormData(prev => ({
        ...prev,
        allergens: [...new Set([...allergens, ...manualAllergens])]
      }));
    }
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
  
  const handleSectionsChange = (newSections) => {
    setFormData({ ...formData, sections: newSections });
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

  const handleAddCustomAllergen = async () => {
    if (!customAllergenInput.trim()) return;

    try {
      // Add custom allergen to the system
      await allergenManager.addCustomAllergen(customAllergenInput.trim());
      
      // Add to recipe
      handleAllergenToggle(customAllergenInput.trim().toLowerCase());
      
      // Refresh available allergens
      setAvailableAllergens(allergenManager.getAllAllergens());
      
      // Clear input
      setCustomAllergenInput('');
      setShowAllergensDropdown(false);
    } catch (error) {
      if (error.message.includes('already exists')) {
        // If it already exists, just add it to the recipe
        handleAllergenToggle(customAllergenInput.trim().toLowerCase());
        setCustomAllergenInput('');
      } else {
        alert(`Failed to add custom allergen: ${error.message}`);
      }
    }
  };

  const handleDietToggle = (diet) => {
    setFormData(prev => ({
      ...prev,
      diets: prev.diets.includes(diet)
        ? prev.diets.filter(d => d !== diet)
        : [...prev.diets, diet]
    }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = async (url) => {
    handleInputChange('image_url', url);
    
    // If it's a valid URL and not from Firebase Storage, offer to download and upload it
    if (url && url.startsWith('http') && !url.includes('firebasestorage.googleapis.com')) {
      if (window.confirm('Would you like to download and save this image to our storage? This ensures the image remains available.')) {
        try {
          setUploadingImage(true);
          const recipeId = id || 'temp_' + Date.now();
          const newImageUrl = await downloadAndUploadImage(url, recipeId);
          handleInputChange('image_url', newImageUrl);
        } catch (error) {
          console.error('Failed to download and upload image:', error);
          alert('Failed to save image. The original URL will be used.');
        } finally {
          setUploadingImage(false);
        }
      }
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Recipe name is required';
    }
    
    if (!formData.serves || formData.serves < 1) {
      errors.serves = 'Serving size must be at least 1';
    }
    
    // Validate sections if they exist, otherwise validate old format
    if (formData.sections && formData.sections.length > 0) {
      let hasAnyIngredients = false;
      let hasAnyInstructions = false;
      
      formData.sections.forEach(section => {
        if (section.ingredients.some(ing => ing.trim())) {
          hasAnyIngredients = true;
        }
        if (section.instructions.trim()) {
          hasAnyInstructions = true;
        }
      });
      
      if (!hasAnyIngredients) {
        errors.ingredients = 'At least one ingredient is required';
      }
      if (!hasAnyInstructions) {
        errors.instructions = 'Instructions are required';
      }
    } else {
      // Old format validation
      const hasIngredients = formData.ingredients.some(ing => ing.trim());
      if (!hasIngredients) {
        errors.ingredients = 'At least one ingredient is required';
      }
      
      if (!formData.instructions.trim()) {
        errors.instructions = 'Instructions are required';
      }
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
      // Prepare recipe data
      let recipeData = {
        ...formData,
        serves: parseInt(formData.serves),
        prep_time: formData.prep_time ? parseInt(formData.prep_time) : null,
        cook_time: formData.cook_time ? parseInt(formData.cook_time) : null,
        total_time: formData.total_time ? parseInt(formData.total_time) : null,
        ingredients_parsed: true,
        updated_at: serverTimestamp()
      };
      
      // Handle sections format
      if (formData.sections && formData.sections.length > 0) {
        // Clean up sections
        recipeData.sections = formData.sections.map(section => ({
          ...section,
          ingredients: section.ingredients.filter(ing => ing.trim())
        }));
        
        // Create flattened ingredients for backward compatibility and analysis
        const allIngredients = [];
        recipeData.sections.forEach(section => {
          allIngredients.push(...section.ingredients);
        });
        recipeData.ingredients = allIngredients;
        
        // Create concatenated instructions for backward compatibility
        const allInstructions = [];
        recipeData.sections.forEach((section, index) => {
          if (section.instructions.trim()) {
            if (section.label) {
              allInstructions.push(`\n${section.label}:\n${section.instructions}`);
            } else if (recipeData.sections.length > 1) {
              allInstructions.push(`\nPart ${index + 1}:\n${section.instructions}`);
            } else {
              allInstructions.push(section.instructions);
            }
          }
        });
        recipeData.instructions = allInstructions.join('\n').trim();
      } else {
        // Old format - filter empty ingredients
        recipeData.ingredients = formData.ingredients.filter(ing => ing.trim());
      }
      
      // Run allergen and tag detection on all ingredients
      const { allergens, tags } = analyzeRecipe(recipeData);
      
      // If auto-detect is enabled, update allergens and merge tags
      if (autoDetectEnabled) {
        // Preserve manually added allergens
        const manualAllergens = recipeData.allergens.filter(a => !allergens.includes(a));
        recipeData.allergens = [...new Set([...allergens, ...manualAllergens])];
        
        // Merge auto-detected tags with existing ones
        recipeData.tags = [...new Set([...recipeData.tags, ...tags])];
      }
      
      if (isNew) {
        // Add creation metadata
        recipeData.created_at = serverTimestamp();
        recipeData.created_by = currentUser.email;
        
        // Generate ID
        const newId = doc(collection(db, 'recipes')).id;
        
        // Upload image if one was selected
        if (imageFile) {
          try {
            setUploadingImage(true);
            const imageUrl = await uploadRecipeImage(imageFile, newId);
            recipeData.image_url = imageUrl;
          } catch (error) {
            console.error('Failed to upload image:', error);
            // Continue saving recipe even if image upload fails
          } finally {
            setUploadingImage(false);
          }
        }
        
        await setDoc(doc(db, 'recipes', newId), recipeData);
        
        // Check for nuts and show joke
        checkForNuts(recipeData, 'save');
        
        navigate(`/recipes/${newId}`);
      } else {
        // Save version history before updating
        const currentDoc = await getDoc(doc(db, 'recipes', id));
        if (currentDoc.exists()) {
          await saveVersionHistory(id, currentDoc.data(), editNote || 'Recipe updated');
        }
        
        // Upload image if one was selected
        if (imageFile) {
          try {
            setUploadingImage(true);
            const imageUrl = await uploadRecipeImage(imageFile, id);
            recipeData.image_url = imageUrl;
          } catch (error) {
            console.error('Failed to upload image:', error);
            // Continue saving recipe even if image upload fails
          } finally {
            setUploadingImage(false);
          }
        }
        
        // Update existing recipe (AFTER image upload so image_url is included)
        await updateDoc(doc(db, 'recipes', id), recipeData);
        
        // Check for nuts and show joke
        checkForNuts(recipeData, 'edit');
        
        // Navigate back to recipe view
        // Don't show special version modal when editing existing special versions
        navigate(`/recipes/${id}`);
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
                  type="text"
                  value={formData.serves || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string or valid numbers
                    if (value === '' || /^\d+$/.test(value)) {
                      handleInputChange('serves', value);
                    }
                  }}
                  onBlur={(e) => {
                    // Default to 4 if left empty
                    if (!e.target.value) {
                      handleInputChange('serves', 4);
                    }
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
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

              <div className="form-group">
                <label htmlFor="total_time">Total Time (minutes)</label>
                <input
                  id="total_time"
                  type="number"
                  value={formData.total_time}
                  onChange={(e) => handleInputChange('total_time', e.target.value)}
                  min="0"
                  placeholder="Auto-calculated"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Recipe Image</label>
              
              <div className="image-upload-section">
                <div className="upload-options">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                  />
                  
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  </button>
                  
                  <span className="upload-divider">or</span>
                  
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                    placeholder="Paste image URL"
                    className="image-url-input"
                  />
                </div>
                
                {/* Show preview from file upload */}
                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Recipe preview" />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={removeImage}
                      title="Remove image"
                    >
                      ✕
                    </button>
                    <span className="image-label">New image (will be uploaded on save)</span>
                  </div>
                )}
                
                {/* Show existing image */}
                {!imagePreview && formData.image_url && (
                  <div className="image-preview">
                    <img 
                      src={formData.image_url} 
                      alt="Recipe preview"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <span className="image-label">Current image</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Ingredients and Instructions */}
          <section className="editor-section">
            <h2>Ingredients & Instructions *</h2>
            {(validationErrors.ingredients || validationErrors.instructions) && (
              <div style={{ marginBottom: '1rem' }}>
                {validationErrors.ingredients && (
                  <span className="field-error">{validationErrors.ingredients}</span>
                )}
                {validationErrors.instructions && (
                  <span className="field-error" style={{ marginLeft: '1rem' }}>
                    {validationErrors.instructions}
                  </span>
                )}
              </div>
            )}
            
            {/* If no sections exist, offer to convert */}
            {!formData.sections ? (
              <>
                <div className="convert-to-sections" style={{ marginBottom: '1rem' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Want to organize this recipe into sections (e.g., main dish + sauce, salad + dressing)?
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      // Convert current data to sections format
                      // Create two sections with the same data
                      // Ensure we have valid ingredients (not just empty strings)
                      const validIngredients = formData.ingredients && formData.ingredients.filter(ing => ing.trim()).length > 0
                        ? formData.ingredients 
                        : [''];
                      
                      const mainSection = {
                        id: 'main',
                        label: '',
                        ingredients: [...validIngredients],
                        instructions: formData.instructions || ''
                      };
                      const secondSection = {
                        id: `section_${Date.now()}`,
                        label: '',
                        ingredients: [...validIngredients],
                        instructions: formData.instructions || ''
                      };
                      handleSectionsChange([mainSection, secondSection]);
                    }}
                  >
                    + Enable Recipe Sections
                  </button>
                </div>
                
                {/* Show traditional ingredients editor */}
                <div className="ingredients-list">
                  <h3>Ingredients</h3>
                  {formData.ingredients.map((ingredient, index) => (
                    <div key={index} className="ingredient-row">
                      <span className="ingredient-number">{index + 1}.</span>
                      <input
                        type="text"
                        value={ingredient}
                        onChange={(e) => handleIngredientChange(index, e.target.value)}
                        placeholder="Enter ingredient"
                      />
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeIngredient(index)}
                        disabled={formData.ingredients.length === 1 && !ingredient}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addIngredient}
                  >
                    + Add Ingredient
                  </button>
                </div>

                <div className="instructions-section" style={{ marginTop: '2rem' }}>
                  <InstructionsEditor
                    instructions={formData.instructions}
                    onChange={(value) => handleInputChange('instructions', value)}
                    placeholder="Enter cooking instructions..."
                  />
                </div>
              </>
            ) : (
              /* Show sections editor */
              <RecipeSections
                sections={formData.sections}
                onChange={handleSectionsChange}
                editMode={true}
              />
            )}
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
              <label>
                Allergens
                <label className="auto-detect-toggle">
                  <input
                    type="checkbox"
                    checked={autoDetectEnabled}
                    onChange={(e) => setAutoDetectEnabled(e.target.checked)}
                  />
                  <span>Auto-detect from ingredients</span>
                </label>
              </label>
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
                    <div className="custom-allergen-input">
                      <input
                        type="text"
                        placeholder="Add custom allergen..."
                        value={customAllergenInput}
                        onChange={(e) => setCustomAllergenInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomAllergen();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomAllergen}
                        className="add-custom-btn"
                      >
                        Add
                      </button>
                    </div>
                    <div className="allergen-categories">
                      {availableAllergens.filter(allergen => !formData.allergens.includes(allergen.id)).map(allergen => (
                        <button
                          key={allergen.id}
                          type="button"
                          className={`allergen-option ${allergen.parent ? 'child-allergen' : 'parent-allergen'} ${allergen.type === 'custom' ? 'custom-allergen' : ''}`}
                          onClick={() => {
                            handleAllergenToggle(allergen.id);
                            setShowAllergensDropdown(false);
                          }}
                          title={allergen.parent ? `Part of ${allergen.parent}` : ''}
                        >
                          {allergen.name}
                          {allergen.type === 'custom' && <span className="custom-badge">custom</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Dietary Types</label>
              <div className="tags-input-container">
                <div className="tags-list">
                  {formData.diets.map((diet, index) => (
                    <span key={index} className="tag">
                      {diet}
                      <button
                        type="button"
                        onClick={() => handleDietToggle(diet)}
                        className="tag-remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    className="add-tag-btn"
                    onClick={() => setShowDietsDropdown(!showDietsDropdown)}
                  >
                    + Add Diet Type
                  </button>
                </div>
                
                {showDietsDropdown && (
                  <div className="allergens-dropdown">
                    {DIET_TYPES.filter(diet => !formData.diets.includes(diet)).map(diet => (
                      <button
                        key={diet}
                        type="button"
                        className="allergen-option"
                        onClick={() => {
                          handleDietToggle(diet);
                          setShowDietsDropdown(false);
                        }}
                      >
                        {diet}
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
      
    </div>
  );
}