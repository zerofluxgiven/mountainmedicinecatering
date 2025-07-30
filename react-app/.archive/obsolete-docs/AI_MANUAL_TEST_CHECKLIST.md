# AI Integration Manual Testing Checklist

## Pre-Test Setup
- [ ] Ensure you're logged into the app
- [ ] Have at least one event created with guest allergens
- [ ] Have some recipes in the system (with allergen data)
- [ ] Open browser DevTools Console to monitor for errors

## 1. AI Chat Interface Testing

### 1.1 Basic Chat Functionality
- [ ] Navigate to any page with the AI chat bubble (bottom right)
- [ ] Click the purple chat bubble to open
- [ ] Verify chat window opens smoothly
- [ ] Check welcome message appears (witty personality)
- [ ] Type "Hello" and press Enter
- [ ] Verify response appears within 5 seconds
- [ ] Check response has Claude's personality

### 1.2 Context-Aware Assistance
- [ ] Go to a specific event page
- [ ] Open AI chat
- [ ] Ask: "What allergens are in this event?"
- [ ] Verify AI understands event context
- [ ] Go to a recipe page
- [ ] Ask: "Is this recipe gluten-free?"
- [ ] Verify AI understands recipe context

### 1.3 Recipe Queries
- [ ] Ask: "Show me all vegan recipes"
- [ ] Ask: "Scale the chocolate cake to serve 50"
- [ ] Ask: "What recipes are safe for nut allergies?"
- [ ] Verify responses are accurate and helpful

### 1.4 Error Handling
- [ ] Send an empty message (should be prevented)
- [ ] Send a very long message (1000+ chars)
- [ ] Minimize and maximize chat window
- [ ] Close and reopen chat (messages should persist)

## 2. Recipe Parsing Testing

### 2.1 Text File Upload
- [ ] Go to Recipes → Import Recipe
- [ ] Create a text file with this content:
```
Cowboy Caviar

Cowboy Caviar Ingredients:
• 1 can black beans
• 1 can corn
• 1 red onion, diced
• 2 bell peppers, diced

Zesty Dressing:
• 1/4 cup olive oil
• 1/4 cup vinegar
• 1 tsp chili powder

Instructions:
Mix all salsa ingredients.
Whisk dressing ingredients.
Combine and chill.
```
- [ ] Upload the file
- [ ] Verify sections are detected (Cowboy Caviar, Zesty Dressing)
- [ ] Verify ALL instructions are captured
- [ ] Check ingredients are properly distributed

### 2.2 Image Upload
- [ ] Take a photo of a recipe or download one
- [ ] Upload via Import Recipe
- [ ] Verify parsing completes
- [ ] Check all fields are extracted
- [ ] Verify image is saved with recipe

### 2.3 URL Import
- [ ] Find a recipe URL online
- [ ] Use Import from URL option
- [ ] Verify recipe is parsed correctly
- [ ] Check for proper section detection
- [ ] Verify instructions are complete

## 3. Event Parsing Testing

### 3.1 Event Flyer Upload
- [ ] Create a text file with event details:
```
Summer Wellness Retreat

Date: August 15-18, 2025
Time: 4:00 PM - 2:00 PM
Location: Mountain Lodge
Address: 123 Mountain Rd, Boulder, CO
Capacity: 45 guests
```
- [ ] Upload when creating new event
- [ ] Verify all fields are populated
- [ ] Check dates are correctly parsed
- [ ] Verify guest count is extracted

### 3.2 Image Flyer Upload
- [ ] Use an event flyer image
- [ ] Upload during event creation
- [ ] Verify text is extracted via OCR
- [ ] Check all details are parsed
- [ ] Verify image is saved with event

## 4. AI Safety Monitoring

### 4.1 Menu Conflict Detection
- [ ] Create/edit an event with allergens (e.g., gluten, dairy)
- [ ] Go to Menu Planning
- [ ] Add a recipe containing those allergens
- [ ] Within 30 seconds, AI chat should pop up with safety question
- [ ] Answer the safety question
- [ ] Verify response is logged

### 4.2 Guest Data Changes
- [ ] Add a new allergy to an existing event with menus
- [ ] Wait for AI monitoring to detect the change
- [ ] Check if safety question appears about re-verifying menus
- [ ] Verify question has high priority

### 4.3 Accommodation Planning
- [ ] From a menu with conflicts, click "Plan Accommodations"
- [ ] Verify conflict analysis is accurate
- [ ] Create an accommodation menu
- [ ] Check if AI verification question appears
- [ ] Verify accommodation is properly saved

## 5. AI History Testing

### 5.1 History Display
- [ ] Navigate to AI History page
- [ ] Verify all recent interactions are listed
- [ ] Check timestamps are correct
- [ ] Verify both chat messages and monitoring questions appear

### 5.2 Filtering
- [ ] Filter by Type (Chat vs Monitoring)
- [ ] Filter by Event
- [ ] Filter by Date Range
- [ ] Verify filters work correctly
- [ ] Clear filters and verify all items return

### 5.3 Real-time Updates
- [ ] Keep AI History page open
- [ ] In another tab, send an AI chat message
- [ ] Verify new interaction appears without refresh
- [ ] Check status updates in real-time

## 6. Performance Testing

### Response Times
- [ ] AI Chat response: < 5 seconds
- [ ] Recipe parsing: < 15 seconds
- [ ] Event parsing: < 15 seconds
- [ ] History page load: < 2 seconds
- [ ] Real-time updates: < 500ms

### Load Testing
- [ ] Send multiple chat messages rapidly
- [ ] Upload multiple recipes in succession
- [ ] Verify system remains responsive
- [ ] Check for any console errors

## 7. Mobile Testing

- [ ] Test on mobile device/responsive mode
- [ ] Verify AI chat is accessible
- [ ] Check chat window fits screen
- [ ] Test touch interactions
- [ ] Verify keyboard doesn't cover input

## Issues Found

### Critical Issues
1. _____________________________________
2. _____________________________________

### Minor Issues
1. _____________________________________
2. _____________________________________

### Suggestions
1. _____________________________________
2. _____________________________________

## Test Summary

- **Date**: ________________
- **Tester**: ________________
- **Overall Result**: [ ] Pass [ ] Pass with Issues [ ] Fail
- **Notes**: _____________________________________

## Next Steps
- [ ] Report critical issues immediately
- [ ] Create GitHub issues for bugs
- [ ] Update documentation if needed
- [ ] Schedule follow-up testing