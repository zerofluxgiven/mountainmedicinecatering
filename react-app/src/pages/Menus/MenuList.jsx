import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
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
    // Subscribe to events to extract menus from them
    const q = query(collection(db, 'events'), orderBy('created_at', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const menusData = [];
      
      snapshot.docs.forEach(doc => {
        const eventData = doc.data();
        
        // Extract menu from event if it exists
        if (eventData.menu) {
          menusData.push({
            id: `${doc.id}_menu`, // Create a unique ID combining event ID and menu suffix
            ...eventData.menu,
            event_id: doc.id,
            event_name: eventData.name,
            event_start_date: eventData.start_date,
            event_end_date: eventData.end_date,
            guest_count: eventData.guest_count,
            // Use event's created_at if menu doesn't have one
            created_at: eventData.menu.created_at || eventData.created_at,
            created_by: eventData.menu.created_by || eventData.created_by
          });
        }
      });
      
      setMenus(menusData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching events/menus:', error);
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

    // Type filter - check meal types within the menu days
    if (filterType !== 'all') {
      const mealTypes = [];
      menu.days?.forEach(day => {
        day.meals?.forEach(meal => {
          if (meal.type) mealTypes.push(meal.type);
        });
      });
      if (!mealTypes.includes(filterType)) return false;
    }


    return true;
  });

  const handleMenuClick = (menu) => {
    // Navigate to the event's menu planner
    if (menu.event_id) {
      navigate(`/events/${menu.event_id}/menus/${menu.id}/plan`);
    }
  };

  const handleCreateNew = () => {
    // Navigate to events page since menus are now created within events
    navigate('/events');
  };


  const handleDelete = async (menu) => {
    try {
      // Delete menu from event document
      if (menu.event_id) {
        const eventRef = doc(db, 'events', menu.event_id);
        await updateDoc(eventRef, {
          menu: null
        });
      }
      setShowDeleteConfirm(null);
      // Update local state immediately for better UX
      setMenus(prevMenus => prevMenus.filter(m => m.id !== menu.id));
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
            Go to Events
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
            onClick={() => handleMenuClick(menu)}
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
                      handleDelete(menu);
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
                <div className="menu-actions-footer">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/events/${menu.event_id}/menus/${menu.id}`);
                    }}
                    title="View menu"
                  >
                    👁️ View Menu
                  </button>
                  {hasRole('user') && (
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
                  )}
                </div>
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
              Go to Events to Create Menu
            </button>
          )}
        </div>
      )}
    </div>
  );
}