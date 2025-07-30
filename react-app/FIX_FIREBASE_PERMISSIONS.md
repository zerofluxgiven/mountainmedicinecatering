# 🚨 URGENT: Firebase Permission Fixes Needed

Based on your console errors, here are the exact fixes needed:

## 1. Cloud Functions Permissions (403 Errors)

Run these commands to fix the 403 Forbidden errors:

```bash
# Fix parseRecipe function
gcloud functions add-iam-policy-binding parseRecipe \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --project=mountainmedicine-6e572

# Fix askAIHttp function
gcloud functions add-iam-policy-binding askAIHttp \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --project=mountainmedicine-6e572

# Fix other HTTP functions
gcloud functions add-iam-policy-binding aiCreateRecipeHttp \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --project=mountainmedicine-6e572
```

## 2. Firestore Security Rules

Go to Firebase Console → Firestore → Rules and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Specific rules for collections
    match /menus/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    match /recipes/{document=**} {
      allow read: if true;  // Public read
      allow write: if request.auth != null;
    }
    
    match /events/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    match /menu_items/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 3. Collection Name Issues

The app expects `menus` but your data is in `menu_items`. You have two options:

### Option A: Quick Fix (Temporary)
Change the code to use `menu_items` instead of `menus`:

```javascript
// In all files, replace:
collection(db, 'menus')
// With:
collection(db, 'menu_items')
```

### Option B: Proper Fix (Recommended)
1. Export data from `menu_items`
2. Import it into `menus` collection
3. Delete `menu_items`

## 4. Storage Rules

Go to Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 5. Missing API Keys

If you see API key errors, run:

```bash
# Set Anthropic key for AI chat
firebase functions:config:set anthropic.key="sk-ant-YOUR_KEY_HERE"

# Set OpenAI key for recipe parsing
firebase functions:config:set openai.key="sk-YOUR_KEY_HERE"

# Deploy functions after setting config
firebase deploy --only functions
```

## Immediate Actions:

1. **First**: Update Firestore Rules (this will fix most errors)
2. **Second**: Run the gcloud commands for function permissions
3. **Third**: Fix the collection naming issue (menu_items → menus)
4. **Fourth**: Delete duplicate Luau Night menus

## To Debug Collections:

1. Open your app in browser
2. Log in
3. Open console (F12)
4. Copy/paste the contents of `fix-collections-browser.js`
5. Follow the diagnostic output

This will show you exactly which collections exist and where your data is.