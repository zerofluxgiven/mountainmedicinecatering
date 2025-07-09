# CLAUDE.md - Complete Architecture Reference

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository. It contains complete architectural documentation to minimize context lookups.

## Table of Contents
1. [Overview](#overview)
2. [Application Flow](#application-flow)
3. [Module Documentation](#module-documentation)
4. [Business Logic](#business-logic)
5. [UI Patterns](#ui-patterns)
6. [Firebase Integration](#firebase-integration)
7. [React Migration Guide](#react-migration-guide)

## Overview

Mountain Medicine Catering is a comprehensive catering management application built with Streamlit and Firebase. It provides tools for event planning, recipe management, menu creation, ingredient tracking, and AI-powered features for catering businesses.

### Tech Stack
- **Frontend**: Streamlit with custom theme (purple color scheme #6B46C1)
- **Backend**: Firebase (Firestore database, Firebase Auth, Firebase Storage)
- **AI Integration**: OpenAI API for recipe parsing and chat features
- **Mobile Support**: Responsive design with dedicated mobile components
- **PDF Generation**: fpdf2 for document export
- **File Processing**: PyPDF2, python-docx, Pillow for various formats

## Application Flow

### 1. Entry Points

#### Public Landing (`public/index.html`)
- Static HTML page served by Firebase Hosting
- Login/signup forms using Firebase Auth JS SDK
- Redirects to Streamlit app after authentication
- Sets session token in localStorage

#### Streamlit App (`app.py`)
```python
def main():
    # 1. Initialize session (user_session_initializer.py)
    # 2. Check authentication (auth.py)
    # 3. Render layout based on auth state
    #    - Not authenticated: landing_page()
    #    - Authenticated: layout() with navigation
```

### 2. Authentication Flow

```
User → index.html → Firebase Auth → Token → localStorage → Streamlit → Session State
```

**Key Functions:**
- `auth.check_authentication()`: Validates Firebase token
- `auth.get_user()`: Returns current user object
- `auth.get_user_id()`: Returns user ID string
- `auth.require_role()`: Decorator for role-based access

**Session Management:**
- Token stored in `st.session_state["user"]`
- Expires after 30 days
- Refreshed on each page load

### 3. Navigation Structure

**Desktop Layout (`layout.py`)**:
```python
def layout():
    # Sidebar navigation
    pages = {
        "🏠 Events Dashboard": events_dashboard,
        "📅 Event Planner": event_planner,
        "📖 Recipe Manager": recipe_manager,
        "🍽️ Menu Builder": menu_builder,
        "🥕 Ingredients": ingredients_manager,
        "💬 AI Assistant": ai_assistant
    }
```

**Mobile Layout (`mobile_layout.py`)**:
- Bottom navigation bar
- Swipe gestures
- Touch-optimized components

### 4. Event Context System

Most operations require an active event context:

```python
# Pattern used throughout the app:
event_id = get_active_event_id()  # from utils.py
if not event_id:
    st.warning("Please select an event first")
    return
```

Event selection stored in `st.session_state["selected_event_id"]`

## Module Documentation

### Core Infrastructure Modules

#### `firebase_init.py`
**Purpose**: Initialize Firebase Admin SDK
```python
- get_db(): Returns Firestore client
- get_bucket(): Returns Storage bucket
- Credentials from st.secrets["firebase_admin"]
- Storage bucket from st.secrets["firebase"]["storageBucket"]
```

#### `auth.py`
**Purpose**: Authentication and authorization
```python
- check_authentication(): Validate user session
- get_user(): Get current user object
- get_user_id(): Get user ID string
- require_role(role): Decorator for role-based access
- has_role(user, required_role): Check if user has role
- logout(): Clear session and redirect
```

#### `utils.py`
**Purpose**: Common utilities used everywhere
```python
- get_active_event_id(): Current event context
- get_event_by_id(event_id): Fetch event document
- generate_id(prefix): Create unique IDs (e.g., "evt_xxx")
- format_date(date): Display-friendly date formatting
- value_to_text(value): Convert any value to string
- session_get(key): Safe session state getter
- session_set(key, value): Safe session state setter
- delete_button(label, key): Confirmation dialog for deletions
```

### Event Management Modules

#### `events.py`
**Purpose**: Core event CRUD operations
```python
- get_all_events(): Fetch all non-deleted events
- get_event(event_id): Get single event
- create_event(data): Create new event
- update_event(event_id, data): Update event
- delete_event(event_id): Soft delete
- get_event_recipes(event_id): Get recipes for event
- get_event_menus(event_id): Get menus for event
```

#### `event_planning_dashboard.py`
**Purpose**: Main event management UI
```python
- event_planning_dashboard(): Main dashboard view
- render_event_card(event): Display event summary
- render_event_timeline(): Calendar view
- handle_event_selection(): Set active event
```

#### `event_mode.py`
**Purpose**: Immersive event-focused interface
```python
- event_mode_ui(): Full-screen event view
- render_event_header(): Event info bar
- render_event_navigation(): Event-specific nav
- quick_actions_panel(): Common event tasks
```

### Recipe Management Modules

#### `recipes.py`
**Purpose**: Recipe CRUD and core operations
```python
- save_recipe_to_firestore(recipe_data, user_id): Create/update recipe
- find_recipe_by_name(name): Search recipes
- get_all_recipes(): Fetch all recipes
- merge_recipe_data(recipe1, recipe2): Combine multi-page recipes
- get_recipe_special_versions(recipe_id): Get dietary variants
- duplicate_recipe(recipe_id, new_name): Clone recipe
```

#### `recipes_editor.py`
**Purpose**: Recipe editing interface
```python
- recipe_editor_ui(recipe_id, prefill_data): Main editor
- render_ingredient_columns(items): Two-column ingredient display
- handle_recipe_save(): Save with validation
- handle_special_version(): Create dietary variant
```

#### `smart_recipe_scaler.py`
**Purpose**: Intelligent recipe scaling
```python
- scale_recipe(recipe, target_servings): Scale with smart parsing
- parse_ingredient(ingredient_str): Extract quantity/unit/item
- scale_quantity(quantity, scale_factor): Handle fractions
- format_scaled_quantity(quantity): Human-readable output
- get_scaling_notes(original_serves, target_serves): Tips
```

### Menu Management Modules

#### `menus.py`
**Purpose**: Menu CRUD operations
```python
- create_menu(menu_data): Create new menu
- update_menu(menu_id, data): Update menu
- get_menu(menu_id): Fetch single menu
- get_event_menus(event_id): Get menus for event
- duplicate_menu(menu_id, new_name): Clone menu
```

#### `menu_editor.py`
**Purpose**: Visual menu builder
```python
- menu_editor_ui(menu_id): Drag-drop interface
- render_recipe_card(recipe): Draggable recipe
- handle_drop_zones(): Manage menu sections
- calculate_menu_totals(): Aggregate servings/costs
```

#### `menu_viewer.py`
**Purpose**: Menu display and export
```python
- menu_viewer_ui(menu_id): Read-only view
- render_menu_section(section): Display menu section
- export_menu_pdf(menu_id): Generate PDF
- share_menu_link(menu_id): Create shareable URL
```

### Ingredient Management Modules

#### `ingredients.py`
**Purpose**: Ingredient tracking and management
```python
- create_ingredient(data): Add new ingredient
- update_ingredient(id, data): Update ingredient
- get_all_ingredients(): Fetch all ingredients
- search_ingredients(query): Find ingredients
- get_ingredient_usage(ingredient_id): Where used
```

#### `ingredients_editor.py`
**Purpose**: Ingredient editing UI
```python
- ingredient_editor_ui(): CRUD interface
- bulk_import_ingredients(csv_data): Import from CSV
- manage_ingredient_categories(): Category management
- ingredient_substitutions(): Define alternatives
```

#### `allergies.py`
**Purpose**: Allergen tracking
```python
- get_event_allergies(event_id): Get event allergens
- add_guest_allergy(event_id, guest_data): Add allergy
- remove_guest_allergy(event_id, allergy_id): Remove
- aggregate_event_allergens(event_id): Update event file
- check_recipe_allergens(recipe, allergens): Safety check
```

### AI and Parsing Modules

#### `ai_parsing_engine.py`
**Purpose**: AI-powered document parsing
```python
- parse_file(file, target_type, user_id): Main parser
- extract_text(file): Get text from any file type
- parse_recipe_from_text(text): Extract recipe data
- parse_menu_from_text(text): Extract menu data
- parse_with_vision(image_file): Use GPT-4 Vision
- validate_parsed_data(data, target_type): Ensure quality
```

#### `ai_chat.py`
**Purpose**: AI assistant interface
```python
- ai_chat_ui(): Chat interface
- process_chat_message(message, context): Handle queries
- generate_suggestions(context): Proactive help
- execute_chat_action(action, params): Perform tasks
```

### File Management Modules

#### `file_storage.py`
**Purpose**: Firebase Storage operations
```python
- save_uploaded_file(file, event_id, user_id): Upload file
- get_file_metadata(file_id): Get file info
- delete_file(file_id): Remove file
- link_file_to_entity(file_id, entity_type, entity_id): Associate
- file_manager_ui(): File browser interface
```

#### `upload.py`
**Purpose**: File upload interfaces
```python
- upload_ui_desktop(): Desktop upload with drag-drop
- upload_ui_mobile(): Mobile-optimized upload
- handle_multi_file_upload(files): Process multiple files
- merge_uploaded_recipes(results): Combine multi-page
```

### Mobile-Specific Modules

#### `mobile_helpers.py`
**Purpose**: Mobile detection and utilities
```python
- is_mobile(): Detect mobile device
- get_device_info(): Device capabilities
- safe_file_uploader(): Mobile-friendly upload
- mobile_number_input(): Touch-optimized input
```

#### `mobile_components.py`
**Purpose**: Mobile UI components
```python
- mobile_button(label, key, **kwargs): Touch buttons
- mobile_card(content): Swipeable cards
- mobile_navigation_bar(): Bottom nav
- mobile_form(fields): Touch-friendly forms
```

### Utility Modules

#### `pdf_export.py`
**Purpose**: PDF generation
```python
- generate_recipe_pdf(recipe_id): Recipe PDF
- generate_menu_pdf(menu_id): Menu PDF
- generate_shopping_list_pdf(event_id): Shopping list
- add_header_footer(pdf, title): Consistent styling
```

#### `firestore_utils.py`
**Purpose**: Database utilities
```python
- batch_write(operations): Atomic writes
- paginated_query(collection, limit): Handle large sets
- migrate_collection(from_col, to_col): Data migration
- backup_collection(collection): Export data
```

## Business Logic

### Recipe Scaling Algorithm

The scaling system intelligently handles various formats:

```python
def scale_recipe(recipe, target_servings):
    # 1. Calculate scale factor
    scale_factor = target_servings / recipe['serves']
    
    # 2. Parse each ingredient
    for ingredient in recipe['ingredients']:
        quantity, unit, item = parse_ingredient(ingredient)
        
        # 3. Scale quantity (handles fractions)
        new_quantity = scale_quantity(quantity, scale_factor)
        
        # 4. Format for display
        scaled_ingredient = format_scaled_quantity(new_quantity) + " " + unit + " " + item
    
    # 5. Add scaling notes for special cases
    if scale_factor > 2:
        add_note("Cooking time may need adjustment")
```

**Special Handling:**
- Fractions: "1/2 cup" → "1 1/2 cups"
- Ranges: "2-3 eggs" → "6-9 eggs"
- Units: Some don't scale (e.g., "to taste")
- Mixed numbers: "1 1/2" → "4 1/2"

### Menu Building Logic

Menus are organized hierarchically:

```
Menu
├── Sections (Appetizers, Mains, etc.)
│   ├── Recipes
│   │   ├── Servings
│   │   └── Notes
│   └── Section Notes
└── Menu Metadata
```

**Calculations:**
- Total servings per section
- Aggregate allergens
- Cost estimates (if prices available)
- Prep time totals

### Shopping List Generation

```python
def generate_shopping_list(event_id):
    # 1. Get all menus for event
    menus = get_event_menus(event_id)
    
    # 2. Extract all recipes
    recipes = extract_recipes_from_menus(menus)
    
    # 3. Scale recipes to guest count
    scaled_recipes = scale_recipes_for_event(recipes, event.guest_count)
    
    # 4. Parse and aggregate ingredients
    ingredients = parse_all_ingredients(scaled_recipes)
    
    # 5. Combine similar items
    combined = combine_ingredients(ingredients)
    
    # 6. Organize by category
    categorized = categorize_ingredients(combined)
    
    return categorized
```

### Allergen Management

Allergens are tracked at multiple levels:

1. **Recipe Level**: Tagged during creation/import
2. **Guest Level**: Individual dietary restrictions
3. **Event Level**: Aggregated from all sources
4. **Menu Level**: Inherited from recipes

```python
def check_menu_safety(menu_id, event_id):
    event_allergens = get_event_allergens(event_id)
    menu_allergens = get_menu_allergens(menu_id)
    
    conflicts = set(menu_allergens) & set(event_allergens)
    if conflicts:
        return {"safe": False, "conflicts": conflicts}
    return {"safe": True}
```

## UI Patterns

### Form Handling

Streamlit forms prevent premature reruns:

```python
with st.form("recipe_form"):
    # All inputs here
    name = st.text_input("Name")
    ingredients = st.text_area("Ingredients")
    
    if st.form_submit_button("Save"):
        # Process only on submit
        save_recipe(...)
```

### State Management

```python
# Initialize state
if "selected_recipe" not in st.session_state:
    st.session_state.selected_recipe = None

# Update state
st.session_state.selected_recipe = recipe_id

# Clear state
if "temp_data" in st.session_state:
    del st.session_state.temp_data
```

### Error Handling

```python
try:
    result = risky_operation()
    st.success("Operation completed!")
except FirebaseError as e:
    st.error(f"Database error: {e}")
    logger.error(f"Firebase operation failed: {e}")
except Exception as e:
    st.error("An unexpected error occurred")
    logger.exception("Unexpected error in operation")
```

### Mobile Responsive Design

```python
# Conditional layouts
if is_mobile():
    # Single column
    st.container()
else:
    # Multi-column
    col1, col2, col3 = st.columns([2, 3, 1])
```

### Progress Indicators

```python
# For long operations
with st.spinner("Processing recipes..."):
    for i, recipe in enumerate(recipes):
        progress.progress((i + 1) / len(recipes))
        process_recipe(recipe)
```

## Firebase Integration

### Firestore Collections

#### `/users`
```javascript
{
  id: "user_xxx",
  email: "user@example.com",
  name: "John Doe",
  role: "admin|editor|viewer",
  created_at: timestamp,
  last_login: timestamp,
  preferences: {
    theme: "light|dark",
    notifications: boolean
  }
}
```

#### `/events`
```javascript
{
  id: "evt_xxx",
  name: "Summer Wedding",
  start_date: timestamp,
  end_date: timestamp,
  location: "Venue Name",
  guest_count: 150,
  status: "planning|confirmed|completed",
  created_by: "user_xxx",
  created_at: timestamp,
  // Aggregated fields
  allergens: ["gluten", "dairy"],
  menu_ids: ["menu_xxx"],
  total_cost: 5000.00,
  notes: "Special instructions"
}
```

#### `/recipes`
```javascript
{
  id: "rec_xxx",
  name: "Chocolate Cake",
  ingredients: ["2 cups flour", "1 cup sugar"],
  instructions: "Mix ingredients...",
  serves: 12,
  prep_time: 30,
  cook_time: 45,
  tags: ["dessert", "vegetarian"],
  allergens: ["gluten", "dairy", "eggs"],
  image_url: "https://storage.googleapis.com/...",
  created_by: "user_xxx",
  created_at: timestamp,
  // Parsing metadata
  ingredients_parsed: true,
  parse_version: 2
}
```

#### `/menus`
```javascript
{
  id: "menu_xxx",
  name: "Wedding Dinner Menu",
  event_id: "evt_xxx",
  sections: [
    {
      name: "Appetizers",
      recipes: [
        {
          recipe_id: "rec_xxx",
          servings: 150,
          notes: "Serve first"
        }
      ]
    }
  ],
  created_by: "user_xxx",
  created_at: timestamp
}
```

#### `/ingredients`
```javascript
{
  id: "ing_xxx",
  name: "All-purpose flour",
  category: "dry goods",
  unit: "cup",
  allergens: ["gluten"],
  substitutes: ["almond flour", "rice flour"],
  supplier: "Restaurant Depot",
  cost_per_unit: 0.50
}
```

### Storage Structure

```
/uploads
  /evt_xxx (event-specific)
    /file_xxx_recipe.pdf
    /file_xxx_menu.jpg
  /unlinked (no event)
    /file_xxx_document.pdf
  
/recipe_images
  /rec_xxx_image.jpg
  
/exports
  /menu_xxx_export.pdf
  /shopping_list_evt_xxx.pdf
```

### Security Rules Patterns

```javascript
// Read own data
allow read: if request.auth.uid == resource.data.created_by;

// Role-based write
allow write: if request.auth.token.role in ["admin", "editor"];

// Event team access
allow read: if request.auth.uid in resource.data.team_members;
```

## React Migration Guide

### Architecture Changes

#### From Streamlit to React Architecture

**Streamlit (Current)**:
```
Request → Python Server → Process → Rerun Entire Page → Response
```

**React (Target)**:
```
User Action → React Component → API Call → Update State → Re-render Component
```

### API Endpoints Needed

#### Authentication
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/verify
POST   /api/auth/refresh
```

#### Events
```
GET    /api/events
GET    /api/events/:id
POST   /api/events
PUT    /api/events/:id
DELETE /api/events/:id
GET    /api/events/:id/recipes
GET    /api/events/:id/menus
GET    /api/events/:id/shopping-list
```

#### Recipes
```
GET    /api/recipes
GET    /api/recipes/:id
POST   /api/recipes
PUT    /api/recipes/:id
DELETE /api/recipes/:id
POST   /api/recipes/:id/scale
POST   /api/recipes/:id/duplicate
GET    /api/recipes/:id/versions
```

#### Menus
```
GET    /api/menus
GET    /api/menus/:id
POST   /api/menus
PUT    /api/menus/:id
DELETE /api/menus/:id
POST   /api/menus/:id/duplicate
GET    /api/menus/:id/export
```

#### AI/Parsing
```
POST   /api/parse/file
POST   /api/parse/url
POST   /api/parse/text
POST   /api/chat
POST   /api/suggestions
```

#### Files
```
POST   /api/upload
GET    /api/files
GET    /api/files/:id
DELETE /api/files/:id
```

### State Management Mapping

#### Session State → React Context/State

**Global State (Context)**:
```javascript
const AppContext = {
  user: { id, email, role },
  selectedEventId: string,
  events: Event[],
  recipes: Recipe[],
  menus: Menu[]
}
```

**Component State**:
```javascript
// Form state
const [formData, setFormData] = useState({})

// UI state
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)

// Derived state
const filteredRecipes = useMemo(() => 
  recipes.filter(r => r.tags.includes(filter)), 
  [recipes, filter]
)
```

### Component Mapping

#### Streamlit → React Components

**Layout Components**:
- `st.container()` → `<Container>`
- `st.columns()` → `<Grid>` with columns
- `st.expander()` → `<Accordion>`
- `st.tabs()` → `<Tabs>`

**Input Components**:
- `st.text_input()` → `<TextField>`
- `st.text_area()` → `<TextArea>`
- `st.selectbox()` → `<Select>`
- `st.multiselect()` → `<MultiSelect>`
- `st.number_input()` → `<NumberInput>`
- `st.file_uploader()` → `<FileUpload>`

**Display Components**:
- `st.write()` → `<Typography>`
- `st.markdown()` → `<Markdown>`
- `st.dataframe()` → `<DataTable>`
- `st.metric()` → `<MetricCard>`

**Feedback Components**:
- `st.success()` → `<Alert severity="success">`
- `st.error()` → `<Alert severity="error">`
- `st.warning()` → `<Alert severity="warning">`
- `st.spinner()` → `<CircularProgress>`

### Real-time Features

Replace Streamlit's full-page refresh with:

```javascript
// Firestore listeners
useEffect(() => {
  const unsubscribe = db.collection('recipes')
    .where('event_id', '==', eventId)
    .onSnapshot((snapshot) => {
      const recipes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setRecipes(recipes)
    })
  
  return () => unsubscribe()
}, [eventId])
```

### Mobile-First Considerations

```javascript
// Responsive design hooks
const isMobile = useMediaQuery('(max-width: 768px)')

// Touch gestures
const handlers = useSwipeable({
  onSwipedLeft: () => navigateNext(),
  onSwipedRight: () => navigatePrev()
})

// Conditional rendering
return isMobile ? <MobileLayout /> : <DesktopLayout />
```

### Performance Optimizations

```javascript
// Lazy loading
const RecipeEditor = lazy(() => import('./components/RecipeEditor'))

// Memoization
const expensiveCalculation = useMemo(() => 
  calculateShoppingList(recipes, guestCount), 
  [recipes, guestCount]
)

// Virtualization for long lists
<VirtualList
  items={recipes}
  renderItem={(recipe) => <RecipeCard recipe={recipe} />}
/>
```

### Testing Strategy

```javascript
// Component tests
describe('RecipeEditor', () => {
  it('should scale recipe correctly', () => {
    const { getByText, getByLabelText } = render(<RecipeEditor recipe={mockRecipe} />)
    fireEvent.change(getByLabelText('Servings'), { target: { value: '20' } })
    fireEvent.click(getByText('Scale'))
    expect(getByText('2 cups flour')).toBeInTheDocument()
  })
})

// Integration tests
it('should create recipe and update event', async () => {
  // Test API calls and state updates
})
```

## Event Mode (Planned Feature)

**Event Mode** is a planned feature for the React app that will provide a scoped view when editing an event. This feature will:

### 1. Event Planning Dashboard
When editing an event, users will enter a dedicated planning dashboard that provides:
- Event details editing
- Menu management for that specific event
- Recipe editing within the context of the event
- All edits scoped to the particular event

### 2. Multiple Menus per Event
Events can have multiple menus to handle different dietary needs:
- Main menu
- Vegan menu
- Allergy-specific menus (e.g., peanut-free menu)
- All menus displayed side-by-side for concurrent planning

### 3. Menu Structure
Each menu contains:
- **Meals** (not menu types): breakfast, lunch, dinner, ceremony, etc.
- Each meal includes:
  - Description field
  - Instructions field
  - Notes field
  - Multiple recipes as clickable cards

### 4. Scoped Editing
When in event mode:
- Shopping lists pertain to that specific event
- To-do lists are event-specific
- All changes are contextualized to the selected event

### Data Model Updates
The React app has been updated to support the new menu structure:
- Menus contain `meals` array (not `sections`)
- Each meal has `type`, `description`, `instructions`, `notes`, and `recipes` fields
- Backward compatibility maintained with `sections` field

## Development Commands

### Running the Application
```bash
# Standard development server
streamlit run app.py

# With CORS disabled (for development)
streamlit run app.py --server.enableCORS false --server.enableXsrfProtection false

# With specific port
streamlit run app.py --server.port 8502
```

### Installing Dependencies
```bash
# Python dependencies
pip install -r requirements.txt

# System dependencies (required for OCR)
sudo apt install tesseract-ocr

# For development
pip install pytest black flake8
```

### Environment Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

### Firebase Emulator (for testing)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start emulators
firebase emulators:start --only firestore,storage,auth

# Run app against emulators
FIRESTORE_EMULATOR_HOST=localhost:8080 streamlit run app.py
```

## Common Issues and Solutions

### Session State Issues
```python
# Problem: Number input shows error with empty string
# Solution: Never set to empty string
if "serves" in st.session_state:
    del st.session_state["serves"]  # Delete instead

# Problem: Form resets on interaction
# Solution: Use form container
with st.form("my_form"):
    # All inputs here
    submit = st.form_submit_button()
```

### Firebase Issues
```python
# Problem: Firebase not initialized
# Solution: Check if app exists
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

# Problem: Permissions denied
# Solution: Check authentication
user = get_user()
if not user or user.get("role") not in ["admin", "editor"]:
    st.error("Insufficient permissions")
```

### Mobile Issues
```python
# Problem: File upload fails on mobile
# Solution: Use mobile-specific uploader
if is_mobile():
    file = st.file_uploader("Choose file", 
                          accept_multiple_files=False,
                          type=['jpg', 'png'])
```

### Performance Issues
```python
# Problem: Slow recipe list loading
# Solution: Implement pagination
@st.cache_data
def load_recipes_page(page=1, limit=20):
    start = (page - 1) * limit
    return get_recipes_paginated(start, limit)
```

## Deployment

### GitHub Actions Workflow
The app automatically deploys on push to main:

```yaml
# .github/workflows/firebase-hosting-merge.yml
- Builds Streamlit app
- Deploys to Firebase Hosting
- Updates Firebase Functions
```

### Manual Deployment
```bash
# Deploy hosting only
firebase deploy --only hosting

# Deploy everything
firebase deploy

# Deploy specific function
firebase deploy --only functions:apiFunction
```

### Environment Variables
Required in `.streamlit/secrets.toml`:
```toml
[firebase_admin]
type = "service_account"
project_id = "your-project-id"
private_key = "-----BEGIN PRIVATE KEY-----\n..."
client_email = "firebase-adminsdk@..."

[firebase]
storageBucket = "your-project.appspot.com"

[openai]
api_key = "sk-..."
```

---

This document serves as the complete reference for the Mountain Medicine Catering application. When context is lost, start here to understand the system architecture and find specific implementation details.