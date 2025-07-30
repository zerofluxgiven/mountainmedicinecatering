# AI Integration Test Plan

## Overview

This document outlines the comprehensive test plan for the AI integration features in the Mountain Medicine Catering React application. It covers testing procedures for the AI monitoring service, chat interface, history page, and diet management integration.

## Test Objectives

1. **Functionality**: Verify all AI features work as expected
2. **Performance**: Ensure AI responses are timely and efficient
3. **Reliability**: Confirm error handling and recovery mechanisms
4. **User Experience**: Validate intuitive interface and smooth interactions
5. **Data Integrity**: Ensure AI data is properly stored and retrieved
6. **Integration**: Verify seamless integration with existing features

## Test Environment Setup

### Prerequisites
1. Firebase project with Firestore and Functions configured
2. OpenAI API key configured in Firebase Functions
3. Test user accounts with different roles (admin, user)
4. Sample recipes and menus in the database
5. Test diet configurations

### Test Data
```javascript
// Sample test recipes
const testRecipes = [
  {
    name: "Classic Chocolate Cake",
    ingredients: ["2 cups flour", "1 cup sugar", "1/2 cup cocoa powder"],
    serves: 12,
    tags: ["dessert", "vegetarian"]
  },
  {
    name: "Grilled Salmon",
    ingredients: ["4 salmon fillets", "2 tbsp olive oil", "1 lemon"],
    serves: 4,
    tags: ["main", "pescatarian", "gluten-free"]
  }
];

// Sample test diets
const testDiets = [
  {
    name: "Gluten-Free",
    restrictions: ["gluten", "wheat", "barley", "rye"]
  },
  {
    name: "Vegan",
    restrictions: ["meat", "dairy", "eggs", "honey"]
  }
];

// Sample AI queries
const testQueries = [
  "Scale the chocolate cake recipe to serve 24 people",
  "What recipes are suitable for a gluten-free diet?",
  "Create a vegan version of the grilled salmon",
  "Generate a shopping list for a 50-person event"
];
```

## 1. AI Monitoring Service Testing (aiMonitor.js)

### Test Scenarios

#### 1.1 Service Initialization
**Objective**: Verify the AI monitoring service initializes correctly

**Steps**:
1. Start the application
2. Check browser console for initialization messages
3. Verify no errors in console
4. Check Network tab for Firebase connection

**Expected Results**:
- Service connects to Firestore
- Real-time listener established
- No console errors

#### 1.2 Real-time Updates
**Objective**: Test real-time AI interaction monitoring

**Steps**:
1. Open the application in two browser windows
2. In Window 1, send an AI chat message
3. In Window 2, navigate to AI History page
4. Observe real-time updates

**Expected Results**:
- New AI interaction appears immediately in Window 2
- Status updates from "processing" to "completed"
- No duplicate entries

#### 1.3 Error Handling
**Objective**: Test service behavior during connection issues

**Steps**:
1. Start the application
2. Disable network connection
3. Attempt to send AI chat message
4. Re-enable network connection
5. Check if pending messages are processed

**Expected Results**:
- Graceful error handling
- User notification of connection issues
- Automatic retry when connection restored

### Automated Test Example
```javascript
// aiMonitor.test.js
import { initializeAIMonitor } from '../services/aiMonitor';
import { firestore } from '../config/firebase';

jest.mock('../config/firebase');

describe('AI Monitor Service', () => {
  test('should initialize listener on service start', async () => {
    const mockOnSnapshot = jest.fn();
    firestore.collection.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      onSnapshot: mockOnSnapshot
    });

    const cleanup = initializeAIMonitor('test-user-id');
    
    expect(mockOnSnapshot).toHaveBeenCalled();
    expect(typeof cleanup).toBe('function');
  });
});
```

## 2. AI Chat Interface Testing (AIChat.jsx)

### Test Scenarios

#### 2.1 Message Input and Submission
**Objective**: Test chat message input and submission

**Steps**:
1. Navigate to AI Chat page
2. Type a test message: "What recipes can I make with chicken?"
3. Click Send button
4. Verify message appears in chat
5. Wait for AI response

**Expected Results**:
- Message input clears after sending
- User message appears immediately
- Loading indicator shows during processing
- AI response appears within 30 seconds

#### 2.2 Recipe Scaling
**Objective**: Test AI recipe scaling functionality

**Steps**:
1. Ask: "Scale the Classic Chocolate Cake recipe to serve 24"
2. Wait for AI response
3. Verify scaled ingredients
4. Check if original recipe is preserved

