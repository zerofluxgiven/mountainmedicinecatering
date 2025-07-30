# Unused Code Analysis Report

## Summary
Analysis completed on 2025-07-23. Found several unused components and exports that can be safely removed to reduce codebase complexity.

## Components to Remove

### 1. Definitely Unused Components
These components are not imported or used anywhere:

- **MenuSection** (`/src/components/Menu/MenuSection.jsx`)
  - Old component replaced by newer menu planning system
  - Not imported anywhere in the codebase
  
- **PermissionError** (`/src/components/common/PermissionError.jsx`)
  - Generic error component that's never used
  - App handles permissions differently now

### 2. Legacy Components (Imported but Unused)
These are imported in App.jsx but never used in routes:

- **MenuEditor** (`/src/pages/Menus/MenuEditor.jsx`) - 658 lines
  - Replaced by MenuPlannerWrapper
  - Large file that can be removed
  
- **MenuPlanner** (`/src/pages/Menus/MenuPlanner.jsx`)
  - Replaced by MenuPlannerWrapper/MenuPlannerCalendar
  - Old planning interface

## Action Required in App.jsx
Remove these unused imports:
```javascript
// Remove these lines from App.jsx
import MenuEditor from './pages/Menus/MenuEditor';
import MenuPlanner from './pages/Menus/MenuPlanner';
```

## Potentially Unused Service Functions
The analyzer found many exported functions that appear unused. These require more careful review as they might be:
- Used dynamically
- Called from Firebase Functions
- Part of the public API
- Used in tests

Key services to review:
- `allergenManager.js` - Many exports appear unused but might be used by Firebase Functions
- `aiNameGenerator.js` - generateAIName function
- `deezNutsService.js` - getNutSpecificJoke function
- Various utility functions in dateFormatting, timeFormatting, ingredientParser

## Large Files Needing Refactoring
Files over 500 lines that could benefit from splitting:
- RecipeEditor.jsx (1032 lines)
- RecipeImport.jsx (1122 lines)
- AIChat.jsx (936 lines)
- pdfService.js (816 lines)

## Remove Day Button Documentation
The "Remove Day" button is working correctly but requires:
1. Multiple days in the menu (hidden if only 1 day)
2. Day to be expanded to see the button

This is documented in REMOVE_DAY_BUTTON_GUIDE.md.

## Recommendations
1. **Immediate**: Remove the 4 unused components listed above
2. **Next Sprint**: Review and clean up unused service functions
3. **Future**: Refactor large files into smaller, more maintainable modules

## Testing Impact
- The comprehensive mobile test suite exists but has environment issues
- Manual testing recommended after removing components
- No production impact expected as these components are not in use