# Mountain Medicine Kitchen - Testing Strategy

## Overview
This document outlines the testing approach for the React migration, including automated tests, manual testing procedures, and validation checkpoints.

## Testing Levels

### 1. Build & Runtime Tests
Quick tests to ensure the app builds and runs without errors.

### 2. Unit Tests
Test individual components and functions in isolation.

### 3. Integration Tests
Test component interactions and Firebase operations.

### 4. End-to-End Tests
Test complete user workflows.

### 5. Manual Testing Checklist
Structured manual testing for UI/UX validation.

## Quick Runtime Tests

### Basic Health Check Script
```bash
#!/bin/bash
# save as: test-health.sh

echo "🔍 Running React App Health Check..."

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Firebase config needed!"
    echo "   Copy .env.example to .env and add your Firebase credentials"
fi

# Try to build the app
echo "🏗️  Testing build process..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Health check passed!"
```

### Firebase Connection Test
```javascript
// test-firebase-connection.js
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const testFirebaseConnection = async () => {
  try {
    console.log('🔥 Testing Firebase connection...');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    // Test Firestore read
    const testDoc = await db.collection('_test').doc('test').get();
    console.log('✅ Firestore connection successful');
    
    // Test Auth
    console.log('✅ Auth initialized');
    
    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return false;
  }
};
```

## Unit Tests Setup

### Install Testing Dependencies
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(firebase|@firebase)/)'
  ],
};
```

### Setup File
```javascript
// src/setupTests.js
import '@testing-library/jest-dom';

// Mock Firebase
jest.mock('./config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}));
```

## Component Tests

### 1. Authentication Context Test
```javascript
// src/contexts/__tests__/AuthContext.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

const TestComponent = () => {
  const { currentUser, loading } = useAuth();
  return (
    <div>
      {loading ? 'Loading...' : currentUser ? 'Logged in' : 'Not logged in'}
    </div>
  );
};

describe('AuthContext', () => {
  test('provides authentication state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });
  });
});
```

### 2. Protected Route Test
```javascript
// src/components/Auth/__tests__/ProtectedRoute.test.jsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { AuthContext } from '../../../contexts/AuthContext';

const mockAuthContext = (user = null, role = null) => ({
  currentUser: user,
  userRole: role,
  loading: false,
  hasRole: (required) => {
    const roles = { admin: 3, editor: 2, viewer: 1 };
    return roles[role] >= roles[required];
  },
});

describe('ProtectedRoute', () => {
  test('redirects when not authenticated', () => {
    const { container } = render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext()}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(container.innerHTML).not.toContain('Protected Content');
  });

  test('shows content when authenticated', () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext({ uid: '123' }, 'admin')}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
```

### 3. Dashboard Component Test
```javascript
// src/pages/Dashboard/__tests__/Dashboard.test.jsx
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';
import { AppContext } from '../../../contexts/AppContext';
import { AuthContext } from '../../../contexts/AuthContext';

const mockAppContext = {
  activeEvent: { id: '1', name: 'Test Event', guest_count: 100 },
  events: [{ id: '1', name: 'Test Event' }],
  recipes: Array(5).fill({ id: '1', name: 'Recipe' }),
  menus: Array(3).fill({ id: '1', name: 'Menu' }),
};

const mockAuthContext = {
  currentUser: { email: 'test@example.com' },
  userRole: 'admin',
};

describe('Dashboard', () => {
  test('displays user welcome message', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <AppContext.Provider value={mockAppContext}>
          <Dashboard />
        </AppContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText(/Welcome back, test!/)).toBeInTheDocument();
  });

  test('displays correct stats', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <AppContext.Provider value={mockAppContext}>
          <Dashboard />
        </AppContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('5')).toBeInTheDocument(); // recipes
    expect(screen.getByText('3')).toBeInTheDocument(); // menus
    expect(screen.getByText('100')).toBeInTheDocument(); // guest count
  });
});
```

## Integration Tests

### Firebase Operations Test
```javascript
// src/services/__tests__/firebase.integration.test.js
import { db, auth } from '../../config/firebase';
import { collection, addDoc, getDoc, deleteDoc } from 'firebase/firestore';

describe('Firebase Integration', () => {
  let testDocRef;

  afterEach(async () => {
    // Cleanup test data
    if (testDocRef) {
      await deleteDoc(testDocRef);
    }
  });

  test('can write and read from Firestore', async () => {
    const testData = {
      name: 'Test Recipe',
      serves: 4,
      created_at: new Date(),
    };

    // Write
    testDocRef = await addDoc(collection(db, '_test'), testData);
    expect(testDocRef.id).toBeTruthy();

    // Read
    const doc = await getDoc(testDocRef);
    expect(doc.exists()).toBe(true);
    expect(doc.data().name).toBe('Test Recipe');
  });
});
```

## Manual Testing Checklist

### Pre-Deployment Checklist
```markdown
## 🚀 Pre-Deployment Testing Checklist

