import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import ShoppingListGenerator from '../../components/Ingredients/ShoppingListGenerator';
import './IngredientList.css';

export default function IngredientList() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { selectedEventId, recipes, menus } = useApp();
  
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState(new Set());

  useEffect(() => {
    // Subscribe to ingredients
    const q = query(collection(db, 'ingredients'), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ingredientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setIngredients(ingredientsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching ingredients:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const categories = [
    'all', 'produce', 'protein', 'dairy', 'grains', 'spices', 
    'condiments', 'baking', 'beverages', 'other'
  ];

  const filteredIngredients = ingredients.filter(ingredient => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const nameMatch = ingredient.name?.toLowerCase().includes(search);
      const supplierMatch = ingredient.preferred_supplier?.toLowerCase().includes(search);
      if (!nameMatch && !supplierMatch) return false;
    }

    // Category filter
    if (filterCategory !== 'all') {
      if (ingredient.category !== filterCategory) return false;
    }

    return true;
  });

  const handleIngredientClick = (ingredientId) => {
    navigate(`/ingredients/${ingredientId}`);
  };

  const handleCreateNew = () => {
    navigate('/ingredients/new');
  };

  const toggleIngredientSelection = (ingredientId) => {
    setSelectedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(ingredientId)) {
        next.delete(ingredientId);
      } else {
        next.add(ingredientId);
      }
      return next;
    });
  };

  const handleGenerateShoppingList = () => {
    if (!selectedEventId) {
      alert('Please select an event first');
      return;
    }
    setShowShoppingList(true);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'produce': return '🥬';
      case 'protein': return '🥩';
      case 'dairy': return '🥛';
      case 'grains': return '🌾';
      case 'spices': return '🧂';
      case 'condiments': return '🍯';
      case 'baking': return '🧁';
      case 'beverages': return '🥤';
      default: return '📦';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading ingredients...</p>
      </div>
    );
  }

  return (
    <div className="ingredient-list">
      <div className="ingredient-list-header">
        <h1>Ingredient Management</h1>
        <div className="header-actions">
          {selectedEventId && (
            <button 
              className="btn btn-secondary"
              onClick={handleGenerateShoppingList}
            >
              <span className="btn-icon">📋</span>
              Shopping List
            </button>
          )}
          {hasRole('user') && (
            <button 
              className="btn btn-primary"
              onClick={handleCreateNew}
            >
              <span className="btn-icon">➕</span>
              Add Ingredient
            </button>
          )}
          {hasRole('admin') && (
            <button 
              className="btn btn-warning"
              onClick={() => navigate('/admin/ingredient-cleanup')}
            >
              <span className="btn-icon">🧹</span>
              Cleanup Names
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="ingredient-filters">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search ingredients or suppliers..."
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

        <div className="category-filters">
          {categories.map(category => (
            <button
              key={category}
              className={`category-btn ${filterCategory === category ? 'active' : ''}`}
              onClick={() => setFilterCategory(category)}
            >
              {category === 'all' ? 'All' : (
                <>
                  <span className="category-icon">{getCategoryIcon(category)}</span>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        Showing {filteredIngredients.length} of {ingredients.length} ingredients
      </div>

      {/* Ingredients Table */}
      <div className="ingredients-table-container">
        <table className="ingredients-table">
          <thead>
            <tr>
              {hasRole('user') && <th className="checkbox-col"></th>}
              <th>Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Cost</th>
              <th>Supplier</th>
              <th>Stock Status</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredIngredients.map(ingredient => (
              <tr key={ingredient.id}>
                {hasRole('user') && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIngredients.has(ingredient.id)}
                      onChange={() => toggleIngredientSelection(ingredient.id)}
                    />
                  </td>
                )}
                <td className="name-cell">
                  <span className="category-icon">{getCategoryIcon(ingredient.category)}</span>
                  {ingredient.name}
                </td>
                <td>{ingredient.category || 'Other'}</td>
                <td>{ingredient.unit || '-'}</td>
                <td>{ingredient.cost_per_unit ? `$${ingredient.cost_per_unit.toFixed(2)}` : '-'}</td>
                <td>{ingredient.preferred_supplier || '-'}</td>
                <td>
                  <span className={`stock-status ${ingredient.in_stock ? 'in-stock' : 'out-of-stock'}`}>
                    {ingredient.in_stock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
                <td className="actions-cell">
                  <button
                    className="action-btn view"
                    onClick={() => handleIngredientClick(ingredient.id)}
                    title="View details"
                  >
                    👁️
                  </button>
                  {hasRole('user') && (
                    <button
                      className="action-btn edit"
                      onClick={() => navigate(`/ingredients/${ingredient.id}/edit`)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredIngredients.length === 0 && (
          <div className="empty-state">
            <p>No ingredients found.</p>
            {hasRole('user') && (
              <button 
                className="btn btn-primary"
                onClick={handleCreateNew}
              >
                Add First Ingredient
              </button>
            )}
          </div>
        )}
      </div>

      {/* Shopping List Generator Modal */}
      {showShoppingList && (
        <ShoppingListGenerator
          eventId={selectedEventId}
          recipes={recipes}
          menus={menus}
          ingredients={ingredients}
          onClose={() => setShowShoppingList(false)}
        />
      )}
    </div>
  );
}