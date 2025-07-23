import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { getRecipeImage, ThumbnailSize } from '../../services/thumbnailService';
import { useScrollVisibility } from '../../hooks/useScrollDirection';
import './RecipeSelector.css';

export default function RecipeSelector({ recipes, event, onSelect, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [showConflicts, setShowConflicts] = useState(false);
  const isHeaderVisible = useScrollVisibility();

  // Get all unique tags from recipes
  const allTags = useMemo(() => {
    const tags = new Set();
    recipes.forEach(recipe => {
      (recipe.tags || []).forEach(tag => tags.add(tag));
      (recipe.dietary_tags || []).forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [recipes]);

  // Filter recipes based on search and filters
  const filteredRecipes = useMemo(() => {
    let filtered = recipes;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(recipe => 
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (recipe.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (recipe.ingredients || []).some(ingredient => {
          const ingredientText = typeof ingredient === 'string' 
            ? ingredient 
            : ingredient.item || '';
          return ingredientText.toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Tag filter
    if (filterTag !== 'all') {
      filtered = filtered.filter(recipe => 
        (recipe.tags || []).includes(filterTag) ||
        (recipe.dietary_tags || []).includes(filterTag)
      );
    }

    // Conflict filter
    if (showConflicts) {
      const eventAllergens = event?.allergens || [];
      filtered = filtered.filter(recipe => 
        (recipe.allergens || []).some(allergen => eventAllergens.includes(allergen))
      );
    }

    return filtered;
  }, [recipes, searchTerm, filterTag, showConflicts, event]);

  const hasConflict = (recipe) => {
    const eventAllergens = event?.allergens || [];
    return (recipe.allergens || []).some(allergen => eventAllergens.includes(allergen));
  };

  const getConflictAllergens = (recipe) => {
    const eventAllergens = event?.allergens || [];
    return (recipe.allergens || []).filter(allergen => eventAllergens.includes(allergen));
  };

  const handleSelect = (recipe) => {
    // Servings will be calculated automatically based on event details
    onSelect(recipe);
  };

  const modalContent = (
    <div className="recipe-selector">
      <div className="selector-overlay" onClick={onClose}></div>
      
      <div className="selector-modal">
        <div className={`selector-header-container recipe-selector-header ${!isHeaderVisible ? 'scroll-hidden' : ''}`}>
          <div className="selector-header">
            <h3>Select Recipe</h3>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="selector-filters">
            <div className="search-bar">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search recipes..."
                className="search-input"
              />
            </div>

            <div className="filter-controls">
              <select 
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="tag-filter"
              >
                <option value="all">All Categories</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>

              <label className="conflict-filter">
                <input
                  type="checkbox"
                  checked={showConflicts}
                  onChange={(e) => setShowConflicts(e.target.checked)}
                />
                Show only conflict recipes
              </label>
            </div>
          </div>
        </div>

        <div className="recipes-grid">
          {filteredRecipes.length === 0 ? (
            <div className="no-recipes">
              <p>No recipes found matching your criteria</p>
              {searchTerm && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => setSearchTerm('')}
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            filteredRecipes.map(recipe => (
              <div 
                key={recipe.id} 
                className={`recipe-card ${hasConflict(recipe) ? 'has-conflict' : ''}`}
                onClick={() => handleSelect(recipe)}
              >
                <div className="recipe-image-container">
                  <img 
                    src={getRecipeImage(recipe, ThumbnailSize.CARD)} 
                    alt={recipe.name}
                    className="recipe-image"
                    loading="lazy"
                  />
                </div>
                <div className="recipe-header">
                  <h4 className="recipe-name">{recipe.name}</h4>
                  {hasConflict(recipe) && (
                    <span className="conflict-indicator" title={`Contains: ${getConflictAllergens(recipe).join(', ')}`}>
                      ⚠️
                    </span>
                  )}
                </div>

                {recipe.description && (
                  <p className="recipe-description">{recipe.description}</p>
                )}

                <div className="recipe-meta">
                  <span className="serves">Serves: {recipe.serves || 'N/A'}</span>
                  {recipe.prep_time && (
                    <span className="prep-time">Prep: {recipe.prep_time}min</span>
                  )}
                  {recipe.cook_time && (
                    <span className="cook-time">Cook: {recipe.cook_time}min</span>
                  )}
                </div>

                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="recipe-tags">
                    {recipe.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                    {recipe.tags.length > 3 && (
                      <span className="tag-more">+{recipe.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {hasConflict(recipe) && (
                  <div className="conflict-warning">
                    <strong>⚠️ Allergen Conflict:</strong>
                    <div className="conflict-allergens">
                      {getConflictAllergens(recipe).map(allergen => (
                        <span key={allergen} className="conflict-allergen">{allergen}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="recipe-actions">
                  <button className="btn btn-primary btn-sm">
                    Add to Meal
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="selector-footer">
          <p className="recipe-count">
            Showing {filteredRecipes.length} of {recipes.length} recipes
          </p>
          
          {event?.allergens && event.allergens.length > 0 && (
            <div className="event-allergens">
              <strong>Event Allergens:</strong>
              {event.allergens.map(allergen => (
                <span key={allergen} className="event-allergen-tag">{allergen}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render the modal using a portal to avoid positioning issues
  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
}