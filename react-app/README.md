# Mountain Medicine Kitchen - React App

This is the React migration of the Mountain Medicine Catering Streamlit application.

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Fill in your Firebase configuration values
   - Get these from your Firebase Console or existing Streamlit secrets

3. **Run the development server**:
   ```bash
   npm start
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Auth/           # Authentication components
│   └── Layout/         # App layout and navigation
├── contexts/           # React Context providers
│   ├── AuthContext.jsx # Authentication state
│   └── AppContext.jsx  # Global app state
├── pages/              # Page components
│   └── Login/          # Login page
├── services/           # API and Firebase services
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── styles/             # Global styles
```

## Development Progress

### ✅ Completed
- Basic React setup with routing
- Firebase configuration
- Authentication context
- App-wide state management
- Protected routes
- Main layout with sidebar
- Login page
- Purple theme matching Streamlit app

### 🚧 In Progress
- Dashboard page
- Events management
- Recipe management
- Menu builder
- Ingredients tracking
- AI chat interface

### 📋 TODO
- API endpoints (Firebase Functions)
- File upload functionality
- PDF export
- Mobile responsive design
- Real-time updates
- Testing setup

## Key Differences from Streamlit

1. **State Management**: Using React Context instead of `st.session_state`
2. **Routing**: React Router for navigation instead of Streamlit pages
3. **Real-time Updates**: Firestore listeners instead of full page reloads
4. **Component-based**: Reusable components instead of function-based pages

## Firebase Integration

The app uses the same Firebase project as the Streamlit app:
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Storage**: Firebase Storage
- **Hosting**: Can be deployed to Firebase Hosting

## Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run deploy` - Deploy to Firebase Hosting (configure first)

## Deployment

1. Build the app:
   ```bash
   npm run build
   ```

2. Deploy to Firebase:
   ```bash
   firebase deploy --only hosting
   ```

Make sure to configure Firebase Hosting to serve the React app at a different path than the Streamlit app (e.g., `/app`).