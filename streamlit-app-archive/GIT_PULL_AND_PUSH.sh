#!/bin/bash
# Pull latest changes and push the recipe scaling fix

# Pull the latest changes from the remote branch
echo "Pulling latest changes..."
git pull origin fix/parsing-and-data-consistency

# Push your changes
echo "Pushing recipe scaling fix..."
git push origin fix/parsing-and-data-consistency

echo "Successfully pushed recipe scaling fix to fix/parsing-and-data-consistency branch!"