import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { generateMenuPDF, enhancedPrint } from '../../services/pdfService';
import { formatDate, formatDateRange } from '../../utils/dateFormatting';
import './MenuViewer.css';

// Meal type configurations
const MEAL_TYPES = {
  breakfast: { label: 'Breakfast', icon: '☀️', color: '#FFF8DC' },
  lunch: { label: 'Lunch', icon: '🥗', color: '#F0F8FF' },
  dinner: { label: 'Dinner', icon: '🍽️', color: '#F5F5DC' },
  snack: { label: 'Snack', icon: '🍎', color: '#F0FFF0' },
  beverage: { label: 'Beverage', icon: '☕', color: '#FAF0E6' },
  ceremony: { label: 'Ceremony', icon: '🎊', color: '#FFE4E1' },
  celebration: { label: 'Celebration', icon: '🎉', color: '#FFE4E1' }
};

export default function MenuViewer() {
  const { eventId, menuId } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fullPageMode, setFullPageMode] = useState(false);
  const [expandedDays, setExpandedDays] = useState(new Set());

  useEffect(() => {
    loadEventAndMenu();
  }, [eventId]);

  useEffect(() => {
    // Handle ESC key for full page mode
    const handleEsc = (e) => {
      if (e.key === 'Escape' && fullPageMode) {
        setFullPageMode(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [fullPageMode]);

  const loadEventAndMenu = async () => {
    try {
      setLoading(true);
      
      // Load event data
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        setError('Event not found');
        return;
      }

      const eventData = { id: eventDoc.id, ...eventDoc.data() };
      setEvent(eventData);
      
      // Extract menu from event
      if (eventData.menu) {
        setMenu(eventData.menu);
        // Expand all days by default
        const dayIndices = eventData.menu.days?.map((_, index) => index) || [];
        setExpandedDays(new Set(dayIndices));
      } else {
        setError('No menu found for this event');
      }
    } catch (err) {
      console.error('Error loading event/menu:', err);
      setError('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/events/${eventId}/menus/${menuId}/plan`);
  };

  const handlePrint = () => {
    enhancedPrint(`${menu.name || 'Menu'} - ${event.name}`);
  };

  const handleExportPDF = async () => {
    try {
      await generateMenuPDF(menu, event);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const toggleDay = (dayIndex) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayIndex)) {
        next.delete(dayIndex);
      } else {
        next.add(dayIndex);
      }
      return next;
    });
  };

  const toggleAllDays = () => {
    if (expandedDays.size === menu.days.length) {
      setExpandedDays(new Set());
    } else {
      setExpandedDays(new Set(menu.days.map((_, index) => index)));
    }
  };

  const getMealConfig = (type) => {
    return MEAL_TYPES[type] || { 
      label: type?.charAt(0).toUpperCase() + type?.slice(1) || 'Meal', 
      icon: '🍽️', 
      color: '#F0F0F0' 
    };
  };

  const getTotalCourses = () => {
    if (!menu?.days) return 0;
    return menu.days.reduce((total, day) => 
      total + day.meals.reduce((mealTotal, meal) => 
        mealTotal + (meal.courses?.length || 0), 0
      ), 0
    );
  };

  const getTotalRecipes = () => {
    if (!menu?.days) return 0;
    return menu.days.reduce((total, day) => 
      total + day.meals.reduce((mealTotal, meal) => 
        mealTotal + meal.courses.reduce((courseTotal, course) => {
          let count = 0;
          // Count main recipes
          if (course.recipes) {
            count += course.recipes.length;
          } else if (course.recipe_id) {
            count += 1;
          }
          // Count accommodation recipes
          if (course.accommodations) {
            count += course.accommodations.length;
          }
          return courseTotal + count;
        }, 0), 0
      ), 0
    );
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
        <Link to="/events" className="btn btn-secondary">
          Back to Events
        </Link>
      </div>
    );
  }

  if (!menu || !event) return null;

  const content = (
    <div className={`menu-viewer ${fullPageMode ? 'full-page' : ''}`}>
      {/* Header */}
      <div className="menu-header no-print">
        <div className="menu-header-content">
          <Link to={`/events/${eventId}`} className="back-link">
            ← Back to Event
          </Link>
          
          <div className="menu-title-row">
            <h1>{menu.name || 'Menu'}</h1>
            <span className="menu-type">{menu.type}</span>
          </div>
          
          <div className="menu-actions">
            {hasRole('user') && (
              <button 
                className="btn btn-primary"
                onClick={handleEdit}
              >
                ✏️ Edit Menu
              </button>
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
            
            <button 
              className="btn btn-secondary"
              onClick={() => setFullPageMode(!fullPageMode)}
              title={fullPageMode ? "Exit full page" : "View full page"}
            >
              {fullPageMode ? '↙️' : '⛶'} {fullPageMode ? 'Exit' : 'Full Page'}
            </button>
          </div>
        </div>
      </div>

      {/* Event Info Bar */}
      <div className="event-info-bar">
        <div className="event-info-content">
          <h2>{event.name}</h2>
          <div className="event-meta">
            <span>📅 {formatDateRange(event.start_date, event.end_date)}</span>
            <span>👥 {event.guest_count} guests</span>
            <span>📍 {event.location || 'Location TBD'}</span>
          </div>
          {(event.allergens?.length > 0 || event.dietary_restrictions?.length > 0) && (
            <div className="dietary-info">
              {event.allergens?.length > 0 && (
                <span className="allergen-warning">
                  ⚠️ Allergens: {event.allergens.join(', ')}
                </span>
              )}
              {event.dietary_restrictions?.length > 0 && (
                <span className="dietary-restrictions">
                  🥗 Diets: {event.dietary_restrictions.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Menu Stats */}
      <div className="menu-stats no-print">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{menu.days?.length || 0}</span>
            <span className="stat-label">Days</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{menu.days?.reduce((sum, day) => sum + day.meals.length, 0) || 0}</span>
            <span className="stat-label">Meals</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{getTotalCourses()}</span>
            <span className="stat-label">Courses</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{getTotalRecipes()}</span>
            <span className="stat-label">Recipes</span>
          </div>
        </div>
        
        <button 
          className="expand-all-btn"
          onClick={toggleAllDays}
        >
          {expandedDays.size === menu.days?.length ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Menu Content */}
      <div className="menu-content printable">
        <div className="print-header">
          <h2>{menu.name}</h2>
          <p className="print-event">{event.name} • {formatDateRange(event.start_date, event.end_date)}</p>
          <p className="print-meta">{event.guest_count} guests • {event.location}</p>
        </div>

        {menu.days && menu.days.length > 0 ? (
          <div className="menu-days">
            {menu.days.map((day, dayIndex) => (
              <div key={dayIndex} className={`menu-day ${expandedDays.has(dayIndex) ? 'expanded' : ''}`}>
                <div 
                  className="day-header"
                  onClick={() => toggleDay(dayIndex)}
                >
                  <div className="day-info">
                    <h3>{day.day_label}</h3>
                    <span className="day-date">{formatDate(day.date)}</span>
                  </div>
                  <div className="day-summary">
                    <span>{day.meals.length} meals</span>
                    <span className="toggle-icon no-print">
                      {expandedDays.has(dayIndex) ? '−' : '+'}
                    </span>
                  </div>
                </div>
                
                {expandedDays.has(dayIndex) && (
                  <div className="day-meals">
                    {day.meals.map((meal, mealIndex) => {
                      const mealConfig = getMealConfig(meal.type);
                      return (
                        <div 
                          key={mealIndex} 
                          className="meal-card"
                          style={{ backgroundColor: mealConfig.color }}
                        >
                          <div className="meal-header">
                            <div className="meal-title">
                              <span className="meal-icon">{mealConfig.icon}</span>
                              <h4>{mealConfig.label}</h4>
                              <span className="meal-time">{meal.time}</span>
                            </div>
                          </div>
                          
                          <div className="meal-courses">
                            {meal.courses && meal.courses.length > 0 ? (
                              meal.courses.map((course, courseIndex) => (
                                <div key={courseIndex} className="course-section">
                                  <h5 className="course-name">{course.name}</h5>
                                  
                                  {/* Main recipes */}
                                  <div className="course-recipes">
                                    {course.recipes?.map((recipe, recipeIndex) => (
                                      <div key={recipeIndex} className="recipe-item">
                                        <span className="recipe-name">{recipe.recipe_name}</span>
                                        <span className="recipe-servings">({recipe.servings} servings)</span>
                                        {recipe.notes && (
                                          <p className="recipe-notes">{recipe.notes}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {/* Accommodations */}
                                  {course.accommodations && course.accommodations.length > 0 && (
                                    <div className="accommodations-list">
                                      <h6>Dietary Accommodations:</h6>
                                      {course.accommodations.map((acc, accIndex) => (
                                        <div key={accIndex} className="accommodation-item">
                                          <span className="acc-name">{acc.name}</span>
                                          <span className="acc-servings">({acc.servings} servings)</span>
                                          <span className="acc-for">for {acc.for_guests?.join(', ')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {course.notes && (
                                    <p className="course-notes">{course.notes}</p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="empty-meal">No courses added</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-menu">
            <p>This menu has no days configured yet.</p>
          </div>
        )}
      </div>

      {/* Full Page Mode Close Button */}
      {fullPageMode && (
        <button 
          className="full-page-close"
          onClick={() => setFullPageMode(false)}
          title="Exit full page (ESC)"
        >
          ✕
        </button>
      )}
    </div>
  );

  return fullPageMode ? (
    <div className="full-page-container">
      {content}
    </div>
  ) : content;
}