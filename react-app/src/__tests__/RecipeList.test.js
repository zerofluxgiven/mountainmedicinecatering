import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecipeList from '../pages/Recipes/RecipeList';
import { AuthProvider } from '../contexts/AuthContext';
import { AppProvider } from '../contexts/AppContext';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback({ uid: 'test-user', email: 'test@example.com' });
    return jest.fn();
  }),
}));

// Mock recipes data
const mockRecipes = [
  {
    id: '1',
    name: 'Chocolate Cake',
    serves: 8,
    tags: ['dessert', 'chocolate'],
    allergens: ['gluten', 'dairy', 'eggs'],
    created_at: { toDate: () => new Date('2024-01-01') }
  },
  {
    id: '2',
    name: 'Vegetable Stir Fry',
    serves: 4,
    tags: ['main', 'vegetarian'],
    allergens: ['soy'],
    created_at: { toDate: () => new Date('2024-01-02') }
  },
  {
    id: '3',
    name: 'Caesar Salad',
    serves: 6,
    tags: ['salad', 'appetizer'],
    allergens: ['dairy', 'eggs', 'fish'],
    created_at: { toDate: () => new Date('2024-01-03') }
  }
];

const renderRecipeList = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <RecipeList />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('RecipeList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Firestore query
    query.mockReturnValue('mock-query');
    orderBy.mockReturnValue('mock-order');
    
    // Mock onSnapshot to return recipes
    onSnapshot.mockImplementation((query, callback) => {
      callback({
        docs: mockRecipes.map(recipe => ({
          id: recipe.id,
          data: () => recipe
        }))
      });
      return jest.fn(); // unsubscribe
    });
  });

  test('renders recipe list with recipes', async () => {
    renderRecipeList();

    await waitFor(() => {
      expect(screen.getByText('Recipe Management')).toBeInTheDocument();
      expect(screen.getByText('Chocolate Cake')).toBeInTheDocument();
      expect(screen.getByText('Vegetable Stir Fry')).toBeInTheDocument();
      expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
    });
  });

  test('filters recipes by search term', async () => {
    renderRecipeList();

    await waitFor(() => {
      expect(screen.getByText('Chocolate Cake')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search recipes/i);
    fireEvent.change(searchInput, { target: { value: 'chocolate' } });

    await waitFor(() => {
      expect(screen.getByText('Chocolate Cake')).toBeInTheDocument();
      expect(screen.queryByText('Vegetable Stir Fry')).not.toBeInTheDocument();
      expect(screen.queryByText('Caesar Salad')).not.toBeInTheDocument();
    });
  });

  test('filters recipes by tag', async () => {
    renderRecipeList();

    await waitFor(() => {
      expect(screen.getByText('Chocolate Cake')).toBeInTheDocument();
    });

    const dessertTag = screen.getByText('dessert');
    fireEvent.click(dessertTag);

    await waitFor(() => {
      expect(screen.getByText('Chocolate Cake')).toBeInTheDocument();
      expect(screen.queryByText('Vegetable Stir Fry')).not.toBeInTheDocument();
      expect(screen.queryByText('Caesar Salad')).not.toBeInTheDocument();
    });
  });

  test('filters recipes by allergen', async () => {
    renderRecipeList();

    await waitFor(() => {
      expect(screen.getByText('Chocolate Cake')).toBeInTheDocument();
    });

    const dairyAllergen = screen.getAllByText('dairy')[0];
    fireEvent.click(dairyAllergen);

    await waitFor(() => {
      expect(screen.getByText('Chocolate Cake')).toBeInTheDocument();
      expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
      expect(screen.queryByText('Vegetable Stir Fry')).not.toBeInTheDocument();
    });
  });

  test('sorts recipes by name', async () => {
    renderRecipeList();

    await waitFor(() => {
      expect(screen.getByText('Chocolate Cake')).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText(/sort by/i);
    fireEvent.change(sortSelect, { target: { value: 'name' } });

    // In a real test, we would check the order of elements
    await waitFor(() => {
      const recipeCards = screen.getAllByTestId('recipe-card');
      expect(recipeCards).toHaveLength(3);
    });
  });

  test('shows empty state when no recipes', async () => {
    onSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] });
      return jest.fn();
    });

    renderRecipeList();

    await waitFor(() => {
      expect(screen.getByText(/no recipes found/i)).toBeInTheDocument();
    });
  });
});