import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { COLLECTIONS } from '../../config/collections';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import './MenuList.css';

const DEFAULT_MEAL_TYPES = ['breakfast', 'brunch', 'lunch', 'dinner', 'ceremony'];

export default function MenuList() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { menus: globalMenus } = useApp();
  
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [availableMealTypes, setAvailableMealTypes] = useState([...DEFAULT_MEAL_TYPES]);

  useEffect(() => {
    // Subscribe to menus
    const q = query(collection(db, COLLECTIONS.MENUS), orderBy('created_at', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const menusData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMenus(menusData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching menus:', error);
      setLoading(false);
    });

    // Subscribe to meal types
    const mealTypesUnsubscribe = onSnapshot(collection(db, 'meal_types'), (snapshot) => {
      const customTypes = snapshot.docs.map(doc => doc.id);
      setAvailableMealTypes([...DEFAULT_MEAL_TYPES, ...customTypes]);
    });

    return () => {
      unsubscribe();
      mealTypesUnsubscribe();
    };
  }, []);

  const filteredMenus = menus.filter(menu => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const nameMatch = menu.name?.toLowerCase().includes(search);
      const descMatch = menu.description?.toLowerCase().includes(search);
      if (!nameMatch && !descMatch) return false;
    }

    // Type filter - check meal types within the menu
    if (filterType !== 'all') {
      const mealTypes = menu.meals?.map(meal => meal.type) || [];
      if (!mealTypes.includes(filterType)) return false;
    }


    return true;
  });

  const handleMenuClick = (menuId) => {
    // Check if user wants to edit (holding alt/option key)
    if (window.event?.altKey) {
      navigate(`/menus/${menuId}/plan`);
    } else {
      navigate(`/menus/${menuId}`);
    }
  };

  const handleCreateNew = () => {
    navigate('/menus/new');
  };

  const handleDuplicate = (e, menu) => {
    e.stopPropagation();
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

  const handleDelete = async (menuId) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.MENUS, menuId));
      setShowDeleteConfirm(null);
      // Update local state immediately for better UX
      setMenus(prevMenus => prevMenus.filter(menu => menu.id !== menuId));
    } catch (err) {
      console.error('Error deleting menu:', err);
      alert('Failed to delete menu: ' + err.message);
    }
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

  const formatDate = (date) => {
    if (!date) return 'No date';
    const d = date.toDate?.() || new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading menus...</p>
      </div>
    );
  }

  return (
    <div className="menu-list">
      <div className="menu-list-header">
        <h1>Menu Builder</h1>
        {hasRole('user') && (
          <button 
            className="btn btn-primary"
            onClick={handleCreateNew}
          >
            <span className="btn-icon">➕</span>
            Create Menu
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="menu-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search menus..."
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

        <div className="filter-pills">
          <button
            className={`filter-pill ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Menus
          </button>
          {availableMealTypes.map(type => {
            const icons = {
              breakfast: '🌅',
              brunch: '🥐',
              lunch: '☀️',
              dinner: '🌙',
              ceremony: '🎋'
            };
            return (
              <button
                key={type}
                className={`filter-pill ${filterType === type ? 'active' : ''}`}
                onClick={() => setFilterType(type)}
              >
                {icons[type] || '🍽️'} {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        Showing {filteredMenus.length} of {menus.length} menus
      </div>

      {/* Menu Grid */}
      <div className="menu-grid">
        {filteredMenus.map(menu => (
          <div 
            key={menu.id} 
            className="menu-card menu-card-purple"
            onClick={() => handleMenuClick(menu.id)}
          >
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm === menu.id && (
              <div 
                className="delete-confirm-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <p>Delete this menu?</p>
                <div className="confirm-actions">
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(menu.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            <div className="menu-card-header">
              <span className="menu-type-icon">
                {getMenuTypeIcon(menu.type)}
              </span>
            </div>

            <div className="menu-card-body">
              <h3 className="menu-name">{menu.name || 'Unnamed Menu'}</h3>
              
              {menu.description && (
                <p className="menu-description">{menu.description}</p>
              )}

              <div className="menu-meta">
                <span className="menu-type">
                  {menu.type === 'custom' && menu.displayType 
                    ? menu.displayType 
                    : (menu.type ? menu.type.charAt(0).toUpperCase() + menu.type.slice(1) : 'General')}
                </span>
                <span className="menu-items">
                  {menu.days?.length || 0} days
                </span>
              </div>

              {menu.event_name && (
                <div className="menu-event">
                  📅 {menu.event_name}
                </div>
              )}

              <div className="menu-footer">
                <span className="menu-date">
                  Created {formatDate(menu.created_at)}
                </span>
                {hasRole('user') && (
                  <div className="menu-actions-footer">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={(e) => handleDuplicate(e, menu)}
                      title="Duplicate menu"
                    >
                      📋 Copy
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(menu.id);
                      }}
                      title="Delete menu"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMenus.length === 0 && (
        <div className="empty-state">
          <p>No menus found.</p>
          {hasRole('user') && (
            <button 
              className="btn btn-primary"
              onClick={handleCreateNew}
            >
              Create Your First Menu
            </button>
          )}
        </div>
      )}
    </div>
  );
}