**Expected Results**:
- AI correctly doubles all ingredients
- Maintains ingredient formatting
- Provides scaling notes if applicable
- Original recipe unchanged in database

#### 2.3 Diet Filtering
**Objective**: Test AI diet-based recipe filtering

**Steps**:
1. Ask: "Show me all gluten-free recipes"
2. Verify AI response lists appropriate recipes
3. Ask: "Which recipes are suitable for vegans?"
4. Check accuracy of dietary classifications

**Expected Results**:
- AI correctly identifies dietary restrictions
- Only compatible recipes are suggested
- Clear explanation of why recipes match/don't match

#### 2.4 Error States
**Objective**: Test error handling in chat interface

**Test Cases**:
1. **Empty Message**: Try sending empty message
2. **Long Message**: Send message > 1000 characters
3. **Network Error**: Disconnect network and send message
4. **API Error**: Test with invalid API key (dev environment)

**Expected Results**:
- Empty messages are prevented
- Long messages show character limit warning
- Network errors show retry option
- API errors show helpful error message

### Manual Test Checklist
- [ ] Can send and receive messages
- [ ] Messages persist after page refresh
- [ ] Timestamp displays correctly
- [ ] User avatars/names show properly
- [ ] Scroll to bottom works on new messages
- [ ] Mobile responsive layout works
- [ ] Copy message functionality works
- [ ] Clear chat history works (if implemented)

### Automated Test Example
```javascript
// AIChat.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AIChat from '../components/Chat/AIChat';
import { aiService } from '../services/aiService';

jest.mock('../services/aiService');

describe('AI Chat Component', () => {
  test('should send message and display response', async () => {
    aiService.sendMessage.mockResolvedValue({
      response: 'Here are some chicken recipes...',
      timestamp: new Date()
    });

    render(<AIChat />);
    
    const input = screen.getByPlaceholderText('Ask me about recipes...');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'Chicken recipes' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Chicken recipes')).toBeInTheDocument();
      expect(screen.getByText(/Here are some chicken recipes/)).toBeInTheDocument();
    });
  });
});
```

## 3. AI History Page Testing (AIHistory.jsx)

### Test Scenarios

#### 3.1 History Display
**Objective**: Verify AI interaction history displays correctly

**Steps**:
1. Send several AI chat messages
2. Navigate to AI History page
3. Verify all interactions are listed
4. Check sorting (newest first)

**Expected Results**:
- All AI interactions visible
- Correct timestamps
- Proper sorting order
- Query and response preview visible

#### 3.2 Filtering and Search
**Objective**: Test history filtering capabilities

**Steps**:
1. Use date range filter to show last 7 days
2. Search for specific keyword (e.g., "vegan")
3. Filter by status (completed/failed)
4. Clear filters and verify all items return

**Expected Results**:
- Filters work independently and combined
- Search is case-insensitive
- Results update in real-time
- Clear filters restores full list

#### 3.3 Interaction Details
**Objective**: Test viewing full interaction details

**Steps**:
1. Click on a history item
2. Verify detail modal/view opens
3. Check full query and response displayed
4. Test copy functionality
5. Close detail view

**Expected Results**:
- Full conversation visible
- Metadata (timestamp, duration) shown
- Copy buttons work
- Smooth open/close animations

#### 3.4 Pagination
**Objective**: Test pagination for large history

**Steps**:
1. Ensure > 20 AI interactions exist
2. Verify pagination controls appear
3. Navigate through pages
4. Check items per page selector

**Expected Results**:
- Correct number of items per page
- Page navigation works
- No duplicate items
- Performance remains good with many items

### Performance Testing
```javascript
// Measure history page load time
console.time('AIHistoryLoad');
// Navigate to AI History
console.timeEnd('AIHistoryLoad'); // Should be < 2 seconds

// Test with large dataset (100+ interactions)
// Verify smooth scrolling
// Check memory usage doesn't increase significantly
```

## 4. Diet Management Integration Testing

### Test Scenarios

#### 4.1 Diet Creation via AI
**Objective**: Test creating diets through AI chat

**Steps**:
1. Ask AI: "Create a new diet for lactose intolerant guests"
2. AI should ask for confirmation
3. Confirm creation
4. Navigate to Diet Management
5. Verify new diet exists

**Expected Results**:
- AI understands diet creation request
- Confirmation step prevents accidents
- Diet created with correct restrictions
- Appears in diet management list

#### 4.2 Recipe-Diet Compatibility
**Objective**: Test AI's ability to check recipe-diet compatibility

**Steps**:
1. Ask: "Is the Chocolate Cake suitable for gluten-free diet?"
2. Ask: "Modify the Grilled Salmon for vegan diet"
3. Ask: "Which recipes work for both vegan and gluten-free?"

