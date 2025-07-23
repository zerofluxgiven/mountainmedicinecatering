#!/bin/bash

# Test the AI endpoint directly with curl
echo "Testing askAIHttp endpoint..."

# First test without auth (should get 401)
echo -e "\n1. Testing without auth (expect 401):"
curl -X POST https://us-central1-mountainmedicine-6e572.cloudfunctions.net/askAIHttp \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' \
  -w "\nStatus: %{http_code}\n"

# Test with OPTIONS (CORS preflight)
echo -e "\n2. Testing CORS preflight:"
curl -X OPTIONS https://us-central1-mountainmedicine-6e572.cloudfunctions.net/askAIHttp \
  -H "Origin: https://mountainmedicine-6e572.web.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization" \
  -i