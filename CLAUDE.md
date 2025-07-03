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

## Important Considerations

1. **No Test Suite**: Currently no automated tests. Be extra careful with changes.

2. **Event Context**: Many operations require a selected event. Always verify event selection.

3. **Role Permissions**: Check user role before allowing sensitive operations.

4. **Mobile Experience**: Test changes on mobile viewport (responsive design critical).

5. **AI Features**: Require valid OpenAI API key and handle rate limits gracefully.

6. **File Processing**: Supports PDF, images, CSV, DOCX - test file uploads thoroughly.

7. **Session Management**: Handle session expiry and re-authentication flows properly.