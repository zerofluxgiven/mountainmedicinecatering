#!/bin/bash

echo "Starting Firebase Emulators..."

# Check if firebase-tools is installed
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Navigate to functions directory and install dependencies
cd functions
echo "Installing function dependencies..."
npm install

# Go back to project root
cd ..

# Start emulators
echo "Starting emulators..."
firebase emulators:start --only functions,firestore,auth,storage