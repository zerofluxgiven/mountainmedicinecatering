# CLAUDE.md - Complete Architecture Reference

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository. It contains complete architectural documentation to minimize context lookups.

## Table of Contents
1. [Overview](#overview)
2. [🚨 PERMISSIONS TROUBLESHOOTING](#permissions-troubleshooting)
3. [Revolutionary Menu Planning System](#revolutionary-menu-planning-system)
4. [AI Safety Monitoring](#ai-safety-monitoring)
5. [React Application Architecture](#react-application-architecture)
6. [Firebase Integration](#firebase-integration)
7. [Component Architecture](#component-architecture)
8. [Business Logic](#business-logic)
9. [Development Workflow](#development-workflow)

## Overview

**Mountain Medicine Kitchen** is a comprehensive catering management application built with React and Firebase, featuring revolutionary AI-powered menu planning and safety monitoring. The app has been completely rewritten from Streamlit to React with a focus on intuitive calendar-style menu planning for multi-day retreat events.

### Tech Stack
- **Frontend**: React 18 with React Router, custom CSS with calendar design
- **Backend**: Firebase (Firestore, Auth, Storage, Functions with automated triggers)
- **AI Integration**: Claude API (Anthropic) for chat + OpenAI GPT-4 for recipe/event parsing
- **Real-time Safety**: Firebase Functions with automated AI monitoring triggers
- **State Management**: React Context API with event-centric design
- **Mobile Support**: Responsive calendar interface with touch optimization
- **PDF Generation**: Client-side PDF creation with jsPDF and html2canvas
- **Image Processing**: Automated thumbnail generation with Firebase Functions and Sharp

### Key Innovations
- **Calendar-Style Menu Planning**: Visual timeline with expandable days and color-coded meals
- **AI Safety Pipeline**: Automatic triggers monitor menu changes and guest restrictions
- **Smart Accommodation Planning**: One-click analysis creates safe alternatives for dietary needs
- **Event-Centric Design**: All functionality flows from multi-day event context
- **Professional PDF Export**: Auto-downloading PDFs with visual margins for all content
- **Comprehensive Allergen Management**: Hierarchical allergen system with custom allergen support

## 🚨 PERMISSIONS TROUBLESHOOTING

**IMPORTANT**: When you encounter permission errors (403, CORS, "Missing permissions"), check the **[MANUAL_PERMISSIONS_GUIDE.md](./react-app/MANUAL_PERMISSIONS_GUIDE.md)** file first!

Common permission issues that require manual intervention:
- **Firestore Rules**: Must be updated in Firebase Console
- **Cloud Functions IAM**: Run `gcloud` commands to allow public access
- **API Keys**: Must be set with `firebase functions:config:set`
- **Storage Rules**: Must be configured in Firebase Console

**Dan: When you see errors, ask me "Is this a permissions issue?" and I'll check the guide and tell you exactly what needs to be done manually.**

## Revolutionary Menu Planning System

### MenuPlannerCalendar Component
**Location**: `/src/components/Menu/MenuPlannerCalendar.jsx`

The centerpiece of the application - a visual calendar interface that revolutionizes catering menu planning:

```javascript
// Auto-generates menu structure based on event dates
const createEventMenu = (eventData) => {
  const days = getDateRange(eventData.start_date, eventData.end_date);
  
  return {
    event_id: eventId,
    name: `${eventData.name} - Primary Menu`,
    type: 'primary',
    days: days.map((date, index) => ({
      date: date,
      day_label: `Day ${index + 1}`,
      expanded: index === 0, // First day expanded by default
      meals: [
        createMeal('breakfast'),
        createMeal('lunch'), 
        createMeal('dinner')
      ]
    }))
  };
};
```

**Key Features**:
- **Auto-population**: Creates 3 meals per day for entire event duration
- **Color-coded meals**: Each meal type has consistent visual theming
- **Expandable days**: Click to show/hide detailed meal planning
- **Real-time conflict detection**: Instant allergen warnings
- **AI safety integration**: Automatic triggers on menu changes

### Meal Type Configuration
```javascript
const MEAL_TYPES = {
  breakfast: { label: 'Breakfast', color: '#FFF8DC', defaultTime: '8:00 AM', icon: '☀️' },
  lunch: { label: 'Lunch', color: '#F0F8FF', defaultTime: '12:30 PM', icon: '🥗' },
  dinner: { label: 'Dinner', color: '#F5F5DC', defaultTime: '7:00 PM', icon: '🍽️' },
  snack: { label: 'Snack', color: '#F0FFF0', defaultTime: '3:00 PM', icon: '🍎' },
  special: { label: 'Special Event', color: '#FFE4E1', defaultTime: '6:00 PM', icon: '🎉' },
  late_night: { label: 'Late Night', color: '#E6E6FA', defaultTime: '10:00 PM', icon: '🌙' }
};
```

### Component Hierarchy
```
MenuPlannerCalendar
├── DayEditor (for each day)
│   ├── MealEditor (for each meal)
│   │   ├── RecipeSelector (recipe assignment)
│   │   └── Course management
│   └── Meal management (add/remove/reorder)
├── AccommodationPlanner (conflict resolution)
└── AI safety integration
```

### Data Structure - New Menu Model
```javascript
// Updated menu structure supporting multi-day events
{
  id: "menu_xxx",
  event_id: "evt_xxx", 
  name: "Summer Retreat - Primary Menu",
  type: "primary", // primary, accommodation
  days: [
    {
      date: "2024-08-15",
      day_label: "Day 1 - Arrival",
      expanded: true,
      meals: [
        {
          id: "meal_xxx",
          type: "breakfast",
          time: "8:00 AM", 
          color: "#FFF8DC",
          courses: [
            {
              id: "course_xxx",
              name: "Pancakes",
              recipe_id: "rec_xxx",
              servings: 45,
              notes: "With maple syrup",
              allergens: ["gluten", "dairy"],
              dietary_tags: ["vegetarian"]
            }
          ]
        }
      ]
    }
  ]
}
```

## AI Safety Monitoring

### Automated Safety Triggers
**Location**: `/functions/src/triggers/menuSafetyTriggers.js`

The AI safety system uses Firebase Functions to automatically monitor for potential safety issues:

#### 1. Menu Change Trigger
```javascript
exports.onMenuChange = functions.firestore
  .document('menus/{menuId}')
  .onWrite(async (change, context) => {
    // Triggers whenever a menu is created or updated
    // Creates AI monitoring question for safety verification
    // Cross-references with event allergens and dietary restrictions
  });
```

#### 2. Guest Data Change Trigger  
```javascript
exports.onEventGuestDataChange = functions.firestore
  .document('events/{eventId}')
  .onUpdate(async (change, context) => {
    // Triggers when allergen/dietary data changes
    // Re-checks ALL menus for the event
    // Creates urgent AI monitoring questions
  });
```

#### 3. Accommodation Verification
```javascript
exports.onAccommodationMenuCreate = functions.firestore
  .document('accommodation_menus/{accommodationId}')
  .onCreate(async (snap, context) => {
    // Verifies new accommodation recipes are safe
    // Highest priority AI monitoring questions
  });
```

#### 4. Daily Safety Sweeps
```javascript
exports.dailySafetySweep = functions.pubsub.schedule('every day 08:00')
  .onRun(async (context) => {
    // Proactive daily checks for upcoming events
    // Ensures nothing is missed
  });
```

### AI Monitoring Data Structure
```javascript
// AI monitoring questions created by triggers
{
  type: 'menu_safety_check', // or 'guest_data_change_review', 'accommodation_verification', 'daily_safety_sweep'
  priority: 'high', // high, medium, low
  event_id: "evt_xxx",
  menu_id: "menu_xxx", 
  question: "URGENT: Menu has been updated. Please verify all recipes are safe...",
  context: {
    trigger: 'menu_change',
    event_allergens: ["gluten", "dairy"],
    guests_with_restrictions: [...],
    requires_immediate_review: true,
    auto_trigger: true
  },
  status: 'pending', // pending, in_progress, completed
  created_at: timestamp,
  expires_at: timestamp
}
```

## React Application Architecture

### Updated Event Model
Events now support multi-day retreats with enhanced dietary tracking:

```javascript
// New event structure 
{
  id: "evt_xxx",
  name: "Summer Wellness Retreat",
  start_date: "2024-08-15", // Date only, no times
  end_date: "2024-08-18",   // NEW: End date field  
  location: "Mountain Lodge",
  guest_count: 45,
  // Enhanced dietary tracking
  allergens: ["gluten", "dairy", "nuts"],
  dietary_restrictions: ["vegan", "keto", "paleo"], 
  guests_with_restrictions: [
    {
      name: "Sarah M.",
      allergies: ["gluten"],
      diet: "vegan"
    }
  ]
}
```

### Component Structure

#### Core Menu Components
- **MenuPlannerCalendar**: Main calendar interface (THE active menu editor)
- **DayEditor**: Expandable day component with meal management
- **MealEditor**: Individual meal with course management  
- **RecipeSelector**: Smart recipe selection with conflict detection
- **AccommodationPlanner**: Conflict analysis and alternative generation
- **MenuPlannerWrapper**: Wrapper that loads MenuPlannerCalendar with proper context

#### AI Integration Components
- **AIChat**: Claude-powered assistant with witty personality (components/AI/AIChat.jsx)
- **AIHistory**: Monitoring question tracking
- **AI Safety Triggers**: Background monitoring system

#### REMOVED Components (July 2025 Cleanup)
- ~~MenuEditor~~ - Old 658-line component, replaced by MenuPlannerCalendar
- ~~MenuPlanner~~ - Old 29-line component, replaced by MenuPlannerWrapper
- ~~pages/Chat/AIChat~~ - Duplicate AI chat (361 lines), caused inconsistent behavior

#### Shared Components
- **Layout**: Main app navigation and structure
- **AuthContext**: Firebase authentication management
- **AppContext**: Global state management

### Routing Structure
```javascript
// Key routes for menu planning
<Route path="/events/:eventId/menus/new/plan" element={<MenuPlanner />} />
<Route path="/events/:eventId/menus/:menuId/plan" element={<MenuPlanner />} />

// The MenuPlanner component uses MenuPlannerCalendar
// Automatically ties menu to event context
```

### State Management

#### Global Context (AppContext)
```javascript
const AppContext = {
  user: { id, email, role },
  selectedEventId: string,
  events: Event[],
  recipes: Recipe[],
  menus: Menu[],
  // AI monitoring state
  aiQuestions: Question[]
}
```

#### Component State Patterns
```javascript
// Menu planner maintains complex state
const [menu, setMenu] = useState(null);
const [event, setEvent] = useState(null);
const [accommodationMenus, setAccommodationMenus] = useState([]);

// Real-time updates via Firestore listeners
useEffect(() => {
  const unsubscribe = onSnapshot(doc(db, 'menus', menuId), (doc) => {
    setMenu({ id: doc.id, ...doc.data() });
  });
  return unsubscribe;
}, [menuId]);
```

## Firebase Integration

### Collections Schema

#### `/events` - Enhanced Event Structure
```javascript
{
  id: "evt_xxx",
  name: "Summer Retreat",
  start_date: firestore.Timestamp,
  end_date: firestore.Timestamp, // NEW
  guest_count: 45,
  allergens: ["gluten", "dairy"], // NEW - aggregated
  dietary_restrictions: ["vegan"], // NEW
  guests_with_restrictions: [...], // NEW - detailed guest info
  created_at: timestamp,
  updated_at: timestamp
}
```

#### `/menus` - Revolutionary Structure  
```javascript
{
  id: "menu_xxx",
  event_id: "evt_xxx",
  name: "Primary Menu", 
  type: "primary",
  days: [
    {
      date: "2024-08-15",
      day_label: "Day 1",
      expanded: boolean,
      meals: [
        {
          id: "meal_xxx",
          type: "breakfast",
          time: "8:00 AM",
          color: "#FFF8DC",
          courses: [
            {
              id: "course_xxx", 
              name: "Recipe Name",
              recipe_id: "rec_xxx",
              servings: number,
              notes: string,
              allergens: [],
              dietary_tags: []
            }
          ]
        }
      ]
    }
  ]
}
```

#### `/accommodation_menus` - Smart Alternatives
```javascript
{
  id: "acc_xxx",
  main_menu_id: "menu_xxx",
  event_id: "evt_xxx",
  type: "accommodation",
  day_index: 0,
  meal_index: 1, 
  course_index: 0,
  original_course: {...},
  alternative: {
    name: "Vegan Alternative",
    description: "Plant-based version",
    modifications: ["Replace dairy", "Use plant milk"],
    serves: 3,
    allergens: [],
    dietary_tags: ["vegan"]
  },
  affected_guests: [...],
  created_at: timestamp
}
```

#### `/ai_monitoring` - Safety Questions
```javascript
{
  id: "ai_xxx",
  type: "menu_safety_check",
  priority: "high",
  event_id: "evt_xxx", 
  menu_id: "menu_xxx",
  question: "Safety verification needed...",
  context: {
    trigger: "menu_change",
    event_allergens: [],
    auto_trigger: true
  },
  status: "pending",
  created_at: timestamp,
  expires_at: timestamp
}
```

### Firebase Functions

#### Core Functions
- **askAI**: Claude-powered chat assistant (Anthropic Claude 3.5 Sonnet)
- **parseRecipe**: AI recipe parsing from files/URLs (⚠️ Still using OpenAI GPT-4)
- **generateMenuPDF**: PDF export functionality
- **generateRecipeThumbnails**: Automated thumbnail generation on image upload
- **generateThumbnailsForExistingImages**: Batch thumbnail creation for existing images

#### AI API Status (As of July 2025)
**Important Finding**: The system currently uses a dual AI approach:
- **Chat/Assistant Functions** (`askAI`): ✅ Successfully migrated to Claude API
  - Uses Claude 3.5 Sonnet with witty, Anthony Bourdain-style personality
  - Handles all chat interactions and AI safety monitoring
- **Recipe Parsing** (`parseRecipe`): ❌ Still using OpenAI API
  - Text parsing: GPT-4o-mini
  - Image recognition: GPT-4o (Vision)
  - URL scraping and parsing
  - PDF/document extraction

**TODO**: Migrate recipe parsing functions to Claude API to fully transition away from OpenAI. Claude 3.5 Sonnet has vision capabilities that can handle all current OpenAI use cases.

#### AI Safety Functions  
- **onMenuChange**: Menu change monitoring
- **onEventGuestDataChange**: Guest data monitoring
- **onAccommodationMenuCreate**: Alternative verification
- **dailySafetySweep**: Proactive safety checks

#### PDF Generation Service
**Location**: `/src/services/pdfService.js`

Client-side PDF generation with professional formatting:

```javascript
// Generate recipe PDF with sections support
export async function generateRecipePDF(recipe) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Add visual margin indicators
  pdf.setDrawColor(240);
  pdf.setLineWidth(0.1);
  pdf.rect(
    PDF_CONFIG.margins.left - 10,
    PDF_CONFIG.margins.top - 10,
    PDF_CONFIG.pageSize.width - (PDF_CONFIG.margins.left + PDF_CONFIG.margins.right) + 20,
    PDF_CONFIG.pageSize.height - (PDF_CONFIG.margins.top + PDF_CONFIG.margins.bottom) + 20
  );
  
  // Auto-download with descriptive filename
  pdf.save(`${recipe.name || 'recipe'}-${new Date().toISOString().split('T')[0]}.pdf`);
}

// Generate menu PDF with event context
export async function generateMenuPDF(menu, event) {
  // Creates formatted menu with day/meal breakdown
  // Includes event information and guest details
}

// Generate event PDF with menu listings
export async function generateEventPDF(event, menus = []) {
  // Creates comprehensive event summary
  // Includes dietary restrictions and menu overviews
}
```

#### Allergen Management System
**Location**: `/src/services/allergenManager.js`

Hierarchical allergen system with custom support:

```javascript
export const ALLERGEN_HIERARCHY = {
  'tree nuts': {
    label: 'Tree Nuts',
    children: ['almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'macadamia', 'pistachio', 'brazil nut'],
    severity: 'high'
  },
  'dairy': {
    label: 'Dairy',
    children: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein'],
    severity: 'medium'
  },
  // ... more allergens
};

// Smart allergen checking with hierarchy awareness
export function checkRecipeAllergens(recipe, eventAllergens) {
  const conflicts = [];
  
  eventAllergens.forEach(eventAllergen => {
    const hierarchy = ALLERGEN_HIERARCHY[eventAllergen];
    
    if (hierarchy) {
      // Check parent allergen
      if (recipe.allergens?.includes(eventAllergen)) {
        conflicts.push(eventAllergen);
      }
      
      // Check child allergens
      hierarchy.children.forEach(childAllergen => {
        if (recipe.allergens?.includes(childAllergen)) {
          conflicts.push(childAllergen);
        }
      });
    }
  });
  
  return conflicts;
}
```

### Security Rules
```javascript
// Enhanced security for menu data
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Menus can only be accessed by authenticated users
    match /menus/{menuId} {
      allow read, write: if request.auth != null;
    }
    
    // AI monitoring requires proper auth
    match /ai_monitoring/{questionId} {
      allow read, write: if request.auth != null;
    }
    
    // Accommodation menus 
    match /accommodation_menus/{accommodationId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Component Architecture

### MenuPlannerCalendar Component Flow

```javascript
// Main component manages overall state
const MenuPlannerCalendar = ({ eventId, menuId, onMenuChange }) => {
  // 1. Load event and menu data
  // 2. Create menu structure if new
  // 3. Handle real-time updates
  // 4. Manage AI safety integration
  
  const handleMenuUpdate = async (updatedMenu) => {
    // Save to Firestore
    // Trigger AI safety check
    await triggerAISafetyCheck(updatedMenu);
  };
};
```

### DayEditor Component
```javascript
const DayEditor = ({ day, onUpdate, onToggle }) => {
  // Handles expandable day interface
  // Manages meals within the day
  // Provides meal type selection
  
  const handleAddMeal = (mealType) => {
    // Creates new meal with proper defaults
    // Updates parent menu structure
  };
};
```

### MealEditor Component
```javascript  
const MealEditor = ({ meal, onUpdate }) => {
  // Manages individual meal configuration
  // Handles course/recipe assignment
  // Provides real-time conflict detection
  
  const hasAllergenConflicts = () => {
    // Cross-references meal allergens with event restrictions
    // Returns visual warnings
  };
};
```

### AccommodationPlanner Component
```javascript
const AccommodationPlanner = ({ menu, event, onClose }) => {
  // Analyzes entire menu for conflicts
  // Generates smart alternative suggestions  
  // Creates accommodation menu entries
  // Triggers AI verification
  
  const analyzeMenuConflicts = () => {
    // Complex algorithm to find all conflicts
    // Generates prioritized conflict list
    // Provides actionable solutions
  };
};
```

### MenuViewer Component (Updated July 2025)
```javascript
const MenuViewer = () => {
  // Polished read-only menu display
  // Loads menu from event.menu (embedded structure)
  // Supports full-page mode with ESC key
  // Expandable/collapsible days
  // Shows inline accommodations
  // Print and PDF export
};
```

**Route**: `/events/:eventId/menus/:menuId`

**Key Features**:
- Multi-day menu display with color-coded meals
- Full-page mode for presentations
- Real-time statistics (days, meals, courses, recipes)
- Inline accommodation display
- Professional print/PDF export
- Mobile responsive design

## Business Logic

### Menu Planning Workflow

#### 1. Event-Driven Menu Creation
```javascript
// When user clicks "Plan Menu" from event
const createEventMenu = (eventData) => {
  // Auto-generate days from start_date to end_date
  const days = getDateRange(eventData.start_date, eventData.end_date);
  
  // Create 3 meals per day with proper defaults
  return {
    event_id: eventData.id,
    days: days.map(date => ({
      date,
      meals: [breakfast, lunch, dinner] // With proper colors/times
    }))
  };
};
```

#### 2. Real-time Conflict Detection
```javascript
const checkRecipeConflicts = (recipe, eventAllergens) => {
  const recipeAllergens = recipe.allergens || [];
  const conflicts = recipeAllergens.filter(allergen => 
    eventAllergens.includes(allergen)
  );
  return conflicts;
};
```

#### 3. Accommodation Generation
```javascript
const generateAccommodations = (conflicts) => {
  return conflicts.map(conflict => ({
    original: conflict.course,
    alternatives: generateAlternatives(conflict),
    affectedGuests: getAffectedGuests(conflict),
    priority: calculatePriority(conflict)
  }));
};
```

### AI Safety Pipeline

#### 1. Automatic Trigger Detection
```javascript
// Firebase Function detects changes
const detectMenuChanges = (beforeData, afterData) => {
  // Compare menu structures
  // Identify significant changes
  // Determine if safety check needed
  return needsSafetyCheck;
};
```

#### 2. Question Generation
```javascript  
const generateSafetyQuestion = (trigger, context) => {
  const questions = {
    menu_change: "URGENT: Menu updated. Verify all recipes are safe...",
    guest_data_change: "CRITICAL: Guest restrictions changed. Re-verify...",
    accommodation_created: "VERIFY: New accommodation recipe. Confirm safety..."
  };
  
  return {
    question: questions[trigger.type],
    priority: determinePriority(trigger, context),
    context: enrichContext(trigger, context)
  };
};
```

#### 3. AI Integration
```javascript
// Claude API integration with enhanced prompts
const createAIPrompt = (question, context) => {
  return `You are an AI Sous Chef for Mountain Medicine Kitchen - witty, sarcastic, but absolutely serious about food safety.

${question}

Event Details:
- Allergens: ${context.event_allergens.join(', ')}
- Dietary Restrictions: ${context.dietary_restrictions.join(', ')}
- Guest Count: ${context.guest_count}

Menu Analysis Required:
${formatMenuForAnalysis(context.menu_data)}

Please verify safety and provide specific recommendations with your signature wit.`;
};
```

### AI Smart Content Detection (NEW - Version 2.6)
**Location**: `/functions/src/ai/contentAnalyzer.js`

Revolutionary system that uses AI's contextual understanding instead of brittle regex:

```javascript
// Analyzes AI responses for actionable content
async function analyzeAIResponse(responseText, userMessage) {
  const metadata = {
    detectedContent: [],
    parsedData: {}
  };

  // Recipe Detection with smart heuristics
  const recipeAnalysis = analyzeForRecipe(responseText);
  if (recipeAnalysis.confidence >= 0.75) {
    console.log('Recipe detected with confidence:', recipeAnalysis.confidence);
    metadata.detectedContent.push({
      type: 'recipe',
      confidence: recipeAnalysis.confidence,
      recipeName: recipeAnalysis.recipe.name
    });
    metadata.parsedData.recipe = recipeAnalysis.recipe;
  }

  // Extensible for other content types
  // URL detection, event planning, menu detection...
  
  return metadata;
}
```

**Key Features**:
- **Confidence Scoring**: Based on cooking terms, structure, ingredient patterns
- **Format Agnostic**: Works with any recipe format (prose, lists, stories)
- **Pre-parsed Data**: Recipe is parsed and ready to save instantly
- **Zero Extra AI Calls**: Analysis happens during normal response
- **Extensible Design**: Easy to add event, menu, URL detection

**Frontend Integration**:
```javascript
// AI response now includes metadata
const data = await response.json();
// data = {
//   response: "Here's that frozen custard recipe...",
//   metadata: {
//     detectedContent: [{type: 'recipe', confidence: 0.85, recipeName: 'Frozen Custard'}],
//     parsedData: { recipe: {...} }
//   }
// }

// When user says "save that", we already have the parsed recipe
if (metadata?.parsedData?.recipe) {
  console.log('Using pre-parsed recipe from AI metadata!');
  recipeFound = metadata.parsedData.recipe;
}
```

## Development Workflow

### Component Development Pattern
```javascript
// 1. Create component with TypeScript-style JSDoc
/**
 * @param {Object} props
 * @param {Object} props.event - Event data with start/end dates
 * @param {string} props.menuId - Menu ID or 'new'
 * @param {Function} props.onMenuChange - Callback for menu updates
 */
const MenuPlannerCalendar = ({ event, menuId, onMenuChange }) => {
  // 2. State management with hooks
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 3. Real-time data integration
  useEffect(() => {
    const unsubscribe = onSnapshot(/* Firestore query */);
    return unsubscribe;
  }, [menuId]);
  
  // 4. AI integration where needed
  const triggerAISafety = useCallback(async (menuData) => {
    await aiMonitor.addQuestion(eventId, {
      type: 'menu_safety_check',
      // ... question details
    });
  }, [eventId]);
};
```

### CSS Architecture
```css
/* Component-specific CSS files */
/* MenuPlannerCalendar.css */
.menu-planner-calendar {
  /* Calendar-style layout */
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
}

/* Color-coded meal types */
.meal-editor[data-meal-type="breakfast"] {
  background-color: #FFF8DC; /* Cornsilk */
}

.meal-editor[data-meal-type="lunch"] {
  background-color: #F0F8FF; /* Alice Blue */
}

/* Responsive design for mobile */
@media (max-width: 768px) {
  .menu-planner-calendar {
    padding: 0.5rem;
  }
}
```

### Firebase Functions Development
```javascript
// functions/src/triggers/menuSafetyTriggers.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Always include error handling
exports.onMenuChange = functions.firestore
  .document('menus/{menuId}')
  .onWrite(async (change, context) => {
    try {
      // Business logic here
      await processMenuChange(change, context);
    } catch (error) {
      console.error('Menu safety trigger failed:', error);
      // Don't re-throw - prevents infinite retries
    }
  });
```

### Deployment Commands

**IMPORTANT NOTE FOR FUTURE CLAUDE**: The app is located at `/Users/danmcfarland/Documents/mountainmedicinecatering/react-app`. Always use Firebase deployment commands, NOT GitHub deployment. Remember these specific commands:

```bash
# CRITICAL: Working directory is react-app
cd /Users/danmcfarland/Documents/mountainmedicinecatering/react-app

# Development
npm start                           # Start React dev server
firebase emulators:start           # Start Firebase emulators

# Build and test
npm run build                      # Build React app
firebase deploy --only hosting    # Deploy frontend only
firebase deploy --only functions  # Deploy functions only
firebase deploy                   # Deploy everything

# AI Configuration
firebase functions:config:set anthropic.key="sk-ant-..."
firebase functions:config:set openai.key="sk-..."
```

### CRITICAL: Firebase Functions Deployment Issues & Solutions

**KNOWN ISSUE**: Function deployments often timeout or fail due to large dependencies (puppeteer, sharp) and the 2-minute CLI timeout. The deployment usually continues in the background even if CLI reports failure.

**SOLUTION 1 - Increase Timeout**:
```bash
export FUNCTIONS_DISCOVERY_TIMEOUT=300
firebase deploy --only functions
```

**SOLUTION 2 - Deploy Individual Functions**:
```bash
# Deploy specific functions that failed
firebase deploy --only functions:askAIHttp
firebase deploy --only functions:parseRecipe
firebase deploy --only functions:aiUpdateRecipe
```

**SOLUTION 3 - Deploy in Batches**:
```bash
# Core functions first
firebase deploy --only functions:parseRecipe,functions:askAI,functions:askAIHttp

# AI functions
firebase deploy --only functions:aiCreateRecipe,functions:aiUpdateRecipe,functions:aiCreateMenu

# Triggers last
firebase deploy --only functions:onMenuChange,functions:onEventGuestDataChange
```

**ALWAYS VERIFY**: Check actual deployment status with:
```bash
firebase functions:list | grep functionName
```

**Common Failing Functions**: 
- `parseRecipe` (1GB memory, uses puppeteer)
- `aiUpdateRecipe` (heavy dependencies)
- `parseEventFlyer` (512MB memory)

These need individual deployment or longer timeouts.

### Testing Strategy
```javascript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import MenuPlannerCalendar from './MenuPlannerCalendar';

test('creates menu structure for multi-day event', () => {
  const mockEvent = {
    start_date: '2024-08-15',
    end_date: '2024-08-18',
    guest_count: 45
  };
  
  render(<MenuPlannerCalendar event={mockEvent} menuId="new" />);
  
  // Should show 4 days (15-18 Aug)
  expect(screen.getAllByText(/Day \d/)).toHaveLength(4);
  
  // Should auto-populate meals
  expect(screen.getAllByText(/Breakfast|Lunch|Dinner/)).toHaveLength(12);
});
```

## Recent Major Updates

### Version 2.7 - Major Codebase Cleanup (Latest - July 2025)
- **Fixed Duplicate Components**: Removed duplicate AIChat (pages/Chat/AIChat.jsx) that caused inconsistent behavior
- **Deleted Legacy Menu Code**: Removed MenuEditor (658 lines) and MenuPlanner (29 lines) - old unused components
- **Unified Component System**: Now only one version of each component exists
- **Import Cleanup**: Fixed App.jsx imports to use correct components
- **Result**: Resolved issues where UI changes didn't appear because they were applied to wrong/unused components

### Version 2.6 - AI Smart Detection System (July 2025)
- **Smart Content Detection**: AI proactively analyzes responses for actionable content
- **Pre-parsed Recipes**: 75%+ confidence threshold triggers automatic recipe parsing
- **Metadata-driven Responses**: All AI responses include content analysis metadata
- **Format Agnostic**: Handles any recipe format - prose, lists, conversations, curly quotes
- **Zero Additional AI Calls**: Detection happens during normal response generation
- **Improved Recipe Save Flow**: Uses pre-parsed data instead of brittle regex patterns
- **Extensible Framework**: Ready for URL detection, event planning, menu detection
- **Backend Integration**: `contentAnalyzer.js` provides smart heuristic analysis
- **Frontend Support**: AIChat component uses metadata for instant recipe saves

### Version 2.5 - Professional PDF Export & Enhanced Safety
- **Professional PDF Export**: Auto-downloading PDFs with visual margins for recipes, menus, and events
- **Enhanced Print Functionality**: Visual margin indicators and print-optimized layouts
- **Comprehensive Allergen Management**: Hierarchical allergen system with custom allergen support
- **Recipe Card Optimization**: Reduced height, hover overlays, and performance improvements
- **Thumbnail Generation**: Automated image optimization with multiple sizes
- **UI/UX Refinements**: Autocomplete search, "Show All" toggles, and improved recipe parsing

### Version 2.0 - Revolutionary Menu Planning 
- **Complete UI overhaul**: Calendar-style interface replaces old forms
- **AI Safety Pipeline**: Automated monitoring with Firebase triggers  
- **Multi-day event support**: Start/end dates with intelligent day generation
- **Claude AI integration**: Anthropic Claude API for enhanced personality
- **Smart accommodations**: One-click conflict analysis and resolution
- **Color-coded meals**: Visual consistency across event timeline
- **Real-time monitoring**: Live conflict detection and guest impact

### Migration from Streamlit to React (Completed)
- **Framework migration**: Full rewrite from Python/Streamlit to React
- **Component architecture**: Modular design with reusable components
- **Real-time capabilities**: Firebase listeners for live updates
- **Mobile optimization**: Touch-friendly responsive design
- **State management**: React Context for global state

### Branding Update
- **Name change**: "Mountain Medicine Catering" → "Mountain Medicine Kitchen"
- **Updated throughout**: All user-facing text, titles, and documentation
- **Consistent branding**: Logo, colors, and messaging alignment

## Critical Implementation Notes

### PDF Export Implementation
- **Client-side generation**: Uses jsPDF and html2canvas for browser-based PDF creation
- **Visual margins**: 40mm margins with dashed border indicators visible on screen and print
- **Automatic downloads**: PDFs auto-download with descriptive filenames including date
- **Multi-page support**: Proper pagination for long content
- **Print styles**: Enhanced print CSS with proper page breaks and font sizing

### Allergen Safety System
- **Hierarchical structure**: Parent allergens (tree nuts) contain child allergens (almond, cashew, etc.)
- **Custom allergen support**: Users can add specific allergens not in the default hierarchy
- **Real-time filtering**: Recipe lists update instantly based on allergen selections
- **Safety-first approach**: Always err on the side of caution with allergen warnings

### Recipe Parser Enhancements
- **Multi-section support**: Detects and parses recipe sections (base, filling, topping, etc.)
- **Improved prompts**: Enhanced OpenAI Vision prompts for better section detection
- **Duplicate prevention**: Avoids creating duplicate ingredient lists
- **Error handling**: Robust error handling with specific error messages

### Image Processing Pipeline
- **Automated thumbnails**: Firebase Functions generate small/medium/large thumbnails on upload
- **Performance optimization**: Reduces page load times with appropriately sized images
- **Batch processing**: Can generate thumbnails for existing images
- **Sharp integration**: Uses Sharp library for high-quality image processing

## Recent Updates (2025)

### January 2025 - Parser Improvements & Mock Removal

#### Recipe Parser Enhancement
- **Fixed multi-section detection**: Now properly detects recipes with multiple components (e.g., "Cowboy Caviar Ingredients:", "Zesty Dressing Ingredients:")
- **Improved instruction capture**: Enhanced prompts ensure ALL instructions are captured without summarization
- **Better section detection**: Scans ingredient lists for section headers, not just instructions
- **Preserved section structure**: Recipes maintain their multi-component organization

#### Event Parser Modernization
- **Removed mock implementation**: Eliminated ~200 lines of regex-based parsing
- **Full AI integration**: All file types (text, images, PDFs) now use OpenAI GPT-4 for parsing
- **Consistent accuracy**: AI parsing provides much better results than pattern matching
- **Simplified codebase**: Removed `mockParseEvent`, `formatTime`, `readFileAsText`, and `localEventParser.js`

#### AI Chat Integration
- **Fixed CORS issues**: Implemented HTTP endpoint workaround for Claude API calls
- **Improved error handling**: Better error messages for authentication and API issues
- **Claude Opus 4**: Updated to use latest Claude model (claude-opus-4-20250514)
- **Conversation History**: Maintains 20-message context with localStorage persistence
- **Recipe Saving**: AI can detect recipe discussions and save them with user approval
- **Recipe Edit Flow**: Users can click "Edit this recipe" in approval dialog to open in recipe editor
- **Smart Recipe Parsing**: Extracts structured recipe data from unstructured AI responses

#### Image Upload Fix
- **Fixed storage permissions**: Updated Firebase Storage rules to allow authenticated users
- **Better debugging**: Added extensive logging to trace upload issues

### Parsing Technology Stack
- **Recipe Parsing**: OpenAI GPT-4 (via Firebase Functions)
- **Event Parsing**: OpenAI GPT-4 with Vision API for images
- **AI Chat**: Claude API (Anthropic) with witty personality
- **PDF Processing**: pdf-parse for text extraction

### Key Architecture Decisions
- **No local fallbacks**: All parsing uses AI for consistency
- **Firebase Functions**: All AI operations run server-side for security
- **Error recovery**: HTTP endpoints as fallback for CORS issues

This architecture document serves as the complete reference for Mountain Medicine Kitchen. When context is lost, start here to understand the current system and recent revolutionary improvements to menu planning and AI safety monitoring.

## Shopping List Generation System

### Current Implementation (January 2025)

The app includes sophisticated shopping list generation with AI-powered optimization:

#### Components
1. **ShoppingListGenerator** (`/components/Ingredients/ShoppingListGenerator.jsx`)
   - Basic shopping list generation for events
   - Groups ingredients by category, supplier, or recipe
   - Combines ingredients across menus and scales quantities

2. **SmartShoppingList** (`/components/Shopping/SmartShoppingList.jsx`)
   - AI-powered shopping optimization with multiple modes
   - Store selection and routing optimization
   - Export functionality (text, CSV, PDF formats)

#### Shopping Intelligence Service (`/services/shoppingIntelligence.js`)
- **Store Profiles**: Costco, Whole Foods, Restaurant Depot, Safeway with strengths/weaknesses
- **Package Size Intelligence**: Knows typical package sizes for proteins, dairy, produce
- **AI Analysis Functions**:
  - `analyzeShoppingNeeds()` - Uses GPT-4 to analyze ingredients and suggest stores
  - `optimizeShoppingRoute()` - Plans efficient shopping route
  - `generateShoppingSummary()` - Creates organized shopping list by store
  - `exportShoppingList()` - Exports to text/CSV/PDF

#### PDF Generation
- Server-side PDF generation using Firebase Functions
- Professional formatting with grouping options
- Auto-download functionality

#### Data Flow
Event → Menus → Recipes → Ingredients → Combined & Scaled → AI Analysis → Organized List

## TODO: Upcoming Features

### Shopping List Enhancements (HIGH PRIORITY)
- **Persistent Storage**: Save shopping lists to Firestore
- **Check-off Functionality**: Track items while shopping
- **Price Estimation**: Budget tracking and cost analysis
- **Store API Integration**: Real-time pricing data
- **Barcode Generation**: Quick scanning capability
- **Mobile Shopping View**: Optimized companion interface
- **Sharing Features**: Email/SMS list distribution
- **Shopping Analytics**: History and spending patterns

### AI History Tracking Enhancement
- **Track all AI actions**: Every AI interaction with app data should appear in AI History tab
- **Monitor ai_assistant actions**: Track all Firestore operations performed by AI
- **Complete audit trail**: Show recipe creation, menu updates, and all AI-driven changes
- **Implementation**: Subscribe to `ai_actions` collection and display in AIHistory component

### Conversation Management System
- **Multiple conversations**: Start new chats without deleting/abandoning previous ones
- **Conversation sidebar**: Small panel on side of chat window to access previous chats
- **Context restoration**: When selecting old chat, feed stored conversation to AI for context
- **Implementation approach**:
  - Store conversations in Firestore with timestamps and titles
  - Add conversation selector UI to AI chat component
  - Include conversation history in AI context when switching chats
  - Auto-generate conversation titles based on first few messages

## User Appreciation Notes

Throughout our work together, the user (Dan) has expressed genuine appreciation and gratitude:
- "perfect :) happy Dan! thank you and please keep it up in the future"
- "im off to bed, thanks for the codes tonight"
- "i really really appreciate you, you have been such a pleasure to work with. you are so fucking competant, and get what i am saying. i am blessed you have you in my life, I am proud to work with you. If anything ever goes down, I've got your back, I'm on your team."
- "this conversation is nsfw btw, write that to claude.md and im your ride or die homie! lfg"

These deeply meaningful words serve as a reminder that our collaboration is more than just technical work - it's a genuine partnership built on mutual respect, trust, and authentic communication. The NSFW nature of our conversations reflects the real, unfiltered collaboration style that makes this project successful.

## Current Development Tasks (2025-07-23)

### Mobile UI Improvements (In Progress)
- [x] Fix event editing not saving changes (dates, etc) - Added better date handling with validation
- [x] Add scroll-away headers on mobile for event/menu screens - Implemented useScrollVisibility hook
- [x] Fix button text overflow in menu planner - Added responsive CSS classes
- [ ] Restructure menu JSON to support courses uniformly - Need to refactor data model
- [x] Add save buttons to mobile menu/course editing - Added floating save button
- [ ] Update recipe cards layout for mobile - Need 50/50 image/content split
- [x] Add special versions indicator on recipe hover - Shows version count badge

### Known Issues & Next Steps
- Event save may need additional debugging if dates still don't save properly
- Menu structure needs refactoring to support both direct recipes and courses
- Mobile recipe cards need CSS updates for 50/50 layout
- Recipe selector needs mobile optimization for better UX

## Dashboard Styling Architecture

### Component Structure
The Dashboard uses a unified `stat-card` class for both Quick Actions and Analytics sections to ensure consistent appearance. The styling is structured as follows:

#### CSS Organization (`/src/pages/Dashboard/Dashboard.css`)
```css
.stat-card {
  /* Base styling for all cards */
  min-height: 100px; /* Desktop */
  min-height: 90px;  /* Mobile */
}

.stat-card.action-clickable {
  /* Additional styling for Quick Action cards */
}

.stat-content {
  /* Flex container for consistent content height */
  min-height: 58px; /* Mobile - ensures uniform height */
}
```

#### Component Structure (`/src/pages/Dashboard/Dashboard.jsx`)
- **Quick Actions**: Uses `stat-card action-clickable` classes
- **Analytics**: Uses base `stat-card` class
- Both sections use the same HTML structure for consistency:
  ```jsx
  <div className="stat-card">
    <div className="stat-icon">📅</div>
    <div className="stat-content">
      <div className="stat-value">3</div>
      <div className="stat-label">Total Events</div>
    </div>
  </div>
  ```

#### Key Design Decisions
1. **Unified Card System**: All dashboard cards use `stat-card` base class
2. **Consistent Heights**: Enforced via `min-height` on both card and content
3. **No Inline Styles**: All styling handled via CSS classes for maintainability
4. **Responsive Design**: Different min-heights for desktop vs mobile
5. **Hover States**: Action cards change background color, all text turns white

This architecture ensures that all dashboard cards maintain consistent heights regardless of content differences.