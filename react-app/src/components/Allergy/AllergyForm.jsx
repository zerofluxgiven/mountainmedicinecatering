import React, { useState } from 'react';
import './AllergyForm.css';

const COMMON_ALLERGENS = [
  'Dairy', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts',
  'Wheat', 'Soy', 'Sesame', 'Gluten', 'Mustard', 'Celery',
  'Lupin', 'Molluscs', 'Sulphites'
];

const SEVERITY_LEVELS = ['Mild', 'Moderate', 'Severe'];

export default function AllergyForm({ allergy, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    guest_name: allergy?.guest_name || '',
    allergens: allergy?.allergens || [],
    severity: allergy?.severity || 'Moderate',
    notes: allergy?.notes || '',
    dietary_restrictions: allergy?.dietary_restrictions || '',
    emergency_contact: allergy?.emergency_contact || '',
    emergency_phone: allergy?.emergency_phone || ''
  });

  const [customAllergen, setCustomAllergen] = useState('');
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

  const handleAllergenToggle = (allergen) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  };

  const handleAddCustomAllergen = () => {
    if (customAllergen.trim() && !formData.allergens.includes(customAllergen.trim())) {
      setFormData(prev => ({
        ...prev,
        allergens: [...prev.allergens, customAllergen.trim()]
      }));
      setCustomAllergen('');
    }
  };

  const handleRemoveAllergen = (allergen) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.filter(a => a !== allergen)
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.guest_name.trim()) {
      newErrors.guest_name = 'Guest name is required';
    }
    
    if (formData.allergens.length === 0) {
      newErrors.allergens = 'At least one allergen must be selected';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="allergy-form">
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

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="emergency_contact">Emergency Contact</label>
            <input
              id="emergency_contact"
              type="text"
              value={formData.emergency_contact}
              onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
              placeholder="Contact name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="emergency_phone">Emergency Phone</label>
            <input
              id="emergency_phone"
              type="tel"
              value={formData.emergency_phone}
              onChange={(e) => handleInputChange('emergency_phone', e.target.value)}
              placeholder="Phone number"
            />
          </div>
        </div>
      </div>

      {/* Allergens */}
      <div className="form-section">
        <h3>Allergens *</h3>
        {errors.allergens && (
          <span className="field-error">{errors.allergens}</span>
        )}
        
        <div className="allergen-grid">
          {COMMON_ALLERGENS.map(allergen => (
            <label key={allergen} className="allergen-checkbox">
              <input
                type="checkbox"
                checked={formData.allergens.includes(allergen)}
                onChange={() => handleAllergenToggle(allergen)}
              />
              <span>{allergen}</span>
            </label>
          ))}
        </div>

        <div className="custom-allergen">
          <input
            type="text"
            value={customAllergen}
            onChange={(e) => setCustomAllergen(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomAllergen();
              }
            }}
            placeholder="Add custom allergen"
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAddCustomAllergen}
            disabled={!customAllergen.trim()}
          >
            Add
          </button>
        </div>

        {/* Selected Allergens */}
        {formData.allergens.length > 0 && (
          <div className="selected-allergens">
            <h4>Selected Allergens:</h4>
            <div className="allergen-tags">
              {formData.allergens.map(allergen => (
                <span key={allergen} className="allergen-tag">
                  {allergen}
                  <button
                    type="button"
                    className="remove-allergen"
                    onClick={() => handleRemoveAllergen(allergen)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Severity */}
      <div className="form-section">
        <h3>Severity Level</h3>
        
        <div className="severity-options">
          {SEVERITY_LEVELS.map(level => (
            <label key={level} className="severity-option">
              <input
                type="radio"
                name="severity"
                value={level}
                checked={formData.severity === level}
                onChange={() => handleInputChange('severity', level)}
              />
              <span className={`severity-label ${level.toLowerCase()}`}>
                {level}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Additional Information */}
      <div className="form-section">
        <h3>Additional Information</h3>
        
        <div className="form-group">
          <label htmlFor="dietary_restrictions">Other Dietary Restrictions</label>
          <input
            id="dietary_restrictions"
            type="text"
            value={formData.dietary_restrictions}
            onChange={(e) => handleInputChange('dietary_restrictions', e.target.value)}
            placeholder="e.g., Vegetarian, Vegan, Kosher, Halal"
          />
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Any additional information about the allergy..."
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
          {allergy ? 'Update Allergy' : 'Add Allergy'}
        </button>
      </div>
    </form>
  );
}