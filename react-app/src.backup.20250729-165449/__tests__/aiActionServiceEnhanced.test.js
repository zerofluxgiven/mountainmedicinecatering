import { aiActionServiceEnhanced } from '../services/aiActionServiceEnhanced';
import { aiActionService } from '../services/aiActionService';
import { doc, getDoc, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { auth } from '../config/firebase';

// Mock dependencies
jest.mock('../config/firebase');
jest.mock('firebase/firestore');
jest.mock('../services/aiActionService');
jest.mock('../services/pdfGenerator');

describe('AIActionServiceEnhanced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    aiActionServiceEnhanced.pendingActions.clear();
  });

  describe('Approval Flow', () => {
    test('requestApproval creates pending action and calls callback', async () => {
      const mockCallback = jest.fn();
      aiActionServiceEnhanced.setApprovalCallback(mockCallback);

      const action = {
        type: 'create_recipe',
        aiMessage: 'Creating recipe',
        data: { recipe: { name: 'Test Recipe' } }
      };

      const promise = aiActionServiceEnhanced.requestApproval(action);

      // Callback should be called immediately
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          ...action,
          actionId: expect.stringMatching(/^action_\d+$/)
        })
      );

      // Should have pending action
      expect(aiActionServiceEnhanced.pendingActions.size).toBe(1);

      // Simulate approval
      const [[pendingAction]] = mockCallback.mock.calls;
      aiActionServiceEnhanced.handleApproval(pendingAction.actionId, true);

      await expect(promise).resolves.toBe(true);
      expect(aiActionServiceEnhanced.pendingActions.size).toBe(0);
    });

    test('requestApproval rejects when no callback set', async () => {
      aiActionServiceEnhanced.onApprovalRequired = null;

      const action = {
        type: 'create_recipe',
        data: {}
      };

      await expect(aiActionServiceEnhanced.requestApproval(action))
        .rejects.toThrow('No approval handler set');
    });

    test('handleApproval with rejection', async () => {
      const mockCallback = jest.fn();
      aiActionServiceEnhanced.setApprovalCallback(mockCallback);

      const action = { type: 'test', data: {} };
      const promise = aiActionServiceEnhanced.requestApproval(action);

      const [[pendingAction]] = mockCallback.mock.calls;
      aiActionServiceEnhanced.handleApproval(pendingAction.actionId, false);

      await expect(promise).rejects.toThrow('Action rejected by user');
    });
  });

  describe('Parse User Intent', () => {
    test('detects create recipe intent', async () => {
      const result = await aiActionServiceEnhanced.parseUserIntent('create a new recipe for pasta');
      expect(result.intent).toBe('createRecipe');
    });

    test('detects import recipe intent', async () => {
      const result = await aiActionServiceEnhanced.parseUserIntent('import recipe from this website');
      expect(result.intent).toBe('importRecipe');
    });

    test('detects scale recipe intent', async () => {
      const result = await aiActionServiceEnhanced.parseUserIntent('scale this recipe to 50 servings');
      expect(result.intent).toBe('scaleRecipe');
    });

    test('detects shopping list intent', async () => {
      const result = await aiActionServiceEnhanced.parseUserIntent('generate shopping list for the event');
      expect(result.intent).toBe('shoppingList');
    });

    test('returns unknown for unmatched intent', async () => {
      const result = await aiActionServiceEnhanced.parseUserIntent('do something random');
      expect(result.intent).toBe('unknown');
    });
  });

  describe('Create Recipe with Approval', () => {
    test('creates recipe after approval', async () => {
      const mockCallback = jest.fn();
      aiActionServiceEnhanced.setApprovalCallback(mockCallback);
      
      const mockResult = { success: true, recipeId: 'new_recipe_123' };
      aiActionService.createRecipe.mockResolvedValue(mockResult);

      const recipeData = {
        name: 'Test Recipe',
        servings: 4,
        ingredients: [{ item: 'flour', amount: '2', unit: 'cups' }],
        instructions: ['Mix ingredients', 'Bake']
      };

      const createPromise = aiActionServiceEnhanced.createRecipeWithApproval(
        recipeData,
        { source: 'test' }
      );

      // Verify approval dialog data
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'create_recipe',
          aiMessage: expect.stringContaining('Test Recipe'),
          data: {
            recipe: recipeData,
            source_url: undefined
          }
        })
      );

      // Simulate approval
      const [[pendingAction]] = mockCallback.mock.calls;
      aiActionServiceEnhanced.handleApproval(pendingAction.actionId, true);

      const result = await createPromise;
      expect(result).toEqual(mockResult);
      expect(aiActionService.createRecipe).toHaveBeenCalledWith(
        recipeData,
        { source: 'test' }
      );
    });

    test('cancels recipe creation on rejection', async () => {
      const mockCallback = jest.fn();
      aiActionServiceEnhanced.setApprovalCallback(mockCallback);

      const createPromise = aiActionServiceEnhanced.createRecipeWithApproval({
        name: 'Test Recipe'
      });

      const [[pendingAction]] = mockCallback.mock.calls;
      aiActionServiceEnhanced.handleApproval(pendingAction.actionId, false);

      await expect(createPromise).rejects.toThrow('Recipe creation cancelled');
      expect(aiActionService.createRecipe).not.toHaveBeenCalled();
    });
  });

  describe('Scale Recipe with Approval', () => {
    test('scales recipe with preview', async () => {
      const mockCallback = jest.fn();
      aiActionServiceEnhanced.setApprovalCallback(mockCallback);

      // Mock Firestore
      const mockRecipe = {
        name: 'Original Recipe',
        servings: 4,
        ingredients: [
          { item: 'flour', amount: '2', unit: 'cups' }
        ]
      };

      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'recipe123',
        data: () => mockRecipe
      });

      addDoc.mockResolvedValue({ id: 'scaled_recipe_123' });

      const scalePromise = aiActionServiceEnhanced.scaleRecipeWithApproval(
        'recipe123',
        20
      );

      // Check approval dialog shows scaling details
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'scale_recipe',
          aiMessage: expect.stringContaining('4 servings to 20 servings'),
          data: expect.objectContaining({
            recipeName: 'Original Recipe',
            originalServings: 4,
            newServings: 20,
            scaleFactor: 5
          })
        })
      );

      // Simulate approval
      const [[pendingAction]] = mockCallback.mock.calls;
      aiActionServiceEnhanced.handleApproval(pendingAction.actionId, true);

      const result = await scalePromise;
      expect(result.success).toBe(true);
      expect(result.recipeId).toBe('scaled_recipe_123');
      
      // Verify scaled recipe was created
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Original Recipe (20 servings)',
          servings: 20,
          original_recipe_id: 'recipe123'
        })
      );
    });

    test('handles recipe not found', async () => {
      getDoc.mockResolvedValue({
        exists: () => false
      });

      await expect(
        aiActionServiceEnhanced.scaleRecipeWithApproval('invalid_id', 10)
      ).rejects.toThrow('Recipe not found');
    });
  });

  describe('Batch Operations', () => {
    test('executes batch operations in sequence', async () => {
      const mockCallback = jest.fn();
      aiActionServiceEnhanced.setApprovalCallback(mockCallback);

      const operations = [
        {
          type: 'create_recipe',
          description: 'Create appetizer',
          data: { name: 'Appetizer' },
          context: {}
        },
        {
          type: 'update_recipe',
          description: 'Update main course',
          recipeId: 'recipe123',
          updates: { servings: 10 },
          context: {}
        }
      ];

      aiActionService.createRecipe.mockResolvedValue({ success: true, recipeId: 'app123' });
      aiActionService.updateRecipe.mockResolvedValue({ success: true });

      const batchPromise = aiActionServiceEnhanced.executeBatchOperationsWithApproval(operations);

      // Verify approval shows all operations
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'batch_operation',
          data: {
            operations: [
              { type: 'create_recipe', description: 'Create appetizer' },
              { type: 'update_recipe', description: 'Update main course' }
            ]
          }
        })
      );

      // Approve
      const [[pendingAction]] = mockCallback.mock.calls;
      aiActionServiceEnhanced.handleApproval(pendingAction.actionId, true);

      const results = await batchPromise;
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ success: true, result: { success: true, recipeId: 'app123' } });
      expect(results[1]).toEqual({ success: true, result: { success: true } });
    });

    test('continues batch on individual operation failure', async () => {
      const mockCallback = jest.fn();
      aiActionServiceEnhanced.setApprovalCallback(mockCallback);

      const operations = [
        { type: 'create_recipe', data: {}, context: {} },
        { type: 'unknown_operation', data: {} }
      ];

      aiActionService.createRecipe.mockResolvedValue({ success: true });

      const batchPromise = aiActionServiceEnhanced.executeBatchOperationsWithApproval(operations);

      const [[pendingAction]] = mockCallback.mock.calls;
      aiActionServiceEnhanced.handleApproval(pendingAction.actionId, true);

      const results = await batchPromise;
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Unknown operation type');
    });
  });

  describe('Event and Menu Operations', () => {
    test('creates event with validation', async () => {
      const mockCallback = jest.fn();
      aiActionServiceEnhanced.setApprovalCallback(mockCallback);

      auth.currentUser = { uid: 'user123' };
      addDoc.mockResolvedValue({ id: 'event123' });

      const eventData = {
        name: 'Summer Retreat',
        start_date: '2024-08-15',
        end_date: '2024-08-18',
        guest_count: 50,
        location: 'Mountain Lodge'
      };

      const eventPromise = aiActionServiceEnhanced.createEventWithApproval(eventData);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'create_event',
          aiMessage: expect.stringContaining('4-day event'),
          data: { event: eventData }
        })
      );

      const [[pendingAction]] = mockCallback.mock.calls;
      aiActionServiceEnhanced.handleApproval(pendingAction.actionId, true);

      const result = await eventPromise;
      expect(result.success).toBe(true);
      expect(result.eventId).toBe('event123');
    });

    test('manages allergies with safety trigger', async () => {
      const mockCallback = jest.fn();
      aiActionServiceEnhanced.setApprovalCallback(mockCallback);

      const mockEvent = {
        name: 'Test Event',
        allergens: ['gluten', 'dairy']
      };

      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockEvent
      });

      updateDoc.mockResolvedValue();

      const allergyPromise = aiActionServiceEnhanced.manageAllergiesWithApproval(
        'event123',
        { add: ['nuts', 'shellfish'] }
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'manage_allergies',
          data: {
            eventId: 'event123',
            eventName: 'Test Event',
            add: ['nuts', 'shellfish']
          }
        })
      );

      const [[pendingAction]] = mockCallback.mock.calls;
      aiActionServiceEnhanced.handleApproval(pendingAction.actionId, true);

      const result = await allergyPromise;
      expect(result.success).toBe(true);
      expect(result.allergens).toEqual(['gluten', 'dairy', 'nuts', 'shellfish']);
    });
  });
});