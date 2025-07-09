# Mountain Medicine Catering

A comprehensive catering management application built with React and Firebase.

## Live Demo
🚀 **[Visit Mountain Medicine Catering](https://mountainmedicine-6e572.web.app)**

## Features

### 📅 Event Management
- Create and manage catering events
- Track guest counts and dietary restrictions
- Upload and parse event flyers with AI
- Manage event-specific menus and recipes

### 📖 Recipe Management
- Store and organize recipes
- Smart recipe scaling based on guest count
- Recipe versioning system (track changes over time)
- Special dietary versions (Gluten-Free, Vegan, etc.)
- AI-powered recipe import from text/images

### 🍽️ Menu Building
- Visual drag-and-drop menu builder
- Organize recipes into menu sections
- Calculate total servings automatically
- Export menus as PDFs

### 🥕 Ingredient Tracking
- Comprehensive ingredient database
- Allergen tracking and management
- Automatic shopping list generation
- Ingredient categorization

### 🤖 AI Features
- Recipe parsing from various file formats
- Event flyer parsing to extract details
- AI chat assistant for catering questions
- Smart suggestions and automation

### 📱 Mobile Support
- Fully responsive design
- Touch-optimized interfaces
- Mobile-friendly navigation

## Technology Stack

- **Frontend**: React 18 with React Router
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **AI Integration**: OpenAI GPT-4
- **Styling**: Custom CSS with responsive design
- **State Management**: React Context API
- **File Processing**: PDF parsing, image OCR
- **Deployment**: Firebase Hosting

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Firebase account
- OpenAI API key (for AI features)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/mountain-medicine-catering.git
cd mountain-medicine-catering
```

2. Install dependencies
```bash
npm install
cd functions && npm install
```

3. Configure environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your Firebase config
```

4. Set up Firebase
```bash
firebase login
firebase use --add
```

5. Deploy Firebase Functions
```bash
cd functions
firebase deploy --only functions
```

6. Run the development server
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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software for Mountain Medicine Catering.

## Support

For support, please contact the development team.