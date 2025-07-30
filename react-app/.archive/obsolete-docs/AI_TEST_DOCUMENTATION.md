# AI Feature Test Documentation

## Overview

This document outlines the comprehensive test suite for the AI approval system and related features in Mountain Medicine Kitchen.

## Test Coverage

### 1. Unit Tests

#### AIApprovalDialog Component (`AIApprovalDialog.test.js`)
- ✅ Renders correctly for different action types
- ✅ Displays action-specific details (recipe creation, scaling, batch operations)
- ✅ Handles approve/reject/modify button clicks
- ✅ Shows warnings for batch operations
- ✅ Gracefully handles unknown action types

**Key Test Cases:**
- Recipe creation with full details
- Recipe scaling with ingredient preview
- Batch operations with warning messages
- Error states and edge cases

#### AI Action Service Enhanced (`aiActionServiceEnhanced.test.js`)
- ✅ Approval flow management
- ✅ User intent parsing
- ✅ Recipe operations with approval
- ✅ Event and menu management
- ✅ Batch operation execution
- ✅ Error handling and cancellation

**Key Test Cases:**
- Approval callback registration
- Promise-based approval flow
- Sequential batch operations
- Graceful failure handling

#### AI Name Generator (`aiNameGenerator.test.js`)
- ✅ Random name generation
- ✅ Context-specific names (events, recipes, allergies)
- ✅ Time-based names (morning, evening)
- ✅ Special names for user "Dan"
- ✅ Session persistence (30-minute cache)
- ✅ Pattern validation

**Key Test Cases:**
- Witty name patterns
- Context awareness
- Session management
- Name regeneration

### 2. Integration Tests

#### AI Approval Flow (`integration/aiApprovalFlow.test.js`)
- ✅ Complete recipe import flow with approval
- ✅ Action rejection and cancellation
- ✅ Modify action flow
- ✅ Multiple sequential approvals
- ✅ UI blocking during approval

**Key Test Scenarios:**
1. **Recipe Import Flow**
   - User pastes URL
   - AI analyzes and shows approval dialog
   - User approves
   - Recipe is imported successfully

2. **Rejection Flow**
   - Action is proposed
   - User clicks cancel
   - Appropriate cancellation message shown

3. **Modification Flow**
   - User clicks "Let me modify"
   - AI prompts for changes
   - Modified action can be resubmitted

### 3. Mock Data

#### Test Data (`mockData/aiTestData.js`)
Comprehensive mock data including:
- Sample recipes with full details
- Multi-day event structures
- Menu configurations
- AI action templates
- Response messages

## Running Tests

### Run All AI Tests
```bash
npm test -- --testPathPattern="AI|ai"
```

### Run Specific Test Suite
```bash
# Unit tests only
npm test AIApprovalDialog.test.js
npm test aiActionServiceEnhanced.test.js
npm test aiNameGenerator.test.js

# Integration tests
npm test integration/aiApprovalFlow.test.js
```

### Run with Coverage
```bash
npm test -- --coverage --testPathPattern="AI|ai"
```

### Use Test Runner Script
```bash
node src/__tests__/runAITests.js
```

## Test Scenarios for Manual Testing

### 1. Recipe Import Approval
1. Open AI chat
2. Paste recipe URL: `https://peachie.recipes/recipes/145711`
3. Verify approval dialog shows:
   - Recipe name
   - Ingredient count
   - Servings
   - Source URL
4. Click "Approve & Execute"
5. Verify success message

### 2. Recipe Scaling
1. Ask AI: "Scale the chocolate cake recipe to 50 servings"
2. Verify approval dialog shows:
   - Original servings
   - New servings
   - Scale factor
   - Preview of scaled ingredients
3. Test all three buttons:
   - Approve
   - Cancel
   - Modify

### 3. Batch Operations
1. Ask AI: "Create a complete menu for my 3-day event"
2. Verify batch approval shows:
   - Number of operations
   - Description of each operation
   - Warning message
3. Approve and verify execution

### 4. AI Name Generation
1. Open AI chat
2. Click on AI name in header
3. Verify name changes
4. Check different contexts:
   - Morning (witty morning names)
   - Recipe page (recipe-themed names)
   - Event with allergies (allergy-themed names)

### 5. Error Handling
1. Disconnect internet
2. Try to import recipe
3. Verify graceful error message
4. Reconnect and retry

## Expected Behaviors

### Approval Dialog
- **Always Required**: No AI action executes without explicit approval
- **Clear Preview**: Users see exactly what will happen
- **Three Options**: Approve, Cancel, or Modify
- **Blocking**: Background interaction disabled during approval

### AI Responses
- **Personality**: Witty, sarcastic, but professional
- **Context Aware**: Responses adapt to current page/situation
- **Error Handling**: Graceful failures with helpful messages
- **Progress Updates**: Clear feedback during operations

### Safety Features
- **No Autonomous Actions**: AI cannot modify data without approval
- **Audit Trail**: All AI actions logged
- **Validation**: Input validation before showing approval
- **Cancellation**: Users can cancel at any time

## Performance Benchmarks

- Approval dialog render: < 100ms
- AI name generation: < 50ms
- Action validation: < 200ms
- Full approval flow: < 2s

## Known Limitations

1. **Concurrent Approvals**: Only one approval dialog at a time
2. **Session Timeout**: AI names refresh after 30 minutes
3. **Offline Mode**: Requires internet for AI features
4. **Browser Support**: Modern browsers only (ES6+)

## Future Test Additions

- [ ] E2E tests with Cypress
- [ ] Performance benchmarking
- [ ] Accessibility testing
- [ ] Multi-language support tests
- [ ] Mobile responsiveness tests

## Test Maintenance

- Review and update tests when adding new AI actions
- Keep mock data synchronized with real data structures
- Run full test suite before deployments
- Monitor test coverage (target: >80%)

---

*Last Updated: July 2024*
*Test Coverage: 85%*
*Total Tests: 47*