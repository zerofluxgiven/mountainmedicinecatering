import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecipeViewer from '../pages/Recipes/RecipeViewer';
import RecipeScaler from '../components/Recipes/RecipeScaler';

// Mock Firebase
jest.mock('../config/firebase', () => ({
  db: {},
  auth: {}
}));

// Mock hooks
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasRole: () => true })
}));

// Mock window.print
const mockPrint = jest.fn();
window.print = mockPrint;

describe('Recipe Print Functionality', () => {
  const mockRecipe = {
    id: 'test-recipe',
    name: 'Test Recipe',
    serves: 4,
    ingredients: ['1 cup flour', '2 eggs', '1/2 cup milk'],
    instructions: 'Mix all ingredients. Bake at 350°F for 30 minutes.',
    prep_time: 15,
    cook_time: 30,
    tags: ['breakfast', 'easy'],
    allergens: ['gluten', 'eggs', 'dairy']
  };

  afterEach(() => {
    jest.clearAllMocks();
    document.body.className = '';
  });

  describe('RecipeViewer Print', () => {
    it('should add printing class to body when print button is clicked', async () => {
      render(
        <BrowserRouter>
          <RecipeViewer />
        </BrowserRouter>
      );

      // Assuming we can find and click the print button
      const printButton = screen.getByText(/print/i);
      fireEvent.click(printButton);

      await waitFor(() => {
        expect(document.body.classList.contains('printing-recipe')).toBe(true);
      });
    });

    it('should call window.print', async () => {
      render(
        <BrowserRouter>
          <RecipeViewer />
        </BrowserRouter>
      );

      const printButton = screen.getByText(/print/i);
      fireEvent.click(printButton);

      await waitFor(() => {
        expect(mockPrint).toHaveBeenCalled();
      });
    });

    it('should remove printing class after printing', async () => {
      render(
        <BrowserRouter>
          <RecipeViewer />
        </BrowserRouter>
      );

      const printButton = screen.getByText(/print/i);
      fireEvent.click(printButton);

      await waitFor(() => {
        expect(document.body.classList.contains('printing-recipe')).toBe(false);
      }, { timeout: 200 });
    });
  });

  describe('RecipeScaler Print', () => {
    it('should add printing-scaled-recipe class when printing from scaler', async () => {
      render(
        <RecipeScaler 
          recipe={mockRecipe}
          onClose={() => {}}
        />
      );

      const printButton = screen.getByText(/print scaled recipe/i);
      fireEvent.click(printButton);

      await waitFor(() => {
        expect(document.body.classList.contains('printing-scaled-recipe')).toBe(true);
      });
    });

    it('should include data attributes for print', () => {
      const { container } = render(
        <RecipeScaler 
          recipe={mockRecipe}
          onClose={() => {}}
        />
      );

      const scaledRecipeDiv = container.querySelector('.scaled-recipe');
      expect(scaledRecipeDiv).toHaveAttribute('data-servings');
      expect(scaledRecipeDiv).toHaveAttribute('data-print-date');
    });
  });
});