import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import './IngredientEditor.css';

const CATEGORIES = [
  'produce', 'protein', 'dairy', 'grains', 'spices', 
  'condiments', 'baking', 'beverages', 'other'
];

const UNITS = [
  'each', 'dozen', 'pound', 'ounce', 'gram', 'kilogram',
  'liter', 'milliliter', 'cup', 'tablespoon', 'teaspoon',
  'bunch', 'box', 'can', 'jar', 'package', 'bottle'
];

export default function IngredientEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const isNew = !id;
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'other',
    unit: 'each',
    cost_per_unit: '',
    preferred_supplier: '',
    supplier_contact: '',
    supplier_email: '',
    supplier_phone: '',
    min_order_quantity: '',
    lead_time_days: '',
    in_stock: true,
    stock_quantity: '',
    reorder_point: '',
    storage_location: '',
    notes: '',
    allergens: []
  });
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (!isNew) {
      loadIngredient();
    }
  }, [id, isNew]);

  const loadIngredient = async () => {
    try {
      setLoading(true);
      const ingredientDoc = await getDoc(doc(db, 'ingredients', id));
      
      if (!ingredientDoc.exists()) {
        setError('Ingredient not found');
        return;
      }

      const data = ingredientDoc.data();
      setFormData({
        name: data.name || '',
        category: data.category || 'other',
        unit: data.unit || 'each',
        cost_per_unit: data.cost_per_unit || '',
        preferred_supplier: data.preferred_supplier || '',
        supplier_contact: data.supplier_contact || '',
        supplier_email: data.supplier_email || '',
        supplier_phone: data.supplier_phone || '',
        min_order_quantity: data.min_order_quantity || '',
        lead_time_days: data.lead_time_days || '',
        in_stock: data.in_stock !== false,
        stock_quantity: data.stock_quantity || '',
        reorder_point: data.reorder_point || '',
        storage_location: data.storage_location || '',
        notes: data.notes || '',
        allergens: data.allergens || []
      });
    } catch (err) {
      console.error('Error loading ingredient:', err);
      setError('Failed to load ingredient');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Ingredient name is required';
    }
    
    if (formData.cost_per_unit && isNaN(parseFloat(formData.cost_per_unit))) {
      errors.cost_per_unit = 'Cost must be a valid number';
    }
    
    if (formData.supplier_email && !isValidEmail(formData.supplier_email)) {
      errors.supplier_email = 'Invalid email address';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Prepare ingredient data
      const ingredientData = {
        ...formData,
        cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : null,
        min_order_quantity: formData.min_order_quantity ? parseInt(formData.min_order_quantity) : null,
        lead_time_days: formData.lead_time_days ? parseInt(formData.lead_time_days) : null,
        stock_quantity: formData.stock_quantity ? parseFloat(formData.stock_quantity) : null,
        reorder_point: formData.reorder_point ? parseFloat(formData.reorder_point) : null,
        updated_at: serverTimestamp()
      };
      
      if (isNew) {
        // Add creation metadata
        ingredientData.created_at = serverTimestamp();
        ingredientData.created_by = currentUser.email;
        
        // Generate ID
        const newId = doc(db, 'ingredients').id;
        await setDoc(doc(db, 'ingredients', newId), ingredientData);
        
        navigate(`/ingredients/${newId}`);
      } else {
        // Update existing ingredient
        await updateDoc(doc(db, 'ingredients', id), ingredientData);
        navigate(`/ingredients/${id}`);
      }
    } catch (err) {
      console.error('Error saving ingredient:', err);
      setError('Failed to save ingredient. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate(id ? `/ingredients/${id}` : '/ingredients');
    }
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
        <p>Loading ingredient...</p>
      </div>
    );
  }

  if (error && !isNew) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/ingredients')}
        >
          Back to Ingredients
        </button>
      </div>
    );
  }

  return (
    <div className="ingredient-editor">
      <form onSubmit={handleSubmit}>
        <div className="editor-header">
          <h1>{isNew ? 'Add New Ingredient' : 'Edit Ingredient'}</h1>
          <div className="editor-actions">
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Ingredient'}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="editor-content">
          {/* Basic Information */}
          <section className="editor-section">
            <h2>Basic Information</h2>
            
            <div className="form-group">
              <label htmlFor="name">Ingredient Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter ingredient name"
                className={validationErrors.name ? 'error' : ''}
              />
              {validationErrors.name && (
                <span className="field-error">{validationErrors.name}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <div className="select-with-icon">
                  <span className="select-icon">{getCategoryIcon(formData.category)}</span>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="unit">Unit of Measure</label>
                <select
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => handleInputChange('unit', e.target.value)}
                >
                  {UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="cost_per_unit">Cost per Unit ($)</label>
                <input
                  id="cost_per_unit"
                  type="number"
                  value={formData.cost_per_unit}
                  onChange={(e) => handleInputChange('cost_per_unit', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className={validationErrors.cost_per_unit ? 'error' : ''}
                />
                {validationErrors.cost_per_unit && (
                  <span className="field-error">{validationErrors.cost_per_unit}</span>
                )}
              </div>
            </div>
          </section>

          {/* Supplier Information */}
          <section className="editor-section">
            <h2>Supplier Information</h2>
            
            <div className="form-group">
              <label htmlFor="preferred_supplier">Preferred Supplier</label>
              <input
                id="preferred_supplier"
                type="text"
                value={formData.preferred_supplier}
                onChange={(e) => handleInputChange('preferred_supplier', e.target.value)}
                placeholder="Supplier name"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="supplier_contact">Contact Name</label>
                <input
                  id="supplier_contact"
                  type="text"
                  value={formData.supplier_contact}
                  onChange={(e) => handleInputChange('supplier_contact', e.target.value)}
                  placeholder="Contact person"
                />
              </div>

              <div className="form-group">
                <label htmlFor="supplier_email">Email</label>
                <input
                  id="supplier_email"
                  type="email"
                  value={formData.supplier_email}
                  onChange={(e) => handleInputChange('supplier_email', e.target.value)}
                  placeholder="supplier@example.com"
                  className={validationErrors.supplier_email ? 'error' : ''}
                />
                {validationErrors.supplier_email && (
                  <span className="field-error">{validationErrors.supplier_email}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="supplier_phone">Phone</label>
                <input
                  id="supplier_phone"
                  type="tel"
                  value={formData.supplier_phone}
                  onChange={(e) => handleInputChange('supplier_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="min_order_quantity">Min Order Quantity</label>
                <input
                  id="min_order_quantity"
                  type="number"
                  value={formData.min_order_quantity}
                  onChange={(e) => handleInputChange('min_order_quantity', e.target.value)}
                  min="0"
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="lead_time_days">Lead Time (days)</label>
                <input
                  id="lead_time_days"
                  type="number"
                  value={formData.lead_time_days}
                  onChange={(e) => handleInputChange('lead_time_days', e.target.value)}
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>
          </section>

          {/* Inventory Information */}
          <section className="editor-section">
            <h2>Inventory Information</h2>
            
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.in_stock}
                  onChange={(e) => handleInputChange('in_stock', e.target.checked)}
                />
                <span>Currently in stock</span>
              </label>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="stock_quantity">Current Stock</label>
                <input
                  id="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reorder_point">Reorder Point</label>
                <input
                  id="reorder_point"
                  type="number"
                  value={formData.reorder_point}
                  onChange={(e) => handleInputChange('reorder_point', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="storage_location">Storage Location</label>
                <input
                  id="storage_location"
                  type="text"
                  value={formData.storage_location}
                  onChange={(e) => handleInputChange('storage_location', e.target.value)}
                  placeholder="e.g., Walk-in cooler, Pantry shelf A3"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes about this ingredient..."
                rows="3"
              />
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}