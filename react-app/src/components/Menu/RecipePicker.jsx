import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import './RecipePicker.css';

export default function RecipePicker({ onSelect, onClose }) {
  const { recipes } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  // Extract unique tags
  const allTags = useMemo(() => {
    const tags = new Set();
    recipes.forEach(recipe => {
      recipe.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [recipes]);

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const nameMatch = recipe.name?.toLowerCase().includes(search);
        const ingredientMatch = recipe.ingredients?.some(ing => 
          ing.toLowerCase().includes(search)
        );
        if (!nameMatch && !ingredientMatch) return false;
      }

      // Tag filter
      if (selectedTags.length > 0) {
        if (!recipe.tags?.some(tag => selectedTags.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }, [recipes, searchTerm, selectedTags]);

  const handleTagToggle = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleRecipeClick = (recipe) => {
    onSelect(recipe);
  };

  return (
    <div className="recipe-picker-overlay" onClick={onClose}>
      <div className="recipe-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="picker-header">
          <h2>Select Recipe</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="picker-filters">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              autoFocus
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>

          {allTags.length > 0 && (
            <div className="tag-filters">
              <span className="filter-label">Filter by tags:</span>
              <div className="tag-pills">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    className={`tag-pill ${selectedTags.includes(tag) ? 'active' : ''}`}
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="picker-results">
          <div className="results-header">
            {filteredRecipes.length} recipes found
          </div>

          <div className="recipe-grid">
            {filteredRecipes.map(recipe => (
              <div
                key={recipe.id}
                className="recipe-option"
                onClick={() => handleRecipeClick(recipe)}
              >
                <h4 className="recipe-name">{recipe.name}</h4>
                
                <div className="recipe-meta">
                  <span className="serves">Serves {recipe.serves || '?'}</span>
                  {recipe.prep_time && (
                    <span className="time">Prep: {recipe.prep_time}min</span>
                  )}
                  {recipe.cook_time && (
                    <span className="time">Cook: {recipe.cook_time}min</span>
                  )}
                </div>

                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="recipe-tags">
                    {recipe.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                    {recipe.tags.length > 3 && (
                      <span className="tag">+{recipe.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {recipe.allergens && recipe.allergens.length > 0 && (
                  <div className="recipe-allergens">
                    {recipe.allergens.map(allergen => (
                      <span key={allergen} className="allergen">
                        ⚠️ {allergen}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredRecipes.length === 0 && (
            <div className="empty-results">
              <p>No recipes found matching your criteria.</p>
            </div>
          )}
        </div>

        <div className="picker-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}