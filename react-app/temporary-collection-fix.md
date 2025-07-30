# Temporary Fix for menu_items vs menus Issue

If your data is in `menu_items` but the code expects `menus`, here's a quick fix:

## Option 1: Update Firestore Rules (Easiest)

Add rules for BOTH collections in Firebase Console → Firestore → Rules:

```javascript
match /menus/{document=**} {
  allow read, write: if request.auth != null;
}

match /menu_items/{document=**} {
  allow read, write: if request.auth != null;
}
```

## Option 2: Global Find & Replace (5 files to update)

Replace `'menus'` with `'menu_items'` in these files:

1. `/src/pages/Menus/MenuList.jsx` - Line 25
2. `/src/contexts/AppContext.jsx` - Line 90  
3. `/src/pages/Events/EventViewer.jsx` - Line 71
4. `/src/pages/Events/AllergyManager.jsx` - Line 113
5. `/src/components/Menu/MenuPlannerCalendar.jsx` - Line 256

## Option 3: Create a Config File

Create `/src/config/collections.js`:

```javascript
// Temporary collection name mappings
export const COLLECTIONS = {
  MENUS: 'menu_items',  // Change this back to 'menus' after migration
  RECIPES: 'recipes',
  EVENTS: 'events',
  USERS: 'users'
};
```

Then update imports:
```javascript
import { COLLECTIONS } from '../config/collections';

// Use:
collection(db, COLLECTIONS.MENUS)
// Instead of:
collection(db, 'menus')
```

## Which Option to Choose?

- **Option 1**: Best if you just want the app to work immediately
- **Option 2**: Quick but you'll need to change it back later
- **Option 3**: Most professional - easy to switch back after proper migration

Remember: These are temporary fixes. The proper solution is to migrate the data from `menu_items` to `menus` in Firebase.