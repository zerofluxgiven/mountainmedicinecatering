#!/bin/bash
# Git commands to push recipe scaling fix

# Add the changed files
git add recipes_editor.py recipes.py

# Commit with message
git commit -m "Fix recipe scaling issues

- Fix increment by 0.1 instead of 1 in recipe scaling
- Prevent scale recipe option from disappearing
- Change step=None to step=1.0 in number inputs
- Improve recipe scaling UI to show scaled result in expander
- Add ability to save scaled recipe as new recipe

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to main branch
git push origin main

echo "Done! Recipe scaling fix has been pushed."