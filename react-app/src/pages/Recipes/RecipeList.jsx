import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { getRecipesWithVersions } from '../../services/recipeVersions';
import './RecipeList.css';

export default function RecipeList() {
  const navigate = useNavigate();
  const { recipes } = useApp();
  const { hasRole } = useAuth();
  
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [sortBy, setSortBy] = useState('name'); // name, serves, created_at
  const [recipesWithVersions, setRecipesWithVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(true);
  
  // Load recipes with versions
  useEffect(() => {
    const loadVersions = async () => {
      try {
        const data = await getRecipesWithVersions();
        setRecipesWithVersions(data);
      } catch (error) {
        console.error('Error loading recipe versions:', error);
      } finally {
        setLoadingVersions(false);
      }
    };
    loadVersions();
  }, [recipes]); // Reload when recipes change

  // Extract unique tags and allergens from recipes
  const { allTags, allAllergens } = useMemo(() => {
    const tags = new Set();
    const allergens = new Set();
    
    recipes.forEach(recipe => {
      recipe.tags?.forEach(tag => tags.add(tag));
      recipe.allergens?.forEach(allergen => allergens.add(allergen));
    });
    
    return {
      allTags: Array.from(tags).sort(),
      allAllergens: Array.from(allergens).sort()
    };
  }, [recipes]);

  // Filter and sort recipes
  const filteredRecipes = useMemo(() => {
    let filtered = recipes.filter(recipe => {
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

      // Allergen filter (exclude recipes with selected allergens)
      if (selectedAllergens.length > 0) {
        if (recipe.allergens?.some(allergen => selectedAllergens.includes(allergen))) {
          return false;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'serves':
          return (b.serves || 0) - (a.serves || 0);
        case 'created_at':
          const dateA = a.created_at?.toDate?.() || new Date(a.created_at || 0);
          const dateB = b.created_at?.toDate?.() || new Date(b.created_at || 0);
          return dateB - dateA;
        default:
          return 0;
      }
    });

    return filtered;
  }, [recipes, searchTerm, selectedTags, selectedAllergens, sortBy]);

  const handleTagToggle = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleAllergenToggle = (allergen) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const handleRecipeClick = (recipeId) => {
    navigate(`/recipes/${recipeId}`);
  };

  const handleCreateNew = () => {
    navigate('/recipes/new');
  };

  return (
    <div className="recipe-list">
      <div className="recipe-list-header">
        <h1>Recipe Manager</h1>
        {hasRole('user') && (
          <div className="header-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/recipes/import')}
            >
              <span className="btn-icon">📥</span>
              Import
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleCreateNew}
            >
              <span className="btn-icon">➕</span>
              Add Recipe
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="recipe-filters">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search recipes or ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
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

        <div className="filter-row">
          <div className="filter-group">
            <label>Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="name">Name</option>
              <option value="serves">Serving Size</option>
              <option value="created_at">Date Added</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Filter by Tags:</label>
            <div className="tag-filters">
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-filter ${selectedTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Exclude Allergens:</label>
            <div className="allergen-filters">
              {allAllergens.map(allergen => (
                <button
                  key={allergen}
                  className={`allergen-filter ${selectedAllergens.includes(allergen) ? 'active' : ''}`}
                  onClick={() => handleAllergenToggle(allergen)}
                >
                  🚫 {allergen}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(selectedTags.length > 0 || selectedAllergens.length > 0) && (
          <button 
            className="clear-filters"
            onClick={() => {
              setSelectedTags([]);
              setSelectedAllergens([]);
            }}
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        Showing {filteredRecipes.length} of {recipes.length} recipes
      </div>

      {/* Recipe Grid */}
      <div className="recipe-grid">
        {filteredRecipes.map(recipe => {
          // Find version info for this recipe
          const recipeWithVersions = recipesWithVersions.find(r => r.id === recipe.id) || recipe;
          return (
            <RecipeCard
              key={recipe.id}
              recipe={recipeWithVersions}
              onClick={() => handleRecipeClick(recipe.id)}
            />
          );
        })}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="empty-state">
          <p>No recipes found matching your criteria.</p>
          {hasRole('user') && (
            <button 
              className="btn btn-primary"
              onClick={handleCreateNew}
            >
              Create Your First Recipe
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Recipe Card Component
function RecipeCard({ recipe, onClick }) {
  const defaultImage = '/api/placeholder/300/200';
  
  // Check if this recipe has special versions
  const hasVersions = recipe.versions && recipe.versions.length > 0;
  
  return (
    <div className="recipe-card" onClick={onClick}>
      {recipe.image_url && (
        <div className="recipe-image">
          <img 
            src={recipe.image_url} 
            alt={recipe.name}
            onError={(e) => { e.target.src = defaultImage; }}
          />
        </div>
      )}
      
      <div className="recipe-content">
        <h3 className="recipe-name">{recipe.name || 'Unnamed Recipe'}</h3>
        
        {/* Show special version indicator if this is a version */}
        {recipe.special_version && (
          <span className="version-indicator">{recipe.special_version}</span>
        )}
        
        {/* Show available versions if this is a parent recipe */}
        {hasVersions && (
          <div className="available-versions">
            <span className="versions-label">Available versions:</span>
            {recipe.versions.map((version, index) => (
              <span key={version.id} className="version-badge">
                {version.special_version}
              </span>
            ))}
          </div>
        )}
        
        <div className="recipe-meta">
          <span className="recipe-serves">
            <span className="icon">🍽️</span>
            Serves {recipe.serves || '?'}
          </span>
          
          {recipe.prep_time && (
            <span className="recipe-time">
              <span className="icon">⏱️</span>
              {recipe.prep_time} min
            </span>
          )}
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="recipe-tags">
            {recipe.tags.slice(0, 3).map(tag => (
              <span key={tag} className="recipe-tag">{tag}</span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="recipe-tag">+{recipe.tags.length - 3}</span>
            )}
          </div>
        )}

        {recipe.allergens && recipe.allergens.length > 0 && (
          <div className="recipe-allergens">
            {recipe.allergens.map(allergen => (
              <span key={allergen} className="recipe-allergen">
                ⚠️ {allergen}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}