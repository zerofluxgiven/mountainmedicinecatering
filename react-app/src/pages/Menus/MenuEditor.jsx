import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import MealCard from '../../components/Menu/MealCard';
import RecipePicker from '../../components/Menu/RecipePicker';
import './MenuEditor.css';

export default function MenuEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { recipes } = useApp();
  
  const isNew = !id;
  const template = location.state?.template;
  const eventId = location.state?.eventId; // Get event ID if passed from event viewer
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_id: eventId || '',
    meals: []
  });
  
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [showAllergyWarning, setShowAllergyWarning] = useState(false);
  const [allergyConflicts, setAllergyConflicts] = useState([]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadEvents();
    if (template) {
      // Load from template
      setFormData({
        ...template,
        event_id: '',
        sections: template.sections || []
      });
    } else if (!isNew) {
      loadMenu();
    }
  }, [id, isNew, template]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadEvents = () => {
    const q = query(collection(db, 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsData);
    });
    return () => unsubscribe();
  };

  const loadMenu = async () => {
    try {
      setLoading(true);
      const menuDoc = await getDoc(doc(db, 'menus', id));
      
      if (!menuDoc.exists()) {
        setError('Menu not found');
        return;
      }

      const data = menuDoc.data();
      setFormData({
        name: data.name || '',
        description: data.description || '',
        event_id: data.event_id || '',
        meals: data.meals || data.sections || [] // Support old sections format temporarily
      });
    } catch (err) {
      console.error('Error loading menu:', err);
      setError('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    
    // Load event details when event is selected
    if (field === 'event_id' && value) {
      const event = events.find(e => e.id === value);
      setCurrentEvent(event);
    }
  };

  const addMeal = () => {
    const newMeal = {
      id: `meal-${Date.now()}`,
      type: 'dinner',
      description: '',
      instructions: '',
      notes: '',
      recipes: []
    };
    setFormData(prev => ({
      ...prev,
      meals: [...prev.meals, newMeal]
    }));
  };

  const updateMeal = (mealId, updates) => {
    setFormData(prev => ({
      ...prev,
      meals: prev.meals.map(meal =>
        meal.id === mealId ? { ...meal, ...updates } : meal
      )
    }));
  };

  const removeMeal = (mealId) => {
    setFormData(prev => ({
      ...prev,
      meals: prev.meals.filter(meal => meal.id !== mealId)
    }));
  };

  const addRecipeToMeal = (mealId, recipe) => {
    setFormData(prev => ({
      ...prev,
      meals: prev.meals.map(meal =>
        meal.id === mealId
          ? { ...meal, recipes: [...meal.recipes, recipe] }
          : meal
      )
    }));
  };

  const removeRecipeFromMeal = (mealId, recipeId) => {
    setFormData(prev => ({
      ...prev,
      meals: prev.meals.map(meal =>
        meal.id === mealId
          ? { ...meal, recipes: meal.recipes.filter(recipe => recipe.id !== recipeId) }
          : meal
      )
    }));
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const draggedItem = findRecipeById(active.id);
    setActiveItem(draggedItem);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    // Check if we're moving sections
    const activeSectionIndex = formData.meals.findIndex(s => s.id === activeId);
    const overSectionIndex = formData.meals.findIndex(s => s.id === overId);

    if (activeSectionIndex !== -1 && overSectionIndex !== -1) {
      // Moving meals
      setFormData(prev => ({
        ...prev,
        meals: arrayMove(prev.meals, activeSectionIndex, overSectionIndex)
      }));
    } else {
      // Moving items within or between meals
      // This is handled within MealCard components
    }
  };

  const findRecipeById = (id) => {
    for (const meal of formData.meals) {
      const recipe = meal.recipes.find(recipe => recipe.id === id);
      if (recipe) return recipe;
    }
    return null;
  };

  const openRecipePicker = (mealId) => {
    setSelectedMeal(mealId);
    setShowRecipePicker(true);
  };

  const handleRecipeSelect = async (recipe) => {
    if (selectedMeal) {
      // Calculate scaled serving size if event is selected
      let scaledServes = recipe.serves;
      if (currentEvent) {
        const totalPeople = (currentEvent.guest_count || 0) + (currentEvent.staff_count || 0);
        if (totalPeople > 0) {
          scaledServes = totalPeople;
        }
      }
      
      const menuRecipe = {
        id: `recipe-${Date.now()}`,
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        serves: scaledServes,
        original_serves: recipe.serves,
        notes: '',
        allergens: recipe.allergens || []
      };
      
      // Check for allergy conflicts if event is selected
      if (currentEvent && currentEvent.allergens?.length > 0 && recipe.allergens?.length > 0) {
        const conflicts = currentEvent.allergens.filter(allergen => 
          recipe.allergens.includes(allergen)
        );
        
        if (conflicts.length > 0) {
          setAllergyConflicts(conflicts.map(allergen => ({
            allergen,
            recipe: recipe.name
          })));
          setShowAllergyWarning(true);
          // Store the pending recipe to add after confirmation
          setFormData(prev => ({ ...prev, pendingRecipe: { mealId: selectedMeal, recipe: menuRecipe } }));
          setShowRecipePicker(false);
          setSelectedMeal(null);
          return;
        }
      }
      
      addRecipeToMeal(selectedMeal, menuRecipe);
    }
    setShowRecipePicker(false);
    setSelectedMeal(null);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Menu name is required';
    }
    
    if (formData.meals.length === 0) {
      errors.meals = 'Menu must have at least one meal';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Get event name if event is selected
      let eventName = '';
      if (formData.event_id) {
        const selectedEvent = events.find(e => e.id === formData.event_id);
        eventName = selectedEvent?.name || '';
      }
      
      // Prepare menu data
      const menuData = {
        ...formData,
        event_name: eventName,
        updated_at: serverTimestamp()
      };
      
      
      if (isNew) {
        // Add creation metadata
        menuData.created_at = serverTimestamp();
        menuData.created_by = currentUser.email;
        
        // Generate ID
        const newId = doc(collection(db, 'menus')).id;
        await setDoc(doc(db, 'menus', newId), menuData);
        
        navigate(`/menus/${newId}`);
      } else {
        // Update existing menu
        await updateDoc(doc(db, 'menus', id), menuData);
        navigate(`/menus/${id}`);
      }
    } catch (err) {
      console.error('Error saving menu:', err);
      setError('Failed to save menu. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate(id ? `/menus/${id}` : '/menus');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading menu...</p>
      </div>
    );
  }

  if (error && !isNew) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/menus')}
        >
          Back to Menus
        </button>
      </div>
    );
  }

  return (
    <div className="menu-editor">
      <form onSubmit={handleSubmit}>
        <div className="editor-header">
          <h1>{isNew ? 'Create New Menu' : 'Edit Menu'}</h1>
          <div className="editor-actions">
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Menu'}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="editor-content">
          {/* Basic Information */}
          <section className="editor-section">
            <h2>Menu Information</h2>
            
            <div className="form-group">
              <label htmlFor="name">Menu Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter menu name"
                className={validationErrors.name ? 'error' : ''}
              />
              {validationErrors.name && (
                <span className="field-error">{validationErrors.name}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="event_id">Associated Event</label>
                <select
                  id="event_id"
                  value={formData.event_id}
                  onChange={(e) => handleInputChange('event_id', e.target.value)}
                >
                  <option value="">No event</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name} - {new Date(event.event_date?.toDate?.() || event.event_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the menu..."
                rows="3"
              />
            </div>
          </section>

          {/* Menu Sections */}
          <section className="editor-section">
            <div className="section-header">
              <h2>Menu Meals</h2>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={addMeal}
              >
                + Add Meal
              </button>
            </div>
            
            {validationErrors.meals && (
              <span className="field-error">{validationErrors.meals}</span>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={formData.meals.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="menu-meals">
                  {formData.meals.map((meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      onUpdate={(updates) => updateMeal(meal.id, updates)}
                      onRemove={() => removeMeal(meal.id)}
                      onAddRecipe={() => openRecipePicker(meal.id)}
                      onRemoveRecipe={(recipeId) => removeRecipeFromMeal(meal.id, recipeId)}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeItem ? (
                  <div className="drag-item">
                    {activeItem.recipe_name}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {formData.meals.length === 0 && (
              <div className="empty-sections">
                <p>No meals yet. Add your first meal to start building the menu.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={addMeal}
                >
                  Add First Meal
                </button>
              </div>
            )}
          </section>
        </div>
      </form>

      {/* Recipe Picker Modal */}
      {showRecipePicker && (
        <RecipePicker
          onSelect={handleRecipeSelect}
          onClose={() => {
            setShowRecipePicker(false);
            setSelectedMeal(null);
          }}
        />
      )}

      {/* Allergy Warning Modal */}
      {showAllergyWarning && (
        <div className="modal-overlay" onClick={() => setShowAllergyWarning(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>⚠️ Allergy Warning</h3>
            <p>The following allergens in this recipe match guest allergies:</p>
            <ul className="allergy-conflicts">
              {allergyConflicts.map((conflict, index) => (
                <li key={index}>
                  <strong>{conflict.allergen}</strong> in {conflict.recipe}
                </li>
              ))}
            </ul>
            <p>Do you want to continue adding this recipe?</p>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowAllergyWarning(false);
                  setAllergyConflicts([]);
                  setFormData(prev => {
                    const { pendingRecipe, ...rest } = prev;
                    return rest;
                  });
                }}
              >
                No, Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  if (formData.pendingRecipe) {
                    addRecipeToMeal(formData.pendingRecipe.mealId, formData.pendingRecipe.recipe);
                  }
                  setShowAllergyWarning(false);
                  setAllergyConflicts([]);
                  setFormData(prev => {
                    const { pendingRecipe, ...rest } = prev;
                    return rest;
                  });
                }}
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}