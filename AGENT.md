# AGENT.md

This file provides guidance for AI agents working on the Mountain Medicine Catering codebase.

## Quick Start for AI Agents

### Primary Goal
This is a catering management system that helps organize events, recipes, menus, and handle dietary restrictions/allergies at scale.

### Key Commands
```bash
# Run the app
streamlit run app.py

# Install dependencies
pip install -r requirements.txt
```

### Critical Files to Understand
1. `app.py` - Main entry point and navigation
2. `recipes.py` - Recipe management (CRUD operations)
3. `events.py` - Event management
4. `ai_parsing_engine.py` - AI-powered parsing logic
5. `allergies.py` - Allergy tracking and management

## Code Architecture Principles

### 1. Event-Scoped Design
Almost everything in this app is scoped to a specific catering event:
- Recipes can be global or event-specific
- Menus belong to events
- Allergies are tracked per event
- Shopping lists are generated per event

**Always check**: `st.session_state.get("selected_event_id")`

### 2. Firebase Structure
```
/users/{userId}
/events/{eventId}
  /meta/event_file  # Aggregated event data
  /allergies/{allergyId}  # Individual allergy records
/recipes/{recipeId}
  /versions/{versionId}  # Special dietary versions
/menus/{menuId}
/ingredients/{ingredientId}
```

### 3. Session State Patterns
```python
# Good - Check existence first
if "key" in st.session_state:
    del st.session_state["key"]

# Bad - Can cause KeyError
del st.session_state["key"]

# Good - Type-appropriate defaults
st.number_input("Serves", value=4)  # Not empty string!
```

## Common Tasks & Solutions

### Adding a New Feature
1. Check if it needs event context
2. Add appropriate role checks (`get_user_role()`)
3. Include mobile support (`mobile_helpers.py`)
4. Handle errors gracefully (no crashes!)

### Modifying Recipe System
- Recipes MUST have `serves` field for scaling
- Use `save_recipe_to_firestore()` - it handles field normalization
- Special versions go in subcollections, not as separate recipes

### Working with AI Parsing
```python
# Always check if client exists
if not client:
    st.error("OpenAI not configured")
    return {}

# Validate parsed data
if not recipe.get("ingredients") or not recipe.get("instructions"):
    st.warning("Invalid recipe data")
```

### Handling Allergies
- Individual allergies: `/events/{eventId}/allergies/`
- Aggregated list: `event_file["allergens"]`
- Always call `_update_event_file_allergens()` after changes

## Testing Checklist

Before committing changes:
- [ ] Test on desktop view
- [ ] Test on mobile view
- [ ] Test with missing OpenAI key
- [ ] Test with no event selected
- [ ] Test with different user roles
- [ ] Check Firestore rules allow operations

## Known Gotchas

1. **UUID imports** - Must be at module level
2. **Number inputs** - Can't be cleared with empty strings
3. **Firestore queries** - May fail if field doesn't exist on all documents
4. **File uploads** - Different behavior on mobile vs desktop
5. **Special versions** - Not separate recipes, they're subcollection docs

## Future Enhancement Areas

### Smart Menu Modifications (Planned)
- Automatic special version selection based on guest allergies
- Ingredient substitution suggestions
- Scaling adjustments for dietary restrictions

### Testing Infrastructure (Needed)
- No tests exist currently
- Consider pytest + streamlit testing framework
- Mock Firebase calls for unit tests

### Performance Optimizations
- Recipe search could use Algolia/Elasticsearch
- Image uploads could use progressive loading
- Batch operations for large events

## AI Agent Tips

1. **Read error messages carefully** - Streamlit errors often indicate session state issues
2. **Check imports** - Missing imports are common when copying code
3. **Respect existing patterns** - Don't reinvent what already works
4. **Test incrementally** - Small changes are easier to debug
5. **Document complex logic** - Future agents will thank you

## Contact & Resources

- GitHub: https://github.com/zerofluxgiven/mountainmedicinecatering
- Streamlit Docs: https://docs.streamlit.io
- Firebase Docs: https://firebase.google.com/docs

Remember: This is a production app used by a real catering business. Quality and reliability matter!