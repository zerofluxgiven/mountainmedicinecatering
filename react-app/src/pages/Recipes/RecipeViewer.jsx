import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import RecipeScaler from '../../components/Recipes/RecipeScaler';
import { getSpecialVersions, getVersionHistory, createSpecialVersion } from '../../services/recipeVersions';
import './RecipeViewer.css';

export default function RecipeViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScaler, setShowScaler] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [specialVersions, setSpecialVersions] = useState([]);
  const [versionHistory, setVersionHistory] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAddVersionModal, setShowAddVersionModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [creatingVersion, setCreatingVersion] = useState(false);

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const recipeDoc = await getDoc(doc(db, 'recipes', id));
      
      if (!recipeDoc.exists()) {
        setError('Recipe not found');
        return;
      }

      const recipeData = { id: recipeDoc.id, ...recipeDoc.data() };
      setRecipe(recipeData);
      
      // Load versions in parallel
      const [specialVers, history] = await Promise.all([
        getSpecialVersions(id),
        getVersionHistory(id)
      ]);
      
      setSpecialVersions(specialVers);
      setVersionHistory(history);
    } catch (err) {
      console.error('Error loading recipe:', err);
      setError('Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/recipes/${id}/edit`);
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'recipes', id));
      navigate('/recipes');
    } catch (err) {
      console.error('Error deleting recipe:', err);
      alert('Failed to delete recipe');
    }
  };

  const handleDuplicate = () => {
    // Navigate to editor with recipe data as prefill
    navigate('/recipes/new', { state: { prefillData: recipe } });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert('PDF export coming soon!');
  };

  const handleCreateVersion = async () => {
    if (!newVersionName.trim()) {
      alert('Please enter a name for the special version');
      return;
    }

    setCreatingVersion(true);
    try {
      // Get the base recipe (not a version)
      const baseRecipeId = recipe.parent_id || id;
      const baseRecipe = recipe.parent_id ? 
        await getDoc(doc(db, 'recipes', baseRecipeId)) : 
        { data: () => recipe };
      
      await createSpecialVersion(
        baseRecipeId,
        baseRecipe.data(),
        newVersionName.trim(),
        `Created ${newVersionName.trim()} version`
      );
      
      // Reload to show new version
      await loadRecipe();
      setShowAddVersionModal(false);
      setNewVersionName('');
    } catch (err) {
      console.error('Error creating special version:', err);
      alert('Failed to create special version');
    } finally {
      setCreatingVersion(false);
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

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/recipes" className="btn btn-secondary">
          Back to Recipes
        </Link>
      </div>
    );
  }

  if (!recipe) return null;

  return (
    <div className="recipe-viewer">
      {/* Header */}
      <div className="recipe-header">
        <div className="recipe-header-content">
          <Link to="/recipes" className="back-link">
            ← Back to Recipes
          </Link>
          <h1>{recipe.name || 'Unnamed Recipe'}</h1>
          
          <div className="recipe-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowScaler(!showScaler)}
            >
              📐 Scale Recipe
            </button>
            
            {hasRole('user') && (
              <>
                <button 
                  className="btn btn-secondary"
                  onClick={handleEdit}
                >
                  ✏️ Edit
                </button>
                
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowAddVersionModal(true)}
                >
                  ➕ Add Version
                </button>
                
                <button 
                  className="btn btn-secondary"
                  onClick={handleDuplicate}
                >
                  📋 Duplicate
                </button>
                
                <button 
                  className="btn btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  🗑️ Delete
                </button>
              </>
            )}
            
            <button 
              className="btn btn-secondary"
              onClick={handlePrint}
            >
              🖨️ Print
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={handleExportPDF}
            >
              📄 Export PDF
            </button>
            
            {versionHistory.length > 0 && (
              <button 
                className="btn btn-secondary"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
              >
                📚 Version History ({versionHistory.length})
              </button>
            )}
          </div>
          
          {/* Version Selector */}
          {specialVersions.length > 0 && (
            <div className="version-selector">
              <label>View Version: </label>
              <select 
                value={selectedVersion || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const version = specialVersions.find(v => v.id === e.target.value);
                    setRecipe(version);
                    setSelectedVersion(e.target.value);
                  } else {
                    loadRecipe(); // Reset to original
                    setSelectedVersion(null);
                  }
                }}
                className="version-dropdown"
              >
                <option value="">Original Recipe</option>
                {specialVersions.map(version => (
                  <option key={version.id} value={version.id}>
                    {version.special_version}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Delete Recipe?</h3>
            <p>Are you sure you want to delete "{recipe.name}"? This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete Recipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Scaler */}
      {showScaler && (
        <RecipeScaler 
          recipe={recipe}
          onClose={() => setShowScaler(false)}
        />
      )}
      
      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="modal-overlay" onClick={() => setShowVersionHistory(false)}>
          <div className="modal-content version-history-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Version History</h3>
              <button 
                className="close-button"
                onClick={() => setShowVersionHistory(false)}
              >
                ✕
              </button>
            </div>
            <div className="version-history-list">
              {versionHistory.length === 0 ? (
                <p className="empty-message">No version history available</p>
              ) : (
                versionHistory.map(version => (
                  <div key={version.id} className="version-item">
                    <div className="version-header">
                      <span className="version-date">
                        {version.timestamp?.toDate ? 
                          new Date(version.timestamp.toDate()).toLocaleString() :
                          'Unknown date'
                        }
                      </span>
                      {version.edit_note && (
                        <span className="version-note">{version.edit_note}</span>
                      )}
                    </div>
                    <button 
                      className="btn btn-small"
                      onClick={() => {
                        setRecipe(version);
                        setSelectedVersion(version.id);
                        setShowVersionHistory(false);
                      }}
                    >
                      View this version
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="recipe-main">
        <div className="recipe-content-grid">
          {/* Left Column - Image and Meta */}
          <div className="recipe-sidebar">
            {recipe.image_url && (
              <div className="recipe-hero-image">
                <img src={recipe.image_url} alt={recipe.name} />
              </div>
            )}

            <div className="recipe-info-card">
              <h3>Recipe Information</h3>
              
              <div className="info-item">
                <span className="info-label">Serves:</span>
                <span className="info-value">{recipe.serves || 'Not specified'}</span>
              </div>

              {recipe.prep_time && (
                <div className="info-item">
                  <span className="info-label">Prep Time:</span>
                  <span className="info-value">{recipe.prep_time} minutes</span>
                </div>
              )}

              {recipe.cook_time && (
                <div className="info-item">
                  <span className="info-label">Cook Time:</span>
                  <span className="info-value">{recipe.cook_time} minutes</span>
                </div>
              )}

              {recipe.tags && recipe.tags.length > 0 && (
                <div className="info-item">
                  <span className="info-label">Tags:</span>
                  <div className="tag-list">
                    {recipe.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {recipe.allergens && recipe.allergens.length > 0 && (
                <div className="info-item allergen-section">
                  <span className="info-label">⚠️ Contains:</span>
                  <div className="allergen-list">
                    {recipe.allergens.map(allergen => (
                      <span key={allergen} className="allergen">{allergen}</span>
                    ))}
                  </div>
                </div>
              )}

              {recipe.created_by && (
                <div className="info-item">
                  <span className="info-label">Added by:</span>
                  <span className="info-value">{recipe.created_by}</span>
                </div>
              )}

              {recipe.created_at && (
                <div className="info-item">
                  <span className="info-label">Date added:</span>
                  <span className="info-value">
                    {new Date(recipe.created_at.seconds * 1000 || recipe.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Ingredients and Instructions */}
          <div className="recipe-details">
            {/* Ingredients Section */}
            <section className="recipe-section">
              <h2>Ingredients</h2>
              <div className="ingredients-list">
                {recipe.ingredients ? (
                  typeof recipe.ingredients === 'string' ? (
                    <div className="ingredients-text">
                      {recipe.ingredients.split('\n').map((line, index) => (
                        line.trim() && <p key={index} className="ingredient-item">{line}</p>
                      ))}
                    </div>
                  ) : Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ? (
                    <ul>
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="ingredient-item">
                          {ingredient}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-message">No ingredients listed</p>
                  )
                ) : (
                  <p className="empty-message">No ingredients listed</p>
                )}
              </div>
            </section>

            {/* Instructions Section */}
            <section className="recipe-section">
              <h2>Instructions</h2>
              <div className="instructions">
                {recipe.instructions ? (
                  typeof recipe.instructions === 'string' ? (
                    <div className="instructions-text">
                      {recipe.instructions.split('\n').map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                    </div>
                  ) : Array.isArray(recipe.instructions) ? (
                    <ol className="instructions-list">
                      {recipe.instructions.map((step, index) => (
                        <li key={index} className="instruction-step">
                          {step}
                        </li>
                      ))}
                    </ol>
                  ) : null
                ) : (
                  <p className="empty-message">No instructions provided</p>
                )}
              </div>
            </section>

            {/* Notes Section */}
            {recipe.notes && (
              <section className="recipe-section">
                <h2>Notes</h2>
                <div className="recipe-notes">
                  {recipe.notes}
                </div>
              </section>
            )}

            {/* Special Versions */}
            {recipe.special_version && (
              <section className="recipe-section">
                <h2>Special Version</h2>
                <div className="special-version-badge">
                  {recipe.special_version}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
      
      {/* Add Version Modal */}
      {showAddVersionModal && (
        <div className="modal-overlay" onClick={() => setShowAddVersionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Create Special Version</h3>
            <p>Create a dietary variant of this recipe (e.g., Gluten-Free, Vegan, etc.)</p>
            
            <div className="form-group">
              <label>Version Name</label>
              <input
                type="text"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                placeholder="e.g., Gluten-Free, Vegan, Dairy-Free"
                autoFocus
              />
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddVersionModal(false);
                  setNewVersionName('');
                }}
                disabled={creatingVersion}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateVersion}
                disabled={creatingVersion || !newVersionName.trim()}
              >
                {creatingVersion ? 'Creating...' : 'Create Version'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}