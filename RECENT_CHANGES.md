# Recent Changes to Sync to Kitchen Repo

## Files Modified (Past Week)

### 1. recipes_editor.py
**Changes:**
- Simplified recipe scaling implementation
- Removed complex scaled_versions subcollection approach
- Added in-UI scaling with expander display
- Options to save scaled recipe as new or update current
- Fixed state management issues

### 2. upload.py
**Changes:**
- Multi-file upload support (front/back of recipe cards)
- Automatic recipe merging from multiple files
- Better error handling with try-catch blocks
- Mobile upload improvements

### 3. file_storage.py
**Changes:**
- Enhanced error handling for Firebase Storage
- Better error messages for debugging
- Try-catch blocks around upload operations

### 4. firebase_init.py
**Changes:**
- Added error handling for initialization
- Check for missing storageBucket configuration
- Better error messages

### 5. ai_parsing_engine.py
**Changes:**
- Fixed Vision API for mobile uploads
- Added debugging capabilities
- Improved error handling

## Key Features to Preserve in React

### Recipe Scaling
- Smart scaling with ingredient parsing
- Fractional measurements handling
- Scaling notes for special instructions
- Save scaled versions

### Multi-File Upload
- Drag-and-drop multiple files
- Automatic recipe merging
- Support for PDF, images, DOCX
- Progress indicators

### Mobile Support
- Touch-friendly UI
- Responsive design
- Mobile-specific upload flow
- Device detection

## Data Model Consistency

### Recipe Structure
```javascript
{
  id: string,
  name: string,
  ingredients: string[],
  instructions: string,
  serves: number,
  allergens: string[],
  tags: string[],
  image_url: string,
  created_at: timestamp,
  created_by: string
}
```

### Event Structure
```javascript
{
  id: string,
  name: string,
  start_date: timestamp,
  end_date: timestamp,
  location: string,
  guest_count: number,
  status: string,
  allergens: string[], // Aggregated
  menus: string[]
}
```

## API Endpoints Needed

### Recipes
- GET /api/recipes
- GET /api/recipes/:id
- POST /api/recipes
- PUT /api/recipes/:id
- POST /api/recipes/:id/scale

### Events
- GET /api/events
- GET /api/events/:id
- POST /api/events
- PUT /api/events/:id

### Upload
- POST /api/upload
- POST /api/parse

### AI
- POST /api/chat
- POST /api/parse/recipe
- POST /api/suggestions

## Git Sync Commands

To sync changes to kitchen repo:
```bash
# From mountainmedicinecatering directory
cp recipes_editor.py ../mountainmedicine-kitchen/mountainmedicine-kitchen/
cp upload.py ../mountainmedicine-kitchen/mountainmedicine-kitchen/
cp file_storage.py ../mountainmedicine-kitchen/mountainmedicine-kitchen/
cp firebase_init.py ../mountainmedicine-kitchen/mountainmedicine-kitchen/
cp ai_parsing_engine.py ../mountainmedicine-kitchen/mountainmedicine-kitchen/
```

---
Last Updated: [Current Date]
Status: Ready for sync