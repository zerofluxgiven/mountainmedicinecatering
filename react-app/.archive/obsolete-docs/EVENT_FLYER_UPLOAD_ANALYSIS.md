# Event Flyer Upload Analysis & Fixes

## Issues Found

### 1. Firebase Functions Authentication & CORS Issues
The event flyer parsing functionality is experiencing authentication and CORS issues:

- **Problem**: The parseEventFlyer callable function is failing with CORS/authentication errors
- **Current Workaround**: The code falls back to HTTP endpoint or local parsing
- **Root Cause**: Missing CORS configuration and potential authentication issues in Firebase Functions

### 2. Inconsistent Data Models

#### Events Collection
The event model has the following structure:
```javascript
{
  name: string,
  event_date: Date,
  start_time: string,
  end_time: string,
  guest_count: number,
  client_name: string,
  client_email: string,
  client_phone: string,
  website: string,
  venue: string,
  venue_address: string,
  venue_contact: string,
  description: string,
  notes: string,
  special_requests: string,
  budget: number,
  status: 'planning' | 'confirmed' | 'completed' | 'cancelled',
  flyer_url: string,
  allergens: string[], // Aggregated from guest allergies
  created_at: timestamp,
  created_by: string,
  updated_at: timestamp
}
```

#### Recipes Collection
```javascript
{
  name: string,
  serves: number,
  prep_time: string,
  cook_time: string,
  ingredients: string[],
  instructions: string,
  notes: string,
  tags: string[],
  allergens: string[],
  image_url: string,
  special_version: string,
  created_at: timestamp,
  created_by: string,
  updated_at: timestamp
}
```

#### Menus Collection
```javascript
{
  name: string,
  description: string,
  event_id: string, // Reference to event
  meals: [ // New structure
    {
      id: string,
      type: string,
      description: string,
      instructions: string,
      notes: string,
      recipes: [
        {
          id: string,
          recipe_id: string, // Reference to recipe
          servings: number,
          notes: string
        }
      ]
    }
  ],
  sections: [], // Old structure for backward compatibility
  created_at: timestamp,
  created_by: string,
  updated_at: timestamp
}
```

### 3. Data Model Inconsistencies

1. **Menu Structure Migration**: The menu structure is transitioning from `sections` to `meals`, but both are being supported which can cause confusion
2. **Recipe References**: In menus, recipes are stored with both full recipe data and recipe_id references, which can lead to data synchronization issues
3. **Missing Event References**: Recipes don't have event_id references, making it hard to find event-specific recipes
4. **Allergen Management**: Allergens are tracked at multiple levels (events, recipes, guest allergies) but not consistently aggregated

## Fixes Required

### 1. Fix Firebase Functions CORS

Add CORS configuration to Firebase Functions:

```javascript
// In functions/index.js, update the parseEventFlyer function:
exports.parseEventFlyer = functions
  .runWith({ cors: true })
  .https.onCall(async (data, context) => {
    // ... existing code
  });
```

### 2. Improve Error Handling in Event Parser

Update the client-side error handling to provide better feedback:

```javascript
// In src/services/eventParser.js
// Add specific error handling for common issues
if (error.code === 'functions/not-found') {
  // Function deployment issue
} else if (error.code === 'unauthenticated') {
  // Auth issue
} else if (error.message?.includes('CORS')) {
  // CORS issue
}
```

### 3. Standardize Data Models

#### Update Menu Structure
Commit to the new `meals` structure and provide migration for old data:

```javascript
// Add migration function
async function migrateMenuStructure(menuData) {
  if (menuData.sections && !menuData.meals) {
    menuData.meals = menuData.sections.map(section => ({
      id: `meal-${Date.now()}-${Math.random()}`,
      type: section.name.toLowerCase(),
      description: section.description || '',
      instructions: '',
      notes: section.notes || '',
      recipes: section.items || []
    }));
  }
  return menuData;
}
```

#### Normalize Recipe References
Store only recipe_id and servings in menus, fetch full recipe data when needed:

```javascript
// In menu structure
recipes: [
  {
    recipe_id: string,
    servings: number,
    notes: string
  }
]
```

#### Add Event Context to Recipes
Add optional event_id to recipes for event-specific recipes:

```javascript
// In recipe model
{
  // ... existing fields
  event_id: string | null, // Optional reference to event
  is_template: boolean // Flag for reusable recipes
}
```

### 4. Improve Allergen Tracking

Create a centralized allergen aggregation system:

```javascript
// Utility function to aggregate allergens
function aggregateEventAllergens(event, menus, recipes, guestAllergies) {
  const allergenSet = new Set();
  
  // From guest allergies
  guestAllergies.forEach(guest => {
    guest.allergens?.forEach(a => allergenSet.add(a));
  });
  
  // From recipes in menus
  menus.forEach(menu => {
    menu.meals.forEach(meal => {
      meal.recipes.forEach(recipeRef => {
        const recipe = recipes.find(r => r.id === recipeRef.recipe_id);
        recipe?.allergens?.forEach(a => allergenSet.add(a));
      });
    });
  });
  
  return Array.from(allergenSet).sort();
}
```

### 5. Add Data Validation

Implement consistent validation across all collections:

```javascript
// Validation schemas
const eventSchema = {
  name: { required: true, type: 'string', minLength: 1 },
  event_date: { required: true, type: 'date' },
  client_name: { required: true, type: 'string' },
  guest_count: { type: 'number', min: 0 },
  // ... etc
};

const recipeSchema = {
  name: { required: true, type: 'string', minLength: 1 },
  serves: { required: true, type: 'number', min: 1 },
  ingredients: { required: true, type: 'array', minItems: 1 },
  // ... etc
};

const menuSchema = {
  name: { required: true, type: 'string', minLength: 1 },
  event_id: { type: 'string' },
  meals: { type: 'array', minItems: 0 },
  // ... etc
};
```

## Implementation Priority

1. **High Priority**:
   - Fix Firebase Functions CORS issue
   - Improve error handling and user feedback
   - Standardize menu structure (migrate from sections to meals)

2. **Medium Priority**:
   - Normalize recipe references in menus
   - Add event context to recipes
   - Implement data validation

3. **Low Priority**:
   - Centralize allergen tracking
   - Add comprehensive logging
   - Performance optimizations

## Testing Checklist

- [ ] Event flyer upload works with images (PNG, JPG)
- [ ] Event flyer upload works with PDFs
- [ ] Event flyer upload works with text files
- [ ] Proper error messages displayed when parsing fails
- [ ] Authentication errors handled gracefully
- [ ] Menu creation with new meals structure
- [ ] Recipe references properly linked
- [ ] Allergen aggregation working correctly
- [ ] Data validation preventing invalid entries