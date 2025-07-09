import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import './IngredientViewer.css';

export default function IngredientViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [ingredient, setIngredient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadIngredient();
  }, [id]);

  const loadIngredient = async () => {
    try {
      setLoading(true);
      const ingredientDoc = await getDoc(doc(db, 'ingredients', id));
      
      if (!ingredientDoc.exists()) {
        setError('Ingredient not found');
        return;
      }

      setIngredient({ id: ingredientDoc.id, ...ingredientDoc.data() });
    } catch (err) {
      console.error('Error loading ingredient:', err);
      setError('Failed to load ingredient');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/ingredients/${id}/edit`);
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'ingredients', id));
      navigate('/ingredients');
    } catch (err) {
      console.error('Error deleting ingredient:', err);
      alert('Failed to delete ingredient');
    }
  };

  const handleDuplicate = () => {
    navigate('/ingredients/new', { 
      state: { 
        duplicateFrom: {
          ...ingredient,
          name: `${ingredient.name} (Copy)`,
          id: undefined,
          created_at: undefined,
          created_by: undefined
        }
      }
    });
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

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    const d = date.toDate?.() || new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading ingredient...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/ingredients" className="btn btn-secondary">
          Back to Ingredients
        </Link>
      </div>
    );
  }

  if (!ingredient) return null;

  return (
    <div className="ingredient-viewer">
      {/* Header */}
      <div className="ingredient-header">
        <div className="ingredient-header-content">
          <Link to="/ingredients" className="back-link">
            ← Back to Ingredients
          </Link>
          
          <div className="ingredient-title">
            <span className="category-icon">{getCategoryIcon(ingredient.category)}</span>
            <h1>{ingredient.name || 'Unnamed Ingredient'}</h1>
          </div>
          
          <div className="ingredient-actions">
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
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Delete Ingredient?</h3>
            <p>Are you sure you want to delete "{ingredient.name}"? This action cannot be undone.</p>
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
                Delete Ingredient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="ingredient-content">
        <div className="content-grid">
          {/* Basic Information */}
          <div className="info-card">
            <h2>Basic Information</h2>
            
            <div className="info-row">
              <span className="info-label">Category:</span>
              <span className="info-value">
                {ingredient.category ? 
                  ingredient.category.charAt(0).toUpperCase() + ingredient.category.slice(1) 
                  : 'Other'}
              </span>
            </div>
            
            <div className="info-row">
              <span className="info-label">Unit:</span>
              <span className="info-value">{ingredient.unit || '-'}</span>
            </div>
            
            <div className="info-row">
              <span className="info-label">Cost per Unit:</span>
              <span className="info-value">{formatCurrency(ingredient.cost_per_unit)}</span>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="info-card">
            <h2>Supplier Information</h2>
            
            <div className="info-row">
              <span className="info-label">Preferred Supplier:</span>
              <span className="info-value">{ingredient.preferred_supplier || '-'}</span>
            </div>
            
            {ingredient.supplier_contact && (
              <div className="info-row">
                <span className="info-label">Contact:</span>
                <span className="info-value">{ingredient.supplier_contact}</span>
              </div>
            )}
            
            {ingredient.supplier_email && (
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">
                  <a href={`mailto:${ingredient.supplier_email}`}>{ingredient.supplier_email}</a>
                </span>
              </div>
            )}
            
            {ingredient.supplier_phone && (
              <div className="info-row">
                <span className="info-label">Phone:</span>
                <span className="info-value">
                  <a href={`tel:${ingredient.supplier_phone}`}>{ingredient.supplier_phone}</a>
                </span>
              </div>
            )}
            
            {ingredient.min_order_quantity && (
              <div className="info-row">
                <span className="info-label">Min Order:</span>
                <span className="info-value">{ingredient.min_order_quantity} {ingredient.unit}</span>
              </div>
            )}
            
            {ingredient.lead_time_days && (
              <div className="info-row">
                <span className="info-label">Lead Time:</span>
                <span className="info-value">{ingredient.lead_time_days} days</span>
              </div>
            )}
          </div>

          {/* Inventory Status */}
          <div className="info-card">
            <h2>Inventory Status</h2>
            
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className={`stock-status ${ingredient.in_stock ? 'in-stock' : 'out-of-stock'}`}>
                {ingredient.in_stock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
            
            {ingredient.stock_quantity !== undefined && ingredient.stock_quantity !== null && (
              <div className="info-row">
                <span className="info-label">Current Stock:</span>
                <span className="info-value">{ingredient.stock_quantity} {ingredient.unit}</span>
              </div>
            )}
            
            {ingredient.reorder_point !== undefined && ingredient.reorder_point !== null && (
              <div className="info-row">
                <span className="info-label">Reorder Point:</span>
                <span className="info-value">{ingredient.reorder_point} {ingredient.unit}</span>
              </div>
            )}
            
            {ingredient.storage_location && (
              <div className="info-row">
                <span className="info-label">Storage Location:</span>
                <span className="info-value">{ingredient.storage_location}</span>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="info-card">
            <h2>Metadata</h2>
            
            {ingredient.created_by && (
              <div className="info-row">
                <span className="info-label">Created by:</span>
                <span className="info-value">{ingredient.created_by}</span>
              </div>
            )}
            
            {ingredient.created_at && (
              <div className="info-row">
                <span className="info-label">Created:</span>
                <span className="info-value">{formatDate(ingredient.created_at)}</span>
              </div>
            )}
            
            {ingredient.updated_at && (
              <div className="info-row">
                <span className="info-label">Last Updated:</span>
                <span className="info-value">{formatDate(ingredient.updated_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes Section */}
        {ingredient.notes && (
          <div className="notes-section">
            <h2>Notes</h2>
            <p>{ingredient.notes}</p>
          </div>
        )}

        {/* Recipes Using This Ingredient */}
        <div className="usage-section">
          <h2>Recipes Using This Ingredient</h2>
          <p className="coming-soon">Recipe usage tracking coming soon!</p>
        </div>
      </div>
    </div>
  );
}