import React, { useState } from 'react';
import './DietForm.css';

const COMMON_DIETS = [
  'Vegan', 'Vegetarian', 'Pescatarian', 'Gluten-Free', 
  'Keto', 'Paleo', 'Mediterranean', 'Low-Carb',
  'Halal', 'Kosher', 'Hindu Vegetarian', 'Jain',
  'Carnivore', 'No Seed Oils', 'Low-FODMAP', 'Whole30'
];

export default function DietForm({ diet, onSubmit, onCancel, eventMenus }) {
  const [formData, setFormData] = useState({
    guest_name: diet?.guest_name || '',
    diet_types: diet?.diet_types || (diet?.diet_type ? [diet.diet_type] : []), // Support multiple diets
    custom_diet_names: diet?.custom_diet_names || [],
    restrictions: diet?.restrictions || [],
    notes: diet?.notes || '',
    sub_menu_id: diet?.sub_menu_id || ''
  });

  const [customRestriction, setCustomRestriction] = useState('');
  const [customDietInput, setCustomDietInput] = useState('');
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleAddCustomRestriction = () => {
    if (customRestriction.trim() && !formData.restrictions.includes(customRestriction.trim())) {
      setFormData(prev => ({
        ...prev,
        restrictions: [...prev.restrictions, customRestriction.trim()]
      }));
      setCustomRestriction('');
    }
  };

  const handleRemoveRestriction = (restriction) => {
    setFormData(prev => ({
      ...prev,
      restrictions: prev.restrictions.filter(r => r !== restriction)
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.guest_name.trim()) {
      newErrors.guest_name = 'Guest name is required';
    }
    
    // Check if at least one diet is selected (either common or custom)
    if (formData.diet_types.length === 0 && formData.custom_diet_names.length === 0) {
      newErrors.diet_types = 'Please select at least one diet type or enter a custom diet';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Combine all diet types and custom diets
    const allDiets = [...formData.diet_types, ...formData.custom_diet_names];
    
    // Format the data for submission
    const submissionData = {
      guest_name: formData.guest_name.trim(),
      diet_types: formData.diet_types.length > 0 ? formData.diet_types : [],
      custom_diet_names: formData.custom_diet_names.length > 0 ? formData.custom_diet_names : [],
      diet_name: allDiets.join(', '), // Combined diet name for display
      restrictions: formData.restrictions.length > 0 ? formData.restrictions : [],
      notes: formData.notes.trim() || '',
      sub_menu_id: formData.sub_menu_id || ''
    };
    
    console.log('Submitting diet data:', submissionData);
    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="diet-form">
      {/* Guest Information */}
      <div className="form-section">
        <h3>Guest Information</h3>
        
        <div className="form-group">
          <label htmlFor="guest_name">Guest Name *</label>
          <input
            id="guest_name"
            type="text"
            value={formData.guest_name}
            onChange={(e) => handleInputChange('guest_name', e.target.value)}
            placeholder="Enter guest name"
            className={errors.guest_name ? 'error' : ''}
          />
          {errors.guest_name && (
            <span className="field-error">{errors.guest_name}</span>
          )}
        </div>
      </div>

      {/* Diet Types - Multiple Selection */}
      <div className="form-section">
        <h3>Diet Types * <small>(Select all that apply)</small></h3>
        {errors.diet_types && (
          <span className="field-error">{errors.diet_types}</span>
        )}
        
        <div className="diet-options">
          {COMMON_DIETS.map(diet => (
            <label key={diet} className="diet-option checkbox">
              <input
                type="checkbox"
                value={diet}
                checked={formData.diet_types.includes(diet)}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleInputChange('diet_types', [...formData.diet_types, diet]);
                  } else {
                    handleInputChange('diet_types', formData.diet_types.filter(d => d !== diet));
                  }
                }}
              />
              <span className="diet-label">{diet}</span>
            </label>
          ))}
        </div>
        
        {/* Custom Diets */}
        <div className="custom-diet-section">
          <h4>Custom Diets</h4>
          <div className="custom-diet-input">
            <input
              type="text"
              value={customDietInput}
              onChange={(e) => setCustomDietInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (customDietInput.trim() && !formData.custom_diet_names.includes(customDietInput.trim())) {
                    handleInputChange('custom_diet_names', [...formData.custom_diet_names, customDietInput.trim()]);
                    setCustomDietInput('');
                  }
                }
              }}
              placeholder="Enter custom diet name (e.g., 'Anti-inflammatory')"
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (customDietInput.trim() && !formData.custom_diet_names.includes(customDietInput.trim())) {
                  handleInputChange('custom_diet_names', [...formData.custom_diet_names, customDietInput.trim()]);
                  setCustomDietInput('');
                }
              }}
              disabled={!customDietInput.trim()}
            >
              Add Custom Diet
            </button>
          </div>
          
          {formData.custom_diet_names.length > 0 && (
            <div className="custom-diet-tags">
              {formData.custom_diet_names.map(dietName => (
                <span key={dietName} className="diet-tag custom">
                  {dietName}
                  <button
                    type="button"
                    className="remove-diet"
                    onClick={() => handleInputChange('custom_diet_names', formData.custom_diet_names.filter(d => d !== dietName))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Additional Restrictions */}
      <div className="form-section">
        <h3>Additional Restrictions</h3>
        
        <div className="custom-restriction">
          <input
            type="text"
            value={customRestriction}
            onChange={(e) => setCustomRestriction(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomRestriction();
              }
            }}
            placeholder="Add specific restrictions (e.g., 'no nightshades')"
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAddCustomRestriction}
            disabled={!customRestriction.trim()}
          >
            Add
          </button>
        </div>

        {formData.restrictions.length > 0 && (
          <div className="restrictions-list">
            <h4>Current Restrictions:</h4>
            <div className="restriction-tags">
              {formData.restrictions.map(restriction => (
                <span key={restriction} className="restriction-tag">
                  {restriction}
                  <button
                    type="button"
                    className="remove-restriction"
                    onClick={() => handleRemoveRestriction(restriction)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Additional Information */}
      <div className="form-section">
        <h3>Additional Information</h3>
        
        {eventMenus && eventMenus.length > 0 && (
          <div className="form-group">
            <label htmlFor="sub_menu_id">Special Menu Assignment</label>
            <select
              id="sub_menu_id"
              value={formData.sub_menu_id}
              onChange={(e) => handleInputChange('sub_menu_id', e.target.value)}
            >
              <option value="">Use main event menu</option>
              {eventMenus.map(menu => (
                <option key={menu.id} value={menu.id}>
                  {menu.name}
                  {menu.is_sub_menu && ' (Special Menu)'}
                </option>
              ))}
            </select>
            <p className="field-hint">
              Assign this guest to a special menu designed for their diet
            </p>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Any additional information about the diet..."
            rows="3"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button 
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="btn btn-primary"
        >
          {diet ? 'Update Diet' : 'Add Diet'}
        </button>
      </div>
    </form>
  );
}