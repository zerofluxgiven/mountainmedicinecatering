# Remove Day Button Visibility Guide

## How to See the Remove Day Button in Menu Planner

The "Remove Day" button in the menu planner is working correctly but may not be immediately visible. Here's how to access it:

### Requirements for Button Visibility:
1. **Multiple Days Required**: The menu must have MORE than 1 day (button is hidden if only 1 day exists)
2. **Day Must Be Expanded**: Click on the day header to expand it and see the day actions

### Step-by-Step Instructions:
1. Navigate to a menu with multiple days (e.g., "24th Family Camping Trip")
2. Click on any day header (e.g., "Day 1 - Friday, July 25, 2025")
3. The day will expand showing meals and actions
4. Look in the top-right corner of the expanded day header
5. You'll see two buttons:
   - "+ Meal" button
   - "Remove Day" button (red background on desktop, shows text on mobile)

### Mobile vs Desktop Display:
- **Desktop**: Shows red "✕" icon
- **Mobile**: Shows "Remove Day" text

### Code Location:
- Component: `/src/components/Menu/DayEditor.jsx` (lines 213-222)
- Styles: `/src/components/Menu/DayEditor.css` (lines 166-194)
- Handler: `/src/components/Menu/MenuPlannerCalendar.jsx` (line 375-386)

### Why It's Hidden Sometimes:
- **Safety Feature**: Prevents accidental deletion of the last day
- **UI Cleanliness**: Only shows when relevant (multiple days exist)
- **Mobile Optimization**: Text label instead of icon for clarity

## Troubleshooting:
If you still can't see the button:
1. Ensure you have more than one day in the menu
2. Make sure the day is expanded (click the day header)
3. Check that you're logged in with proper permissions
4. Clear browser cache if styles seem incorrect