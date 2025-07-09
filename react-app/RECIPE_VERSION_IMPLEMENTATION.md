# Recipe Version System Implementation

## Overview
Implemented a comprehensive recipe versioning system that tracks recipe history and manages special dietary versions (e.g., Gluten-Free, Vegan variants).

## Files Created/Modified

### 1. Service Layer
- **`/services/recipeVersions.js`** - Core service for version management
  - `saveRecipeVersion()` - Saves versions to Firestore subcollection
  - `getSpecialVersions()` - Fetches dietary variants
  - `getVersionHistory()` - Fetches edit history
  - `createSpecialVersion()` - Creates named dietary versions
  - `saveVersionHistory()` - Auto-saves history on edits
  - `getRecipesWithVersions()` - Loads recipes with their versions

### 2. Recipe Viewer Updates
- **`/pages/Recipes/RecipeViewer.jsx`**
  - Added version selector dropdown for switching between versions
  - Added "Version History" button showing edit history count
  - Version history modal displays timestamps and edit notes
  - Users can view and restore previous versions

### 3. Recipe Editor Updates  
- **`/pages/Recipes/RecipeEditor.jsx`**
  - Auto-saves version history when updating recipes
  - Added "Edit Note" field for documenting changes
  - Post-save modal prompts to create special dietary versions
  - Special version field for marking variants

### 4. Recipe List Updates
- **`/pages/Recipes/RecipeList.jsx`**
  - Shows available versions as badges on recipe cards
  - Special version indicator for variant recipes
  - Loads version data asynchronously

### 5. Styling
- **`/pages/Recipes/RecipeViewer.css`**
  - Version selector styling with purple theme
  - Version history modal styling
  - Responsive design for version UI
  
- **`/pages/Recipes/RecipeList.css`**
  - Version badges in primary color
  - Special version indicators in green
  - Available versions section with purple accent

## Data Structure

Versions are stored as a subcollection under each recipe:
```
/recipes/{recipeId}/versions/{versionId}
```

Version documents include:
- All recipe fields at time of save
- `timestamp` - When version was created
- `edit_note` - Description of changes
- `is_special_version` - Boolean flag
- `special_version` - Name of dietary variant (if applicable)

## Features

1. **Version History**
   - Automatically saved on every recipe update
   - Viewable through "Version History" button
   - Shows timestamp and edit notes
   - One-click restore to previous version

2. **Special Dietary Versions**
   - Create named variants (Gluten-Free, Vegan, etc.)
   - Accessible through dropdown in recipe viewer
   - Shown as badges in recipe list
   - Maintain separate ingredients/instructions

3. **User Experience**
   - Seamless version switching
   - Clear visual indicators for versions
   - Optional edit notes for tracking changes
   - Prompt to create special versions after save

## Usage

1. **Creating a Special Version**:
   - Edit a recipe
   - Enter version name in "Special Version" field
   - Save recipe
   - Or use post-save modal prompt

2. **Viewing Version History**:
   - Open any recipe
   - Click "Version History" button
   - Browse previous versions
   - Click "View this version" to restore

3. **Switching Between Versions**:
   - Use dropdown selector in recipe viewer
   - Select special version or "Original Recipe"
   - Recipe content updates instantly

## Integration Points

- Works with existing recipe structure
- Compatible with recipe scaler
- Maintains all recipe features (tags, allergens, images)
- Respects user permissions for editing