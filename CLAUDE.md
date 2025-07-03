# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Mountain Medicine Catering is a comprehensive catering management application built with Streamlit and Firebase. It provides tools for event planning, recipe management, menu creation, ingredient tracking, and AI-powered features for catering businesses.

## Development Commands

### Running the Application
```bash
# Standard development server
streamlit run app.py

# With CORS disabled (for development)
streamlit run app.py --server.enableCORS false --server.enableXsrfProtection false
```

### Installing Dependencies
```bash
# Python dependencies
pip install -r requirements.txt

# System dependencies (required for OCR)
sudo apt install tesseract-ocr
```

### Deployment
The application automatically deploys to Firebase Hosting via GitHub Actions:
- **Production**: Merges to `main` branch trigger automatic deployment
- **Preview**: Pull requests create preview deployments
- No manual build or deployment commands needed

## Architecture & Key Concepts

### Tech Stack
- **Frontend**: Streamlit with custom theme (purple color scheme)
- **Backend**: Firebase (Firestore database, Firebase Auth, Firebase Storage)
- **AI Integration**: OpenAI API for recipe parsing and chat features
- **Mobile Support**: Responsive design with dedicated mobile components

### Core Architecture Patterns

1. **Event-Scoped Operations**: Most features operate within the context of a selected catering event. Always check if an event is selected when working on event-related features.

2. **Session State Management**: Uses `st.session_state` extensively. Key session variables:
   - `selected_event_id`: Current event context
   - `user_role`: User's role (admin/viewer/editor)
   - `mobile_mode`: Whether mobile UI is active
   - `event_mode`: Special mode for event operations

3. **Authentication Flow**: 
   - Firebase Auth with custom token handling
   - Session expiry management (30 days)
   - Role-based permissions stored in Firestore

4. **AI Parsing Engine**: Uses OpenAI's structured JSON output for reliable data extraction from recipes, menus, and documents.

### Module Organization

- **Event Management**: `events.py`, `event_mode.py`, `event_planning_dashboard.py`
- **Recipe System**: `recipes.py`, `recipes_editor.py`, `smart_recipe_scaler.py`
- **Menu Management**: `menus.py`, `menu_editor.py`, `menu_viewer.py`
- **Ingredients**: `ingredients.py`, `ingredients_editor.py`, `allergies.py`
- **AI Features**: `ai_chat.py`, `ai_parsing_engine.py`, `suggestions.py`
- **Mobile Interface**: `mobile_layout.py`, `mobile_components.py`, `mobile_helpers.py`
- **Infrastructure**: `auth.py`, `firebase_init.py`, `firestore_utils.py`

### Key Development Patterns

1. **Mobile-First Design**: Check `mobile_helpers.py` for mobile detection logic. Mobile components are in separate modules.

2. **Firebase Operations**: 
   - Use `firestore_utils.py` for batch operations
   - Always handle Firebase exceptions
   - Check user permissions before write operations

3. **UI Components**: Reusable components in `ui_components.py` and `mobile_components.py`

4. **File Uploads**: Centralized in `upload.py` with mobile-specific handling in `upload_integration.py`

5. **PDF Export**: Uses `fpdf2` via `pdf_export.py` for generating documents

### Environment Configuration

Required secrets in `.streamlit/secrets.toml`:
- Firebase service account credentials
- OpenAI API key
- Other API keys as needed

The application runs on port 8501 (Streamlit default) with custom theming defined in `.streamlit/config.toml`.

## Recent Updates & Data Models

### Recipe Data Structure
Recipes are stored in Firestore with the following fields:
- `id`: Unique identifier
- `name`: Recipe title
- `ingredients`: Text or array of ingredients
- `instructions`: Text or array of steps
- `serves`: Number of servings (critical for scaling)
- `special_version`: Name of dietary variant (e.g., "Gluten-Free")
- `tags`: Array of categorization tags
- `allergens`: Array of allergens present
- `image_url`: Firebase Storage URL for recipe image
- `created_at`: Timestamp
- `created_by`: User ID who created it
- `ingredients_parsed`: Boolean indicating if ingredients were parsed

### Special Versions System
- Special versions (dietary variants) are stored as subcollections under parent recipes
- Path: `/recipes/{recipeId}/versions/{versionId}`
- Recipe viewer shows dropdown to switch between original and special versions
- After saving a recipe, users are prompted to add special versions

### Event Allergen Management
- Individual allergies stored in: `/events/{eventId}/allergies/{allergyId}`
- Event file contains aggregated `allergens` array that auto-updates
- Allergen aggregation happens via `_update_event_file_allergens()` function

### AI Parsing Updates
- URL parsing includes browser headers to avoid 403 errors
- Better error handling for invalid/missing OpenAI API keys
- Recipe validation checks for non-empty ingredients AND instructions
- Handles field name variations (serves vs servings)

### File Upload Flow
1. File uploaded to Firebase Storage
2. Text extracted based on file type (PDF, image, DOCX, etc.)
3. AI parser extracts structured data
4. User can preview before saving
5. Duplicate detection with version/rename options

## Important Considerations

1. **No Test Suite**: Currently no automated tests. Be extra careful with changes.

2. **Event Context**: Many operations require a selected event. Always verify event selection.

3. **Role Permissions**: Check user role before allowing sensitive operations.

4. **Mobile Experience**: Test changes on mobile viewport (responsive design critical).

5. **AI Features**: 
   - Require valid OpenAI API key in `.streamlit/secrets.toml`
   - Handle rate limits gracefully
   - Check for environment variable conflicts (OPENAI_API_KEY)

6. **File Processing**: Supports PDF, images, CSV, DOCX - test file uploads thoroughly.

7. **Session Management**: 
   - Handle session expiry and re-authentication flows properly
   - Be careful with session state when using forms and number inputs
   - Clear session state keys properly (del vs setting to empty)

8. **Data Consistency**:
   - Always include `serves` field when saving recipes
   - Convert `servings` to `serves` for consistency
   - Ensure `created_at` timestamps are added
   - Aggregate allergens to event file when allergies change

## Common Pitfalls

1. **Import Errors**: Always import `uuid` at module level, not inside functions
2. **Session State**: Don't set number input fields to empty strings
3. **Firestore Queries**: Not all recipes have `created_at` field - handle legacy data
4. **AI Parsing**: Empty arrays are not the same as missing fields - validate properly
5. **Special Versions**: These are subcollection documents, not separate recipes