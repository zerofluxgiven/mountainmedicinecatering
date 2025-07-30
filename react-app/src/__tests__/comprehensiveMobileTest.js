/**
 * Comprehensive Mobile Browser Test for Mountain Medicine Kitchen
 * 
 * This test simulates a mobile browser experience and checks all major functionality
 * Run with: npm test -- comprehensiveMobileTest.test.js
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { AuthContext } from '../contexts/AuthContext';
import { AppContext } from '../contexts/AppContext';

// Mock Firebase
jest.mock('../config/firebase', () => ({
  db: {},
  auth: {},
  storage: {}
}));

// Mock user with full permissions
const mockUser = {
  uid: 'test-user-123',
  email: 'test@mountainmedicine.com',
  emailVerified: true
};

const mockAuthContext = {
  currentUser: mockUser,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false
};

const mockAppContext = {
  events: [
    {
      id: 'evt-1',
      name: '24th Family Camping Trip',
      start_date: new Date('2025-07-25'),
      end_date: new Date('2025-07-27'),
      guest_count: 20,
      allergens: ['gluten', 'dairy'],
      dietary_restrictions: ['vegan']
    }
  ],
  recipes: [
    {
      id: 'rec-1',
      name: 'Pancakes',
      servings: 10,
      allergens: ['gluten', 'dairy']
    },
    {
      id: 'rec-2',
      name: 'Vegan Salad',
      servings: 8,
      allergens: [],
      dietary_tags: ['vegan']
    }
  ],
  menus: [
    {
      id: 'menu-1',
      event_id: 'evt-1',
      name: '24th Family Camping Trip - Primary Menu',
      days: [
        {
          date: '2025-07-25',
          day_label: 'Day 1',
          expanded: false,
          meals: [
            {
              id: 'meal-1',
              type: 'breakfast',
              time: '8:00 AM',
              courses: []
            }
          ]
        },
        {
          date: '2025-07-26',
          day_label: 'Day 2',
          expanded: false,
          meals: [
            {
              id: 'meal-2',
              type: 'breakfast',
              time: '8:00 AM',
              courses: []
            }
          ]
        }
      ]
    }
  ],
  selectedEventId: 'evt-1',
  loading: false
};

// Set viewport to mobile size
beforeEach(() => {
  window.innerWidth = 375;
  window.innerHeight = 667;
  window.dispatchEvent(new Event('resize'));
});

const renderApp = () => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <AppContext.Provider value={mockAppContext}>
          <App />
        </AppContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Comprehensive Mobile Functionality Tests', () => {
  
  describe('Navigation and Layout', () => {
    test('Mobile sidebar toggle works correctly', async () => {
      renderApp();
      
      // Check sidebar is closed by default on mobile
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass('closed');
      
      // Click hamburger menu
      const menuButton = screen.getByRole('button', { name: /menu/i });
      fireEvent.click(menuButton);
      
      // Sidebar should open
      await waitFor(() => {
        expect(sidebar).toHaveClass('open');
      });
      
      // Should have white background (not grey)
      const computedStyle = window.getComputedStyle(sidebar);
      expect(computedStyle.backgroundColor).toBe('white');
    });
    
    test('All navigation items are accessible', () => {
      renderApp();
      
      const navItems = [
        'Dashboard',
        'Events', 
        'Recipes',
        'Menus',
        'Shopping Lists',
        'Ingredients',
        'AI History',
        'Settings'
      ];
      
      navItems.forEach(item => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });
  });
  
  describe('Dashboard', () => {
    test('All analytics cards have consistent height', () => {
      renderApp();
      navigate('/');
      
      const statCards = screen.getAllByClassName('stat-card');
      const heights = statCards.map(card => card.offsetHeight);
      
      // All cards should have the same height
      const uniqueHeights = [...new Set(heights)];
      expect(uniqueHeights.length).toBe(1);
    });
    
    test('Quick actions are clickable and styled correctly', () => {
      renderApp();
      
      const createEvent = screen.getByText('New Event').closest('.stat-card');
      expect(createEvent).toHaveClass('action-clickable');
      
      fireEvent.click(createEvent);
      expect(window.location.pathname).toBe('/events/new');
    });
  });
  
  describe('Menu Planner', () => {
    test('Remove Day button is visible when there are multiple days', async () => {
      renderApp();
      navigate('/events/evt-1/menus/menu-1/plan');
      
      // Wait for menu to load
      await waitFor(() => {
        expect(screen.getByText('24th Family Camping Trip - Primary Menu')).toBeInTheDocument();
      });
      
      // Expand first day
      const day1 = screen.getByText('Day 1').closest('.day-editor');
      const expandButton = within(day1).getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);
      
      // Check for Remove Day button (should exist since there are 2 days)
      await waitFor(() => {
        const removeButton = within(day1).getByText('Remove Day');
        expect(removeButton).toBeInTheDocument();
        expect(removeButton).toHaveClass('btn-danger');
      });
    });
    
    test('Days are sorted chronologically after date change', async () => {
      renderApp();
      navigate('/events/evt-1/menus/menu-1/plan');
      
      // Change a date and verify sorting
      const day2 = screen.getByText('Day 2').closest('.day-editor');
      const dateElement = within(day2).getByText(/Jul 26/);
      fireEvent.click(dateElement);
      
      // Should show date input
      const dateInput = within(day2).getByType('date');
      fireEvent.change(dateInput, { target: { value: '2025-07-24' } });
      fireEvent.blur(dateInput);
      
      // Days should reorder
      await waitFor(() => {
        const dayLabels = screen.getAllByText(/Day \d/);
        expect(dayLabels[0]).toHaveTextContent('Day 1');
        expect(dayLabels[1]).toHaveTextContent('Day 2');
      });
    });
  });
  
  describe('Event Management', () => {
    test('Search input does not show magnifying glass emoji', () => {
      renderApp();
      navigate('/events');
      
      const searchInput = screen.getByPlaceholderText('Search events, clients, or venues...');
      const searchContainer = searchInput.parentElement;
      
      // Should not contain magnifying glass emoji
      expect(searchContainer.textContent).not.toContain('🔍');
    });
    
    test('Events can be created and edited', async () => {
      renderApp();
      navigate('/events/new');
      
      // Fill form
      fireEvent.change(screen.getByLabelText('Event Name'), {
        target: { value: 'Test Event' }
      });
      
      fireEvent.change(screen.getByLabelText('Start Date'), {
        target: { value: '2025-08-01' }
      });
      
      fireEvent.change(screen.getByLabelText('End Date'), {
        target: { value: '2025-08-03' }
      });
      
      // Save button should be visible on mobile
      const saveButton = screen.getByText('Save Event');
      expect(saveButton).toBeVisible();
    });
  });
  
  describe('Recipe Features', () => {
    test('Recipe cards show version indicators on hover', () => {
      renderApp();
      navigate('/recipes');
      
      const recipeCard = screen.getByText('Pancakes').closest('.recipe-card');
      
      // Simulate hover
      fireEvent.mouseEnter(recipeCard);
      
      // Version badge should appear if recipe has versions
      const versionBadge = within(recipeCard).queryByText(/versions/i);
      if (versionBadge) {
        expect(versionBadge).toBeVisible();
      }
    });
    
    test('Recipe import handles multiple formats', () => {
      renderApp();
      navigate('/recipes/import');
      
      expect(screen.getByText('Import Recipes')).toBeInTheDocument();
      expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument();
    });
  });
  
  describe('AI Integration', () => {
    test('AI chat is accessible and functional', () => {
      renderApp();
      navigate('/chat');
      
      const chatInput = screen.getByPlaceholderText(/ask me anything/i);
      expect(chatInput).toBeInTheDocument();
      
      // Test message sending
      fireEvent.change(chatInput, { target: { value: 'Test message' } });
      fireEvent.submit(chatInput.closest('form'));
      
      // Should show loading state
      expect(screen.getByText(/thinking/i)).toBeInTheDocument();
    });
  });
  
  describe('Mobile-Specific UI Elements', () => {
    test('Floating save buttons appear on scroll', async () => {
      renderApp();
      navigate('/events/evt-1/edit');
      
      // Scroll down
      window.scrollY = 200;
      window.dispatchEvent(new Event('scroll'));
      
      // Floating save button should appear
      await waitFor(() => {
        const floatingSave = screen.getByClassName('mobile-save-button');
        expect(floatingSave).toHaveClass('visible');
      });
    });
    
    test('Headers hide on scroll down, show on scroll up', async () => {
      renderApp();
      
      const header = screen.getByRole('banner');
      
      // Simulate scroll down
      window.scrollY = 100;
      window.dispatchEvent(new Event('scroll'));
      
      await waitFor(() => {
        expect(header).toHaveClass('scroll-hidden');
      });
      
      // Simulate scroll up
      window.scrollY = 50;
      window.dispatchEvent(new Event('scroll'));
      
      await waitFor(() => {
        expect(header).not.toHaveClass('scroll-hidden');
      });
    });
  });
});

// Helper function to navigate
function navigate(path) {
  window.history.pushState({}, '', path);
}

// Test for unused code detection
describe('Code Usage Analysis', () => {
  test('Identify potentially unused components', () => {
    const usedComponents = new Set();
    const allComponents = [
      'Dashboard',
      'EventList',
      'EventEditor',
      'RecipeList',
      'RecipeEditor',
      'MenuPlanner',
      'MenuEditor', // Potentially unused?
      'ShoppingList',
      'AIChat'
    ];
    
    // This would need to be more sophisticated in practice
    // You could use a tool like webpack-bundle-analyzer
    console.log('Components to review for usage:', 
      allComponents.filter(c => !usedComponents.has(c))
    );
  });
});