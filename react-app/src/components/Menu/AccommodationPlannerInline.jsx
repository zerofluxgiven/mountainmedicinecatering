import React, { useState, useEffect } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { aiMonitor } from '../../services/aiMonitor';
import RecipeSelector from '../Menu/RecipeSelector';
import './AccommodationPlanner.css';

export default function AccommodationPlannerInline({ 
  menu, 
  event, 
  onClose, 
  onMenuUpdate // This will update the entire menu with inline accommodations
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
    if (!menu || !event) {
      setProcessing(false);
      return;
    }

    const foundConflicts = [];
    const eventAllergens = event.allergens || [];
    const eventDiets = event.dietary_restrictions || [];
    const guestsWithRestrictions = event.guests_with_restrictions || [];

    // Map allergens/diets to guests
    const allergenToGuests = {};
    const dietToGuests = {};

    guestsWithRestrictions.forEach(guest => {
      guest.allergies?.forEach(allergy => {
        if (!allergenToGuests[allergy]) allergenToGuests[allergy] = [];
        allergenToGuests[allergy].push(guest.name);
      });
      if (guest.diet) {
        if (!dietToGuests[guest.diet]) dietToGuests[guest.diet] = [];
        dietToGuests[guest.diet].push(guest.name);
      }
    });

    // Analyze each day, meal, course
    menu.days?.forEach((day, dayIndex) => {
      day.meals?.forEach((meal, mealIndex) => {
        meal.courses?.forEach((course, courseIndex) => {
          // For each recipe in the course
          course.recipes?.forEach((recipe, recipeIndex) => {
            const recipeAllergens = recipe.allergens || [];
            const recipeDietaryTags = recipe.dietary_tags || [];

            // Check allergen conflicts
            const allergenConflicts = [];
            const affectedByAllergen = new Set();

            recipeAllergens.forEach(allergen => {
              if (eventAllergens.includes(allergen)) {
                allergenConflicts.push(allergen);
                (allergenToGuests[allergen] || []).forEach(guest => 
                  affectedByAllergen.add(guest)
                );
              }
            });

            // Check dietary conflicts
            const dietaryConflicts = [];
            const affectedByDiet = new Set();

            eventDiets.forEach(diet => {
              // Check if recipe meets dietary requirement
              const meetsRequirement = checkDietaryCompliance(recipeDietaryTags, diet);
              if (!meetsRequirement) {
                dietaryConflicts.push(diet);
                (dietToGuests[diet] || []).forEach(guest => 
                  affectedByDiet.add(guest)
                );
              }
            });

            // Combine affected guests
            const allAffectedGuests = [
              ...new Set([...affectedByAllergen, ...affectedByDiet])
            ];

            if (allergenConflicts.length > 0 || dietaryConflicts.length > 0) {
              // Check if accommodation already exists
              const existingAccommodations = course.accommodations || [];
              const hasAccommodation = existingAccommodations.some(acc => 
                acc.for_guests?.some(guest => allAffectedGuests.includes(guest))
              );

              if (!hasAccommodation) {
                foundConflicts.push({
                  dayIndex,
                  mealIndex,
                  courseIndex,
                  recipeIndex,
                  day: day.day_label,
                  meal: meal.type,
                  course: course.name,
                  recipe: recipe.recipe_name,
                  allergenConflicts,
                  dietaryConflicts,
                  affectedGuests: allAffectedGuests,
                  guestCount: allAffectedGuests.length
                });
              }
            }
          });
        });
      });
    });

    setConflicts(foundConflicts);
    setProcessing(false);
  };

  const checkDietaryCompliance = (tags, diet) => {
    const dietLower = diet.toLowerCase();
    const tagsLower = tags.map(t => t.toLowerCase());

    // Simple compliance check - can be expanded
    switch (dietLower) {
      case 'vegan':
        return tagsLower.includes('vegan');
      case 'vegetarian':
        return tagsLower.includes('vegetarian') || tagsLower.includes('vegan');
      case 'gluten-free':
        return tagsLower.includes('gluten-free');
      case 'dairy-free':
        return tagsLower.includes('dairy-free') || tagsLower.includes('vegan');
      default:
        return false;
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
      // Create a deep copy of the menu
      const updatedMenu = JSON.parse(JSON.stringify(menu));
      
      // Navigate to the specific course
      const course = updatedMenu.days[selectedConflict.dayIndex]
        .meals[selectedConflict.mealIndex]
        .courses[selectedConflict.courseIndex];
      
      // Initialize accommodations array if needed
      if (!course.accommodations) {
        course.accommodations = [];
      }
      
      // Create the accommodation
      const accommodation = {
        id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: recipe.name,
        recipe_id: recipe.id,
        servings: selectedConflict.affectedGuests.length,
        for_guests: selectedConflict.affectedGuests,
        reason: `${selectedConflict.allergenConflicts.join(', ')} ${selectedConflict.dietaryConflicts.join(', ')}`.trim(),
        allergens: recipe.allergens || [],
        dietary_tags: recipe.dietary_tags || [],
        created_at: new Date().toISOString(),
        created_by: currentUser.email
      };
      
      // Add the accommodation
      course.accommodations.push(accommodation);
      
      // Adjust main recipe servings
      if (course.recipes.length > 0) {
        const totalAccommodationServings = course.accommodations.reduce(
          (sum, acc) => sum + (acc.servings || 0), 
          0
        );
        course.recipes[0].servings = event.guest_count - totalAccommodationServings;
      }
      
      // Update the menu
      onMenuUpdate(updatedMenu);
      
      // Trigger AI verification
      await triggerAIVerification(accommodation, selectedConflict);
      
      // Re-analyze conflicts
      // The menu state will be updated by the parent component
      // Just need to re-analyze conflicts here
      
    } catch (error) {
      console.error('Error creating accommodation:', error);
      alert('Failed to create accommodation');
    } finally {
      setShowRecipeSelector(false);
      setSelectedConflict(null);
      setSelectedSuggestion(null);
    }
  };

  const triggerAIVerification = async (accommodation, conflict) => {
    try {
      await aiMonitor.storeQuestions(event.id, [{
        type: 'accommodation_verification',
        priority: 'high',
        question: `VERIFY: New accommodation created. Please confirm "${accommodation.name}" is safe for guests with ${conflict.allergenConflicts.concat(conflict.dietaryConflicts).join(', ')} restrictions.`,
        context: {
          accommodation,
          original_recipe: conflict.recipe,
          affected_guests: conflict.affectedGuests,
          restrictions: {
            allergens: conflict.allergenConflicts,
            dietary: conflict.dietaryConflicts
          }
        }
      }]);
    } catch (error) {
      console.error('Error triggering AI verification:', error);
    }
  };

  const generateSuggestions = (conflict) => {
    const suggestions = [];
    
    // Allergen-based suggestions
    conflict.allergenConflicts.forEach(allergen => {
      const allergenLower = allergen.toLowerCase();
      
      if (allergenLower.includes('gluten')) {
        suggestions.push({
          type: 'modification',
          description: 'Make gluten-free version',
          modifications: [
            'Replace wheat flour with gluten-free flour blend',
            'Use certified gluten-free ingredients',
            'Prepare in separate area to avoid cross-contamination'
          ]
        });
      }
      
      if (allergenLower.includes('dairy') || allergenLower.includes('milk')) {
        suggestions.push({
          type: 'modification',
          description: 'Make dairy-free version',
          modifications: [
            'Replace dairy milk with plant-based milk',
            'Use dairy-free butter or oil',
            'Substitute cheese with dairy-free alternatives'
          ]
        });
      }
      
      if (allergenLower.includes('nut')) {
        suggestions.push({
          type: 'modification',
          description: 'Remove nuts',
          modifications: [
            'Omit all nuts from the recipe',
            'Replace with seeds if texture needed',
            'Ensure no nut-based oils or extracts'
          ]
        });
      }
    });
    
    // Dietary-based suggestions
    conflict.dietaryConflicts.forEach(diet => {
      const dietLower = diet.toLowerCase();
      
      if (dietLower === 'vegan') {
        suggestions.push({
          type: 'modification',
          description: 'Make vegan version',
          modifications: [
            'Replace all animal products with plant-based alternatives',
            'Use plant milk, vegan butter, egg replacers',
            'Ensure all ingredients are plant-based'
          ]
        });
      }
      
      if (dietLower === 'vegetarian') {
        suggestions.push({
          type: 'modification',
          description: 'Make vegetarian version',
          modifications: [
            'Replace meat with plant-based proteins',
            'Use mushrooms for umami flavor',
            'Add beans or lentils for substance'
          ]
        });
      }
    });
    
    // Always add alternative dish option
    suggestions.push({
      type: 'alternative',
      description: 'Select alternative dish',
      modifications: []
    });
    
    return suggestions;
  };

  if (processing) {
    return (
      <div className="accommodation-planner-modal">
        <div className="accommodation-planner-content">
          <div className="loading">Analyzing menu for dietary conflicts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="accommodation-planner-modal">
      <div className="accommodation-planner-content">
        <div className="planner-header">
          <h2>Accommodation Planner</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="planner-body">
          {conflicts.length === 0 ? (
            <div className="no-conflicts">
              <h3>✅ No Dietary Conflicts Found</h3>
              <p>All menu items are compatible with guest dietary restrictions and allergies.</p>
            </div>
          ) : (
            <>
              <div className="conflicts-summary">
                <p>Found {conflicts.length} items that need accommodation for dietary restrictions.</p>
              </div>

              <div className="conflicts-list">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="conflict-card">
                    <div className="conflict-header">
                      <h4>{conflict.recipe}</h4>
                      <span className="affected-count">{conflict.guestCount} guests affected</span>
                    </div>
                    
                    <div className="conflict-details">
                      <div className="location">
                        {conflict.day} • {conflict.meal} • {conflict.course}
                      </div>
                      
                      <div className="restrictions">
                        {conflict.allergenConflicts.length > 0 && (
                          <div className="allergen-conflicts">
                            <strong>Allergens:</strong> {conflict.allergenConflicts.join(', ')}
                          </div>
                        )}
                        {conflict.dietaryConflicts.length > 0 && (
                          <div className="dietary-conflicts">
                            <strong>Diets:</strong> {conflict.dietaryConflicts.join(', ')}
                          </div>
                        )}
                      </div>
                      
                      <div className="affected-guests">
                        <strong>Guests:</strong> {conflict.affectedGuests.join(', ')}
                      </div>
                    </div>

                    <div className="suggestions">
                      <h5>Suggested Solutions:</h5>
                      {generateSuggestions(conflict).map((suggestion, idx) => (
                        <button
                          key={idx}
                          className="suggestion-button"
                          onClick={() => handleSelectAlternative(conflict, suggestion)}
                        >
                          {suggestion.description}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="planner-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {showRecipeSelector && (
        <RecipeSelector
          onSelect={handleRecipeSelect}
          onClose={() => {
            setShowRecipeSelector(false);
            setSelectedConflict(null);
            setSelectedSuggestion(null);
          }}
          filterAllergens={selectedConflict?.allergenConflicts || []}
          filterDietary={selectedConflict?.dietaryConflicts || []}
          title="Select Alternative Recipe"
        />
      )}
    </div>
  );
}