# Mountain Medicine Catering - React Migration Roadmap

## Project Overview
Converting Mountain Medicine Catering from Streamlit to React while maintaining the existing Firebase backend (Firestore, Auth, Storage).

## Current State
- **Main Repo**: `/mountainmedicinecatering` - Active Streamlit app with recent updates
- **Kitchen Repo**: `/mountainmedicine-kitchen` - Contains full Streamlit app + React skeleton (kitchen-react-starter.zip)
- **Missing in Kitchen**: Recent changes from past week including:
  - Recipe scaling improvements (recipes_editor.py)
  - Multi-file upload functionality (upload.py)
  - Error handling improvements (file_storage.py, firebase_init.py)
  - Mobile detection fixes (layout.py)
  - AI parsing updates (ai_parsing_engine.py)

## Architecture Plan

### Backend (Firebase Functions)
- Use existing Firebase project & credentials
- Convert Python business logic to JavaScript/TypeScript
- Key modules to convert:
  1. Authentication (auth.py → auth.js)
  2. Recipe operations (recipes.py → recipes.js)
  3. Event management (events.py → events.js)
  4. File storage (file_storage.py → storage.js)
  5. AI parsing (ai_parsing_engine.py → parsing.js)

### Frontend (React)
- Deploy to Firebase Hosting alongside existing app
- Use different entry point (not index.html) to avoid conflicts
- Share Firebase config with existing login page

## Migration Phases

### Phase 1: Foundation (Week 1)
1. **Sync Recent Changes**
   - Copy updated files from main repo to kitchen repo
   - Files to sync: recipes_editor.py, upload.py, file_storage.py, firebase_init.py, ai_parsing_engine.py

2. **React Setup**
   - Extract kitchen-react-starter.zip
   - Configure Firebase SDK
   - Set up routing (React Router)
   - Create authentication context

3. **Core Infrastructure**
   - Firebase Functions setup
   - API structure definition
   - Shared utilities

### Phase 2: Core Features (Week 2)
1. **Recipe Management**
   - Recipe list view
   - Recipe editor (with scaling)
   - Recipe viewer
   - Multi-file upload

2. **Event Management**
   - Event list/calendar
   - Event details
   - Event creation/editing

3. **Authentication**
   - Login/logout flow
   - Role-based permissions
   - Session management

### Phase 3: Advanced Features (Week 3)
1. **Menu Builder**
   - Menu editor
   - Drag-and-drop interface
   - PDF export

2. **Ingredients & Shopping**
   - Ingredient management
   - Shopping list generation
   - Allergen tracking

3. **AI Features**
   - Recipe parsing
   - Chat interface
   - Suggestions

### Phase 4: Polish & Migration (Week 4)
1. **Mobile Optimization**
   - Responsive design
   - Touch interactions
   - PWA setup

2. **Data Migration**
   - User migration plan
   - Testing strategy
   - Rollback procedures

## Technical Decisions

### State Management
- Use React Context for auth & global state
- Local state for component-specific data
- Consider Redux if complexity grows

### UI Framework
- Material-UI or Ant Design for consistent components
- Tailwind CSS for custom styling
- Match existing purple theme (#6B46C1)

### File Structure
```
src/
├── components/
│   ├── recipes/
│   ├── events/
│   ├── menus/
│   └── common/
├── services/
│   ├── firebase/
│   ├── api/
│   └── utils/
├── contexts/
├── hooks/
└── pages/
```

## Key Conversions

### Session State → React State
```python
st.session_state["key"] = value  # Streamlit
```
→
```javascript
const [key, setKey] = useState(value);  // React
```

### UI Components
- st.button() → <Button />
- st.text_input() → <TextField />
- st.selectbox() → <Select />
- st.expander() → <Accordion />

### Data Flow
- Streamlit: Top-down rerun on change
- React: Component-based updates with hooks

## Context Preservation Instructions

When context window resets:
1. Read this file first
2. Check RECENT_CHANGES.md for latest updates
3. Review current git branch and recent commits
4. Check which phase we're in

## Current Working Directory Structure
- All React work happens in: `/Users/danmcfarland/mountainmedicine-kitchen/mountainmedicine-kitchen/`
- Original Streamlit app: `/Users/danmcfarland/Documents/mountainmedicinecatering/`

## Firebase Configuration
- Use same Firebase project
- Credentials in .streamlit/secrets.toml
- Convert to environment variables for React

## Testing Strategy
- Run both apps simultaneously (different ports)
- Feature parity testing checklist
- User acceptance testing plan

## Deployment Strategy
- React app at: myapp.com/app (or similar)
- Keep Streamlit at: myapp.com
- Gradual user migration
- Feature flags for rollout

---
Last Updated: [Current Date]
Current Phase: Planning
Next Step: Sync recent changes to kitchen repo