#!/bin/bash

# Script to set IAM permissions for HTTP functions to allow unauthenticated access
# This is required for CORS preflight requests to work properly

PROJECT_ID="mountainmedicine-6e572"
REGION="us-central1"

echo "Setting IAM permissions for HTTP functions..."

# Array of HTTP functions that need unauthenticated access
FUNCTIONS=(
  "aiCreateRecipeHttp"
  "askAIHttp"
  "parseEventFlyerHTTP"
  "healthCheck"
)

for FUNCTION_NAME in "${FUNCTIONS[@]}"; do
  echo "Setting permissions for $FUNCTION_NAME..."
  
  # Add allUsers invoker permission
  gcloud functions add-iam-policy-binding "$FUNCTION_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --member="allUsers" \
    --role="roles/cloudfunctions.invoker" \
    2>&1 || echo "Warning: Could not set permissions for $FUNCTION_NAME"
done

echo "Done! HTTP functions should now accept CORS preflight requests."
echo ""
echo "Note: If you see permission errors, you may need to:"
echo "1. Ensure you're logged into gcloud: gcloud auth login"
echo "2. Set the correct project: gcloud config set project $PROJECT_ID"
echo "3. Have the necessary IAM permissions to modify function policies"