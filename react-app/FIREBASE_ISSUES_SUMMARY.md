# Firebase Issues Summary

## Current Status
The HAR file shows successful requests (200 status), but your console screenshot showed multiple errors. This suggests the issues are intermittent or permission-based.

## Key Problems Found

### 1. Collection Name Mismatch
- **Code expects**: `menus`
- **Firebase has**: `menu_items`
- **Impact**: Menus won't load or save properly

### 2. Typo in Firebase
- **Found**: `vent_modifications`
- **Should be**: `event_modifications`
- **Impact**: Event modification features won't work

### 3. Permission Errors (from console screenshot)
- Multiple "Missing or insufficient permissions" errors
- 403 Forbidden on Cloud Functions (parseRecipe, etc.)
- Need to update Firestore rules and Cloud Function IAM

### 4. Duplicate Menus
- Multiple "Luau Night" menus exist
- Need to check in Firebase Console and clean up

## Immediate Actions Required

### Step 1: Fix Firestore Security Rules
Go to Firebase Console → Firestore → Rules and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 2: Temporary Collection Name Fix
Create `/src/config/collections.js`:

```javascript
// Temporary fix - update when data is migrated
export const COLLECTIONS = {
  MENUS: 'menu_items',  // Using wrong name temporarily
  RECIPES: 'recipes',
  EVENTS: 'events',
  USERS: 'users'
};
```

Then update these 5 files to use `COLLECTIONS.MENUS`:
1. `/src/pages/Menus/MenuList.jsx`
2. `/src/contexts/AppContext.jsx`
3. `/src/pages/Events/EventViewer.jsx`
4. `/src/pages/Events/AllergyManager.jsx`
5. `/src/components/Menu/MenuPlannerCalendar.jsx`

### Step 3: Fix Cloud Function Permissions
Run these commands:

```bash
# Fix parseRecipe
gcloud functions add-iam-policy-binding parseRecipe \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --project=mountainmedicine-6e572

# Fix askAIHttp
gcloud functions add-iam-policy-binding askAIHttp \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --project=mountainmedicine-6e572
```

### Step 4: Clean Up Duplicate Menus
1. Go to Firebase Console → Firestore
2. Find the `menu_items` collection
3. Search for "Luau Night"
4. Delete duplicates keeping only the most recent

## Testing After Fixes

1. Clear browser cache
2. Reload the app
3. Check if menus load properly
4. Try creating a new menu
5. Check console for errors

## Long-term Solution

Eventually, you should:
1. Migrate data from `menu_items` to `menus`
2. Rename `vent_modifications` to `event_modifications`
3. Create proper indexes for complex queries
4. Set up monitoring for permission errors

## Scripts Available

- `fix-collections-browser-corrected.js` - Browser diagnostic tool
- `temporary-collection-fix.md` - Quick fix options
- `fix-firebase-collections.js` - Full migration script (requires service account)