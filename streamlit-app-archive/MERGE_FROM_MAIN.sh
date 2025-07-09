#!/bin/bash
# Merge latest changes from main into current branch

echo "Current branch: fix/parsing-and-data-consistency"
echo "Merging changes from main..."

# Merge with a merge commit (no rebase)
git pull origin main --no-rebase

echo ""
echo "Merge complete! Check for any conflicts above."
echo ""

# Show current status
git status

# Show recent commits to verify merge
echo ""
echo "Recent commits after merge:"
git log --oneline -10