import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { AppContext } from '../contexts/AppContext';

// Mock contexts
const mockAuthContext = {
  currentUser: null,
  userRole: null,
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  signup: jest.fn(),
  hasRole: jest.fn(),
};

const mockAppContext = {
  selectedEventId: null,
  activeEvent: null,
  events: [],
  recipes: [],
  menus: [],
  loading: false,
  setSelectedEventId: jest.fn(),
};

// Custom render function
export function renderWithProviders(
  ui,
  {
    authValue = mockAuthContext,
    appValue = mockAppContext,
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <AuthContext.Provider value={authValue}>
          <AppContext.Provider value={appValue}>
            {children}
          </AppContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock data generators
export const createMockUser = (overrides = {}) => ({
  uid: 'user_test_123',
  email: 'test@example.com',
  displayName: 'Test User',
  ...overrides,
});

export const createMockEvent = (overrides = {}) => ({
  id: 'evt_test_123',
  name: 'Test Event',
  start_date: new Date('2024-12-25'),
  end_date: new Date('2024-12-26'),
  location: 'Test Location',
  guest_count: 100,
  status: 'planning',
  created_by: 'user_test_123',
  created_at: new Date(),
  ...overrides,
});

export const createMockRecipe = (overrides = {}) => ({
  id: 'rec_test_123',
  name: 'Test Recipe',
  ingredients: ['1 cup flour', '2 eggs', '1/2 cup sugar'],
  instructions: 'Mix all ingredients and bake at 350F for 30 minutes',
  serves: 4,
  tags: ['dessert'],
  allergens: ['gluten', 'eggs'],
  created_by: 'user_test_123',
  created_at: new Date(),
  ...overrides,
});

export const createMockMenu = (overrides = {}) => ({
  id: 'menu_test_123',
  name: 'Test Menu',
  event_id: 'evt_test_123',
  sections: [
    {
      name: 'Appetizers',
      recipes: [
        {
          recipe_id: 'rec_test_123',
          servings: 100,
          notes: 'Serve first',
        },
      ],
    },
  ],
  created_by: 'user_test_123',
  created_at: new Date(),
  ...overrides,
});

// Re-export everything from testing library
export * from '@testing-library/react';

// Export our custom render as the default
export { renderWithProviders as render };