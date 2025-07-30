import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cleanupIngredientNames, previewIngredientCleanup } from '../../utils/cleanupIngredients';
import './IngredientCleanup.css';

export default function IngredientCleanup() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  // Check admin access
  if (!hasRole('admin')) {
    return (
      <div className="admin-access-denied">
        <h2>Access Denied</h2>
        <p>You must be an admin to access this page.</p>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }
  
  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const previewData = await previewIngredientCleanup();
      setPreview(previewData);
    } catch (err) {
      console.error('Preview failed:', err);
      setError('Failed to preview changes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCleanup = async () => {
    if (!window.confirm('Are you sure you want to clean up ingredient names? This will modify the database.')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setPreview(null);
    
    try {
      const cleanupResults = await cleanupIngredientNames();
      setResults(cleanupResults);
    } catch (err) {
      console.error('Cleanup failed:', err);
      setError('Failed to clean up ingredients: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="ingredient-cleanup">
      <div className="cleanup-header">
        <h1>Ingredient Name Cleanup</h1>
        <button 
          className="btn-secondary"
          onClick={() => navigate('/ingredients')}
        >
          Back to Ingredients
        </button>
      </div>
      
      <div className="cleanup-info">
        <h2>About This Tool</h2>
        <p>
          This tool fixes malformed ingredient names in the database, such as:
        </p>
        <ul>
          <li>"/2 Teaspoon Baking Soda" → "Baking Soda"</li>
          <li>"/4 Cup Coconut Sugar" → "Coconut Sugar"</li>
          <li>"1 Tablespoon Vanilla Extract" → "Vanilla Extract"</li>
        </ul>
        <p>
          It also merges duplicate ingredients with similar names.
        </p>
      </div>
      
      <div className="cleanup-actions">
        <button 
          className="btn-preview"
          onClick={handlePreview}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Preview Changes'}
        </button>
        
        <button 
          className="btn-cleanup"
          onClick={handleCleanup}
          disabled={loading || !preview}
        >
          {loading ? 'Processing...' : 'Run Cleanup'}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {preview && (
        <div className="preview-results">
          <h2>Preview Results</h2>
          
          <div className="preview-summary">
            <p>Total ingredients: {preview.total}</p>
            <p>Would fix: {preview.wouldFix.length}</p>
            <p>Would merge: {preview.wouldMerge.length} groups</p>
            <p>No change needed: {preview.noChange.length}</p>
          </div>
          
          {preview.wouldFix.length > 0 && (
            <div className="preview-section">
              <h3>Names to Fix</h3>
              <div className="fix-list">
                {preview.wouldFix.slice(0, 20).map((fix, index) => (
                  <div key={index} className="fix-item">
                    <span className="from">{fix.from}</span>
                    <span className="arrow">→</span>
                    <span className="to">{fix.to}</span>
                  </div>
                ))}
                {preview.wouldFix.length > 20 && (
                  <p className="more">...and {preview.wouldFix.length - 20} more</p>
                )}
              </div>
            </div>
          )}
          
          {preview.wouldMerge.length > 0 && (
            <div className="preview-section">
              <h3>Duplicates to Merge</h3>
              <div className="merge-list">
                {preview.wouldMerge.slice(0, 10).map((merge, index) => (
                  <div key={index} className="merge-group">
                    <h4>{merge.normalizedName}</h4>
                    <ul>
                      {merge.ingredients.map((ing, i) => (
                        <li key={i}>{ing.name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                {preview.wouldMerge.length > 10 && (
                  <p className="more">...and {preview.wouldMerge.length - 10} more groups</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {results && (
        <div className="cleanup-results">
          <h2>Cleanup Complete!</h2>
          
          <div className="results-summary">
            <p>✅ Fixed {results.fixed} malformed names</p>
            <p>✅ Merged {results.merged} duplicate ingredients</p>
            {results.errors.length > 0 && (
              <p>⚠️ {results.errors.length} errors occurred</p>
            )}
          </div>
          
          {results.changes.length > 0 && (
            <div className="results-section">
              <h3>Changes Made</h3>
              <div className="changes-list">
                {results.changes.slice(0, 50).map((change, index) => (
                  <div key={index} className="change-item">
                    {change.type === 'fixed' ? (
                      <>
                        <span className="type">Fixed:</span>
                        <span className="detail">
                          "{change.from}" → "{change.to}"
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="type">Merged:</span>
                        <span className="detail">
                          "{change.deletedName}" into "{change.mergedName}"
                        </span>
                      </>
                    )}
                  </div>
                ))}
                {results.changes.length > 50 && (
                  <p className="more">...and {results.changes.length - 50} more changes</p>
                )}
              </div>
            </div>
          )}
          
          {results.errors.length > 0 && (
            <div className="results-section errors">
              <h3>Errors</h3>
              <div className="errors-list">
                {results.errors.map((error, index) => (
                  <div key={index} className="error-item">
                    {error.name || error.general || 'Unknown error'}: {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}