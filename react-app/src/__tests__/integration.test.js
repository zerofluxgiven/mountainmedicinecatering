import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipeSections from '../components/Recipes/RecipeSections';
import MenuItem from '../components/Menu/MenuItem';

// Mock Firebase
jest.mock('../config/firebase', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user-id', email: 'test@example.com' }
  }
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({
    docs: [
      {
        id: 'recipe1',
        data: () => ({ name: 'Test Dressing', serves: 10, ingredients: ['olive oil', 'vinegar'] })
      },
      {
        id: 'recipe2',
        data: () => ({ name: 'Test Sauce', serves: 8, ingredients: ['tomatoes', 'basil'] })
      }
    ]
  })),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn()
}));

// Mock drag and drop
jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false
  })
}));

describe('Recipe Sections - Form Submission Fix', () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    sections: [],
    onChange: mockOnChange,
    mode: 'edit'
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  test('Add Section button should not submit form', () => {
    render(<RecipeSections {...defaultProps} />);
    
    const addSectionButton = screen.getByText('+ Add Section');
    expect(addSectionButton).toHaveAttribute('type', 'button');
    
    // Simulate click
    fireEvent.click(addSectionButton);
    
    // Should add a new section without form submission
    expect(mockOnChange).toHaveBeenCalledWith([
      expect.objectContaining({
        label: 'New Section',
        ingredients: [''],
        instructions: ''
      })
    ]);
  });

  test('Choose Existing Recipe button should open modal', async () => {
    const sections = [{
      label: 'Main',
      ingredients: ['lettuce'],
      instructions: 'Chop lettuce'
    }];
    
    render(<RecipeSections {...defaultProps} sections={sections} />);
    
    const chooseRecipeButton = screen.getByText('Choose Existing Recipe');
    expect(chooseRecipeButton).toHaveAttribute('type', 'button');
    
    fireEvent.click(chooseRecipeButton);
    
    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText('Choose Recipe for Main')).toBeInTheDocument();
    });
  });
});

describe('Menu Item - Sub-recipe Functionality', () => {
  const mockOnUpdate = jest.fn();
  const mockOnRemove = jest.fn();
  
  const defaultItem = {
    id: 'item1',
    recipe_id: 'main-recipe',
    recipe_name: 'Pancakes',
    serves: 20,
    notes: 'Test notes',
    sub_recipes: []
  };

  beforeEach(() => {
    mockOnUpdate.mockClear();
    mockOnRemove.mockClear();
  });

  test('Sub-recipe section should display when editing', () => {
    render(
      <MenuItem 
        item={defaultItem}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );
    
    // Enter edit mode
    const editButton = screen.getByTitle('Edit notes');
    fireEvent.click(editButton);
    
    // Sub-recipe button should appear
    const addSubRecipeButton = screen.getByText('+ Add Sub-Recipe (Sauce, Dressing, etc.)');
    expect(addSubRecipeButton).toBeInTheDocument();
    expect(addSubRecipeButton).toHaveAttribute('type', 'button');
  });

  test('Sub-recipes should display with proper hierarchy', () => {
    const itemWithSubRecipes = {
      ...defaultItem,
      sub_recipes: [
        {
          id: 'sub1',
          recipe_id: 'syrup-recipe',
          recipe_name: 'Maple Syrup',
          serves: 20
        }
      ]
    };
    
    render(
      <MenuItem 
        item={itemWithSubRecipes}
        onUpdate={mockOnUpdate}
        onRemove={mockOnRemove}
      />
    );
    
    // Check sub-recipe is displayed with hierarchy indicator
    expect(screen.getByText('└')).toBeInTheDocument();
    expect(screen.getByText('Maple Syrup')).toBeInTheDocument();
    expect(screen.getByText('Serves 20')).toBeInTheDocument();
  });
});