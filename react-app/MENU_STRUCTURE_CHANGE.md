# Menu Structure Change Plan

## Current Structure (PROBLEM)
- Menus are stored in separate `menu_items` collection
- Events reference menus by ID
- Creates duplicate menus every time
- Autosave doesn't work properly

## New Structure (SOLUTION)
- Menus will be stored directly in the event document
- No separate menu collection needed
- One source of truth
- Simpler data model

### Event Document Structure
```javascript
{
  id: "evt_xxx",
  name: "Luau Night",
  start_date: "2025-08-15",
  end_date: "2025-08-18",
  // ... other event fields ...
  
  // NEW: Embed menu directly in event
  menu: {
    name: "Luau Night - Primary Menu",
    type: "primary",
    days: [
      {
        date: "2025-08-15",
        day_label: "Day 1 - Arrival",
        expanded: true,
        meals: [
          {
            id: "meal_xxx",
            type: "breakfast",
            time: "8:00 AM",
            courses: [...]
          }
        ]
      }
    ],
    updated_at: timestamp,
    updated_by: "user@email.com"
  }
}
```

## Implementation Steps

1. **Update MenuPlannerCalendar save function**
   - Save menu as part of event document
   - Remove separate menu document creation

2. **Update MenuPlannerCalendar load function**
   - Load menu from event.menu field
   - No need to fetch separate menu document

3. **Update EventViewer**
   - Show menu data from event.menu

4. **Remove menu_items collection references**
   - Clean up all code that references separate menus

## Benefits
- No more duplicate menus
- Autosave works correctly
- Simpler data model
- Better performance (one document fetch instead of two)
- Menu is always in sync with event