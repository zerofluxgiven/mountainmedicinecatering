import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { getRecipesWithVersions } from '../../services/recipeVersions';
import { formatTimeShort } from '../../utils/timeFormatting';
import { getRecipeImage, ThumbnailSize } from '../../services/thumbnailService';
import allergenManager from '../../services/allergenManager';
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
  
  // New states for autocomplete and show all
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [allergenSearchTerm, setAllergenSearchTerm] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [showAllAllergens, setShowAllAllergens] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showAllergenDropdown, setShowAllergenDropdown] = useState(false);
  const [allAllergensExpanded, setAllAllergensExpanded] = useState([]);
  
  // Initialize allergen manager
  useEffect(() => {
    allergenManager.initialize();
    return () => allergenManager.cleanup();
  }, []);
  
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
  const { allTags, allAllergens, expandedAllergens } = useMemo(() => {
    const tags = new Set();
    const allergens = new Set();
    
    recipes.forEach(recipe => {
      recipe.tags?.forEach(tag => tags.add(tag));
      recipe.allergens?.forEach(allergen => allergens.add(allergen));
    });
    
    // Get all allergens from allergen manager (includes custom ones)
    const managerAllergens = allergenManager.getAllAllergens();
    
    // Merge recipe allergens with predefined/custom allergens
    managerAllergens.forEach(allergen => {
      allergens.add(allergen.id);
    });
    
    return {
      allTags: Array.from(tags).sort(),
      allAllergens: Array.from(allergens).sort(),
      expandedAllergens: managerAllergens
    };
  }, [recipes]);
  
  // Filter tags based on search
  const filteredTags = useMemo(() => {
    if (!tagSearchTerm) return [];
    return allTags.filter(tag => 
      tag.toLowerCase().startsWith(tagSearchTerm.toLowerCase())
    );
  }, [allTags, tagSearchTerm]);
  
  // Filter allergens based on search
  const filteredAllergens = useMemo(() => {
    if (!allergenSearchTerm) return [];
    return allAllergens.filter(allergen => 
      allergen.toLowerCase().startsWith(allergenSearchTerm.toLowerCase())
    );
  }, [allAllergens, allergenSearchTerm]);

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

      // Allergen filter (exclude recipes with selected allergens - using hierarchy)
      if (selectedAllergens.length > 0) {
        if (allergenManager.checkRecipeAllergens(recipe.allergens || [], selectedAllergens)) {
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
    setTagSearchTerm(''); // Clear search after selection
    setShowTagDropdown(false);
  };

  const handleAllergenToggle = (allergen) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
    setAllergenSearchTerm(''); // Clear search after selection
    setShowAllergenDropdown(false);
  };
  
  const handleTagSearch = (value) => {
    setTagSearchTerm(value);
    setShowTagDropdown(value.length > 0);
  };
  
  const handleAllergenSearch = (value) => {
    setAllergenSearchTerm(value);
    setShowAllergenDropdown(value.length > 0);
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
            <div className="autocomplete-container">
              <input
                type="text"
                placeholder="Type to search tags..."
                value={tagSearchTerm}
                onChange={(e) => handleTagSearch(e.target.value)}
                onFocus={() => tagSearchTerm && setShowTagDropdown(true)}
                className="autocomplete-input"
              />
              {showTagDropdown && filteredTags.length > 0 && (
                <div className="autocomplete-dropdown">
                  {filteredTags.map(tag => (
                    <div
                      key={tag}
                      className="autocomplete-item"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              )}
              <button 
                className="show-all-btn"
                onClick={() => setShowAllTags(!showAllTags)}
              >
                {showAllTags ? 'Hide' : 'Show All Tags'}
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label>Exclude Allergens:</label>
            <div className="autocomplete-container">
              <input
                type="text"
                placeholder="Type to exclude allergens..."
                value={allergenSearchTerm}
                onChange={(e) => handleAllergenSearch(e.target.value)}
                onFocus={() => allergenSearchTerm && setShowAllergenDropdown(true)}
                className="autocomplete-input"
              />
              {showAllergenDropdown && filteredAllergens.length > 0 && (
                <div className="autocomplete-dropdown">
                  {filteredAllergens.map(allergen => (
                    <div
                      key={allergen}
                      className="autocomplete-item"
                      onClick={() => handleAllergenToggle(allergen)}
                    >
                      🚫 {allergen}
                    </div>
                  ))}
                </div>
              )}
              <button 
                className="show-all-btn"
                onClick={() => setShowAllAllergens(!showAllAllergens)}
              >
                {showAllAllergens ? 'Hide' : 'Show All Allergens'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Selected filters display */}
        <div className="selected-filters">
          {selectedTags.length > 0 && (
            <div className="selected-tags">
              <span className="filter-label">Tags:</span>
              {selectedTags.map(tag => (
                <span key={tag} className="selected-filter tag-selected">
                  {tag}
                  <button onClick={() => handleTagToggle(tag)}>✕</button>
                </span>
              ))}
            </div>
          )}
          {selectedAllergens.length > 0 && (
            <div className="selected-allergens">
              <span className="filter-label">Excluding:</span>
              {selectedAllergens.map(allergen => (
                <span key={allergen} className="selected-filter allergen-selected">
                  🚫 {allergen}
                  <button onClick={() => handleAllergenToggle(allergen)}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Show all tags section */}
        {showAllTags && (
          <div className="all-tags-section">
            <div className="all-tags-grid">
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
        )}
        
        {/* Show all allergens section */}
        {showAllAllergens && (
          <div className="all-allergens-section">
            <div className="allergen-section-title">Select allergens to exclude:</div>
            <div className="allergens-hierarchy">
              {/* Group allergens by category */}
              {expandedAllergens.filter(a => !a.parent).map(parentAllergen => (
                <div key={parentAllergen.id} className="allergen-category">
                  <div className="allergen-parent">
                    <button
                      className={`allergen-filter parent-allergen ${selectedAllergens.includes(parentAllergen.id) ? 'active' : ''}`}
                      onClick={() => handleAllergenToggle(parentAllergen.id)}
                    >
                      🚫 {parentAllergen.name}
                    </button>
                    {parentAllergen.children && parentAllergen.children.length > 0 && (
                      <button
                        className="expand-allergens"
                        onClick={() => {
                          setAllAllergensExpanded(prev =>
                            prev.includes(parentAllergen.id)
                              ? prev.filter(id => id !== parentAllergen.id)
                              : [...prev, parentAllergen.id]
                          );
                        }}
                      >
                        {allAllergensExpanded.includes(parentAllergen.id) ? '−' : '+'}
                      </button>
                    )}
                  </div>
                  {parentAllergen.children && allAllergensExpanded.includes(parentAllergen.id) && (
                    <div className="allergen-children">
                      {parentAllergen.children.map(childId => {
                        const childAllergen = expandedAllergens.find(a => a.id === childId);
                        return childAllergen ? (
                          <button
                            key={childId}
                            className={`allergen-filter child-allergen ${selectedAllergens.includes(childId) ? 'active' : ''}`}
                            onClick={() => handleAllergenToggle(childId)}
                          >
                            🚫 {childAllergen.name}
                          </button>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Show standalone allergens (no parent) */}
              <div className="allergen-standalone">
                {expandedAllergens
                  .filter(a => !a.parent && (!a.children || a.children.length === 0))
                  .map(allergen => (
                    <button
                      key={allergen.id}
                      className={`allergen-filter ${selectedAllergens.includes(allergen.id) ? 'active' : ''}`}
                      onClick={() => handleAllergenToggle(allergen.id)}
                    >
                      🚫 {allergen.name}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

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
  // Check if this recipe has special versions
  const hasVersions = recipe.versions && recipe.versions.length > 0;
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="recipe-card" 
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="recipe-image">
        <img 
          src={getRecipeImage(recipe, ThumbnailSize.LIST)} 
          alt={recipe.name}
          loading="lazy"
        />
        
        {/* Versions indicator - always visible if has versions */}
        {hasVersions && (
          <div className="recipe-versions-indicator">
            <span>🔀</span>
            <span className="recipe-versions-count">{recipe.versions.length}</span>
          </div>
        )}
        
        {/* Hover overlay with recipe info */}
        {isHovered && (
          <div className="recipe-hover-overlay">
            <div className="recipe-hover-content">
              {/* Version info */}
              {(recipe.special_version || hasVersions) && (
                <div className="hover-section">
                  {recipe.special_version && (
                    <span className="version-indicator">{recipe.special_version}</span>
                  )}
                  {hasVersions && (
                    <div className="available-versions">
                      <span className="versions-label">Versions:</span>
                      {recipe.versions.slice(0, 2).map((version) => (
                        <span key={version.id} className="version-badge">
                          {version.special_version}
                        </span>
                      ))}
                      {recipe.versions.length > 2 && (
                        <span className="version-badge">+{recipe.versions.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Serves and Times */}
              <div className="hover-section">
                <span className="recipe-serves">
                  🍽️ Serves {recipe.serves || '?'}
                </span>
                {(recipe.total_time || recipe.prep_time || recipe.cook_time) && (
                  <span className="recipe-time">
                    ⏱️ {formatTimeShort(recipe.total_time || 
                      (recipe.prep_time && recipe.cook_time ? recipe.prep_time + recipe.cook_time : 
                       recipe.prep_time || recipe.cook_time))}
                  </span>
                )}
              </div>
              
              {/* Tags */}
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="hover-section">
                  <div className="recipe-tags">
                    {recipe.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="recipe-tag">{tag}</span>
                    ))}
                    {recipe.tags.length > 3 && (
                      <span className="recipe-tag">+{recipe.tags.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Allergens */}
              {recipe.allergens && recipe.allergens.length > 0 && (
                <div className="hover-section">
                  <div className="recipe-allergens">
                    {recipe.allergens.map(allergen => (
                      <span key={allergen} className="recipe-allergen">
                        ⚠️ {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Always show recipe name below image */}
      <div className="recipe-name-section">
        <h3 className="recipe-name">{recipe.name || 'Unnamed Recipe'}</h3>
      </div>
    </div>
  );
}