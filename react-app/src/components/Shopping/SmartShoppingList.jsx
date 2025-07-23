import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { analyzeShoppingNeeds, optimizeShoppingRoute, generateShoppingSummary, exportShoppingList } from '../../services/shoppingIntelligence';
import { getRecipesByIds } from '../../services/recipes';
import './SmartShoppingList.css';

const SHOPPING_MODES = {
  minimize_stores: {
    id: 'minimize_stores',
    name: 'Minimize Stores',
    description: 'Shop at 1-2 stores maximum',
    icon: '🏪'
  },
  budget_conscious: {
    id: 'budget_conscious',
    name: 'Budget Conscious', 
    description: 'Optimize for bulk buying',
    icon: '💰'
  },
  quality_first: {
    id: 'quality_first',
    name: 'Quality First',
    description: 'Premium ingredients',
    icon: '⭐'
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    description: 'Mix of quality and value',
    icon: '⚖️'
  }
};

export default function SmartShoppingList({ eventId }) {
  const [event, setEvent] = useState(null);
  const [menus, setMenus] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [shoppingMode, setShoppingMode] = useState('balanced');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [shoppingList, setShoppingList] = useState(null);
  const [error, setError] = useState(null);
  const [selectedStores, setSelectedStores] = useState(['all']);
  const [showExportOptions, setShowExportOptions] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    setLoading(true);
    try {
      // Load event
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }
      const eventData = { id: eventDoc.id, ...eventDoc.data() };
      setEvent(eventData);

      // Load menus for this event
      const menusQuery = query(collection(db, 'menus'), where('event_id', '==', eventId));
      const menusSnapshot = await getDocs(menusQuery);
      const menusData = menusSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenus(menusData);

      // Extract all recipe IDs from menus
      const recipeIds = new Set();
      menusData.forEach(menu => {
        if (menu.days) {
          menu.days.forEach(day => {
            day.meals?.forEach(meal => {
              meal.courses?.forEach(course => {
                if (course.recipe_id) {
                  recipeIds.add(course.recipe_id);
                }
              });
            });
          });
        }
        // Also check old menu structure
        if (menu.meals) {
          menu.meals.forEach(meal => {
            meal.recipes?.forEach(recipe => {
              if (recipe.recipe_id) {
                recipeIds.add(recipe.recipe_id);
              }
            });
          });
        }
      });

      // Load recipes
      if (recipeIds.size > 0) {
        const recipesData = await getRecipesByIds(Array.from(recipeIds));
        setRecipes(recipesData);
      }

    } catch (err) {
      console.error('Error loading event data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateShoppingList = async () => {
    setGenerating(true);
    setError(null);

    try {
      // Collect all ingredients from all recipes
      const allIngredients = [];
      const recipeServingsMap = {};

      menus.forEach(menu => {
        if (menu.days) {
          menu.days.forEach(day => {
            day.meals?.forEach(meal => {
              meal.courses?.forEach(course => {
                const recipe = recipes.find(r => r.id === course.recipe_id);
                if (recipe) {
                  // Use the pre-calculated servings from the course
                  // which already accounts for staff and allergy exclusions
                  const scaleFactor = (course.servings || event.guest_count) / (recipe.serves || 1);
                  recipe.ingredients?.forEach(ing => {
                    allIngredients.push({
                      original: ing,
                      recipe: recipe.name,
                      scaleFactor,
                      courseName: course.name,
                      servings: course.servings,
                      scalingInfo: course.scalingInfo
                    });
                  });
                }
              });
            });
          });
        }
      });

      if (allIngredients.length === 0) {
        throw new Error('No ingredients found in menus');
      }

      // Analyze shopping needs with AI
      const ingredientStrings = allIngredients.map(i => {
        // Simple scaling of quantities in the string
        // This is a basic approach - the AI will handle more complex parsing
        return i.original;
      });

      const analyzedIngredients = await analyzeShoppingNeeds(
        ingredientStrings, 
        event.guest_count,
        shoppingMode
      );

      // Optimize shopping route
      const optimizedList = optimizeShoppingRoute(analyzedIngredients, shoppingMode);

      // Generate summary
      const summary = generateShoppingSummary(optimizedList, event);
      
      setShoppingList(summary);

    } catch (err) {
      console.error('Error generating shopping list:', err);
      setError('Failed to generate shopping list: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = (format) => {
    if (!shoppingList) return;

    const exported = exportShoppingList(shoppingList, format);
    
    if (format === 'text') {
      // Create download
      const blob = new Blob([exported], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shopping-list-${event.name.replace(/\s+/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const blob = new Blob([exported], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shopping-list-${event.name.replace(/\s+/g, '-')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    setShowExportOptions(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="shopping-list-container">
        <div className="loading">Loading event data...</div>
      </div>
    );
  }

  if (error && !shoppingList) {
    return (
      <div className="shopping-list-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="smart-shopping-list">
      <div className="shopping-header">
        <h2>Smart Shopping List Generator</h2>
        {event && (
          <p className="event-info">
            {event.name} • {event.guest_count} guests • {new Date(event.start_date).toLocaleDateString()}
          </p>
        )}
      </div>

      {!shoppingList ? (
        <div className="shopping-setup">
          <h3>Shopping Preferences</h3>
          <p>Choose how you'd like to optimize your shopping trip</p>

          <div className="shopping-modes">
            {Object.entries(SHOPPING_MODES).map(([key, mode]) => (
              <div
                key={key}
                className={`mode-card ${shoppingMode === key ? 'selected' : ''}`}
                onClick={() => setShoppingMode(key)}
              >
                <div className="mode-icon">{mode.icon}</div>
                <div className="mode-content">
                  <h4>{mode.name}</h4>
                  <p>{mode.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="menu-summary">
            <h4>Menus to Shop For:</h4>
            {menus.length > 0 ? (
              <ul>
                {menus.map(menu => (
                  <li key={menu.id}>
                    {menu.name} ({menu.days?.length || 0} days)
                  </li>
                ))}
              </ul>
            ) : (
              <p>No menus found for this event</p>
            )}
          </div>

          <button 
            className="btn btn-primary generate-btn"
            onClick={generateShoppingList}
            disabled={generating || menus.length === 0}
          >
            {generating ? 'Analyzing ingredients...' : 'Generate Smart Shopping List'}
          </button>

          {error && (
            <div className="error-message">{error}</div>
          )}
        </div>
      ) : (
        <div className="shopping-results">
          <div className="results-header">
            <h3>Your Optimized Shopping List</h3>
            <div className="results-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShoppingList(null)}
              >
                ← Back to Settings
              </button>
              <div className="export-actions">
                <button 
                  className="btn btn-outline"
                  onClick={() => setShowExportOptions(!showExportOptions)}
                >
                  Export ▼
                </button>
                {showExportOptions && (
                  <div className="export-dropdown">
                    <button onClick={() => handleExport('text')}>Download as Text</button>
                    <button onClick={() => handleExport('csv')}>Download as CSV</button>
                    <button onClick={handlePrint}>Print</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="store-filters">
            <span>Show:</span>
            <label>
              <input 
                type="radio" 
                value="all" 
                checked={selectedStores.includes('all')}
                onChange={() => setSelectedStores(['all'])}
              />
              All Stores
            </label>
            {shoppingList.stores.map(store => (
              <label key={store.type}>
                <input 
                  type="checkbox" 
                  value={store.type}
                  checked={selectedStores.includes(store.type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStores([...selectedStores.filter(s => s !== 'all'), store.type]);
                    } else {
                      setSelectedStores(selectedStores.filter(s => s !== store.type));
                    }
                  }}
                />
                {store.name}
              </label>
            ))}
          </div>

          <div className="shopping-stores">
            {shoppingList.stores
              .filter(store => selectedStores.includes('all') || selectedStores.includes(store.type))
              .map(store => (
                <div key={store.type} className="store-section">
                  <h4 className="store-name">{store.name}</h4>
                  <div className="store-stats">
                    {store.items.length} items • {Object.keys(store.categories).length} categories
                  </div>

                  {Object.entries(store.categories).map(([category, items]) => (
                    <div key={category} className="category-section">
                      <h5 className="category-name">{category.charAt(0).toUpperCase() + category.slice(1)}</h5>
                      <div className="shopping-items">
                        {items.map((item, idx) => (
                          <div key={idx} className="shopping-item">
                            <input type="checkbox" id={`${store.type}-${category}-${idx}`} />
                            <label htmlFor={`${store.type}-${category}-${idx}`}>
                              <span className="item-name">{item.display}</span>
                              {item.storage && (
                                <span className="item-note">💡 {item.storage}</span>
                              )}
                              {item.substitutions && item.substitutions.length > 0 && (
                                <span className="item-subs">
                                  Alt: {item.substitutions.join(', ')}
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>

          {shoppingList.notes && shoppingList.notes.length > 0 && (
            <div className="shopping-tips">
              <h4>Shopping Tips</h4>
              {shoppingList.notes.map((note, idx) => (
                <p key={idx}>{note}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}