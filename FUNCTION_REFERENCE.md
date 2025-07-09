# Complete Function Reference

This document contains every important function in the codebase with signatures and usage examples.

## Table of Contents
1. [Authentication Functions](#authentication-functions)
2. [Event Functions](#event-functions)
3. [Recipe Functions](#recipe-functions)
4. [Menu Functions](#menu-functions)
5. [AI/Parsing Functions](#ai-parsing-functions)
6. [File/Storage Functions](#file-storage-functions)
7. [UI Helper Functions](#ui-helper-functions)
8. [Mobile Functions](#mobile-functions)

## Authentication Functions

### auth.py

```python
def check_authentication() -> dict | None:
    """
    Validates current user session from localStorage token.
    Returns user dict if valid, None otherwise.
    Called at start of every page load.
    """
    
def get_user() -> dict | None:
    """
    Returns current user object from session state.
    Includes: id, email, name, role
    """
    
def get_user_id() -> str | None:
    """
    Returns just the user ID string for database operations.
    Most commonly used auth function.
    """
    
def require_role(required_role: str):
    """
    Decorator that restricts function access by role.
    Usage: @require_role("admin")
    Roles: admin > editor > viewer
    """
    
def has_role(user: dict, required_role: str) -> bool:
    """
    Check if user has required role or higher.
    Role hierarchy: admin > editor > viewer
    """
    
def logout():
    """
    Clears session and redirects to landing page.
    Also clears localStorage token via JavaScript.
    """
```

## Event Functions

### events.py

```python
def get_all_events() -> list[dict]:
    """
    Fetches all non-deleted events from Firestore.
    Returns list sorted by start_date descending.
    Each event includes computed fields like allergen aggregates.
    """
    
def get_event(event_id: str) -> dict | None:
    """
    Fetch single event by ID.
    Returns None if not found or deleted.
    """
    
def create_event(event_data: dict) -> str:
    """
    Creates new event with auto-generated ID (evt_xxx).
    Required fields: name, start_date, guest_count
    Returns new event ID.
    """
    
def update_event(event_id: str, updates: dict) -> bool:
    """
    Updates existing event fields.
    Automatically updates 'updated_at' timestamp.
    Returns success boolean.
    """
    
def delete_event(event_id: str) -> bool:
    """
    Soft deletes event (sets deleted=True).
    Events are never hard deleted to preserve history.
    """
    
def get_event_recipes(event_id: str) -> list[dict]:
    """
    Gets all recipes associated with an event.
    Includes recipes from all menus linked to event.
    Returns deduplicated list.
    """
    
def get_event_menus(event_id: str) -> list[dict]:
    """
    Fetches all menus for an event.
    Sorted by created_at timestamp.
    """
    
def calculate_event_totals(event_id: str) -> dict:
    """
    Calculates aggregate data for event:
    - Total recipe count
    - Total servings needed
    - Allergen list
    - Cost estimate (if available)
    """
```

### event_file.py

```python
def _get_event_file(event_id: str) -> dict:
    """
    Internal: Gets or creates event aggregate file.
    Contains computed fields like allergen lists.
    """
    
def _update_event_file_allergens(event_id: str):
    """
    Aggregates all allergens from:
    - Guest allergies
    - Recipe allergens in event menus
    Updates event document with combined list.
    """
    
def get_event_shopping_list(event_id: str) -> dict:
    """
    Generates categorized shopping list for event.
    Scales all recipes to guest count.
    Groups by ingredient category.
    """
```

## Recipe Functions

### recipes.py

```python
def save_recipe_to_firestore(recipe_data: dict, user_id: str = None) -> str:
    """
    Creates or updates recipe.
    Auto-generates ID if not provided (rec_xxx).
    Validates required fields: name, ingredients, serves.
    Returns recipe ID.
    """
    
def find_recipe_by_name(name: str) -> dict | None:
    """
    Case-insensitive recipe search by exact name.
    Used for duplicate detection.
    """
    
def get_all_recipes() -> list[dict]:
    """
    Fetches all recipes, sorted by name.
    Includes special dietary versions.
    """
    
def get_recipe(recipe_id: str) -> dict | None:
    """
    Fetch single recipe by ID.
    Returns None if not found.
    """
    
def duplicate_recipe(recipe_id: str, new_name: str = None) -> str:
    """
    Creates copy of recipe with new ID.
    Optionally rename during duplication.
    Returns new recipe ID.
    """
    
def merge_recipe_data(recipe1: dict, recipe2: dict) -> dict:
    """
    Intelligently merges two recipe dictionaries.
    Used for multi-page recipe uploads.
    Combines ingredients and instructions.
    """
    
def get_recipe_special_versions(recipe_id: str) -> list[dict]:
    """
    Gets dietary variants of a recipe.
    Returns list from versions subcollection.
    """
    
def create_special_version(recipe_id: str, version_data: dict) -> str:
    """
    Creates dietary variant (e.g., gluten-free).
    Stored in subcollection under parent recipe.
    """
```

### smart_recipe_scaler.py

```python
def scale_recipe(recipe: dict, target_servings: float) -> dict:
    """
    Intelligently scales recipe to target servings.
    Handles fractions, ranges, and special cases.
    Returns new recipe dict with scaled quantities.
    
    Example:
    scaled = scale_recipe(recipe, 50)  # Scale to 50 servings
    """
    
def parse_ingredient(ingredient_str: str) -> tuple[float, str, str]:
    """
    Parses ingredient string into components.
    Returns: (quantity, unit, ingredient_name)
    
    Example:
    parse_ingredient("2 cups flour") -> (2.0, "cups", "flour")
    parse_ingredient("1/2 tsp salt") -> (0.5, "tsp", "salt")
    """
    
def scale_quantity(quantity: float, scale_factor: float) -> float:
    """
    Scales a numeric quantity by factor.
    Handles rounding for common fractions.
    """
    
def format_scaled_quantity(quantity: float) -> str:
    """
    Formats number as readable fraction/mixed number.
    Examples: 0.5 -> "1/2", 1.5 -> "1 1/2"
    """
    
def get_scaling_notes(original: int, target: int) -> str:
    """
    Generates helpful notes for extreme scaling.
    Warns about timing/technique adjustments.
    """
```

## Menu Functions

### menus.py

```python
def create_menu(menu_data: dict) -> str:
    """
    Creates new menu with sections structure.
    Required: name, event_id
    Returns menu ID (menu_xxx).
    """
    
def update_menu(menu_id: str, updates: dict) -> bool:
    """
    Updates menu data including sections.
    Preserves section structure integrity.
    """
    
def get_menu(menu_id: str) -> dict | None:
    """
    Fetches single menu with all sections.
    Includes recipe details for each item.
    """
    
def add_recipe_to_menu(menu_id: str, section: str, recipe_id: str, servings: int):
    """
    Adds recipe to specific menu section.
    Creates section if doesn't exist.
    """
    
def remove_recipe_from_menu(menu_id: str, section: str, recipe_id: str):
    """
    Removes recipe from menu section.
    Cleans up empty sections.
    """
    
def calculate_menu_totals(menu_id: str) -> dict:
    """
    Calculates menu aggregates:
    - Total servings per section
    - Combined allergen list
    - Estimated prep time
    """
    
def duplicate_menu(menu_id: str, new_name: str = None) -> str:
    """
    Creates copy of menu with all sections.
    Useful for menu templates.
    """
```

### menu_editor.py

```python
def menu_editor_ui(menu_id: str = None):
    """
    Main menu builder interface.
    Drag-and-drop recipe organization.
    Real-time section management.
    """
    
def render_recipe_card_for_menu(recipe: dict, section: str):
    """
    Renders draggable recipe card.
    Shows servings input and notes.
    """
    
def handle_recipe_drop(recipe_id: str, target_section: str):
    """
    Processes drag-and-drop operations.
    Updates menu structure in database.
    """
    
def render_menu_section(section_name: str, recipes: list):
    """
    Displays menu section with recipes.
    Includes section totals and reordering.
    """
```

## AI Parsing Functions

### ai_parsing_engine.py

```python
def parse_file(file_obj, target_type: str = "recipe", user_id: str = None) -> dict:
    """
    Main parsing entry point for any file type.
    target_type: "recipe", "menu", "ingredients", "all"
    Handles PDF, images, DOCX, CSV, TXT.
    
    Returns: {
        "recipes": {...},
        "menus": {...},
        "ingredients": [...]
    }
    """
    
def extract_text(file_obj) -> str:
    """
    Extracts text from any supported file type.
    Uses appropriate library based on file extension.
    Falls back to OCR for images.
    """
    
def parse_recipe_from_text(text: str) -> dict:
    """
    Uses OpenAI to extract recipe from text.
    Returns structured recipe dict.
    Handles various formats and languages.
    """
    
def parse_menu_from_text(text: str) -> dict:
    """
    Extracts menu structure from text.
    Identifies sections and items.
    """
    
def parse_with_vision(image_file) -> dict:
    """
    Uses GPT-4 Vision for image parsing.
    Better for handwritten or complex layouts.
    """
    
def validate_parsed_data(data: dict, target_type: str) -> bool:
    """
    Validates parsed data has required fields.
    Ensures data quality before saving.
    """
    
def is_meaningful_recipe(recipe_data: dict) -> bool:
    """
    Checks if parsed recipe has actual content.
    Filters out empty or invalid parses.
    """
```

### ai_chat.py

```python
def ai_chat_ui():
    """
    Renders AI assistant chat interface.
    Maintains conversation context.
    """
    
def process_chat_message(message: str, context: dict) -> str:
    """
    Processes user message with context.
    Context includes current event, recipes, etc.
    Returns AI response.
    """
    
def generate_recipe_suggestions(event_id: str) -> list[str]:
    """
    Generates recipe ideas based on:
    - Event type and season
    - Guest count and allergens
    - Previous menus
    """
    
def analyze_menu_balance(menu_id: str) -> dict:
    """
    AI analysis of menu composition.
    Suggests improvements for:
    - Nutritional balance
    - Variety
    - Allergen alternatives
    """
```

## File Storage Functions

### file_storage.py

```python
def save_uploaded_file(file, event_id: str, uploaded_by: str) -> dict:
    """
    Uploads file to Firebase Storage.
    Creates metadata record in Firestore.
    Extracts and parses content.
    
    Returns: {
        "file_id": str,
        "parsed": dict,
        "raw_text": str
    }
    """
    
def get_file_metadata(file_id: str) -> dict:
    """
    Retrieves file metadata from Firestore.
    Includes storage URL and parsed data.
    """
    
def delete_file(file_id: str) -> bool:
    """
    Soft deletes file (marks deleted=True).
    Preserves file in storage for recovery.
    """
    
def link_file_to_entity(file_id: str, entity_type: str, entity_id: str):
    """
    Associates file with recipe/menu/event.
    entity_type: "recipes", "menus", "events"
    Updates file's linked_to field.
    """
    
def get_entity_files(entity_type: str, entity_id: str) -> list[dict]:
    """
    Gets all files linked to an entity.
    Used for showing attachments.
    """
```

### upload.py

```python
def upload_ui_desktop(event_id: str = None):
    """
    Desktop file upload interface.
    Supports multiple files and drag-and-drop.
    Auto-parses and merges multi-page recipes.
    """
    
def upload_ui_mobile():
    """
    Mobile-optimized upload interface.
    Single file at a time for better UX.
    Touch-friendly buttons.
    """
    
def handle_multi_file_upload(files: list, event_id: str) -> dict:
    """
    Processes multiple uploaded files.
    Merges multi-page recipes intelligently.
    Returns combined parsing results.
    """
```

## UI Helper Functions

### ui_components.py

```python
def render_tag_group(tags: list[str], key_prefix: str):
    """
    Renders clickable tag pills.
    Used for recipe tags, allergens, etc.
    Includes remove functionality.
    """
    
def edit_metadata_ui(entity_type: str, entity_id: str):
    """
    Generic metadata editor for any entity.
    Handles tags, notes, custom fields.
    """
    
def render_metric_card(label: str, value: any, delta: any = None):
    """
    Displays metric with optional change indicator.
    Used in dashboards and summaries.
    """
    
def confirmation_dialog(message: str, key: str) -> bool:
    """
    Two-step confirmation for destructive actions.
    Returns True if confirmed.
    """
    
def render_allergen_badges(allergens: list[str]):
    """
    Displays allergen warnings prominently.
    Color-coded by severity.
    """
```

### pdf_export.py

```python
def generate_recipe_pdf(recipe_id: str) -> bytes:
    """
    Creates formatted PDF of single recipe.
    Includes scaling options and images.
    Returns PDF bytes for download.
    """
    
def generate_menu_pdf(menu_id: str) -> bytes:
    """
    Creates professional menu PDF.
    Organized by sections with descriptions.
    """
    
def generate_shopping_list_pdf(event_id: str) -> bytes:
    """
    Creates categorized shopping list.
    Scaled to event guest count.
    Printable checklist format.
    """
    
def generate_event_summary_pdf(event_id: str) -> bytes:
    """
    Complete event package PDF:
    - Event details
    - All menus
    - Shopping lists
    - Prep schedules
    """
```

## Mobile Functions

### mobile_helpers.py

```python
def is_mobile() -> bool:
    """
    Detects mobile device from user agent.
    Checks for common mobile patterns.
    Cached in session state.
    """
    
def get_device_info() -> dict:
    """
    Returns device capabilities:
    - Screen size
    - Touch support
    - OS type
    """
    
def safe_file_uploader(label: str, key: str, **kwargs):
    """
    Mobile-compatible file uploader.
    Handles iOS/Android quirks.
    Single file only on mobile.
    """
    
def mobile_number_input(label: str, key: str, **kwargs):
    """
    Touch-optimized number input.
    Larger buttons for increment/decrement.
    """
```

### mobile_components.py

```python
def mobile_navigation_bar(current_page: str):
    """
    Bottom navigation bar for mobile.
    Fixed position with icons.
    Highlights current page.
    """
    
def mobile_recipe_card(recipe: dict):
    """
    Touch-optimized recipe display.
    Swipe actions for edit/delete.
    Tap to expand details.
    """
    
def mobile_event_selector():
    """
    Dropdown event selector for mobile.
    Shows in header for easy access.
    """
    
def mobile_action_button(label: str, icon: str, key: str, **kwargs):
    """
    Large touch-friendly action button.
    Icon + text for clarity.
    """
```

### mobile_layout.py

```python
def render_mobile_layout():
    """
    Main mobile app shell.
    Handles navigation and page routing.
    Optimized for small screens.
    """
    
def mobile_home_screen():
    """
    Mobile dashboard with quick actions.
    Event-focused interface.
    """
    
def handle_mobile_navigation(selected_page: str):
    """
    Routes to appropriate mobile view.
    Maintains navigation state.
    """
```

## Utility Functions

### utils.py

```python
def get_active_event_id() -> str | None:
    """
    Returns currently selected event ID.
    Central function used everywhere.
    Checks session state.
    """
    
def generate_id(prefix: str) -> str:
    """
    Generates unique ID with prefix.
    Format: prefix_randomstring
    Examples: evt_abc123, rec_xyz789
    """
    
def format_date(date_obj) -> str:
    """
    Consistent date formatting.
    Returns: "Jan 15, 2024"
    Handles various input types.
    """
    
def value_to_text(value: any) -> str:
    """
    Safely converts any value to string.
    Handles lists, dicts, None gracefully.
    Used for display formatting.
    """
    
def delete_button(label: str, key: str) -> bool:
    """
    Two-click delete confirmation.
    First click: "Delete" -> "Confirm?"
    Second click: Executes deletion
    """
    
def session_get(key: str, default=None):
    """
    Safe session state getter.
    Returns default if key doesn't exist.
    Prevents KeyError.
    """
    
def session_set(key: str, value: any):
    """
    Safe session state setter.
    Creates key if doesn't exist.
    """
```

### firestore_utils.py

```python
def batch_write(operations: list[dict]):
    """
    Performs multiple Firestore operations atomically.
    operations: [{"type": "create", "collection": "recipes", "data": {...}}]
    Rolls back all on any failure.
    """
    
def paginated_query(collection: str, page_size: int = 20, start_after=None):
    """
    Retrieves documents in pages.
    Returns (documents, last_doc_for_next_page).
    Prevents loading entire collection.
    """
    
def migrate_field(collection: str, old_field: str, new_field: str):
    """
    Renames field across all documents.
    Used for schema updates.
    Batched for performance.
    """
    
def aggregate_collection_data(collection: str, field: str) -> dict:
    """
    Aggregates data across collection.
    Example: Count recipes by tag.
    Returns frequency map.
    """
```

## React Migration Function Mappings

### State Management Conversions

```python
# Streamlit
st.session_state["selected_recipe"] = recipe_id

# React equivalent
const [selectedRecipe, setSelectedRecipe] = useState(recipeId)
```

### API Endpoint Mappings

```python
# Current: Direct Firestore call
recipes = db.collection("recipes").where("event_id", "==", event_id).stream()

# React: API endpoint
GET /api/events/{eventId}/recipes
```

### Real-time Updates

```python
# Current: Full page reload
st.rerun()

# React: Firestore listener
onSnapshot(query(collection(db, "recipes")), (snapshot) => {
  // Update only changed data
})
```

---

This reference covers all major functions in the application. Use it to quickly find function signatures and understand their purposes without searching through files.