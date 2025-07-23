import React, { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatDateRange, getDateRange } from '../../utils/dateFormatting';
import { getMealTypes, subscribeMealTypes, addMealType } from '../../services/mealTypes';
import DayEditor from './DayEditor';
import AccommodationPlanner from './AccommodationPlanner';
import { aiMonitor } from '../../services/aiMonitor';
import './MenuPlannerCalendar.css';

// Default meal time mappings
const DEFAULT_MEAL_TIMES = {
  breakfast: '8:00 AM',
  lunch: '12:30 PM',
  dinner: '7:00 PM',
  snack: '3:00 PM',
  beverage: '10:00 AM',
  ceremony: '4:00 PM',
  celebration: '8:00 PM'
};

// Default meal icons
const MEAL_ICONS = {
  breakfast: '☀️',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
  beverage: '☕',
  ceremony: '🎊',
  celebration: '🎉'
};

export default function MenuPlannerCalendar({ eventId, menuId, onMenuChange, standaloneConfig }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showAccommodationPlanner, setShowAccommodationPlanner] = useState(false);
  const [accommodationMenus, setAccommodationMenus] = useState([]);
  const [mealTypes, setMealTypes] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    let isSubscribed = true;
    
    // Subscribe to meal types
    const unsubscribe = subscribeMealTypes((types) => {
      if (!isSubscribed) return;
      
      // Convert array to object keyed by ID
      const typesObj = {};
      types.forEach(type => {
        typesObj[type.id] = {
          label: type.name,
          color: type.color,
          opacity: type.opacity,
          defaultTime: DEFAULT_MEAL_TIMES[type.id] || '12:00 PM',
          icon: MEAL_ICONS[type.id] || '🍽️'
        };
      });
      setMealTypes(typesObj);
      
      // Load event and menu after meal types are ready
      if (Object.keys(typesObj).length > 0) {
        loadEventAndMenu();
      }
    });
    
    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [eventId, menuId, standaloneConfig]);

  // Cleanup effect - save on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Note: We can't do async operations in cleanup, so unsaved changes might be lost
      // The auto-save should handle most cases
    };
  }, []);

  const loadEventAndMenu = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Loading event and menu...', { eventId, menuId });
      // Check if this is a standalone menu
      if (standaloneConfig) {
        // Create standalone menu
        if (menuId && menuId !== 'new') {
          // Load existing standalone menu
          const menuDoc = await getDoc(doc(db, 'menus', menuId));
          if (menuDoc.exists()) {
            setMenu({ id: menuDoc.id, ...menuDoc.data() });
          } else {
            throw new Error('Menu not found');
          }
        } else {
          // Create new standalone menu
          const newMenu = createStandaloneMenu(standaloneConfig);
          setMenu(newMenu);
        }
      } else if (eventId) {
        // Load event data
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (!eventDoc.exists()) {
          throw new Error('Event not found');
        }

        const eventData = { id: eventDoc.id, ...eventDoc.data() };
        setEvent(eventData);

        // Load or create menu
        if (menuId && menuId !== 'new') {
          // Load existing menu
          const menuDoc = await getDoc(doc(db, 'menus', menuId));
          if (menuDoc.exists()) {
            const menuData = { id: menuDoc.id, ...menuDoc.data() };
            console.log('Loaded menu:', menuData);
            setMenu(menuData);
          } else {
            throw new Error('Menu not found');
          }
        } else {
          // Create new menu structure
          const newMenu = createEventMenu(eventData);
          console.log('Created new menu:', newMenu);
          setMenu(newMenu);
        }
      } else {
        throw new Error('No event or standalone configuration provided');
      }
    } catch (err) {
      console.error('Error loading event/menu:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createEventMenu = (eventData) => {
    const days = getDateRange(eventData.start_date, eventData.end_date);
    
    return {
      event_id: eventId,
      name: `${eventData.name} - Primary Menu`,
      type: 'primary',
      days: days.map((date, index) => ({
        date: date,
        day_label: `Day ${index + 1}`,
        expanded: index === 0, // First day expanded by default
        meals: [
          createMeal('breakfast'),
          createMeal('lunch'), 
          createMeal('dinner')
        ]
      }))
    };
  };

  const createStandaloneMenu = (config) => {
    const today = new Date();
    const days = [];
    
    // Generate days starting from today
    for (let i = 0; i < config.numberOfDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }
    
    return {
      name: config.menuName || 'New Menu',
      type: 'standalone',
      days: days.map((date, index) => ({
        date: date,
        day_label: `Day ${index + 1}`,
        expanded: index === 0,
        meals: [
          createMeal('breakfast'),
          createMeal('lunch'), 
          createMeal('dinner')
        ]
      }))
    };
  };

  const createMeal = (type) => {
    // Get meal type config
    const mealType = mealTypes[type] || {
      defaultTime: DEFAULT_MEAL_TIMES[type] || '12:00 PM'
    };
    
    return {
      id: `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type,
      time: mealType.defaultTime,
      // Don't store color - always get from settings
      courses: []
    };
  };


  const getDayLabel = (date, index) => {
    try {
      const dayOfWeek = formatDate(date, { weekday: 'long' });
      const monthDay = formatDate(date, { month: 'short', day: 'numeric' });
      
      if (dayOfWeek === 'Invalid date' || monthDay === 'Invalid date') {
        return `Day ${index + 1}`;
      }
      
      return `Day ${index + 1} - ${dayOfWeek}, ${monthDay}`;
    } catch (error) {
      console.error('Error formatting day label:', error);
      return `Day ${index + 1}`;
    }
  };

  const saveMenuToDatabase = useCallback(async (menuToSave) => {
    setSaving(true);
    setError(null);

    try {
      const menuData = {
        ...menuToSave,
        updated_at: serverTimestamp()
      };

      if (menuId && menuId !== 'new') {
        // Update existing menu
        await updateDoc(doc(db, 'menus', menuId), menuData);
      } else {
        // Create new menu
        menuData.created_at = serverTimestamp();
        menuData.created_by = currentUser.email;
        
        const docRef = await addDoc(collection(db, 'menus'), menuData);
        menuToSave.id = docRef.id;
        
        // Update URL if this was a new menu
        if (onMenuChange) {
          onMenuChange(docRef.id);
        }
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      // Trigger AI safety check for menu changes
      await triggerAISafetyCheck(menuToSave);

    } catch (err) {
      console.error('Error saving menu:', err);
      setError('Failed to save menu changes');
    } finally {
      setSaving(false);
    }
  }, [menuId, currentUser, onMenuChange, event]);

  const handleMenuUpdate = useCallback((updatedMenu, immediate = false) => {
    // Update local state immediately
    setMenu(updatedMenu);
    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (immediate) {
      // Save immediately
      saveMenuToDatabase(updatedMenu);
    } else {
      // Debounce the save (auto-save after 2 seconds of no changes)
      saveTimeoutRef.current = setTimeout(() => {
        saveMenuToDatabase(updatedMenu);
      }, 2000);
    }
  }, [saveMenuToDatabase]);

  const triggerAISafetyCheck = async (menuData) => {
    if (!event || !menuData) return;

    try {
      // Create AI monitoring question for menu safety check
      await aiMonitor.addQuestion(eventId, {
        type: 'menu_safety_check',
        priority: 'high',
        question: 'A menu has been updated. Please verify all recipes are safe for guests with the following restrictions:',
        context: {
          event_allergies: event.allergens || [],
          event_dietary_restrictions: event.dietary_restrictions || [],
          guests_with_restrictions: event.guests_with_restrictions || [],
          menu_data: menuData,
          check_type: 'comprehensive_menu_review'
        },
        auto_trigger: true
      });
    } catch (err) {
      console.error('Error triggering AI safety check:', err);
    }
  };

  const handleAddDay = () => {
    if (!menu) return;

    const lastDay = menu.days[menu.days.length - 1];
    const nextDate = new Date(lastDay.date);
    nextDate.setDate(nextDate.getDate() + 1);

    const newDay = {
      date: nextDate.toISOString().split('T')[0],
      day_label: `Day ${menu.days.length + 1}`,
      expanded: false,
      meals: [
        createMeal('breakfast'),
        createMeal('lunch'),
        createMeal('dinner')
      ]
    };

    const updatedMenu = {
      ...menu,
      days: [...menu.days, newDay]
    };

    handleMenuUpdate(updatedMenu);
  };

  const handleAddDayBefore = () => {
    if (!menu) return;

    const firstDay = menu.days[0];
    const prevDate = new Date(firstDay.date);
    prevDate.setDate(prevDate.getDate() - 1);

    const newDay = {
      date: prevDate.toISOString().split('T')[0],
      day_label: `Day 0`, // Will be updated when days are renumbered
      expanded: false,
      meals: [
        createMeal('breakfast'),
        createMeal('lunch'),
        createMeal('dinner')
      ]
    };

    // Insert at beginning and renumber all days
    const updatedDays = [newDay, ...menu.days].map((day, index) => ({
      ...day,
      day_label: `Day ${index + 1}`
    }));

    const updatedMenu = {
      ...menu,
      days: updatedDays
    };

    handleMenuUpdate(updatedMenu);
  };

  const handleRemoveDay = (dayIndex) => {
    if (!menu || menu.days.length <= 1) return;

    if (window.confirm('Remove this entire day from the menu?')) {
      const updatedMenu = {
        ...menu,
        days: menu.days.filter((_, index) => index !== dayIndex)
      };

      handleMenuUpdate(updatedMenu);
    }
  };

  const handleDayUpdate = (dayIndex, updatedDay) => {
    if (!menu) return;

    const updatedMenu = {
      ...menu,
      days: menu.days.map((day, index) => 
        index === dayIndex ? updatedDay : day
      )
    };

    handleMenuUpdate(updatedMenu);
  };

  const handleDayDateChange = (dayIndex, newDate) => {
    if (!menu) return;

    const updatedMenu = {
      ...menu,
      days: menu.days.map((day, index) => 
        index === dayIndex ? { ...day, date: newDate } : day
      )
    };

    handleMenuUpdate(updatedMenu);
  };

  const handleToggleDay = (dayIndex) => {
    if (!menu) return;

    const updatedMenu = {
      ...menu,
      days: menu.days.map((day, index) => 
        index === dayIndex ? { ...day, expanded: !day.expanded } : day
      )
    };

    setMenu(updatedMenu); // Just update state, don't save to DB
  };

  const getTotalMeals = () => {
    if (!menu) return 0;
    return menu.days.reduce((total, day) => total + day.meals.length, 0);
  };

  const getTotalCourses = () => {
    if (!menu) return 0;
    return menu.days.reduce((total, day) => 
      total + day.meals.reduce((mealTotal, meal) => mealTotal + meal.courses.length, 0), 0
    );
  };

  const getTotalRecipes = () => {
    if (!menu) return 0;
    return menu.days.reduce((total, day) => 
      total + day.meals.reduce((mealTotal, meal) => 
        mealTotal + meal.courses.reduce((courseTotal, course) => {
          // Handle both old and new course structure
          if (course.recipes) {
            return courseTotal + course.recipes.length;
          } else if (course.recipe_id) {
            // Old structure - single recipe per course
            return courseTotal + 1;
          }
          return courseTotal;
        }, 0), 0
      ), 0
    );
  };

  if (loading) {
    return (
      <div className="menu-planner-loading">
        <div className="loading-spinner"></div>
        <p>Loading menu planner...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="menu-planner-error">
        <h3>Error Loading Menu</h3>
        <p>{error}</p>
        <button onClick={loadEventAndMenu} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="menu-planner-calendar">
      <div className="menu-header">
        <div className="menu-title">
          <h1>🍽️ {menu?.name || 'Menu Planning'}</h1>
          <div className="menu-meta">
            <span className="event-dates">
              {event && (
                <>
                  {formatDateRange(event.start_date, event.end_date)}
                </>
              )}
            </span>
            <span className="guest-count">👥 {event?.guest_count || 0} guests</span>
            <span className="menu-stats">
              📊 {menu?.days?.length || 0} days • {getTotalMeals()} meals • {getTotalCourses()} courses • {getTotalRecipes()} recipes
            </span>
          </div>
        </div>

        <div className="menu-actions">
          {event?.allergens?.length > 0 || event?.dietary_restrictions?.length > 0 ? (
            <div className="allergy-indicator">
              <span className="allergy-warning">⚠️</span>
              <span className="allergy-text">
                {event.allergens?.length || 0} allergens, {event.dietary_restrictions?.length || 0} diets
              </span>
            </div>
          ) : null}

          <button 
            className="btn btn-secondary"
            onClick={() => setShowAccommodationPlanner(true)}
            disabled={getTotalCourses() === 0}
          >
            Plan Accommodation Menus
          </button>

          <button 
            className="btn btn-primary"
            onClick={() => {
              if (menu?.id) {
                // If menu is saved, navigate to the menu viewer
                navigate(`/menus/${menu.id}`);
              } else {
                // If menu is not saved yet, save it first then navigate
                alert('Please save the menu first before previewing');
              }
            }}
            disabled={getTotalCourses() === 0}
          >
            Preview Full Menu
          </button>
        </div>
      </div>

      {(saving || hasUnsavedChanges) && (
        <div className={`saving-indicator ${hasUnsavedChanges && !saving ? 'unsaved' : ''}`}>
          {saving ? '💾 Saving menu changes...' : '✏️ Unsaved changes (auto-saving)'}
        </div>
      )}

      <div className="days-container">
        {/* Add Day Before button - only show if there are days */}
        {menu?.days?.length > 0 && (
          <div className="add-day-section add-day-before">
            <button className="btn btn-outline add-day-btn" onClick={handleAddDayBefore}>
              <span className="add-icon">+</span>
              Add Day Before First Day
            </button>
          </div>
        )}

        {menu?.days?.map((day, dayIndex) => (
          <DayEditor
            key={day.date}
            day={day}
            dayIndex={dayIndex}
            dayLabel={getDayLabel(day.date, dayIndex)}
            event={event}
            mealTypes={mealTypes}
            expanded={day.expanded}
            onToggle={() => handleToggleDay(dayIndex)}
            onUpdate={(updatedDay) => handleDayUpdate(dayIndex, updatedDay)}
            onDateChange={(newDate) => handleDayDateChange(dayIndex, newDate)}
            onRemove={() => handleRemoveDay(dayIndex)}
            canRemove={menu.days.length > 1}
          />
        ))}

        <div className="add-day-section">
          <button className="btn btn-outline add-day-btn" onClick={handleAddDay}>
            <span className="add-icon">+</span>
            Add Another Day
          </button>
        </div>
      </div>

      {showAccommodationPlanner && (
        <AccommodationPlanner
          menu={menu}
          event={event}
          accommodationMenus={accommodationMenus}
          onClose={() => setShowAccommodationPlanner(false)}
          onAccommodationChange={setAccommodationMenus}
        />
      )}
      
    </div>
  );
}