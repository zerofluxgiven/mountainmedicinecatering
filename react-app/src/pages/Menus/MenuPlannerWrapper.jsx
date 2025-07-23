import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import MenuPlannerCalendar from '../../components/Menu/MenuPlannerCalendar';
import './MenuPlannerWrapper.css';

export default function MenuPlannerWrapper() {
  const { eventId, menuId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState(null);
  const [showDayPrompt, setShowDayPrompt] = useState(false);
  const [numberOfDays, setNumberOfDays] = useState(1);
  const [menuName, setMenuName] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [eventId, menuId]);

  const loadData = async () => {
    try {
      // If we have an eventId, load the event
      if (eventId) {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          setEventData({ id: eventId, ...eventDoc.data() });
        }
        setLoading(false);
      } else if (menuId && menuId !== 'new') {
        // If editing an existing menu without event context
        const menuDoc = await getDoc(doc(db, 'menus', menuId));
        if (menuDoc.exists()) {
          const menuData = menuDoc.data();
          // If the menu has an event_id, redirect to event context
          if (menuData.event_id) {
            navigate(`/events/${menuData.event_id}/menus/${menuId}/plan`);
            return;
          }
          // Otherwise, we can edit the standalone menu
          setLoading(false);
        } else {
          setError('Menu not found');
          setLoading(false);
        }
      } else {
        // Creating a new menu without event context
        setShowDayPrompt(true);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const handleCreateStandaloneMenu = () => {
    if (!menuName.trim()) {
      setError('Please enter a menu name');
      return;
    }
    if (numberOfDays < 1 || numberOfDays > 30) {
      setError('Number of days must be between 1 and 30');
      return;
    }

    // Navigate to the menu planner with the standalone configuration
    setShowDayPrompt(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error && !showDayPrompt) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/menus')} className="btn btn-primary">
          Back to Menus
        </button>
      </div>
    );
  }

  // Show day prompt for standalone menu creation
  if (showDayPrompt) {
    return (
      <div className="menu-planner-wrapper">
        <div className="day-prompt-modal">
          <h2>Create New Menu</h2>
          <p>Let's set up your menu planning calendar</p>
          
          <div className="form-group">
            <label htmlFor="menuName">Menu Name</label>
            <input
              id="menuName"
              type="text"
              value={menuName}
              onChange={(e) => setMenuName(e.target.value)}
              placeholder="e.g., Summer Wedding Menu"
              className="form-control"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="numberOfDays">Number of Days</label>
            <input
              id="numberOfDays"
              type="number"
              min="1"
              max="30"
              value={numberOfDays}
              onChange={(e) => setNumberOfDays(parseInt(e.target.value) || 1)}
              className="form-control"
            />
            <small className="form-text">How many days will this menu cover?</small>
          </div>

          {error && (
            <div className="alert alert-danger">{error}</div>
          )}

          <div className="form-actions">
            <button 
              onClick={() => navigate('/menus')} 
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateStandaloneMenu}
              className="btn btn-primary"
            >
              Start Planning
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the menu planner
  return (
    <MenuPlannerCalendar 
      eventId={eventId} 
      menuId={menuId}
      standaloneConfig={!eventId ? {
        menuName: menuName,
        numberOfDays: numberOfDays
      } : null}
      onMenuChange={(newMenuId) => {
        // Update URL if needed
        if (menuId === 'new' && newMenuId) {
          if (eventId) {
            window.history.replaceState(null, '', `/events/${eventId}/menus/${newMenuId}/plan`);
          } else {
            window.history.replaceState(null, '', `/menus/${newMenuId}/plan`);
          }
        }
      }}
    />
  );
}