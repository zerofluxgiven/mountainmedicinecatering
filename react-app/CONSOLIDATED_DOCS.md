# Consolidated Documentation - Mountain Medicine Kitchen

## Overview
This document consolidates all important technical documentation from various fix/debug/test files that were scattered throughout the codebase. Obsolete files have been archived in `.archive/obsolete-docs/`.

## Key Fixes and Solutions

### 1. Firebase Functions Authentication (FIREBASE_FUNCTIONS_FIX.md)
**Problem**: 403 errors when calling Firebase Functions
**Solution**: 
```bash
gcloud functions add-iam-policy-binding askAI --member="allUsers" --role="roles/cloudfunctions.invoker"
```

### 2. Recipe Parser Fixes (RECIPE_PARSER_FIX_2025.md)
- Fixed multi-section recipe detection
- Enhanced instruction capture without summarization  
- Improved section header detection
- Removed mock parsing in favor of AI parsing

### 3. AI Chat Integration (AI_CHAT_TROUBLESHOOTING.md)
- Fixed CORS issues with HTTP endpoint workaround
- Implemented conversation history with localStorage
- Added recipe detection and saving from chat
- Smart recipe parsing from unstructured text

### 4. Image Upload Issues (IMAGE_EXTRACTION_FIX.md)
- Fixed Firebase Storage permissions for authenticated users
- Added proper error handling for upload failures
- Implemented thumbnail generation with Sharp

### 5. Event Parser Enhancement (EVENT_PARSER_FIX_SUMMARY.md)
- Removed 200+ lines of regex-based parsing
- Full AI integration for all file types
- Consistent accuracy with GPT-4 Vision API

## Testing Documentation

### Manual Testing Checklist
1. **Recipe Import**: Test URL, text file, and image imports
2. **AI Chat**: Verify recipe detection and saving
3. **Menu Planning**: Test multi-day event creation
4. **Mobile UI**: Check responsive design on actual devices
5. **PDF Export**: Verify formatting and auto-download

### Automated Tests
- Recipe parser tests: `src/__tests__/recipeParser.test.js`
- AI action service tests: `src/__tests__/aiActionServiceEnhanced.test.js`
- Integration tests: `src/__tests__/integration.test.js`

## Deployment Notes

### Firebase Deployment
```bash
# Always from react-app directory
cd /Users/danmcfarland/Documents/mountainmedicinecatering/react-app

# Build and deploy
npm run build
firebase deploy --only hosting

# Deploy functions with timeout
export FUNCTIONS_DISCOVERY_TIMEOUT=300
firebase deploy --only functions
```

### Common Issues
- Function deployment timeouts: Deploy individually or in batches
- CORS errors: Check Firebase Function permissions
- Auth errors: Verify Firebase config and API keys

## API Configuration
- Claude API: Used for AI chat assistant
- OpenAI API: Used for recipe/event parsing (to be migrated to Claude)
- Firebase Functions config required for both APIs

## Mobile UI Optimizations (July 2025)
- 16px font-size on all inputs to prevent iOS zoom
- 44px minimum touch targets
- Removed gradient scroll indicators on mobile
- Full-screen modals with no wasted space
- Smaller filter pills (0.65rem font size)
- Single-column layouts on mobile

## Archive Notice
The following files have been archived as they contain outdated or duplicate information:
- All TEST_*.md files (superseded by current test suite)
- All FIX_*.md files (solutions integrated into codebase)
- All DEBUG/ANALYSIS files (issues resolved)
- Individual troubleshooting guides (consolidated here)

For historical reference, see `.archive/obsolete-docs/`.