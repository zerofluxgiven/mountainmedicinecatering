#!/bin/bash

# Quick fix script to update collection names
# This replaces 'menus' with 'menu_items' in all necessary files

echo "🔧 Applying quick fix for collection names..."

# List of files that need updating
files=(
    "src/pages/Menus/MenuList.jsx"
    "src/contexts/AppContext.jsx"
    "src/pages/Events/EventViewer.jsx"
    "src/pages/Events/AllergyManager.jsx"
    "src/components/Menu/MenuPlannerCalendar.jsx"
    "src/components/Menu/AccommodationPlanner.jsx"
    "src/services/aiActionServiceEnhanced.js"
    "src/services/shoppingIntelligence.js"
    "src/services/aiMonitor.js"
    "src/pages/Menus/MenuViewer.jsx"
    "src/components/Shopping/SmartShoppingList.jsx"
)

# Create backup
echo "📦 Creating backup..."
cp -r src src.backup.$(date +%Y%m%d-%H%M%S)

# Replace in each file
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✏️  Updating $file..."
        # Replace collection(db, 'menus') with collection(db, 'menu_items')
        sed -i '' "s/collection(db, 'menus')/collection(db, 'menu_items')/g" "$file"
        # Replace doc(db, 'menus' with doc(db, 'menu_items'
        sed -i '' "s/doc(db, 'menus'/doc(db, 'menu_items'/g" "$file"
    else
        echo "⚠️  File not found: $file"
    fi
done

echo "✅ Quick fix applied!"
echo ""
echo "Next steps:"
echo "1. Run: npm start"
echo "2. Check if menus are loading"
echo "3. If it works, you're good to go!"
echo ""
echo "To revert changes, restore from backup: src.backup.*"