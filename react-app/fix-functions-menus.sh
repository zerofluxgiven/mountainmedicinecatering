#!/bin/bash

# Fix all Firebase Functions to use menu_items instead of menus

echo "🔧 Fixing Firebase Functions to use 'menu_items' collection..."

# List of files to update
files=(
  "functions/chat/assistant.js"
  "functions/index.js"
  "functions/src/triggers/menuSafetyTriggers.js"
  "functions/src/ai/aiActions.js"
  "functions/src/ai/aiActionsComplete.js"
)

# Counter for changes
total_changes=0

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Processing $file..."
    
    # Count occurrences before change
    before=$(grep -c "collection(\"menus\")\|collection('menus')" "$file" 2>/dev/null || echo 0)
    
    # Replace both single and double quoted versions
    sed -i '' "s/collection(\"menus\")/collection(\"menu_items\")/g" "$file"
    sed -i '' "s/collection('menus')/collection('menu_items')/g" "$file"
    
    # Count occurrences after change
    after=$(grep -c "collection(\"menus\")\|collection('menus')" "$file" 2>/dev/null || echo 0)
    
    # Calculate changes made
    changes=$((before - after))
    total_changes=$((total_changes + changes))
    
    if [ $changes -gt 0 ]; then
      echo "   ✅ Updated $changes occurrences"
    else
      echo "   ℹ️  No changes needed"
    fi
  else
    echo "⚠️  File not found: $file"
  fi
done

echo ""
echo "✅ Total changes made: $total_changes"
echo ""
echo "📌 Next steps:"
echo "1. Deploy the functions: firebase deploy --only functions"
echo "2. Clean up the duplicate menus using the browser script"