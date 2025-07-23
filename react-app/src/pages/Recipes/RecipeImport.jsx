import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import FileUpload from '../../components/FileUpload/FileUpload';
import RecipeSections from '../../components/Recipes/RecipeSections';
import InstructionsEditor from '../../components/Recipes/InstructionsEditor';
import { parseRecipeFromFile, parseRecipeFromURL } from '../../services/recipeParser';
import { downloadAndUploadImage, uploadRecipeImage } from '../../services/storageService';
import { analyzeRecipe } from '../../services/allergenDetector';
import './RecipeImport.css';

export default function RecipeImport() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [importMode, setImportMode] = useState('file'); // 'file' or 'url'
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [parsedRecipe, setParsedRecipe] = useState(null);
  const [parsedRecipes, setParsedRecipes] = useState([]);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  
  // New states for file queue management
  const [fileQueue, setFileQueue] = useState([]);
  const [processingStatus, setProcessingStatus] = useState({});
  const [mergeMultipleFiles, setMergeMultipleFiles] = useState(true);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const processingRef = useRef(false);
  
  // Image handling state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);

  // Process queue when new files are added
  useEffect(() => {
    const pendingFiles = fileQueue.filter(f => processingStatus[f.id]?.status === 'pending');
    
    if (pendingFiles.length > 0 && !processingRef.current) {
      processFileQueue();
    }
  }, [fileQueue, processingStatus]);

  // Check if all files are processed and update UI
  useEffect(() => {
    // Skip if we're still processing
    if (processingRef.current || fileQueue.length === 0) return;
    
    // Check if all files have been processed
    const allProcessed = fileQueue.every(f => 
      processingStatus[f.id]?.status === 'done' || 
      processingStatus[f.id]?.status === 'error'
    );
    
    if (!allProcessed) return;
    
    // Gather all successful recipes
    const allSuccessfulRecipes = [];
    fileQueue.forEach(file => {
      if (processingStatus[file.id]?.status === 'done' && processingStatus[file.id]?.recipe) {
        allSuccessfulRecipes.push(processingStatus[file.id].recipe);
      }
    });
    
    console.log('All files processed. Successful recipes:', allSuccessfulRecipes.length);
    
    if (allSuccessfulRecipes.length > 0) {
      if (mergeMultipleFiles && allSuccessfulRecipes.length > 1) {
        // Merge multiple files into one recipe
        const mergedRecipe = mergeRecipes(allSuccessfulRecipes);
        console.log('Setting merged recipe:', mergedRecipe);
        setParsedRecipe(mergedRecipe);
        setParsedRecipes([]);
      } else if (allSuccessfulRecipes.length === 1) {
        console.log('Setting single parsed recipe:', allSuccessfulRecipes[0]);
        setParsedRecipe(allSuccessfulRecipes[0]);
        setParsedRecipes([]);
      } else {
        // Multiple separate recipes
        console.log('Setting multiple recipes:', allSuccessfulRecipes);
        setParsedRecipes(allSuccessfulRecipes);
        setParsedRecipe(allSuccessfulRecipes[0]);
        setCurrentRecipeIndex(0);
      }
      setEditMode(false);
    } else {
      // All files failed
      const hasErrors = fileQueue.some(f => processingStatus[f.id]?.status === 'error');
      if (hasErrors) {
        setError('Failed to parse any recipes from the selected files.');
      }
    }
  }, [fileQueue, processingStatus, mergeMultipleFiles]);

  const handleFileSelect = async (files) => {
    if (!files || (Array.isArray(files) && files.length === 0)) {
      setFileQueue([]);
      setProcessingStatus({});
      setParsedRecipe(null);
      setParsedRecipes([]);
      return;
    }

    // Handle new files being added
    const filesToProcess = Array.isArray(files) ? files : [files];
    const newFileEntries = filesToProcess.map(file => ({
      id: `${file.name}_${Date.now()}_${Math.random()}`,
      file: file,
      name: file.name,
      status: 'pending'
    }));

    // Update processing status for new files
    const newStatus = {};
    newFileEntries.forEach(entry => {
      newStatus[entry.id] = { status: 'pending', recipe: null };
    });
    
    setProcessingStatus(prev => ({ ...prev, ...newStatus }));
    
    // Add new files to the queue - this will trigger useEffect
    setFileQueue(prevQueue => [...prevQueue, ...newFileEntries]);
  };

  const processFileQueue = async () => {
    // Prevent concurrent processing
    if (processingRef.current) return;
    processingRef.current = true;
    
    setIsProcessing(true);
    setError(null);
    
    const pendingFiles = fileQueue.filter(f => processingStatus[f.id]?.status === 'pending');
    const recipes = [];
    
    // Process files sequentially
    for (const fileEntry of pendingFiles) {
      // Update status to processing
      setProcessingStatus(prev => ({
        ...prev,
        [fileEntry.id]: { ...prev[fileEntry.id], status: 'processing' }
      }));
      
      try {
        console.log(`Processing file: ${fileEntry.name}`);
        const recipe = await parseRecipeFromFile(fileEntry.file);
        
        // Decode HTML entities in the parsed recipe data
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          recipe.ingredients = recipe.ingredients.map(ing => {
            if (typeof ing === 'string') {
              return decodeHtmlEntities(ing);
            } else if (ing && typeof ing === 'object') {
              // Handle object format {item, amount, unit}
              return {
                ...ing,
                item: ing.item ? decodeHtmlEntities(ing.item) : ing.item,
                amount: ing.amount ? decodeHtmlEntities(String(ing.amount)) : ing.amount,
                unit: ing.unit ? decodeHtmlEntities(ing.unit) : ing.unit
              };
            }
            return ing;
          });
        }
        if (recipe.instructions) {
          if (typeof recipe.instructions === 'string') {
            recipe.instructions = decodeHtmlEntities(recipe.instructions);
          } else if (Array.isArray(recipe.instructions)) {
            recipe.instructions = recipe.instructions.map(inst => {
              if (typeof inst === 'string') {
                return decodeHtmlEntities(inst);
              } else if (inst && typeof inst === 'object') {
                // Handle object format {instruction, step}
                return {
                  ...inst,
                  instruction: inst.instruction ? decodeHtmlEntities(inst.instruction) : inst.instruction,
                  step: inst.step ? decodeHtmlEntities(inst.step) : inst.step
                };
              }
              return inst;
            });
          }
        }
        if (recipe.name) {
          recipe.name = decodeHtmlEntities(recipe.name);
        }
        
        console.log(`Successfully parsed: ${fileEntry.name}`, recipe);
        console.log('Recipe structure:', {
          hasName: !!recipe.name,
          hasIngredients: !!recipe.ingredients,
          ingredientsLength: recipe.ingredients?.length,
          hasInstructions: !!recipe.instructions,
          instructionsType: Array.isArray(recipe.instructions) ? 'array' : typeof recipe.instructions
        });
        recipes.push(recipe);
        
        // Update status to done
        setProcessingStatus(prev => ({
          ...prev,
          [fileEntry.id]: { 
            status: 'done', 
            recipe: recipe,
            error: null 
          }
        }));
      } catch (err) {
        console.error(`Error parsing file ${fileEntry.name}:`, err);
        
        // Update status to error
        setProcessingStatus(prev => ({
          ...prev,
          [fileEntry.id]: { 
            status: 'error', 
            recipe: null,
            error: err.message || 'Failed to parse file'
          }
        }));
      }
    }
    
    // Processing complete - the useEffect will handle setting the parsed recipes
    setIsProcessing(false);
    processingRef.current = false;
  };

  const mergeRecipes = (recipes) => {
    console.log('Merging recipes:', recipes);
    
    // Helper to check if instructions contain actual content
    const hasValidInstructions = (instructions) => {
      if (!instructions) return false;
      
      // Convert to string for checking
      const instructionText = Array.isArray(instructions) 
        ? instructions.join(' ').toLowerCase()
        : String(instructions).toLowerCase();
      
      // Check if it's a placeholder or missing content
      const invalidPhrases = [
        'not visible',
        'not available',
        'no instructions',
        'see image',
        'see photo',
        'not provided'
      ];
      
      return !invalidPhrases.some(phrase => instructionText.includes(phrase));
    };
    
    // Helper to check if notes contain actual content
    const hasValidNotes = (notes) => {
      if (!notes) return false;
      const notesText = String(notes).toLowerCase();
      return !notesText.includes('not visible') && !notesText.includes('not available');
    };
    
    // Helper to convert time strings to minutes
    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr) return null;
      if (typeof timeStr === 'number') return timeStr;
      
      const str = String(timeStr).toLowerCase();
      let totalMinutes = 0;
      
      // Match hours
      const hoursMatch = str.match(/(\d+)\s*h(our)?s?/);
      if (hoursMatch) {
        totalMinutes += parseInt(hoursMatch[1]) * 60;
      }
      
      // Match minutes
      const minutesMatch = str.match(/(\d+)\s*m(in(ute)?)?s?/);
      if (minutesMatch) {
        totalMinutes += parseInt(minutesMatch[1]);
      }
      
      // If no specific format found, try to extract number
      if (totalMinutes === 0) {
        const numberMatch = str.match(/\d+/);
        if (numberMatch) {
          totalMinutes = parseInt(numberMatch[0]);
        }
      }
      
      return totalMinutes || null;
    };
    
    // Find the best values from all recipes
    const bestRecipe = {
      name: recipes.find(r => r.name && r.name !== 'Merged Recipe')?.name || recipes[0].name || 'Merged Recipe',
      serves: Math.max(...recipes.map(r => r.serves || 4)),
      prep_time: parseTimeToMinutes(recipes.find(r => r.prep_time)?.prep_time),
      cook_time: parseTimeToMinutes(recipes.find(r => r.cook_time)?.cook_time),
      ingredients: [],
      instructions: '',
      notes: '',
      tags: [],
      allergens: [],
      image_url: recipes.find(r => r.image_url)?.image_url || null
    };

    // Combine ingredients - deduplicate similar ones
    const allIngredients = [];
    const seenIngredients = new Set();
    
    recipes.forEach(recipe => {
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach(ing => {
          // Simple deduplication - could be enhanced
          const normalized = ing.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!seenIngredients.has(normalized) || ing.length > 20) {
            allIngredients.push(ing);
            if (ing.length <= 20) seenIngredients.add(normalized);
          }
        });
      }
    });
    bestRecipe.ingredients = allIngredients;

    // Find the best instructions (non-placeholder)
    const validInstructions = recipes.filter(r => hasValidInstructions(r.instructions));
    
    if (validInstructions.length > 0) {
      // Use the instructions from recipes that have valid content
      const instructionParts = [];
      validInstructions.forEach((recipe, index) => {
        if (validInstructions.length > 1) {
          instructionParts.push(`\n--- Part ${index + 1} ---\n`);
        }
        if (typeof recipe.instructions === 'string') {
          instructionParts.push(recipe.instructions);
        } else if (Array.isArray(recipe.instructions)) {
          instructionParts.push(recipe.instructions.join('\n'));
        }
      });
      bestRecipe.instructions = instructionParts.join('\n');
    } else if (recipes.length > 0 && recipes[0].instructions) {
      // Fallback to first recipe's instructions if none are valid
      bestRecipe.instructions = Array.isArray(recipes[0].instructions) 
        ? recipes[0].instructions.join('\n')
        : recipes[0].instructions;
    }

    // Find the best notes (non-placeholder)
    const validNotes = recipes.find(r => hasValidNotes(r.notes));
    if (validNotes?.notes) {
      bestRecipe.notes = validNotes.notes;
    }

    // Combine unique tags and allergens
    const allTags = new Set();
    const allAllergens = new Set();
    recipes.forEach(recipe => {
      recipe.tags?.forEach(tag => allTags.add(tag));
      recipe.allergens?.forEach(allergen => allAllergens.add(allergen));
    });
    bestRecipe.tags = Array.from(allTags);
    bestRecipe.allergens = Array.from(allAllergens);

    console.log('Merged recipe result:', bestRecipe);
    return bestRecipe;
  };

  const removeFileFromQueue = (fileId) => {
    setFileQueue(prev => prev.filter(f => f.id !== fileId));
    setProcessingStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[fileId];
      return newStatus;
    });
  };

  // Helper function to decode HTML entities
  const decodeHtmlEntities = (text) => {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
  };

  const handleURLSubmit = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const recipe = await parseRecipeFromURL(url);
      
      console.log('Parsed recipe from URL:', recipe);
      console.log('Image URL:', recipe.image_url);
      
      // Decode HTML entities in the parsed recipe data
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        recipe.ingredients = recipe.ingredients.map(ing => {
          if (typeof ing === 'string') {
            return decodeHtmlEntities(ing);
          } else if (ing && typeof ing === 'object') {
            // Handle object format {item, amount, unit}
            return {
              ...ing,
              item: ing.item ? decodeHtmlEntities(ing.item) : ing.item,
              amount: ing.amount ? decodeHtmlEntities(String(ing.amount)) : ing.amount,
              unit: ing.unit ? decodeHtmlEntities(ing.unit) : ing.unit
            };
          }
          return ing;
        });
      }
      if (recipe.instructions) {
        if (typeof recipe.instructions === 'string') {
          recipe.instructions = decodeHtmlEntities(recipe.instructions);
        } else if (Array.isArray(recipe.instructions)) {
          recipe.instructions = recipe.instructions.map(inst => {
            if (typeof inst === 'string') {
              return decodeHtmlEntities(inst);
            } else if (inst && typeof inst === 'object') {
              // Handle object format {instruction, step}
              return {
                ...inst,
                instruction: inst.instruction ? decodeHtmlEntities(inst.instruction) : inst.instruction,
                step: inst.step ? decodeHtmlEntities(inst.step) : inst.step
              };
            }
            return inst;
          });
        }
      }
      if (recipe.name) {
        recipe.name = decodeHtmlEntities(recipe.name);
      }
      
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
      // Process instructions - convert string to array if needed
      let processedInstructions = parsedRecipe.instructions;
      if (typeof processedInstructions === 'string') {
        // Split by newlines and filter out empty lines
        processedInstructions = processedInstructions
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      }
      
      // Run allergen and tag detection
      const { allergens, tags } = analyzeRecipe(parsedRecipe);
      
      // Add metadata
      const recipeData = {
        ...parsedRecipe,
        serves: parseInt(parsedRecipe.serves) || 4,
        instructions: processedInstructions,
        created_at: serverTimestamp(),
        created_by: currentUser.email,
        ingredients_parsed: true,
        // Merge detected allergens with any existing ones
        allergens: [...new Set([...(parsedRecipe.allergens || []), ...allergens])],
        // Merge detected tags with any existing ones
        tags: [...new Set([...(parsedRecipe.tags || []), ...tags])]
      };
      
      console.log('Recipe data being saved:', recipeData);
      console.log('Image URL in recipe data:', recipeData.image_url);
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, 'recipes'), recipeData);
      
      // Handle image upload if file selected
      if (imageFile) {
        try {
          setUploadingImage(true);
          const imageUrl = await uploadRecipeImage(imageFile, docRef.id);
          await updateDoc(doc(db, 'recipes', docRef.id), {
            image_url: imageUrl
          });
        } catch (imageError) {
          console.error('Failed to upload image:', imageError);
          // Continue without the image
        } finally {
          setUploadingImage(false);
        }
      }
      // Handle image URL if present and no file selected
      else if (parsedRecipe.image_url && parsedRecipe.image_url.startsWith('http')) {
        try {
          // Download and upload the image to our storage
          const newImageUrl = await downloadAndUploadImage(parsedRecipe.image_url, docRef.id);
          // Update the recipe with the new image URL
          await updateDoc(doc(db, 'recipes', docRef.id), {
            image_url: newImageUrl
          });
        } catch (imageError) {
          console.error('Failed to save image:', imageError);
          // Continue without updating the image URL
        }
      }
      
      // If we have more recipes to save
      if (parsedRecipes.length > 0 && currentRecipeIndex < parsedRecipes.length - 1) {
        // Move to next recipe
        const nextIndex = currentRecipeIndex + 1;
        setCurrentRecipeIndex(nextIndex);
        setParsedRecipe(parsedRecipes[nextIndex]);
        setEditMode(false);
        
        // Show success message
        setError(null); // Clear any errors
        // You might want to show a success toast here
      } else {
        // Navigate to the new recipe if this was the last one
        navigate(`/recipes/${docRef.id}`);
      }
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
    const newIngredients = [...(parsedRecipe.ingredients || [])];
    newIngredients[index] = value;
    updateRecipeField('ingredients', newIngredients);
  };

  const addIngredient = () => {
    updateRecipeField('ingredients', [...(parsedRecipe.ingredients || []), '']);
  };

  const removeIngredient = (index) => {
    const newIngredients = (parsedRecipe.ingredients || []).filter((_, i) => i !== index);
    updateRecipeField('ingredients', newIngredients);
  };
  
  const handleSectionsChange = (newSections) => {
    updateRecipeField('sections', newSections);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
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
  };

  const handleImageUrlChange = async (url) => {
    updateRecipeField('image_url', url);
    
    // Clear file upload if URL is entered
    if (url && imageFile) {
      setImageFile(null);
      setImagePreview(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    updateRecipeField('image_url', '');
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
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
          <>
            <FileUpload
              onFileSelect={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
              multiple={true}
              fileQueue={fileQueue}
              processingStatus={processingStatus}
              onRemoveFile={removeFileFromQueue}
            />
            {fileQueue.length > 1 && (
              <div className="merge-option">
                <label>
                  <input
                    type="checkbox"
                    checked={mergeMultipleFiles}
                    onChange={(e) => setMergeMultipleFiles(e.target.checked)}
                  />
                  Merge multiple files into one recipe
                </label>
              </div>
            )}
          </>
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

      {/* Multiple Recipe Navigator */}
      {parsedRecipes.length > 1 && (
        <div className="recipe-navigator">
          <div className="navigator-info">
            <span>Recipe {currentRecipeIndex + 1} of {parsedRecipes.length}</span>
          </div>
          <div className="navigator-controls">
            <button 
              className="btn btn-secondary"
              onClick={() => {
                const prevIndex = currentRecipeIndex - 1;
                setCurrentRecipeIndex(prevIndex);
                setParsedRecipe(parsedRecipes[prevIndex]);
                setEditMode(false);
              }}
              disabled={currentRecipeIndex === 0}
            >
              ← Previous
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                const nextIndex = currentRecipeIndex + 1;
                setCurrentRecipeIndex(nextIndex);
                setParsedRecipe(parsedRecipes[nextIndex]);
                setEditMode(false);
              }}
              disabled={currentRecipeIndex === parsedRecipes.length - 1}
            >
              Next →
            </button>
          </div>
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
                        type="text"
                        value={parsedRecipe.serves || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string or valid numbers
                          if (value === '' || /^\d+$/.test(value)) {
                            updateRecipeField('serves', value);
                          }
                        }}
                        onBlur={(e) => {
                          // Default to 4 if left empty
                          if (!e.target.value) {
                            updateRecipeField('serves', 4);
                          }
                        }}
                        inputMode="numeric"
                        pattern="[0-9]*"
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

            {/* Recipe Image - Show in both edit and preview modes */}
            {(parsedRecipe.image_url || imagePreview || editMode) && (
              <section className="preview-section">
                <h3>Recipe Image</h3>
                
                {editMode ? (
                  <div className="image-upload-section">
                    <div className="upload-options">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        style={{ display: 'none' }}
                      />
                      
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? 'Uploading...' : '📷 Upload Image'}
                      </button>
                      
                      <span className="upload-divider">or</span>
                      
                      <input
                        type="url"
                        value={parsedRecipe.image_url || ''}
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
                    {!imagePreview && parsedRecipe.image_url && (
                      <div className="image-preview">
                        <img 
                          src={parsedRecipe.image_url} 
                          alt="Recipe preview"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                        <span className="image-label">Current image</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Show image in preview mode */
                  parsedRecipe.image_url && (
                    <div className="image-preview">
                      <img 
                        src={parsedRecipe.image_url} 
                        alt={parsedRecipe.name}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )
                )}
              </section>
            )}

            {/* Ingredients and Instructions */}
            {parsedRecipe.sections ? (
              <section className="preview-section">
                <h3>Ingredients & Instructions</h3>
                <RecipeSections
                  sections={parsedRecipe.sections}
                  onChange={handleSectionsChange}
                  editMode={editMode}
                />
              </section>
            ) : (
              /* Show convert button in edit mode */
              editMode && (
                <div className="preview-section" style={{ marginBottom: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      // Convert to sections format with two sections
                      const mainSection = {
                        id: 'main',
                        label: '',
                        ingredients: parsedRecipe.ingredients || [''],
                        instructions: parsedRecipe.instructions || ''
                      };
                      const secondSection = {
                        id: `section_${Date.now()}`,
                        label: '',
                        ingredients: parsedRecipe.ingredients || [''],
                        instructions: parsedRecipe.instructions || ''
                      };
                      updateRecipeField('sections', [mainSection, secondSection]);
                    }}
                  >
                    + Convert to Recipe Sections (for dressings, sauces, etc.)
                  </button>
                </div>
              )
            )}
            
            {/* Traditional format - only show if no sections */}
            {!parsedRecipe.sections && (
              <>
                {/* Traditional format - Ingredients */}
                <section className="preview-section">
                  <h3>Ingredients</h3>
                  
                  {editMode ? (
                    <div className="edit-ingredients">
                      {parsedRecipe.ingredients?.map((ingredient, index) => (
                        <div key={index} className="edit-ingredient-row">
                          <input
                            type="text"
                            value={typeof ingredient === 'string' 
                              ? ingredient 
                              : ingredient.item 
                                ? `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.item}`.trim()
                                : JSON.stringify(ingredient)}
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
                        <li key={index}>
                          {typeof ingredient === 'string' 
                            ? ingredient 
                            : ingredient.item 
                              ? `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.item}`.trim()
                              : JSON.stringify(ingredient)}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Traditional format - Instructions */}
                <section className="preview-section">
                  {editMode ? (
                    <InstructionsEditor
                      instructions={parsedRecipe.instructions || ''}
                      onChange={(value) => updateRecipeField('instructions', value)}
                      placeholder="Enter cooking instructions..."
                    />
                  ) : (
                    <>
                      <h3>Instructions</h3>
                      <div className="instructions-preview">
                        {typeof parsedRecipe.instructions === 'string' ? (
                          (() => {
                            // Try to parse numbered steps from string
                            const numberedPattern = /(\d+)\.\s*([^]+?)(?=\d+\.\s*|$)/g;
                            const numberedMatches = [...parsedRecipe.instructions.matchAll(numberedPattern)];
                            
                            if (numberedMatches && numberedMatches.length > 0) {
                              // Show as numbered steps
                              return (
                                <div className="instructions-steps">
                                  {numberedMatches.map((match, index) => (
                                    <div key={index} className="import-instruction-step">
                                      <span className="step-number">{match[1]}</span>
                                      <span className="step-text">{match[2].trim()}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            } else {
                              // Fall back to showing as paragraphs
                              return (
                                <div className="instructions-text">
                                  {parsedRecipe.instructions.split('\n').map((line, index) => {
                                    return line.trim() ? <p key={index}>{line}</p> : null;
                                  })}
                                </div>
                              );
                            }
                          })()
                        ) : Array.isArray(parsedRecipe.instructions) ? (
                          <div className="instructions-steps">
                            {parsedRecipe.instructions.map((step, index) => (
                              <div key={index} className="import-instruction-step">
                                <span className="step-number">{index + 1}</span>
                                <span className="step-text">
                                  {typeof step === 'string' 
                                    ? step 
                                    : step.instruction 
                                      ? step.instruction
                                      : step.step
                                        ? step.step
                                        : JSON.stringify(step)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </section>
              </>
            )}


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