import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { collection, doc, setDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AllergyManager from '../../pages/Events/AllergyManager';
import Settings from '../../pages/Settings/Settings';
import MealTypeSettings from '../../components/Settings/MealTypeSettings';
import ColorPicker from '../../components/Settings/ColorPicker';
import DietForm from '../../components/Diet/DietForm';
import { subscribeMealTypes } from '../../services/mealTypes';

// Mock Firebase
jest.mock('../../config/firebase', () => ({
  db: {},
  auth: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDocs: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn()
}));

const mockUser = {
  uid: 'test-user-123',
  email: 'admin@test.com',
  displayName: 'Test Admin'
};

const mockAuthContext = {
  user: mockUser,
  hasRole: (role) => role === 'admin',
  loading: false
};

const renderWithAuth = (component) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Recent Features Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Diet Management', () => {
    const mockEventId = 'test-event-123';
    const mockDiets = [
      {
        id: 'diet-1',
        guest_name: 'John Doe',
        diet_types: ['vegetarian', 'gluten-free'],
        notes: 'Severe gluten allergy'
      },
      {
        id: 'diet-2',
        guest_name: 'Jane Smith',
        diet_types: ['vegan'],
        custom_diet_names: ['raw food'],
        notes: 'Prefers organic'
      }
    ];

    beforeEach(() => {
      getDocs.mockResolvedValue({
        docs: mockDiets.map(diet => ({
          id: diet.id,
          data: () => diet
        }))
      });
    });

    test('should allow multiple diet selections', async () => {
      const onSave = jest.fn();
      renderWithAuth(<DietForm onSave={onSave} onCancel={() => {}} />);

      // Fill in guest name
      const nameInput = screen.getByLabelText(/guest name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Guest' } });

      // Select multiple diets
      const vegetarianCheckbox = screen.getByLabelText(/vegetarian/i);
      const veganCheckbox = screen.getByLabelText(/vegan/i);
      
      fireEvent.click(vegetarianCheckbox);
      fireEvent.click(veganCheckbox);

      // Save
      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
          guest_name: 'Test Guest',
          diet_types: expect.arrayContaining(['vegetarian', 'vegan'])
        }));
      });
    });

    test('should immediately show added diet without refresh', async () => {
      renderWithAuth(<AllergyManager eventId={mockEventId} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Mock successful save
      setDoc.mockResolvedValueOnce();
      
      // Mock updated diets list
      const newDiet = {
        id: 'diet-3',
        guest_name: 'New Guest',
        diet_types: ['pescatarian'],
        notes: 'No shellfish'
      };

      getDocs.mockResolvedValueOnce({
        docs: [...mockDiets, newDiet].map(diet => ({
          id: diet.id,
          data: () => diet
        }))
      });

      // Add new diet
      const addButton = screen.getByText(/add diet/i);
      fireEvent.click(addButton);

      // Fill form
      const nameInput = screen.getByLabelText(/guest name/i);
      fireEvent.change(nameInput, { target: { value: 'New Guest' } });

      const pescatarianCheckbox = screen.getByLabelText(/pescatarian/i);
      fireEvent.click(pescatarianCheckbox);

      // Save
      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);

      // Should immediately show the new diet
      await waitFor(() => {
        expect(screen.getByText('New Guest')).toBeInTheDocument();
      });
    });

    test('should not show redundant dietary restrictions field in allergy form', () => {
      renderWithAuth(<AllergyManager eventId={mockEventId} />);

      // Open allergy form
      const addAllergyButton = screen.getByText(/add allergy/i);
      fireEvent.click(addAllergyButton);

      // Should not find "Other Dietary Restrictions" field
      expect(screen.queryByText(/other dietary restrictions/i)).not.toBeInTheDocument();
    });
  });

  describe('Settings and Meal Type Configuration', () => {
    const mockMealTypes = [
      { id: 'breakfast', name: 'Breakfast', color: '#FFF8DC', opacity: 1, is_default: true },
      { id: 'lunch', name: 'Lunch', color: '#F0F8FF', opacity: 1, is_default: true },
      { id: 'custom_brunch', name: 'Brunch', color: '#FFE4B5', opacity: 0.9, is_default: false }
    ];

    beforeEach(() => {
      // Mock Firestore snapshot
      const mockUnsubscribe = jest.fn();
      onSnapshot.mockImplementation((collection, onNext) => {
        onNext({
          empty: false,
          size: mockMealTypes.length,
          docs: mockMealTypes.map(mt => ({
            id: mt.id,
            data: () => mt
          }))
        });
        return mockUnsubscribe;
      });
    });

    test('should only allow admin access to settings', () => {
      // Test with non-admin user
      const nonAdminContext = {
        ...mockAuthContext,
        hasRole: (role) => role !== 'admin'
      };

      const { container } = render(
        <BrowserRouter>
          <AuthContext.Provider value={nonAdminContext}>
            <Settings />
          </AuthContext.Provider>
        </BrowserRouter>
      );

      // Should redirect or show access denied
      expect(container.textContent).not.toContain('Settings');
    });

    test('should display meal types as a list, not dropdown', async () => {
      renderWithAuth(<MealTypeSettings />);

      await waitFor(() => {
        // Should show all meal types in a list
        expect(screen.getByText('Breakfast')).toBeInTheDocument();
        expect(screen.getByText('Lunch')).toBeInTheDocument();
        expect(screen.getByText('Brunch')).toBeInTheDocument();
      });

      // Should not have any select/dropdown elements for meal types
      const mealTypeList = screen.getByText('Meal Types').parentElement;
      expect(within(mealTypeList).queryByRole('combobox')).not.toBeInTheDocument();
    });

    test('should add custom meal type and update all dropdowns', async () => {
      renderWithAuth(<MealTypeSettings />);

      // Add custom meal type
      const input = screen.getByPlaceholderText(/enter meal type name/i);
      fireEvent.change(input, { target: { value: 'Tea Time' } });

      const addButton = screen.getByText(/add$/i);
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(setDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            name: 'Tea Time',
            color: '#F0F0F0',
            opacity: 1,
            is_default: false
          })
        );
      });
    });

    test('should maintain meal selection when changing colors', async () => {
      renderWithAuth(<MealTypeSettings />);

      // Wait for meal types to load
      await waitFor(() => {
        expect(screen.getByText('Lunch')).toBeInTheDocument();
      });

      // Select Lunch
      const lunchItem = screen.getByText('Lunch').parentElement;
      fireEvent.click(lunchItem);

      // Verify Lunch is selected
      expect(lunchItem).toHaveClass('selected');

      // Change color using slider
      const hueSlider = screen.getByLabelText(/hue/i);
      fireEvent.change(hueSlider, { target: { value: '120' } });

      // Lunch should still be selected
      await waitFor(() => {
        expect(lunchItem).toHaveClass('selected');
        expect(screen.getByText('Color Settings for Lunch')).toBeInTheDocument();
      });
    });
  });

  describe('Color Picker', () => {
    test('should update color via sliders', () => {
      const onChange = jest.fn();
      renderWithAuth(
        <ColorPicker 
          color="#FF0000" 
          opacity={0.8} 
          onChange={onChange} 
        />
      );

      // Change hue
      const hueSlider = screen.getByLabelText(/hue/i);
      fireEvent.change(hueSlider, { target: { value: '240' } });

      expect(onChange).toHaveBeenCalledWith(
        expect.stringMatching(/^#[0-9A-F]{6}$/i),
        0.8
      );

      // Change opacity
      const opacitySlider = screen.getByLabelText(/opacity/i);
      fireEvent.change(opacitySlider, { target: { value: '0.5' } });

      expect(onChange).toHaveBeenLastCalledWith(
        expect.any(String),
        0.5
      );
    });

    test('should accept hex input', () => {
      const onChange = jest.fn();
      renderWithAuth(
        <ColorPicker 
          color="#FF0000" 
          opacity={1} 
          onChange={onChange} 
        />
      );

      const hexInput = screen.getByPlaceholderText(/#FFFFFF/i);
      fireEvent.change(hexInput, { target: { value: '#00FF00' } });

      expect(onChange).toHaveBeenCalledWith('#00FF00', 1);
    });

    test('should display correct color values', () => {
      renderWithAuth(
        <ColorPicker 
          color="#FF0000" 
          opacity={0.75} 
        />
      );

      // Check HSL values are displayed
      expect(screen.getByText(/H:/)).toBeInTheDocument();
      expect(screen.getByText(/S:/)).toBeInTheDocument();
      expect(screen.getByText(/L:/)).toBeInTheDocument();

      // Check opacity percentage
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    test('should update meal types in real-time across components', async () => {
      const mockCallback = jest.fn();
      
      // Subscribe to meal types
      subscribeMealTypes(mockCallback);

      // Simulate Firestore update
      const updatedMealTypes = [
        { id: 'breakfast', name: 'Breakfast', color: '#FFD700', opacity: 0.9 }
      ];

      onSnapshot.mockImplementation((collection, onNext) => {
        onNext({
          empty: false,
          docs: updatedMealTypes.map(mt => ({
            id: mt.id,
            data: () => mt
          }))
        });
        return jest.fn();
      });

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'breakfast',
              color: '#FFD700'
            })
          ])
        );
      });
    });
  });

  describe('UI Consistency and User Experience', () => {
    test('should show loading states appropriately', async () => {
      // Mock slow loading
      getDocs.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
        docs: []
      }), 1000)));

      renderWithAuth(<AllergyManager eventId="test-event" />);

      // Should show loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for load to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });

    test('should display error messages appropriately', async () => {
      setDoc.mockRejectedValueOnce(new Error('Network error'));

      renderWithAuth(<MealTypeSettings />);

      // Try to add a meal type
      const input = screen.getByPlaceholderText(/enter meal type name/i);
      fireEvent.change(input, { target: { value: 'Dinner' } });

      const addButton = screen.getByText(/add$/i);
      fireEvent.click(addButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to add meal type/i)).toBeInTheDocument();
      });
    });

    test('should have consistent button styles and interactions', () => {
      renderWithAuth(<AllergyManager eventId="test-event" />);

      // Check primary buttons
      const primaryButtons = screen.getAllByRole('button', { name: /add|save/i });
      primaryButtons.forEach(button => {
        expect(button).toHaveClass('btn');
        expect(button).toHaveClass('btn-primary');
      });

      // Check cancel/secondary buttons
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      cancelButtons.forEach(button => {
        expect(button).toHaveClass('btn');
        expect(button).toHaveClass('btn-secondary');
      });
    });

    test('should maintain form state during interactions', async () => {
      renderWithAuth(<DietForm onSave={() => {}} onCancel={() => {}} />);

      // Fill in form
      const nameInput = screen.getByLabelText(/guest name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Guest' } });

      const notesInput = screen.getByLabelText(/notes/i);
      fireEvent.change(notesInput, { target: { value: 'Special requirements' } });

      // Toggle some checkboxes
      const veganCheckbox = screen.getByLabelText(/vegan/i);
      fireEvent.click(veganCheckbox);

      // Values should persist
      expect(nameInput.value).toBe('Test Guest');
      expect(notesInput.value).toBe('Special requirements');
      expect(veganCheckbox.checked).toBe(true);
    });
  });
});