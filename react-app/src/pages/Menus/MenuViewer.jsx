import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import './MenuViewer.css';

export default function MenuViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set());

  useEffect(() => {
    loadMenu();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMenu = async () => {
    try {
      setLoading(true);
      const menuDoc = await getDoc(doc(db, 'menus', id));
      
      if (!menuDoc.exists()) {
        setError('Menu not found');
        return;
      }

      const data = { id: menuDoc.id, ...menuDoc.data() };
      setMenu(data);
      
      // Expand all meals by default
      const mealIds = data.meals?.map(m => m.id) || data.sections?.map(s => s.id) || [];
      setExpandedSections(new Set(mealIds));
    } catch (err) {
      console.error('Error loading menu:', err);
      setError('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/menus/${id}/edit`);
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'menus', id));
      navigate('/menus');
    } catch (err) {
      console.error('Error deleting menu:', err);
      alert('Failed to delete menu');
    }
  };

  const handleDuplicate = () => {
    navigate('/menus/new', { 
      state: { 
        template: {
          ...menu,
          name: `${menu.name} (Copy)`,
          id: undefined,
          created_at: undefined,
          created_by: undefined
        }
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert('PDF export coming soon!');
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const getMenuTypeIcon = (type) => {
    switch (type) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      case 'ceremony': return '🎋';
      case 'brunch': return '🥐';
      case 'custom': return '✨';
      default: return '🍽️';
    }
  };

  const getTotalItems = () => {
    const meals = menu?.meals || menu?.sections || [];
    return meals.reduce((total, meal) => 
      total + (meal.recipes?.length || meal.items?.length || 0), 0
    ) || 0;
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    const d = date.toDate?.() || new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/menus" className="btn btn-secondary">
          Back to Menus
        </Link>
      </div>
    );
  }

  if (!menu) return null;

  return (
    <div className="menu-viewer">
      {/* Header */}
      <div className="menu-header">
        <div className="menu-header-content">
          <Link to="/menus" className="back-link">
            ← Back to Menus
          </Link>
          
          <div className="menu-title-row">
            <span className="menu-type-icon">{getMenuTypeIcon(menu.type)}</span>
            <h1>{menu.name || 'Unnamed Menu'}</h1>
          </div>
          
          <div className="menu-actions">
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
            
            <button 
              className="btn btn-secondary"
              onClick={handlePrint}
            >
              🖨️ Print
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={handleExportPDF}
            >
              📄 Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Delete Menu?</h3>
            <p>Are you sure you want to delete "{menu.name}"? This action cannot be undone.</p>
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
                Delete Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Info */}
      <div className="menu-info">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Meals:</span>
            <span className="info-value">
              {menu.meals?.length || menu.sections?.length || 0}
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-label">Total Items:</span>
            <span className="info-value">{getTotalItems()}</span>
          </div>
          
          {menu.event_name && (
            <div className="info-item">
              <span className="info-label">Event:</span>
              <span className="info-value">{menu.event_name}</span>
            </div>
          )}
          
          <div className="info-item">
            <span className="info-label">Created:</span>
            <span className="info-value">{formatDate(menu.created_at)}</span>
          </div>
        </div>

        {menu.description && (
          <div className="menu-description">
            <p>{menu.description}</p>
          </div>
        )}
      </div>

      {/* Menu Content */}
      <div className="menu-content printable">
        <div className="print-header">
          <h2>{menu.name}</h2>
          {menu.event_name && <p className="print-event">For: {menu.event_name}</p>}
        </div>

        {(menu.meals && menu.meals.length > 0) || (menu.sections && menu.sections.length > 0) ? (
          <div className="menu-sections">
            {(menu.meals || menu.sections).map((meal) => (
              <div key={meal.id} className="menu-section meal-section">
                <div 
                  className="section-header"
                  onClick={() => toggleSection(meal.id)}
                >
                  <div className="meal-header-info">
                    <span className="meal-type-badge">
                      {getMenuTypeIcon(meal.type || 'dinner')} {(meal.type || meal.name || 'Meal').charAt(0).toUpperCase() + (meal.type || meal.name || 'meal').slice(1)}
                    </span>
                    {meal.name && !meal.type && <h3>{meal.name}</h3>}
                  </div>
                  <span className="section-toggle">
                    {expandedSections.has(meal.id) ? '−' : '+'}
                  </span>
                </div>
                
                {expandedSections.has(meal.id) && (
                  <div className="meal-content">
                    {(meal.description || meal.instructions || meal.notes) && (
                      <div className="meal-details">
                        {meal.description && (
                          <div className="meal-detail">
                            <strong>Description:</strong>
                            <p>{meal.description}</p>
                          </div>
                        )}
                        {meal.instructions && (
                          <div className="meal-detail">
                            <strong>Instructions:</strong>
                            <p>{meal.instructions}</p>
                          </div>
                        )}
                        {meal.notes && (
                          <div className="meal-detail">
                            <strong>Notes:</strong>
                            <p>{meal.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="section-items">
                      {((meal.recipes && meal.recipes.length > 0) || (meal.items && meal.items.length > 0)) ? (
                        (meal.recipes || meal.items).map((item, index) => (
                          <div key={item.id || index} className="menu-item-display">
                            <div className="item-main-info">
                              <h4>{item.recipe_name}</h4>
                              <span className="item-serves">Serves {item.serves || '?'}</span>
                            </div>
                            
                            {item.notes && (
                              <p className="item-notes">{item.notes}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="empty-section">No recipes in this meal</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-menu">
            <p>This menu has no meals yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}