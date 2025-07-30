# Accommodation Menu Design for New Structure

## Current State (Separate Collection)

Accommodation menus are currently stored in a separate `accommodation_menus` collection:

```javascript
// ACCOMMODATION MENU DOCUMENT
{
  id: "acc_xxx",
  main_menu_id: "menu_xxx", // References old menu
  event_id: "evt_xxx",
  type: "accommodation",
  day_index: 0,
  meal_index: 1,
  course_index: 0,
  original_course: {...},
  alternative: {
    name: "Vegan Pancakes",
    description: "Plant-based version",
    modifications: ["Replace dairy", "Use plant milk"],
    serves: 3,
    allergens: [],
    dietary_tags: ["vegan"]
  },
  affected_guests: ["Sarah M.", "John D."],
  created_at: timestamp
}
```

## Proposed: Embedded Accommodation Structure

Since menus are now embedded in events, accommodations should be too:

### Option 1: Inline Accommodations (Recommended)
```javascript
// EVENT DOCUMENT with embedded accommodations
{
  id: "evt_xxx",
  name: "Luau Night",
  
  // Primary menu
  menu: {
    name: "Luau Night - Primary Menu",
    type: "primary",
    days: [
      {
        date: "2025-08-15",
        meals: [
          {
            id: "meal_xxx",
            type: "breakfast",
            courses: [
              {
                id: "course_xxx",
                name: "Pancakes",
                recipe_id: "rec_xxx",
                servings: 27, // Reduced from 30
                allergens: ["gluten", "dairy"],
                
                // NEW: Inline accommodations
                accommodations: [
                  {
                    id: "acc_xxx",
                    name: "Gluten-Free Pancakes",
                    recipe_id: "rec_gf_pancakes", // Different recipe
                    servings: 3,
                    for_guests: ["Sarah M.", "John D.", "Lisa K."],
                    reason: "Celiac disease",
                    allergens: ["dairy"], // Still has dairy
                    dietary_tags: ["gluten-free"]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Option 2: Separate Accommodations Array
```javascript
{
  id: "evt_xxx",
  name: "Luau Night",
  
  menu: { /* primary menu */ },
  
  // Alternative approach - separate array
  accommodations: [
    {
      id: "acc_xxx",
      day_index: 0,
      meal_index: 0,
      course_index: 0,
      original_course_name: "Pancakes",
      alternative: {
        name: "Vegan Pancakes",
        recipe_id: "rec_vegan_pancakes",
        servings: 5,
        for_guests: ["Guest names..."],
        modifications: ["No dairy", "Plant-based"]
      }
    }
  ]
}
```

## Benefits of Inline Accommodations (Option 1)

1. **Contextual**: Accommodations are right next to what they're replacing
2. **Easy to see**: When viewing a course, you immediately see its alternatives
3. **Automatic scaling**: Main course servings = total - accommodation servings
4. **No index tracking**: No need to track day/meal/course indices
5. **Simpler UI**: Can show accommodations in the same card

## Implementation Changes Needed

### 1. Update Course Structure
```javascript
// In MenuPlannerCalendar or MealEditor
const course = {
  id: "course_xxx",
  name: "Main Recipe",
  recipe_id: "rec_xxx",
  servings: 27, // Auto-calculated: 30 guests - 3 accommodations
  accommodations: [] // NEW field
};
```

### 2. Update AccommodationPlanner
```javascript
// Instead of creating separate documents
const handleCreateAccommodation = async (accommodation) => {
  // Add to the course's accommodations array
  const updatedMenu = { ...menu };
  const course = updatedMenu.days[dayIndex].meals[mealIndex].courses[courseIndex];
  
  course.accommodations = [...(course.accommodations || []), accommodation];
  course.servings = calculateMainServings(event.guest_count, course.accommodations);
  
  // Save the entire menu
  await updateDoc(doc(db, 'events', eventId), {
    menu: updatedMenu
  });
};
```

### 3. Serving Calculation
```javascript
// Automatically adjust main course servings
const calculateMainServings = (totalGuests, accommodations = []) => {
  const accommodationServings = accommodations.reduce(
    (sum, acc) => sum + (acc.servings || 0), 
    0
  );
  return totalGuests - accommodationServings;
};
```

### 4. UI Updates
```javascript
// In MealEditor or CourseDisplay
{course.accommodations && course.accommodations.length > 0 && (
  <div className="accommodations-list">
    <h5>Dietary Accommodations:</h5>
    {course.accommodations.map(acc => (
      <div key={acc.id} className="accommodation-item">
        <span className="acc-name">{acc.name}</span>
        <span className="acc-servings">({acc.servings} servings)</span>
        <span className="acc-guests">For: {acc.for_guests.join(', ')}</span>
      </div>
    ))}
  </div>
)}
```

## Migration Path

1. **Phase 1**: Support both structures
   - Read from accommodation_menus collection if exists
   - New accommodations save inline

2. **Phase 2**: Migrate existing data
   - Script to move accommodation_menus into event documents
   - Update references

3. **Phase 3**: Remove old code
   - Remove accommodation_menus collection
   - Clean up old references

## AI Safety Integration

The inline structure makes AI safety checks even better:

```javascript
// AI can see everything in one context
{
  course: "Pancakes (27 servings)",
  accommodations: [
    "Gluten-Free Pancakes (3 servings) for Celiac guests"
  ],
  total_coverage: 30,
  potential_issues: "Main recipe still contains dairy"
}