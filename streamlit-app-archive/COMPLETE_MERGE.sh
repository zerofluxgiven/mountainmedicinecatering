#!/bin/bash
# Complete the unfinished merge

echo "Completing the merge..."

# Add the new file from main
git add f9a57b0a-ef76-46b7-b357-54357e019783.webarchive

# Complete the merge
git commit -m "Merge branch 'main' into fix/parsing-and-data-consistency

Bringing in latest changes from main branch."

echo "Merge completed!"

# Push the merged branch
echo "Pushing merged branch to remote..."
git push origin fix/parsing-and-data-consistency

echo "Done! Your branch is now up to date with main."

# Show the status
git status