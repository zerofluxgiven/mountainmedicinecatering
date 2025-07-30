# Simple Firebase Diagnostic Steps

Since accessing Firebase from the browser console can be tricky in a React app, here are manual steps to diagnose the issues:

## Option 1: Use React DevTools

1. Install React Developer Tools browser extension if you haven't
2. Open your app and login
3. Open DevTools (F12) and go to the "Components" tab
4. Search for a component that uses Firebase (like "MenuList" or "EventList")
5. Click on it and look at its props/hooks to find the Firebase instance

## Option 2: Check Network Tab

1. Open DevTools (F12) and go to "Network" tab
2. Refresh the page
3. Look for Firestore requests (they'll have URLs like `firestore.googleapis.com`)
4. Check which collections are being queried
5. Look for 403 errors or permission denied errors

## Option 3: Add Temporary Debug Code

Add this to your App.jsx temporarily:

```javascript
// In App.jsx, after imports
import { db } from './config/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Add this inside the App component
useEffect(() => {
  // Make Firebase accessible globally for debugging
  window._debugFirebase = { db, collection, getDocs };
  console.log('Firebase debug tools available at window._debugFirebase');
}, []);
```

Then in console you can run:
```javascript
const { db, collection, getDocs } = window._debugFirebase;
const snapshot = await getDocs(collection(db, 'menus'));
console.log('Menus count:', snapshot.size);
```

## Manual Checks in Firebase Console

1. **Go to Firebase Console → Firestore**
2. **Check these things:**
   - Is there a `menus` collection? Or only `menu_items`?
   - Click on `menu_items` (if it exists) and see if your menu data is there
   - Look for `vent_modifications` - this is a typo
   - Check if `recipes`, `events`, `users` collections exist

3. **For the Duplicate Menus:**
   - Find the collection with your menus (`menus` or `menu_items`)
   - Search for "Luau" 
   - Note the document IDs of duplicates
   - Delete duplicates keeping only the most recent

## Quick Fixes:

### If data is in wrong collection (`menu_items` instead of `menus`):

**Option A - Rename in Firebase Console:**
- Unfortunately, Firebase doesn't have a "rename collection" feature
- You'll need to export and re-import the data

**Option B - Temporary Code Fix:**
Create a file `collection-override.js`:

```javascript
// Temporary fix - maps wrong collection names to correct ones
export const collectionMap = {
  'menus': 'menu_items',  // Use menu_items instead of menus
  'event_modifications': 'vent_modifications'  // Fix typo
};

// Helper function
export function getCollectionName(name) {
  return collectionMap[name] || name;
}
```

Then update your code to use:
```javascript
import { getCollectionName } from './collection-override';

// Instead of:
collection(db, 'menus')

// Use:
collection(db, getCollectionName('menus'))
```

This is a temporary fix until you can properly migrate the data.