# Mountain Medicine Kitchen - Complete Testing Guide

## Overview

This guide consolidates all testing information for the React migration project. It covers automated tests, manual testing procedures, and how to use the testing infrastructure effectively.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Testing Infrastructure](#testing-infrastructure)
3. [Running Tests](#running-tests)
4. [Test Types](#test-types)
5. [Troubleshooting](#troubleshooting)
6. [CI/CD Integration](#cicd-integration)

## Quick Start

```bash
# Navigate to React app
cd react-app

# Install dependencies (if not done)
npm install

# Run all tests
./run-tests.sh

# Or run specific tests
npm test                    # Unit tests
./test-health.sh           # Health check
node test-firebase-connection.js  # Firebase test
```

## Testing Infrastructure

### Files Created

| File | Purpose | Type |
|------|---------|------|
| `test-health.sh` | Verifies app setup and dependencies | Shell script |
| `test-firebase-connection.js` | Tests Firebase configuration | Node script |
| `run-tests.sh` | Runs all tests in sequence | Shell script |
| `jest.config.js` | Jest configuration | Config |
| `src/setupTests.js` | Test environment setup | Setup |
| `src/test-utils/test-utils.jsx` | Custom render functions | Utility |
| `TESTING_STRATEGY.md` | Complete testing approach | Documentation |
| `MANUAL_TESTING_CHECKLIST.md` | Pre-deployment checklist | Documentation |

### Test Commands

```json
// Available in package.json
{
  "scripts": {
    "test": "react-scripts test",
    "test:coverage": "react-scripts test --coverage --watchAll=false",
    "test:watch": "react-scripts test --watch",
    "test:debug": "react-scripts --inspect-brk test --runInBand --no-cache",
    "test:firebase": "node test-firebase-connection.js",
    "test:health": "./test-health.sh"
  }
}
```

## Running Tests

### 1. Health Check Test

**Purpose**: Verify the React app is properly set up before running.

```bash
./test-health.sh
```

**What it checks:**
- ✅ Node.js and npm installed
- ✅ package.json exists
- ✅ Dependencies installed (node_modules)
- ✅ Environment configuration (.env)
- ✅ Required directories exist
- ✅ App builds successfully

**Expected output:**
```
🔍 Running React App Health Check...
==================================
✅ package.json found
✅ Node.js installed: v18.0.0
✅ npm installed: 9.0.0
✅ Dependencies installed
✅ .env file found
✅ All required directories present
✅ Build successful!
==================================
✅ React app is healthy and ready to run!
```

### 2. Firebase Connection Test

**Purpose**: Verify Firebase services are properly configured.

```bash
node test-firebase-connection.js
```

**Prerequisites:**
- Create `.env` file from `.env.example`
- Add your Firebase configuration

**What it tests:**
- ✅ Environment variables present
- ✅ Firebase app initialization
- ✅ Authentication service
- ✅ Firestore database connection
- ✅ Storage bucket access

**Expected output:**
```
🔥 Testing Firebase Connection...

📋 Checking environment variables...
✅ All environment variables present

🚀 Initializing Firebase...
✅ Firebase app initialized

🔐 Testing Authentication...
✅ Auth service connected

📚 Testing Firestore...
✅ Firestore connected

📦 Testing Storage...
✅ Storage service connected

=====================================
✅ Firebase connection test passed!
=====================================
```

### 3. Unit Tests

**Purpose**: Test individual components and functions.

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test Dashboard.test.jsx
```

**Example test structure:**
```javascript
// Dashboard.test.jsx
describe('Dashboard Component', () => {
  test('renders welcome message with user email', () => {
    render(<Dashboard />, {
      authValue: mockAuthValue,
      appValue: mockAppValue,
    });
    
    expect(screen.getByText(/Welcome back, test!/)).toBeInTheDocument();
  });
});
```

### 4. Manual Testing

**Purpose**: Verify UI/UX and user workflows.

Use the checklist in `MANUAL_TESTING_CHECKLIST.md`:

```markdown
## Pre-Launch Checklist
- [ ] App builds without errors
- [ ] Login flow works correctly
- [ ] Navigation functions properly
- [ ] Responsive on mobile devices
- [ ] Data loads from Firebase
- [ ] No console errors
```

### 5. Complete Test Suite

**Purpose**: Run all tests in sequence.

```bash
./run-tests.sh
```

**What it does:**
1. Runs health check
2. Tests Firebase connection (if .env exists)
3. Runs unit tests
4. Provides summary of results

**Output:**
```
🧪 Mountain Medicine Kitchen - Test Runner
========================================

Running: Health Check
----------------------------------------
✅ Health Check passed

Running: Firebase Connection
----------------------------------------
✅ Firebase Connection passed

Running: Unit Tests
----------------------------------------
✅ Unit tests passed

========================================
📊 Test Summary
========================================
✅ All tests passed!
```

## Test Types

### Build & Runtime Tests
- **Health Check**: Ensures app can build and has proper structure
- **Firebase Connection**: Verifies backend services are accessible

### Component Tests
- **Unit Tests**: Test components in isolation with mocked dependencies
- **Integration Tests**: Test component interactions
- **Snapshot Tests**: Detect unexpected UI changes

### Manual Tests
- **Functional Testing**: Verify features work as expected
- **Cross-browser Testing**: Ensure compatibility
- **Responsive Testing**: Check mobile/tablet layouts
- **Performance Testing**: Monitor load times and memory usage
- **Accessibility Testing**: Keyboard navigation and screen readers

## Troubleshooting

### Common Issues

#### Health Check Fails

**Problem**: `package.json not found`
```bash
# Solution: Ensure you're in the react-app directory
cd react-app
```

**Problem**: `node_modules not found`
```bash
# Solution: Install dependencies
npm install
```

**Problem**: `Build failed`
```bash
# Solution: Check build.log for specific errors
cat build.log
```

#### Firebase Connection Fails

**Problem**: `Missing environment variables`
```bash
# Solution: Create .env file
cp .env.example .env
# Add your Firebase config to .env
```

**Problem**: `Permission denied`
```bash
# Solution: Check Firebase security rules
# Ensure your project allows reads for testing
```

#### Unit Tests Fail

**Problem**: `Cannot find module`
```bash
# Solution: Install test dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

**Problem**: `Firebase is not defined`
```bash
# Solution: Mocks are set up in setupTests.js
# Ensure this file exists and is referenced in jest.config.js
```

### Debug Mode

```bash
# Run tests in debug mode
npm run test:debug

# Then open Chrome and navigate to:
chrome://inspect

# Click "inspect" to debug tests
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test React App

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        cd react-app
        npm ci
        
    - name: Run health check
      run: |
        cd react-app
        ./test-health.sh
        
    - name: Run unit tests
      run: |
        cd react-app
        npm test -- --coverage --watchAll=false
        
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        directory: ./react-app/coverage
```

### Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

echo "Running tests before commit..."
cd react-app && npm test -- --watchAll=false --passWithNoTests

if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi
```

## Best Practices

### Writing Tests

1. **Test user behavior, not implementation**
   ```javascript
   // Good
   expect(screen.getByText('Welcome')).toBeInTheDocument();
   
   // Avoid
   expect(component.state.welcomeText).toBe('Welcome');
   ```

2. **Use data-testid for hard-to-select elements**
   ```jsx
   <button data-testid="submit-button">Submit</button>
   ```

3. **Mock external dependencies**
   ```javascript
   jest.mock('../config/firebase');
   ```

4. **Test error states**
   ```javascript
   test('shows error when login fails', async () => {
     // Test error handling
   });
   ```

### Test Organization

```
src/
├── components/
│   └── Button/
│       ├── Button.jsx
│       ├── Button.css
│       └── __tests__/
│           └── Button.test.jsx
├── pages/
│   └── Dashboard/
│       ├── Dashboard.jsx
│       ├── Dashboard.css
│       └── __tests__/
│           └── Dashboard.test.jsx
└── test-utils/
    └── test-utils.jsx
```

### Coverage Goals

- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

Check coverage with:
```bash
npm run test:coverage
```

## Testing Workflow

### Development Workflow

1. **Before starting development**
   ```bash
   ./test-health.sh  # Ensure setup is correct
   ```

2. **During development**
   ```bash
   npm run test:watch  # Run tests in watch mode
   ```

3. **Before committing**
   ```bash
   ./run-tests.sh  # Run all tests
   ```

4. **Before deployment**
   - Complete manual testing checklist
   - Run tests in production mode
   - Verify no console errors

### Testing New Features

1. **Write tests first (TDD)**
   - Define expected behavior
   - Write failing tests
   - Implement feature
   - Make tests pass

2. **Test at multiple levels**
   - Unit test components
   - Integration test workflows
   - Manual test UX

3. **Update test documentation**
   - Add to manual checklist
   - Document new test utilities
   - Update coverage thresholds

## Summary

The testing infrastructure provides:

✅ **Confidence**: Know the app works before deployment  
✅ **Fast Feedback**: Catch issues early in development  
✅ **Documentation**: Tests show how components should work  
✅ **Regression Prevention**: Ensure new changes don't break existing features  
✅ **Quality Assurance**: Maintain high code quality standards  

Use this guide as a reference for all testing activities during the React migration project.