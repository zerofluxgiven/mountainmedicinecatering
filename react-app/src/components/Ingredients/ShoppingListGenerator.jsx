import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import './ShoppingListGenerator.css';

export default function ShoppingListGenerator({ eventId, recipes, menus, ingredients, onClose }) {
  const [event, setEvent] = useState(null);
  const [eventMenus, setEventMenus] = useState([]);
  const [shoppingList, setShoppingList] = useState({});
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('category'); // category, supplier, recipe

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      
      // Load event
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        const eventData = { id: eventDoc.id, ...eventDoc.data() };
        setEvent(eventData);
        
        // Find menus associated with this event
        const associatedMenus = menus.filter(menu => menu.event_id === eventId);
        setEventMenus(associatedMenus);
        
        // Generate shopping list
        generateShoppingList(eventData, associatedMenus);
      }
    } catch (err) {
      console.error('Error loading event data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateShoppingList = (eventData, eventMenus) => {
    const list = {};
    
    // Process each menu
    eventMenus.forEach(menu => {
      menu.sections?.forEach(section => {
        section.items?.forEach(item => {
          // Find the recipe
          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (!recipe) return;
          
          // Calculate servings multiplier
          const recipeServings = recipe.serves || 4;
          const neededServings = eventData.guest_count || 50;
          const multiplier = neededServings / recipeServings;
          
          // Process each ingredient in the recipe
          recipe.ingredients?.forEach(ingredientLine => {
            // Parse ingredient (simplified - in production would use AI)
            const parsed = parseIngredientLine(ingredientLine);
            if (!parsed) return;
            
            const key = parsed.name.toLowerCase();
            
            if (!list[key]) {
              list[key] = {
                name: parsed.name,
                quantity: 0,
                unit: parsed.unit,
                recipes: [],
                category: getIngredientCategory(parsed.name),
                supplier: getIngredientSupplier(parsed.name)
              };
            }
            
            list[key].quantity += (parsed.quantity || 1) * multiplier;
            list[key].recipes.push({
              name: recipe.name,
              menuSection: section.name
            });
          });
        });
      });
    });
    
    setShoppingList(list);
  };

  const parseIngredientLine = (line) => {
    // Simplified parsing - in production would use AI
    const match = line.match(/^([\d.\/\s]+)?\s*([a-zA-Z]+)?\s+(.+)/);
    if (!match) return { name: line, quantity: 1, unit: 'each' };
    
    return {
      quantity: parseFloat(match[1]) || 1,
      unit: match[2] || 'each',
      name: match[3] || line
    };
  };

  const getIngredientCategory = (name) => {
    // Find in ingredients database
    const ingredient = ingredients.find(i => 
      i.name.toLowerCase() === name.toLowerCase()
    );
    return ingredient?.category || 'other';
  };

  const getIngredientSupplier = (name) => {
    // Find in ingredients database
    const ingredient = ingredients.find(i => 
      i.name.toLowerCase() === name.toLowerCase()
    );
    return ingredient?.preferred_supplier || 'Unknown';
  };

  const groupedList = () => {
    const grouped = {};
    
    Object.entries(shoppingList).forEach(([key, item]) => {
      const groupKey = groupBy === 'category' ? item.category : 
                      groupBy === 'supplier' ? item.supplier : 
                      item.recipes[0]?.name || 'Unknown';
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      
      grouped[groupKey].push({ key, ...item });
    });
    
    return grouped;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const data = Object.entries(groupedList()).map(([group, items]) => {
      return `\n${group.toUpperCase()}\n` + 
        items.map(item => 
          `- ${item.quantity.toFixed(2)} ${item.unit} ${item.name}`
        ).join('\n');
    }).join('\n');
    
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-list-${event?.name || 'event'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="shopping-list-overlay" onClick={onClose}>
        <div className="shopping-list-modal" onClick={e => e.stopPropagation()}>
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Generating shopping list...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shopping-list-overlay" onClick={onClose}>
      <div className="shopping-list-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Shopping List</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="event-info">
          <h3>{event?.name}</h3>
          <p>
            {event?.guest_count || '?'} guests • 
            {eventMenus.length} menu{eventMenus.length !== 1 ? 's' : ''} • 
            {Object.keys(shoppingList).length} ingredients
          </p>
        </div>

        <div className="list-controls">
          <div className="group-by">
            <label>Group by:</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              <option value="category">Category</option>
              <option value="supplier">Supplier</option>
              <option value="recipe">Recipe</option>
            </select>
          </div>
          
          <div className="actions">
            <button className="btn btn-secondary" onClick={handlePrint}>
              🖨️ Print
            </button>
            <button className="btn btn-secondary" onClick={handleExport}>
              📥 Export
            </button>
          </div>
        </div>

        <div className="shopping-list-content printable">
          {Object.entries(groupedList()).length === 0 ? (
            <p className="empty-message">No ingredients found. Make sure menus have recipes assigned.</p>
          ) : (
            Object.entries(groupedList()).map(([group, items]) => (
              <div key={group} className="ingredient-group">
                <h4 className="group-title">{group}</h4>
                <table className="ingredient-table">
                  <thead>
                    <tr>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Ingredient</th>
                      <th className="no-print">Used In</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.key}>
                        <td className="quantity">{item.quantity.toFixed(2)}</td>
                        <td className="unit">{item.unit}</td>
                        <td className="name">{item.name}</td>
                        <td className="recipes no-print">
                          {item.recipes.slice(0, 2).map((r, i) => (
                            <span key={i} className="recipe-tag">
                              {r.name}
                            </span>
                          ))}
                          {item.recipes.length > 2 && (
                            <span className="recipe-tag more">
                              +{item.recipes.length - 2}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}