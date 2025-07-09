import React, { useState, useMemo } from 'react';
import { scaleRecipe } from '../../services/recipeScaler';
import './RecipeScaler.css';

export default function RecipeScaler({ recipe, onClose, onSaveScaled }) {
  const [targetServings, setTargetServings] = useState(recipe.serves || 4);
  const [showNotes, setShowNotes] = useState(false);

  // Calculate scaled recipe
  const scaledRecipe = useMemo(() => {
    if (targetServings === recipe.serves) return recipe;
    return scaleRecipe(recipe, targetServings);
  }, [recipe, targetServings]);

  const scaleFactor = targetServings / (recipe.serves || 4);

  const handleSaveAsNew = () => {
    if (onSaveScaled) {
      onSaveScaled(scaledRecipe);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="recipe-scaler">
      <div className="scaler-header">
        <h2>Scale Recipe</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="scaler-controls">
        <div className="serving-selector">
          <label>Original Servings:</label>
          <span className="original-servings">{recipe.serves || 4}</span>
        </div>

        <div className="serving-selector">
          <label>Target Servings:</label>
          <div className="serving-input-group">
            <button 
              className="serving-btn"
              onClick={() => setTargetServings(Math.max(1, targetServings - 1))}
            >
              −
            </button>
            <input
              type="number"
              value={targetServings}
              onChange={(e) => setTargetServings(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="serving-input"
            />
            <button 
              className="serving-btn"
              onClick={() => setTargetServings(targetServings + 1)}
            >
              +
            </button>
          </div>
        </div>

        <div className="scale-factor">
          Scale Factor: <strong>{scaleFactor.toFixed(2)}x</strong>
        </div>
      </div>

      {/* Quick Scale Buttons */}
      <div className="quick-scale-buttons">
        <button 
          className={`quick-scale-btn ${targetServings === Math.round(recipe.serves * 0.5) ? 'active' : ''}`}
          onClick={() => setTargetServings(Math.round((recipe.serves || 4) * 0.5))}
        >
          ½x
        </button>
        <button 
          className={`quick-scale-btn ${targetServings === recipe.serves ? 'active' : ''}`}
          onClick={() => setTargetServings(recipe.serves || 4)}
        >
          1x
        </button>
        <button 
          className={`quick-scale-btn ${targetServings === Math.round(recipe.serves * 1.5) ? 'active' : ''}`}
          onClick={() => setTargetServings(Math.round((recipe.serves || 4) * 1.5))}
        >
          1.5x
        </button>
        <button 
          className={`quick-scale-btn ${targetServings === Math.round(recipe.serves * 2) ? 'active' : ''}`}
          onClick={() => setTargetServings(Math.round((recipe.serves || 4) * 2))}
        >
          2x
        </button>
        <button 
          className={`quick-scale-btn ${targetServings === Math.round(recipe.serves * 3) ? 'active' : ''}`}
          onClick={() => setTargetServings(Math.round((recipe.serves || 4) * 3))}
        >
          3x
        </button>
      </div>

      {/* Scaling Notes */}
      {scaledRecipe.scaling_notes && (
        <div className="scaling-notes">
          <div 
            className="notes-header"
            onClick={() => setShowNotes(!showNotes)}
          >
            <span>📝 Scaling Tips</span>
            <span className="toggle-icon">{showNotes ? '−' : '+'}</span>
          </div>
          {showNotes && (
            <div className="notes-content">
              {scaledRecipe.scaling_notes}
            </div>
          )}
        </div>
      )}

      {/* Scaled Recipe Display */}
      <div className="scaled-recipe printable">
        <h3>{scaledRecipe.name} (Serves {targetServings})</h3>

        <div className="scaled-section">
          <h4>Ingredients</h4>
          <ul className="scaled-ingredients">
            {scaledRecipe.ingredients?.map((ingredient, index) => (
              <li key={index}>{ingredient}</li>
            ))}
          </ul>
        </div>

        {scaledRecipe.instructions && (
          <div className="scaled-section">
            <h4>Instructions</h4>
            <div className="scaled-instructions">
              {typeof scaledRecipe.instructions === 'string' ? (
                <p>{scaledRecipe.instructions}</p>
              ) : (
                <ol>
                  {scaledRecipe.instructions.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}

        {scaledRecipe.notes && (
          <div className="scaled-section">
            <h4>Notes</h4>
            <p>{scaledRecipe.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="scaler-actions">
        <button 
          className="btn btn-secondary"
          onClick={handlePrint}
        >
          🖨️ Print Scaled Recipe
        </button>
        {onSaveScaled && (
          <button 
            className="btn btn-primary"
            onClick={handleSaveAsNew}
          >
            💾 Save as New Recipe
          </button>
        )}
        <button 
          className="btn btn-secondary"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}