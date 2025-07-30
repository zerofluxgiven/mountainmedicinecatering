import React, { useState } from 'react';
import MealEditor from './MealEditor';
import { addMealType } from '../../services/mealTypes';
import './DayEditor.css';

export default function DayEditor({ 
  day, 
  dayIndex, 
  dayLabel, 
  event, 
  mealTypes, 
  expanded, 
  onToggle, 
  onUpdate, 
  onDateChange,
  onRemove, 
  canRemove 
}) {
  const [showMealTypeSelector, setShowMealTypeSelector] = useState(false);
  const [showCustomMealInput, setShowCustomMealInput] = useState(false);
  const [customMealName, setCustomMealName] = useState('');
  const [addingCustomMeal, setAddingCustomMeal] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editedDate, setEditedDate] = useState(day.date);

  const handleAddMeal = (mealType) => {
    const newMeal = {
      id: `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: mealType,
      time: mealTypes[mealType].defaultTime,
      color: mealTypes[mealType].color,
      courses: []
    };

    const updatedDay = {
      ...day,
      meals: [...day.meals, newMeal]
    };

    onUpdate(updatedDay);
    setShowMealTypeSelector(false);
  };

  const handleRemoveMeal = (mealIndex) => {
    // Allow removing meals even if it's the last one (for single meal events)
    // Remove without confirmation for smoother UX with auto-save
    const updatedDay = {
      ...day,
      meals: day.meals.filter((_, index) => index !== mealIndex)
    };

    onUpdate(updatedDay);
  };

  const handleMealUpdate = (mealIndex, updatedMeal) => {
    const updatedDay = {
      ...day,
      meals: day.meals.map((meal, index) => 
        index === mealIndex ? updatedMeal : meal
      )
    };

    onUpdate(updatedDay);
  };

  const getTotalCourses = () => {
    return day.meals.reduce((total, meal) => total + meal.courses.length, 0);
  };

  const getTotalRecipes = () => {
    return day.meals.reduce((total, meal) => 
      total + meal.courses.reduce((courseTotal, course) => {
        // Handle both old and new course structure
        if (course.recipes) {
          return courseTotal + course.recipes.length;
        } else if (course.recipe_id) {
          // Old structure - single recipe per course
          return courseTotal + 1;
        }
        return courseTotal;
      }, 0), 0
    );
  };

  const getAllergenWarnings = () => {
    const warnings = new Set();
    const eventAllergens = event?.allergens || [];
    
    day.meals.forEach(meal => {
      meal.courses.forEach(course => {
        // Handle new structure with multiple recipes
        if (course.recipes) {
          course.recipes.forEach(recipe => {
            (recipe.allergens || []).forEach(allergen => {
              if (eventAllergens.includes(allergen)) {
                warnings.add(allergen);
              }
            });
          });
        } 
        // Handle old structure with single recipe
        else if (course.allergens) {
          course.allergens.forEach(allergen => {
            if (eventAllergens.includes(allergen)) {
              warnings.add(allergen);
            }
          });
        }
      });
    });

    return Array.from(warnings);
  };

  const allergenWarnings = getAllergenWarnings();

  const handleDateChange = () => {
    if (editedDate !== day.date && onDateChange) {
      onDateChange(editedDate);
      setIsEditingDate(false);
    }
  };

  const handleCancelDateEdit = () => {
    setEditedDate(day.date);
    setIsEditingDate(false);
  };

  return (
    <div className={`day-editor ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="day-header" onClick={onToggle} data-meal-count={`${day.meals.length} meals`}>
        <div className="day-title">
          <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
          <h3>{dayLabel}</h3>
          {isEditingDate ? (
            <div className="date-editor" onClick={(e) => e.stopPropagation()}>
              <input
                type="date"
                value={editedDate}
                onChange={(e) => setEditedDate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleDateChange();
                  } else if (e.key === 'Escape') {
                    handleCancelDateEdit();
                  }
                }}
                autoFocus
              />
              <button 
                className="btn btn-sm btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDateChange();
                }}
                title="Save date"
                type="button"
              >
                Save
              </button>
              <button 
                className="btn btn-sm btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelDateEdit();
                }}
                title="Cancel"
                type="button"
              >
                Cancel
              </button>
            </div>
          ) : (
            <span 
              className="day-date" 
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingDate(true);
              }}
              title="Click to change date"
              style={{ cursor: 'pointer' }}
            >
              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        <div className="day-summary">
          <span className="meal-count">{day.meals.length} meals</span>
          <span className="course-count">{getTotalCourses()} courses</span>
          <span className="recipe-count">{getTotalRecipes()} recipes</span>
          
          {allergenWarnings.length > 0 && (
            <span className="allergen-warnings">
              ⚠️ {allergenWarnings.join(', ')}
            </span>
          )}

          <div className="day-actions" onClick={(e) => e.stopPropagation()}>
            <button 
              className="btn btn-sm btn-outline"
              onClick={() => setShowMealTypeSelector(true)}
              title="Add meal"
            >
              + Meal
            </button>
            
            {canRemove && (
              <button 
                className="btn btn-sm btn-danger remove-day-btn"
                onClick={onRemove}
                title="Remove this day from the menu"
              >
                <span className="remove-icon">✕</span>
                <span className="remove-text">Remove Day</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="day-content">
          <div className="meals-container">
            {day.meals.map((meal, mealIndex) => (
              <MealEditor
                key={meal.id}
                meal={meal}
                mealIndex={mealIndex}
                event={event}
                mealTypes={mealTypes}
                onUpdate={(updatedMeal) => handleMealUpdate(mealIndex, updatedMeal)}
                onRemove={() => handleRemoveMeal(mealIndex)}
                canRemove={true}
              />
            ))}
          </div>

          {showMealTypeSelector && (
            <div className="meal-type-selector">
              <div className="selector-overlay" onClick={() => setShowMealTypeSelector(false)}></div>
              <div className="selector-modal">
                <h4>Add New Meal</h4>
                <div className="meal-type-options">
                  {Object.entries(mealTypes).map(([type, config]) => (
                    <button
                      key={type}
                      className="meal-type-option"
                      style={{ backgroundColor: config.color }}
                      onClick={() => handleAddMeal(type)}
                    >
                      <span className="meal-icon">{config.icon}</span>
                      <span className="meal-label">{config.label}</span>
                      <span className="meal-time">{config.defaultTime}</span>
                    </button>
                  ))}
                  
                  {/* Custom Meal Type Option */}
                  <button
                    className="meal-type-option custom"
                    onClick={() => setShowCustomMealInput(true)}
                  >
                    <span className="meal-icon">➕</span>
                    <span className="meal-label">Custom Meal Type</span>
                    <span className="meal-time">Add New</span>
                  </button>
                </div>
                
                {showCustomMealInput && (
                  <div className="custom-meal-input">
                    <input
                      type="text"
                      value={customMealName}
                      onChange={(e) => setCustomMealName(e.target.value)}
                      placeholder="Enter meal type name"
                      onKeyPress={async (e) => {
                        if (e.key === 'Enter' && customMealName.trim()) {
                          setAddingCustomMeal(true);
                          try {
                            const newMealType = await addMealType(customMealName.trim());
                            // Add the meal with the new type
                            handleAddMeal(newMealType.id);
                            setCustomMealName('');
                            setShowCustomMealInput(false);
                          } catch (error) {
                            console.error('Error adding custom meal type:', error);
                            alert('Failed to add custom meal type');
                          } finally {
                            setAddingCustomMeal(false);
                          }
                        }
                      }}
                      disabled={addingCustomMeal}
                      autoFocus
                    />
                    <div className="custom-meal-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={async () => {
                          if (customMealName.trim()) {
                            setAddingCustomMeal(true);
                            try {
                              const newMealType = await addMealType(customMealName.trim());
                              // Add the meal with the new type
                              handleAddMeal(newMealType.id);
                              setCustomMealName('');
                              setShowCustomMealInput(false);
                            } catch (error) {
                              console.error('Error adding custom meal type:', error);
                              alert('Failed to add custom meal type');
                            } finally {
                              setAddingCustomMeal(false);
                            }
                          }
                        }}
                        disabled={!customMealName.trim() || addingCustomMeal}
                      >
                        Add
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setCustomMealName('');
                          setShowCustomMealInput(false);
                        }}
                        disabled={addingCustomMeal}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowMealTypeSelector(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}