### Build & Environment
- [ ] App builds without errors (`npm run build`)
- [ ] No console errors in development
- [ ] Environment variables are set correctly
- [ ] Firebase config is valid

### Authentication Flow
- [ ] Can create new account
- [ ] Can log in with existing account
- [ ] Session persists on refresh
- [ ] Logout works correctly
- [ ] Protected routes redirect when not authenticated
- [ ] Role-based access control works

### Layout & Navigation
- [ ] Sidebar opens/closes properly
- [ ] All navigation links work
- [ ] Active page is highlighted
- [ ] Mobile responsive at 375px, 768px, 1024px
- [ ] Event selector shows all events
- [ ] Event context persists across pages

### Dashboard
- [ ] Stats display correctly
- [ ] Quick action buttons are visible
- [ ] Upcoming events show with countdown
- [ ] Empty states display properly

### Data Loading
- [ ] Events load from Firestore
- [ ] Recipes load when event selected
- [ ] Menus load for selected event
- [ ] Real-time updates work (test in two tabs)

### Error Handling
- [ ] Network errors show user-friendly messages
- [ ] Form validation works
- [ ] Loading states display during data fetch
- [ ] 404 pages handled gracefully

### Performance
- [ ] Initial load time < 3 seconds
- [ ] No memory leaks (check DevTools)
- [ ] Images load efficiently
- [ ] Unnecessary re-renders minimized
```

### Feature Testing Template
```markdown
## Feature: [Feature Name]
**Date Tested:** 
**Tester:** 
**Environment:** Development / Staging / Production

### Functionality Tests
- [ ] Core feature works as expected
- [ ] Edge cases handled
- [ ] Error states display correctly
- [ ] Success feedback shown

### Integration Tests
- [ ] Data saves to Firebase
- [ ] Real-time updates work
- [ ] Other features not broken

### UI/UX Tests
- [ ] Responsive on mobile
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Matches Streamlit version

### Performance
- [ ] Loads within 2 seconds
- [ ] No janky animations
- [ ] Smooth scrolling

### Notes:
[Any issues or observations]
```

## Automated Test Running

### Package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:debug": "node --inspect-brk ./node_modules/.bin/jest --runInBand"
  }
}
```

### GitHub Actions CI
```yaml
# .github/workflows/test.yml
name: Test React App

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        cd react-app
        npm ci
        
    - name: Run tests
      run: |
        cd react-app
        npm test -- --coverage
        
    - name: Build app
      run: |
        cd react-app
        npm run build
```

## Testing Commands Reference

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test Dashboard.test.jsx

# Run tests matching pattern
npm test -- --testNamePattern="auth"

# Debug tests
npm run test:debug
```

## Performance Testing

### Lighthouse CI Setup
```bash
npm install --save-dev @lhci/cli

# Run Lighthouse
npx lhci autorun
```

### Bundle Size Analysis
```bash
# Analyze bundle size
npm run build
npm install -g source-map-explorer
source-map-explorer 'build/static/js/*.js'
```

## Firebase Emulator Testing

### Setup Emulators
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Init emulators
firebase init emulators

# Start emulators
firebase emulators:start
```

### Connect to Emulators in Tests
```javascript
// src/config/firebase.test.js
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

if (process.env.NODE_ENV === 'test') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

## Monitoring & Debugging

### Error Boundary
```javascript
// src/components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-page">
          <h1>Something went wrong</h1>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Test Data Generators

### Mock Data Factory
```javascript
// src/test-utils/mockData.js
export const createMockEvent = (overrides = {}) => ({
  id: 'evt_test_123',
  name: 'Test Event',
  start_date: new Date('2024-12-25'),
  guest_count: 100,
  status: 'planning',
  ...overrides,
});

export const createMockRecipe = (overrides = {}) => ({
  id: 'rec_test_123',
  name: 'Test Recipe',
  ingredients: ['1 cup flour', '2 eggs'],
  instructions: 'Mix and bake',
  serves: 4,
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  uid: 'user_test_123',
  email: 'test@example.com',
  displayName: 'Test User',
  ...overrides,
});
```

---

This testing strategy ensures the React app works correctly as we build it. Start with the health check script and gradually add more tests as features are implemented.