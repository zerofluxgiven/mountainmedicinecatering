import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { aiMonitor } from '../../services/aiMonitor';
import RecipeSelector from '../Menu/RecipeSelector';
import './AccommodationPlanner.css';

export default function AccommodationPlanner({ 
  menu, 
  event, 
  accommodationMenus, 
  onClose, 
  onAccommodationChange 
}) {
  const { currentUser } = useAuth();
  const { recipes } = useApp();
  const [conflicts, setConflicts] = useState([]);
  const [processing, setProcessing] = useState(true);
  const [creatingAlternatives, setCreatingAlternatives] = useState(false);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  useEffect(() => {
    analyzeMenuConflicts();
  }, [menu, event]);

  const analyzeMenuConflicts = () => {
    setProcessing(true);
    
    const foundConflicts = [];
    const eventAllergens = event?.allergens || [];
    const eventDiets = event?.dietary_restrictions || [];
    const guestsWithRestrictions = event?.guests_with_restrictions || [];

    // Analyze each day and meal for conflicts
    menu?.days?.forEach((day, dayIndex) => {
      day.meals?.forEach((meal, mealIndex) => {
        meal.courses?.forEach((course, courseIndex) => {
          // Handle new structure where courses contain multiple recipes
          if (course.recipes && Array.isArray(course.recipes)) {
            // New structure: analyze each recipe within the course
            course.recipes.forEach((recipe, recipeIndex) => {
              const recipeAllergens = recipe.allergens || [];
              const recipeDiets = recipe.dietary_tags || [];

              // Check allergen conflicts
              const allergenConflicts = recipeAllergens.filter(allergen => 
                eventAllergens.includes(allergen)
              );

              // Check dietary conflicts
              const dietaryConflicts = [];
              if (eventDiets.includes('vegan') && !recipeDiets.includes('vegan')) {
                dietaryConflicts.push('vegan');
              }
              if (eventDiets.includes('vegetarian') && !recipeDiets.includes('vegetarian') && !recipeDiets.includes('vegan')) {
                dietaryConflicts.push('vegetarian');
              }
              if (eventDiets.includes('gluten-free') && recipeAllergens.includes('gluten')) {
                dietaryConflicts.push('gluten-free');
              }

              if (allergenConflicts.length > 0 || dietaryConflicts.length > 0) {
                // Count affected guests
                const affectedGuests = guestsWithRestrictions.filter(guest => {
                  return allergenConflicts.some(allergen => guest.allergies?.includes(allergen)) ||
                         dietaryConflicts.some(diet => guest.diet === diet);
                });

                foundConflicts.push({
                  id: `conflict_${dayIndex}_${mealIndex}_${courseIndex}_${recipeIndex}`,
                  day: day,
                  dayIndex,
                  meal: meal,
                  mealIndex,
                  course: course,
                  courseIndex,
                  recipe: recipe,
                  recipeIndex,
                  allergenConflicts,
                  dietaryConflicts,
                  affectedGuests,
                  suggestions: generateSuggestions(recipe, allergenConflicts, dietaryConflicts)
                });
              }
            });
          } else {
            // Old structure (backward compatibility): course has direct recipe properties
            const courseAllergens = course.allergens || [];
            const courseDiets = course.dietary_tags || [];

            // Check allergen conflicts
            const allergenConflicts = courseAllergens.filter(allergen => 
              eventAllergens.includes(allergen)
            );

            // Check dietary conflicts
            const dietaryConflicts = [];
            if (eventDiets.includes('vegan') && !courseDiets.includes('vegan')) {
              dietaryConflicts.push('vegan');
            }
            if (eventDiets.includes('vegetarian') && !courseDiets.includes('vegetarian') && !courseDiets.includes('vegan')) {
              dietaryConflicts.push('vegetarian');
            }
            if (eventDiets.includes('gluten-free') && courseAllergens.includes('gluten')) {
              dietaryConflicts.push('gluten-free');
            }

            if (allergenConflicts.length > 0 || dietaryConflicts.length > 0) {
              // Count affected guests
              const affectedGuests = guestsWithRestrictions.filter(guest => {
                return allergenConflicts.some(allergen => guest.allergies?.includes(allergen)) ||
                       dietaryConflicts.some(diet => guest.diet === diet);
              });

              foundConflicts.push({
                id: `conflict_${dayIndex}_${mealIndex}_${courseIndex}`,
                day: day,
                dayIndex,
                meal: meal,
                mealIndex,
                course: course,
                courseIndex,
                allergenConflicts,
                dietaryConflicts,
                affectedGuests,
                suggestions: generateSuggestions(course, allergenConflicts, dietaryConflicts)
              });
            }
          }
        });
      });
    });

    setConflicts(foundConflicts);
    setProcessing(false);
  };

  const generateSuggestions = (item, allergenConflicts, dietaryConflicts) => {
    const suggestions = [];
    const itemName = item.recipe_name || item.name; // Handle both new and old structure

    // Generate suggestions based on conflict types
    if (allergenConflicts.includes('gluten')) {
      suggestions.push({
        type: 'gluten-free',
        description: `Create gluten-free version of ${itemName}`,
        modifications: [
          'Replace wheat flour with almond or rice flour',
          'Use gluten-free pasta or bread',
          'Ensure all sauces and seasonings are gluten-free'
        ]
      });
    }

    if (allergenConflicts.includes('dairy')) {
      suggestions.push({
        type: 'dairy-free',
        description: `Create dairy-free version of ${itemName}`,
        modifications: [
          'Replace dairy milk with plant-based alternatives',
          'Use nutritional yeast instead of cheese',
          'Replace butter with olive oil or vegan butter'
        ]
      });
    }

    if (allergenConflicts.includes('nuts')) {
      suggestions.push({
        type: 'nut-free',
        description: `Create nut-free version of ${itemName}`,
        modifications: [
          'Replace nuts with seeds (sunflower, pumpkin)',
          'Use seed butters instead of nut butters',
          'Ensure no cross-contamination'
        ]
      });
    }

    if (dietaryConflicts.includes('vegan')) {
      suggestions.push({
        type: 'vegan',
        description: `Create vegan version of ${itemName}`,
        modifications: [
          'Replace all animal products with plant-based alternatives',
          'Use tofu, tempeh, or legumes for protein',
          'Replace eggs with flax eggs or aquafaba'
        ]
      });
    }

    if (dietaryConflicts.includes('vegetarian')) {
      suggestions.push({
        type: 'vegetarian',
        description: `Create vegetarian version of ${itemName}`,
        modifications: [
          'Replace meat with plant-based proteins',
          'Use mushrooms for umami flavor',
          'Add beans or lentils for substance'
        ]
      });
    }

    // Add generic alternative suggestion
    suggestions.push({
      type: 'alternative',
      description: `Provide alternative dish`,
      modifications: [
        'Select a completely different recipe that meets all dietary needs',
        'Consider seasonal and locally available ingredients',
        'Ensure it complements the rest of the meal'
      ]
    });

    return suggestions;
  };

  const handleCreateAlternatives = async () => {
    setCreatingAlternatives(true);

    try {
      // Create accommodation menus for each conflict
      const newAccommodations = [];

      for (const conflict of conflicts) {
        if (conflict.affectedGuests.length > 0) {
          const accommodationData = {
            main_menu_id: menu.id,
            event_id: event.id,
            type: 'accommodation',
            day_index: conflict.dayIndex,
            meal_index: conflict.mealIndex,
            course_index: conflict.courseIndex,
            recipe_index: conflict.recipeIndex || null, // Include if new structure
            original_course: conflict.course,
            original_recipe: conflict.recipe || null, // Include specific recipe if new structure
            conflict_info: {
              allergens: conflict.allergenConflicts,
              dietary: conflict.dietaryConflicts,
              affected_guest_count: conflict.affectedGuests.length
            },
            affected_guests: conflict.affectedGuests,
            status: 'pending',
            created_at: serverTimestamp(),
            created_by: currentUser.email
          };

          const docRef = await addDoc(collection(db, 'accommodation_menus'), accommodationData);
          newAccommodations.push({ id: docRef.id, ...accommodationData });
        }
      }

      onAccommodationChange([...accommodationMenus, ...newAccommodations]);

      // Trigger AI verification for all new accommodations
      for (const accommodation of newAccommodations) {
        await triggerAIVerification(accommodation);
      }

    } catch (error) {
      console.error('Error creating accommodations:', error);
      alert('Failed to create accommodation menus');
    } finally {
      setCreatingAlternatives(false);
    }
  };

  const handleSelectAlternative = (conflict, suggestion) => {
    setSelectedConflict(conflict);
    setSelectedSuggestion(suggestion);
    setShowRecipeSelector(true);
  };

  const handleRecipeSelect = async (recipe) => {
    if (!selectedConflict) return;

    try {
      const accommodationData = {
        main_menu_id: menu.id,
        event_id: event.id,
        type: 'accommodation',
        day_index: selectedConflict.dayIndex,
        meal_index: selectedConflict.mealIndex,
        course_index: selectedConflict.courseIndex,
        recipe_index: selectedConflict.recipeIndex || null,
        original_course: selectedConflict.course,
        original_recipe: selectedConflict.recipe || null,
        alternative: {
          recipe_id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          modifications: selectedSuggestion?.modifications || [],
          allergens: recipe.allergens || [],
          dietary_tags: recipe.dietary_tags || [],
          serves: selectedConflict.affectedGuests.length
        },
        affected_guests: selectedConflict.affectedGuests,
        created_at: serverTimestamp(),
        created_by: currentUser.email
      };

      const docRef = await addDoc(collection(db, 'accommodation_menus'), accommodationData);
      const newAccommodation = { id: docRef.id, ...accommodationData };
      
      onAccommodationChange([...accommodationMenus, newAccommodation]);
      
      // Trigger AI verification
      await triggerAIVerification(newAccommodation);

      setShowRecipeSelector(false);
      setSelectedConflict(null);
      setSelectedSuggestion(null);
    } catch (error) {
      console.error('Error creating accommodation:', error);
      alert('Failed to create accommodation');
    }
  };

  const triggerAIVerification = async (accommodation) => {
    try {
      await aiMonitor.addQuestion(event.id, {
        type: 'accommodation_verification',
        priority: 'high',
        question: 'New accommodation recipe created. Please verify it meets all dietary requirements.',
        context: {
          accommodation_data: accommodation,
          original_course: accommodation.original_course,
          original_recipe: accommodation.original_recipe,
          alternative: accommodation.alternative,
          affected_guests: accommodation.affected_guests,
          event_restrictions: {
            allergens: event.allergens,
            dietary: event.dietary_restrictions
          }
        },
        auto_trigger: true
      });
    } catch (error) {
      console.error('Error triggering AI verification:', error);
    }
  };

  const getConflictTitle = (conflict) => {
    const mealType = conflict.meal.type;
    const dayLabel = conflict.day.day_label || `Day ${conflict.dayIndex + 1}`;
    
    // Handle new structure with course and recipe names
    if (conflict.recipe) {
      return `${dayLabel} - ${mealType} - ${conflict.course.name} - ${conflict.recipe.recipe_name}`;
    }
    // Handle old structure
    return `${dayLabel} - ${mealType} - ${conflict.course.name}`;
  };

  return (
    <div className="accommodation-planner-overlay">
      <div className="accommodation-planner">
        <div className="planner-header">
          <h2>🍽️ Accommodation Menu Planner</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {processing ? (
          <div className="processing">
            <div className="spinner"></div>
            <p>Analyzing menu for dietary conflicts...</p>
          </div>
        ) : (
          <>
            <div className="planner-summary">
              <p>Found <strong>{conflicts.length}</strong> dishes with dietary conflicts affecting <strong>{
                [...new Set(conflicts.flatMap(c => c.affectedGuests.map(g => g.name)))].length
              }</strong> guests.</p>
            </div>

            {conflicts.length === 0 ? (
              <div className="no-conflicts">
                <h3>✅ No Dietary Conflicts Found!</h3>
                <p>All menu items are compatible with guest dietary restrictions.</p>
              </div>
            ) : (
              <div className="conflicts-list">
                {conflicts.map(conflict => (
                  <div key={conflict.id} className="conflict-item">
                    <div className="conflict-header">
                      <h4>{getConflictTitle(conflict)}</h4>
                      <span className="affected-count">
                        Affects {conflict.affectedGuests.length} guest{conflict.affectedGuests.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="conflict-details">
                      <div className="conflict-issues">
                        {conflict.allergenConflicts.length > 0 && (
                          <div className="issue-group">
                            <span className="issue-label">Allergens:</span>
                            {conflict.allergenConflicts.map(allergen => (
                              <span key={allergen} className="allergen-tag">{allergen}</span>
                            ))}
                          </div>
                        )}
                        {conflict.dietaryConflicts.length > 0 && (
                          <div className="issue-group">
                            <span className="issue-label">Dietary:</span>
                            {conflict.dietaryConflicts.map(diet => (
                              <span key={diet} className="dietary-tag">{diet}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="affected-guests">
                        <span className="guests-label">Affected guests:</span>
                        <div className="guest-list">
                          {conflict.affectedGuests.map((guest, idx) => (
                            <span key={idx} className="guest-name">
                              {guest.name}
                              {guest.allergies?.length > 0 && ` (${guest.allergies.join(', ')})`}
                              {guest.diet && ` [${guest.diet}]`}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="suggestions">
                        <h5>Suggested Alternatives:</h5>
                        <div className="suggestion-list">
                          {conflict.suggestions.map((suggestion, idx) => (
                            <div key={idx} className="suggestion-item">
                              <div className="suggestion-header">
                                <span className="suggestion-type">{suggestion.type}</span>
                                <p className="suggestion-desc">{suggestion.description}</p>
                              </div>
                              <ul className="modification-list">
                                {suggestion.modifications.map((mod, modIdx) => (
                                  <li key={modIdx}>{mod}</li>
                                ))}
                              </ul>
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={() => handleSelectAlternative(conflict, suggestion)}
                              >
                                Select Alternative Recipe
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="planner-actions">
              <button 
                className="btn btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
              {conflicts.length > 0 && (
                <button 
                  className="btn btn-primary"
                  onClick={handleCreateAlternatives}
                  disabled={creatingAlternatives}
                >
                  {creatingAlternatives ? 'Creating...' : 'Auto-Generate All Alternatives'}
                </button>
              )}
            </div>
          </>
        )}

        {showRecipeSelector && (
          <RecipeSelector
            recipes={recipes}
            event={event}
            onSelect={handleRecipeSelect}
            onClose={() => {
              setShowRecipeSelector(false);
              setSelectedConflict(null);
              setSelectedSuggestion(null);
            }}
          />
        )}
      </div>
    </div>
  );
}