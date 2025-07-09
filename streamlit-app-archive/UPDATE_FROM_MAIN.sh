#!/bin/bash
# Update the current branch with latest changes from main

echo "Fetching latest changes from remote..."
git fetch origin

echo "Current branch: $(git branch --show-current)"

echo "Pulling latest changes from main..."
git pull origin main

echo "If there were any merge conflicts, please resolve them."
echo "Otherwise, your branch is now up to date with main!"

# Show the status
git status