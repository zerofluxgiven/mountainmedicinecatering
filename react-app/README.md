# Mountain Medicine Kitchen

A comprehensive catering management application built with React and Firebase, featuring revolutionary AI-powered menu planning and safety monitoring.

## Live Demo
🚀 **[Visit Mountain Medicine Kitchen](https://mountainmedicine-6e572.web.app)**

## Features

### 📅 Multi-Day Event Management
- Create and manage multi-day retreat events with start and end dates
- Track guest counts and detailed dietary restrictions per guest
- Upload and parse event flyers with AI
- Event-specific menu planning with automatic day generation
- Real-time allergen and dietary restriction tracking

### 🍽️ Revolutionary Calendar-Style Menu Planning
- **Visual calendar interface** - see your entire event timeline at a glance
- **Auto-populated meals** - automatically creates 3 meals per day for event duration
- **Color-coded meal types** with consistent theming across days:
  - Breakfast (Cornsilk), Lunch (Alice Blue), Dinner (Beige), Snacks, Special Events
- **Expandable days** - click to show/hide detailed meal planning
- **Flexible meal management** - add/remove meals, change types, handle irregular schedules
- **Real-time conflict detection** - instant allergen warnings with guest impact

### 🔒 AI Safety Monitoring System
- **Automatic safety triggers** when menus or guest data changes
- **Real-time allergen conflict detection** across all recipes
- **Proactive AI monitoring** asks safety questions automatically
- **Daily safety sweeps** for upcoming events
- **Accommodation verification** when alternatives are created
- **Claude AI integration** for intelligent, witty assistance

### 🎯 Smart Accommodation Planning
- **One-click accommodation planning** analyzes entire menu for conflicts
- **Smart alternative suggestions** (dairy-free, gluten-free, vegan, etc.)
- **Side-by-side menu comparison** showing main vs accommodation variants
- **Affected guest tracking** with precise portion calculations
- **AI verification** of all accommodation recipes

### 📖 Advanced Recipe Management
- Store and organize recipes with comprehensive metadata
- Smart recipe scaling with fraction handling
- Recipe versioning system (track changes over time)
- Special dietary versions (Gluten-Free, Vegan, etc.)
- AI-powered recipe import from text/images/URLs
- Allergen and dietary tag management
- **Professional PDF export** with visual margins and auto-download
- **Automated thumbnail generation** for performance optimization

### 🛒 Shopping List Generation (Current Implementation)

#### Two Powerful Components:
1. **Basic Shopping List Generator**
   - Groups ingredients by category, supplier, or recipe
   - Combines and scales quantities across all menus
   - Simple, clean interface for quick lists

2. **AI-Powered Smart Shopping List**
   - **Shopping Optimization Modes**:
     - 🏪 Minimize Stores (1-2 stores max)
     - 💰 Budget Conscious (bulk buying optimization)
     - ⭐ Quality First (premium ingredients)
     - ⚖️ Balanced (mix of quality and value)
   - **Store Intelligence**: Knows strengths of Costco, Whole Foods, Restaurant Depot, Safeway
   - **Package Size Optimization**: AI understands bulk vs. regular sizing
   - **Route Planning**: Optimizes your shopping route across multiple stores

#### Export Options:
- 📄 Text format for copy/paste
- 📊 CSV for spreadsheet import
- 📑 Professional PDF with Firebase Functions

#### Data Flow:
Event → Menus → Recipes → Ingredients → Combined & Scaled → AI Analysis → Organized List

#### 🚧 Coming Soon:
- Persistent shopping lists saved to account
- Check-off functionality while shopping
- Price estimation and budget tracking
- Real-time store pricing via APIs
- Barcode generation for quick scanning
- Mobile shopping companion mode
- Share lists via email/SMS
- Shopping history and analytics

### 🥕 Intelligent Ingredient Tracking
- Comprehensive ingredient database with categories
- **Hierarchical allergen system** with parent-child relationships (tree nuts → almond, cashew, etc.)
- **Custom allergen support** for specific dietary needs beyond defaults
- Advanced allergen tracking and cross-referencing
- Automatic shopping list generation from menus
- Ingredient substitution suggestions
- Cost tracking and budget management

### 🤖 Claude AI Integration
- **Witty AI chat assistant** with Anthony Bourdain-style personality
- Recipe parsing from various file formats (PDF, images, text, URLs)
- Event flyer parsing to extract details
- Context-aware assistance based on current page/event
- Smart suggestions and proactive safety monitoring
- Real-time allergen conflict analysis

### 📱 Mobile-First Design
- Fully responsive calendar-style interface
- Touch-optimized meal planning
- Mobile-friendly recipe selection
- Swipe gestures and touch interactions

## Technology Stack

- **Frontend**: React 18 with React Router
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **AI Integration**: Claude API (Anthropic) for chat + OpenAI GPT-4 for parsing
- **Real-time Database**: Firestore with automated triggers
- **Styling**: Custom CSS with responsive calendar design
- **State Management**: React Context API
- **File Processing**: PDF parsing, image OCR, multi-format support
- **Safety Monitoring**: Firebase Functions with automated AI triggers
- **PDF Generation**: Client-side with jsPDF and html2canvas
- **Image Processing**: Automated thumbnails with Sharp library
- **Deployment**: Firebase Hosting with CI/CD

## Architecture Highlights

### 🏗️ Event-Centric Design
- Events drive menu creation automatically
- Multi-day support with intelligent day generation
- Real-time synchronization across all components

### 🔄 AI Safety Pipeline
- **Menu Change Triggers** → Automatic safety verification
- **Guest Data Updates** → Immediate menu re-analysis  
- **Daily Safety Sweeps** → Proactive monitoring
- **Accommodation Verification** → Alternative recipe validation

### 📊 Data Flow
```
Event Creation → Auto Menu Generation → Recipe Assignment → AI Safety Check → Accommodation Planning → Final Verification
```

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Firebase account
- Claude API key (for AI features)
- OpenAI API key (for recipe parsing features)

## ✨ Latest Features (Version 2.6 - January 2025)

### 📄 Professional PDF Export
- **Visual margins**: 40mm margins with dashed border indicators visible on screen and print
- **Auto-download**: PDFs automatically save with descriptive filenames and dates
- **All content types**: Recipes, menus, and events all support PDF export
- **Multi-page support**: Proper pagination for long documents
- **Print optimization**: Enhanced CSS for perfect print layouts

### 🔒 Enhanced Allergen Safety
- **Hierarchical allergen system**: Parent allergens (tree nuts) contain specific child allergens (almond, cashew, walnut, etc.)
- **Custom allergen support**: Add specific allergens not covered by defaults
- **Real-time filtering**: Recipe lists update instantly based on allergen selections
- **Safety-first approach**: Always prioritize guest safety with comprehensive warnings

### 🎨 UI/UX Improvements
- **Recipe card optimization**: Reduced height for better screen utilization
- **Hover overlays**: Recipe cards show details on hover with white overlay effect
- **Autocomplete search**: Enhanced search for recipes and tags with "Show All" toggles
- **Thumbnail generation**: Automated image processing for faster loading

### 🤖 AI Parser Enhancements
- **Recipe Section Detection**: Fixed multi-section recipe parsing (e.g., "Cowboy Caviar Ingredients:", "Zesty Dressing Ingredients:")
- **Complete Instruction Capture**: Enhanced AI prompts ensure ALL instructions are captured without summarization
- **Event Parser Modernization**: Removed 200+ lines of regex parsing, now uses AI for all file types
- **Consistent AI Parsing**: Both recipes and events use OpenAI GPT-4 for accurate extraction
- **Image Upload Fix**: Resolved Firebase Storage permission issues for authenticated users

### 🔧 Technical Improvements
- **Claude Opus 4**: Updated to latest Claude model (claude-opus-4-20250514) for chat
- **CORS Workaround**: Implemented HTTP endpoints for Firebase Functions to handle CORS issues
- **Mock Removal**: Eliminated all mock implementations in favor of real AI services
- **Better Error Messages**: Enhanced error handling with specific, actionable messages

## 🚀 Quick Start Workflow

### Creating Your First Event Menu

1. **Create Event** → Set start/end dates for multi-day retreats
2. **Click "🍽️ Plan Menu"** → Automatically generates calendar layout
3. **Expand days** → View auto-populated breakfast, lunch, dinner
4. **Add recipes** → Search, filter, and assign with conflict detection
5. **Plan accommodations** → One-click analysis creates alternatives
6. **AI monitors everything** → Automatic safety verification

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/mountain-medicine-kitchen.git
cd mountain-medicine-kitchen/react-app
```

2. Install dependencies
```bash
npm install
cd functions && npm install && cd ..
```

3. Configure environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your Firebase config and API keys
```

4. Set up Firebase
```bash
firebase login
firebase use --add
```

5. Configure Firebase Functions
```bash
cd functions
# Set Claude API key
firebase functions:config:set anthropic.key="your-claude-api-key"
# Set OpenAI API key (for legacy features)  
firebase functions:config:set openai.key="your-openai-api-key"
```

6. Deploy Firebase Functions
```bash
firebase deploy --only functions
cd ..
```

7. Run the development server
```bash
npm start
```

## Deployment

The app automatically deploys to Firebase Hosting when changes are pushed to the main branch.

Manual deployment:
```bash
npm run build
firebase deploy
```

## 🔒 AI Safety Features

### Automatic Monitoring Triggers
- **Menu Changes**: Every recipe addition/removal triggers safety verification
- **Guest Data Updates**: Allergen/diet changes immediately re-check all menus
- **Accommodation Creation**: New alternatives get instant verification
- **Daily Sweeps**: Automatic safety checks for upcoming events

### Real-time Conflict Detection
- Visual allergen warnings with affected guest counts
- Cross-reference recipes against guest restrictions
- Proactive accommodation suggestions
- Side-by-side menu comparison views

### Claude AI Integration
- Witty, Anthony Bourdain-style personality
- Context-aware assistance based on current page/event
- Intelligent recipe parsing and menu analysis
- Proactive safety questions and monitoring

## 🎯 Key Components

### MenuPlannerCalendar
Revolutionary calendar-style interface for visual menu planning across multi-day events.

### AccommodationPlanner  
Intelligent system for analyzing menu conflicts and generating safe alternatives.

### AI Safety Triggers
Firebase Functions that automatically monitor for safety issues and trigger AI reviews.

### Real-time Monitoring
Live conflict detection with instant visual feedback and guest impact analysis.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software for Mountain Medicine Kitchen.

## Support

For support, please contact the development team or check the AI History page for automated assistance.