**Expected Results**:
- Accurate compatibility assessment
- Clear explanations of restrictions
- Helpful modification suggestions
- Correct multi-diet filtering

#### 4.3 Menu Planning with Diets
**Objective**: Test AI menu planning with dietary restrictions

**Steps**:
1. Ask: "Create a menu for 50 people with 10 vegans and 5 gluten-free"
2. Review suggested menu structure
3. Ask for alternatives for specific dishes
4. Request shopping list with diet considerations

**Expected Results**:
- AI suggests appropriate portions
- Separate menu sections for diets
- Scalable recipe suggestions
- Shopping list indicates special items

## 5. End-to-End Testing Scenarios

### Scenario 1: Event Planning with AI Assistance
**Objective**: Complete event planning workflow using AI

**Steps**:
1. Create new event for 100 guests
2. Ask AI: "Help me plan a wedding menu for 100 guests"
3. AI suggests menu structure
4. Ask: "15 guests are vegetarian, adjust the menu"
5. Request final shopping list
6. Save AI-generated menu to event

**Expected Results**:
- Smooth conversation flow
- Contextual understanding of event
- Accurate scaling and portioning
- Menu saves correctly to event
- Shopping list reflects all requirements

### Scenario 2: Recipe Import and Modification
**Objective**: Test AI-assisted recipe import and modification

**Steps**:
1. Ask AI: "I have a recipe for beef stew that serves 6"
2. Provide recipe details when prompted
3. Ask: "Convert this to serve 50 people"
4. Ask: "Make a vegetarian version"
5. Save both versions

**Expected Results**:
- AI correctly parses recipe
- Accurate scaling calculations
- Thoughtful vegetarian substitutions
- Both versions save correctly
- Original recipe preserved

### Scenario 3: Allergy Management
**Objective**: Test comprehensive allergy handling

**Steps**:
1. Add guest allergies to event (nuts, shellfish)
2. Ask AI: "Which recipes are safe for this event?"
3. Ask: "Suggest alternatives for unsafe recipes"
4. Generate allergy-safe menu
5. Verify shopping list has allergy warnings

**Expected Results**:
- AI recognizes event context
- Accurate allergy checking
- Helpful alternative suggestions
- Clear allergy indicators
- Shopping list includes warnings

## 6. Performance Benchmarks

### Response Time Targets
- Chat message send: < 100ms
- AI response (simple query): < 5 seconds
- AI response (complex query): < 15 seconds
- History page load: < 2 seconds
- Real-time updates: < 500ms

### Load Testing
```javascript
// Concurrent user test
for (let i = 0; i < 10; i++) {
  setTimeout(() => {
    sendAIMessage(`Test message ${i}`);
  }, i * 100);
}
// All messages should process successfully
```

## 7. Security Testing

### Test Cases
1. **Injection Attacks**: Try SQL/NoSQL injection in chat
2. **XSS Prevention**: Send messages with script tags
3. **Rate Limiting**: Send many messages rapidly
4. **Authentication**: Access AI features without login
5. **Data Privacy**: Verify user can only see own history

## 8. Accessibility Testing

### Checklist
- [ ] Keyboard navigation works throughout AI chat
- [ ] Screen reader announces new messages
- [ ] Sufficient color contrast in UI
- [ ] Focus indicators visible
- [ ] Alternative text for AI status indicators
- [ ] Mobile touch targets are adequate size

## 9. Browser Compatibility

### Test Matrix
| Feature | Chrome | Firefox | Safari | Edge | Mobile Safari | Chrome Mobile |
|---------|---------|---------|---------|---------|---------------|---------------|
| AI Chat | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| History | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Real-time | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 10. Regression Testing

After any AI feature updates, run this checklist:
- [ ] Existing recipes still display correctly
- [ ] Menu builder continues to function
- [ ] Event management unaffected
- [ ] User authentication works
- [ ] Firebase sync remains stable
- [ ] No console errors in production

## Test Execution Log

| Date | Tester | Test Type | Results | Issues Found |
|------|--------|-----------|---------|--------------|
| | | | | |
| | | | | |

## Automated Test Suite

### Setup
```bash
# Install test dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom jest

# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

### Critical Test Coverage Areas
1. AI message sending/receiving
2. Error handling
3. Diet filtering logic
4. History data fetching
5. Real-time updates

## Conclusion

This test plan ensures comprehensive coverage of all AI integration features. Regular execution of these tests will maintain system reliability and user satisfaction. Update this document as new AI features are added.