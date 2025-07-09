#!/bin/bash
# Clean up temporary script files

echo "Cleaning up temporary files..."

# Remove the temporary script files
rm -f GIT_COMMANDS_TO_RUN.sh
rm -f GIT_PULL_AND_PUSH.sh
rm -f MERGE_FROM_MAIN.sh
rm -f UPDATE_FROM_MAIN.sh
rm -f COMPLETE_MERGE.sh
rm -f CLEANUP_TEMP_FILES.sh

# Keep the documentation file
echo "Keeping RECIPE_SCALING_FIX.md for documentation"

echo "Cleanup complete!"

# Show status
git status