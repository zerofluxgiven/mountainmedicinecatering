import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import RecipeSelector from './RecipeSelector';
import { calculateRecipeServings, getEventAllergies } from '../../services/menuScaling';
import { useDeezNuts } from '../../contexts/DeezNutsContext';
import './MealEditor.css';

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

// Default course names
const DEFAULT_COURSE_NAMES = [
  'Appetizers',
  'Salads',
  'Soups',
  'Main Course',
  'Sides',
  'Desserts',
  'Beverages'
];

export default function MealEditor({ 
  meal, 
  mealIndex, 
  event, 
  mealTypes, 
  onUpdate, 
  onRemove, 
  canRemove 
}) {
  const [recipes, setRecipes] = useState([]);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [selectedCourseIndex, setSelectedCourseIndex] = useState(null);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [eventAllergies, setEventAllergies] = useState([]);
  const [editingCourseName, setEditingCourseName] = useState(null);
  const [newCourseName, setNewCourseName] = useState('');
  const { checkForNuts } = useDeezNuts();

  useEffect(() => {
    loadRecipes();
  }, []);

  useEffect(() => {
    if (event?.id) {
      loadEventAllergies();
    }
  }, [event?.id]);

  useEffect(() => {
    // Migrate old structure to new structure if needed
    if (meal.courses && meal.courses.length > 0 && !meal.courses[0].recipes) {
      migrateOldCourseStructure();
    }
  }, [meal]);

  const migrateOldCourseStructure = () => {
    // Convert old single-recipe courses to new multi-recipe structure
    const migratedCourses = meal.courses.map((course, index) => {
      if (!course.recipes) {
        return {
          id: course.id || `course_${Date.now()}_${index}`,
          name: `Course ${index + 1}`,
          position: index,
          recipes: course.recipe_id ? [{
            id: `course_recipe_${Date.now()}_${index}`,
            recipe_id: course.recipe_id,
            recipe_name: course.name,
            servings: course.servings,
            scalingInfo: course.scalingInfo,
            notes: course.notes || '',
            allergens: course.allergens || [],
            dietary_tags: course.dietary_tags || []
          }] : [],
          notes: ''
        };
      }
      return course;
    });

    onUpdate({
      ...meal,
      courses: migratedCourses
    });
  };

  const loadEventAllergies = async () => {
    if (!event?.id) return;
    const allergies = await getEventAllergies(event.id);
    setEventAllergies(allergies);
  };

  const loadRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const recipesSnapshot = await getDocs(collection(db, 'recipes'));
      const recipesData = recipesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecipes(recipesData);
    } catch (err) {
      console.error('Error loading recipes:', err);
    } finally {
      setLoadingRecipes(false);
    }
  };

  // Always prefer mealTypes settings over stored meal color
  const mealConfig = mealTypes[meal.type] ? {
    ...mealTypes[meal.type],
    icon: mealTypes[meal.type].icon || MEAL_ICONS[meal.type] || '🍽️'
  } : {
    label: meal.type.charAt(0).toUpperCase() + meal.type.slice(1),
    color: meal.color || '#F0F0F0',
    opacity: 1,
    defaultTime: meal.time || '12:00 PM',
    icon: MEAL_ICONS[meal.type] || '🍽️'
  };

  const handleTimeChange = (newTime) => {
    onUpdate({
      ...meal,
      time: newTime
    });
  };

  const handleMealTypeChange = (newType) => {
    const newConfig = mealTypes[newType] || {
      color: '#F0F0F0',
      defaultTime: '12:00 PM'
    };
    // Don't store color in meal object anymore - always get from settings
    onUpdate({
      ...meal,
      type: newType,
      time: newConfig.defaultTime || meal.time
    });
  };

  const handleAddCourse = () => {
    const courseName = DEFAULT_COURSE_NAMES[meal.courses.length] || `Course ${meal.courses.length + 1}`;
    const newCourse = {
      id: `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: courseName,
      position: meal.courses.length,
      recipes: [],
      accommodations: [], // NEW: Support for inline accommodations
      notes: ''
    };

    onUpdate({
      ...meal,
      courses: [...meal.courses, newCourse]
    });
  };

  const handleAddRecipeClick = (courseIndex) => {
    setSelectedCourseIndex(courseIndex);
    setShowRecipeSelector(true);
  };

  const handleAddRecipe = async (recipe) => {
    if (selectedCourseIndex === null) return;

    // Check for nuts when adding to menu
    checkForNuts(recipe, 'add');
    
    // Calculate proper servings with allergy adjustments
    const scalingInfo = await calculateRecipeServings(recipe, event, eventAllergies);
    
    const newRecipe = {
      id: `course_recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      servings: scalingInfo.adjustedServings,
      scalingInfo: scalingInfo, // Store full scaling info for display
      notes: '',
      allergens: recipe.allergens || [],
      dietary_tags: recipe.dietary_tags || []
    };

    const updatedCourses = [...meal.courses];
    updatedCourses[selectedCourseIndex].recipes.push(newRecipe);

    onUpdate({
      ...meal,
      courses: updatedCourses
    });

    setShowRecipeSelector(false);
    setSelectedCourseIndex(null);
  };

  const handleRemoveCourse = (courseIndex) => {
    // Remove without confirmation for smoother UX with auto-save
    onUpdate({
      ...meal,
      courses: meal.courses.filter((_, index) => index !== courseIndex)
    });
  };

  const handleRemoveAccommodation = (courseIndex, accIndex) => {
    const updatedCourses = [...meal.courses];
    const course = updatedCourses[courseIndex];
    
    // Remove the accommodation
    course.accommodations = course.accommodations.filter((_, i) => i !== accIndex);
    
    // Recalculate main recipe servings if needed
    if (course.recipes.length > 0 && event) {
      const totalAccommodationServings = course.accommodations.reduce(
        (sum, acc) => sum + (acc.servings || 0), 
        0
      );
      course.recipes[0].servings = event.guest_count - totalAccommodationServings;
    }
    
    onUpdate({
      ...meal,
      courses: updatedCourses
    });
  };

  const handleRemoveRecipe = (courseIndex, recipeIndex) => {
    // Remove without confirmation for smoother UX with auto-save
    const updatedCourses = [...meal.courses];
    updatedCourses[courseIndex].recipes = updatedCourses[courseIndex].recipes.filter((_, index) => index !== recipeIndex);
    
    onUpdate({
      ...meal,
      courses: updatedCourses
    });
  };

  const handleCourseNameEdit = (courseIndex) => {
    setEditingCourseName(courseIndex);
    setNewCourseName(meal.courses[courseIndex].name);
  };

  const handleCourseNameSave = (courseIndex) => {
    if (newCourseName.trim()) {
      const updatedCourses = [...meal.courses];
      updatedCourses[courseIndex].name = newCourseName.trim();
      
      onUpdate({
        ...meal,
        courses: updatedCourses
      });
    }
    setEditingCourseName(null);
    setNewCourseName('');
  };

  const handleCourseNotesUpdate = (courseIndex, notes) => {
    const updatedCourses = [...meal.courses];
    updatedCourses[courseIndex].notes = notes;
    
    onUpdate({
      ...meal,
      courses: updatedCourses
    });
  };

  const handleRecipeUpdate = async (courseIndex, recipeIndex, field, value) => {
    const updatedCourses = [...meal.courses];
    const recipe = updatedCourses[courseIndex].recipes[recipeIndex];
    
    // If servings are being updated manually, recalculate the scaling info
    if (field === 'servings' && recipe.recipe_id) {
      const recipeData = recipes.find(r => r.id === recipe.recipe_id);
      if (recipeData) {
        const scalingInfo = await calculateRecipeServings(recipeData, event, eventAllergies);
        // Update with manual override but keep the warning info
        updatedCourses[courseIndex].recipes[recipeIndex] = {
          ...recipe,
          [field]: value,
          scalingInfo: {
            ...scalingInfo,
            adjustedServings: value, // Use manual value
            manuallyAdjusted: true
          }
        };
      } else {
        updatedCourses[courseIndex].recipes[recipeIndex] = { ...recipe, [field]: value };
      }
    } else {
      updatedCourses[courseIndex].recipes[recipeIndex] = { ...recipe, [field]: value };
    }
    
    onUpdate({
      ...meal,
      courses: updatedCourses
    });
  };

  const getTotalServings = () => {
    return meal.courses.reduce((total, course) => 
      total + course.recipes.reduce((courseTotal, recipe) => 
        courseTotal + (recipe.servings || 0), 0
      ), 0
    );
  };

  const getTotalRecipes = () => {
    return meal.courses.reduce((total, course) => total + course.recipes.length, 0);
  };

  const getUniqueAllergens = () => {
    const allergens = new Set();
    meal.courses.forEach(course => {
      course.recipes.forEach(recipe => {
        (recipe.allergens || []).forEach(allergen => allergens.add(allergen));
      });
    });
    return Array.from(allergens);
  };

  const hasAllergenConflicts = () => {
    const mealAllergens = getUniqueAllergens();
    const eventAllergens = event?.allergens || [];
    return mealAllergens.some(allergen => eventAllergens.includes(allergen));
  };

  return (
    <div className="meal-editor" style={{ 
      backgroundColor: mealConfig.color,
      opacity: mealConfig.opacity || 1 
    }}>
      <div className="meal-header">
        <div className="meal-title">
          <span className="meal-icon">{mealConfig.icon}</span>
          
          <select 
            value={meal.type}
            onChange={(e) => handleMealTypeChange(e.target.value)}
            className="meal-type-select"
          >
            {Object.entries(mealTypes).map(([type, config]) => (
              <option key={type} value={type}>
                {config.label}
              </option>
            ))}
          </select>

          <input
            type="time"
            value={meal.time}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="meal-time-input"
          />
        </div>

        <div className="meal-summary">
          <span className="course-count">{meal.courses.length} courses</span>
          <span className="recipe-count">{getTotalRecipes()} recipes</span>
          <span className="serving-count">Serves: {getTotalServings()}</span>
          
          {hasAllergenConflicts() && (
            <span className="conflict-warning" title={`Contains: ${getUniqueAllergens().join(', ')}`}>
              ⚠️ Allergen Alert
            </span>
          )}

          <div className="meal-actions">
            <button 
              className="btn btn-sm btn-primary"
              onClick={handleAddCourse}
            >
              + Course
            </button>
            
            {canRemove && (
              <button 
                className="btn btn-sm btn-danger"
                onClick={onRemove}
                title="Remove meal"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {meal.courses.length > 0 && (
        <div className="courses-container">
          {meal.courses.map((course, courseIndex) => (
            <div key={course.id} className="course-item">
              <div className="course-header">
                {editingCourseName === courseIndex ? (
                  <div className="course-name-editor">
                    <input
                      type="text"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCourseNameSave(courseIndex);
                        } else if (e.key === 'Escape') {
                          setEditingCourseName(null);
                          setNewCourseName('');
                        }
                      }}
                      autoFocus
                      className="course-name-input"
                    />
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => handleCourseNameSave(courseIndex)}
                    >
                      ✓
                    </button>
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        setEditingCourseName(null);
                        setNewCourseName('');
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <h5 
                    className="course-name"
                    onClick={() => handleCourseNameEdit(courseIndex)}
                    title="Click to edit course name"
                  >
                    {course.name}
                  </h5>
                )}
                
                <div className="course-actions">
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => handleAddRecipeClick(courseIndex)}
                    disabled={loadingRecipes}
                  >
                    + Recipe
                  </button>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => handleRemoveCourse(courseIndex)}
                    title="Remove course"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {course.recipes.length > 0 && (
                <div className="course-recipes">
                  {course.recipes.map((recipe, recipeIndex) => (
                    <div key={recipe.id} className="recipe-item">
                      <div className="recipe-header">
                        <span className="recipe-name">{recipe.recipe_name}</span>
                        <button 
                          className="btn btn-sm btn-outline"
                          onClick={() => handleRemoveRecipe(courseIndex, recipeIndex)}
                          title="Remove recipe"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="recipe-details">
                        {recipe.scalingInfo?.warning && (
                          <div className="scaling-warning">
                            <span className="warning-icon">⚠️</span>
                            <span className="warning-text">{recipe.scalingInfo.warning.message}</span>
                          </div>
                        )}
                        
                        <div className="recipe-meta">
                          <label>
                            Servings:
                            <input
                              type="number"
                              value={recipe.servings}
                              onChange={(e) => handleRecipeUpdate(courseIndex, recipeIndex, 'servings', parseInt(e.target.value) || 0)}
                              min="1"
                              className="servings-input"
                            />
                          </label>

                          {recipe.allergens && recipe.allergens.length > 0 && (
                            <div className="allergen-tags">
                              <span className="allergen-label">Contains:</span>
                              {recipe.allergens.map(allergen => (
                                <span 
                                  key={allergen} 
                                  className={`allergen-tag ${event?.allergens?.includes(allergen) ? 'conflict' : ''}`}
                                >
                                  {allergen}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="recipe-notes">
                          <textarea
                            value={recipe.notes}
                            onChange={(e) => handleRecipeUpdate(courseIndex, recipeIndex, 'notes', e.target.value)}
                            placeholder="Recipe notes (preparation, modifications, etc.)"
                            className="notes-input"
                            rows="2"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {course.recipes.length === 0 && (
                <div className="empty-course">
                  <p>No recipes in this course yet</p>
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleAddRecipeClick(courseIndex)}
                    disabled={loadingRecipes}
                  >
                    Add Recipe
                  </button>
                </div>
              )}

              {/* Accommodations Section */}
              {course.accommodations && course.accommodations.length > 0 && (
                <div className="accommodations-section">
                  <h6 className="accommodations-header">Dietary Accommodations:</h6>
                  <div className="accommodations-list">
                    {course.accommodations.map((acc, accIndex) => (
                      <div key={acc.id} className="accommodation-item">
                        <div className="accommodation-header">
                          <span className="accommodation-name">{acc.name}</span>
                          <span className="accommodation-servings">({acc.servings} servings)</span>
                          <button 
                            className="btn btn-sm btn-outline"
                            onClick={() => handleRemoveAccommodation(courseIndex, accIndex)}
                            title="Remove accommodation"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="accommodation-details">
                          <span className="for-guests">For: {acc.for_guests?.join(', ') || 'TBD'}</span>
                          {acc.reason && <span className="reason">({acc.reason})</span>}
                        </div>
                        {acc.allergens && acc.allergens.length > 0 && (
                          <div className="accommodation-allergens">
                            {acc.allergens.map(allergen => (
                              <span key={allergen} className="allergen-tag">{allergen}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="course-notes">
                <textarea
                  value={course.notes}
                  onChange={(e) => handleCourseNotesUpdate(courseIndex, e.target.value)}
                  placeholder="Course notes (e.g., serving instructions, timing, etc.)"
                  className="course-notes-input"
                  rows="2"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {meal.courses.length === 0 && (
        <div className="empty-meal">
          <p>No courses added yet. Click "+ Course" above to add your first course.</p>
        </div>
      )}

      {showRecipeSelector && (
        <RecipeSelector
          recipes={recipes}
          event={event}
          onSelect={handleAddRecipe}
          onClose={() => {
            setShowRecipeSelector(false);
            setSelectedCourseIndex(null);
          }}
        />
      )}
    </div>
  );
}