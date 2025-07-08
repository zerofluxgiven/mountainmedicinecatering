# Recipe Scaling Fix

## Issue
- When clicking the up button in recipe scaling, it incremented by 0.1 instead of 1
- The scale recipe option would disappear after scaling
- This was due to `step=None` in number inputs and improper session state handling

## Changes Made

### 1. Fixed Recipe Scaling Number Input (`recipes_editor.py`)
- Changed `step=None` to `step=1.0` in the target_servings number input
- Added `format="%.0f"` to display whole numbers
- This ensures the increment buttons increase by 1 instead of 0.1

### 2. Fixed Recipe Scaling Flow (`recipes_editor.py`)
- Removed the session state manipulation that was causing the editor to reload
- Instead of setting `inline_editor_data`, the scaled recipe is now:
  - Stored in a specific session state key
  - Displayed in an expander below the scale button
  - Can be saved as a new recipe with a dedicated button

### 3. Fixed Serves Number Inputs
- Updated serves input in `recipes_editor.py`: `step=1.0`, `format="%.0f"`
- Updated serves input in `recipes.py` manual recipe form: `step=1`

## Result
- Recipe scaling now increments by 1 as expected
- The scale recipe option remains visible after scaling
- Users can view the scaled recipe and save it as a new recipe if desired
- The recipe editor doesn't reload/disappear when scaling