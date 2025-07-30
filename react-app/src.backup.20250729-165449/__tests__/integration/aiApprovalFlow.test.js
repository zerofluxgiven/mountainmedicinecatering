import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIChat from '../../components/AI/AIChat';
import { aiActionServiceEnhanced } from '../../services/aiActionServiceEnhanced';
import { aiActionService } from '../../services/aiActionService';

// Mock dependencies
jest.mock('../../services/aiMonitor');
jest.mock('../../services/aiActionService');
jest.mock('../../services/aiActionServiceEnhanced');
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: { 
      uid: 'test-user-123',
      getIdToken: jest.fn().mockResolvedValue('fake-token')
    }
  },
  db: {},
  functions: {}
}));

// Mock fetch for AI responses
global.fetch = jest.fn();

describe('AI Approval Flow Integration', () => {
  const user = userEvent.setup();
  
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    
    // Setup default fetch response
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ 
        response: "I'll help you with that! Let me process your request." 
      })
    });
  });

  test('complete recipe import flow with approval', async () => {
    // Mock the enhanced service to trigger approval
    let approvalCallback;
    aiActionServiceEnhanced.setApprovalCallback = jest.fn((cb) => {
      approvalCallback = cb;
    });
    
    aiActionServiceEnhanced.importRecipeFromUrlWithApproval = jest.fn(async (url) => {
      // Trigger approval dialog
      const action = {
        type: 'create_recipe',
        aiMessage: 'I found a delicious Chocolate Lava Cake recipe! Let me import it for you.',
        data: {
          recipe: {
            name: 'Chocolate Lava Cake',
            servings: 8,
            ingredients: [
              { item: 'dark chocolate', amount: '200', unit: 'g' },
              { item: 'butter', amount: '100', unit: 'g' },
              { item: 'eggs', amount: '4', unit: '' }
            ],
            instructions: ['Melt chocolate', 'Mix ingredients', 'Bake'],
            source_url: url
          }
        }
      };
      
      return new Promise((resolve, reject) => {
        approvalCallback({
          ...action,
          actionId: 'action_123'
        });
        
        // Store resolve/reject for later
        aiActionServiceEnhanced.handleApproval = jest.fn((actionId, approved) => {
          if (approved) {
            resolve({ success: true, recipe: action.data.recipe });
          } else {
            reject(new Error('Recipe import cancelled'));
          }
        });
      });
    });

    const { container } = render(<AIChat context={{ type: 'dashboard' }} />);

    // Open chat
    const chatButton = screen.getByLabelText('Open AI Assistant');
    fireEvent.click(chatButton);

    // Type recipe URL
    const input = screen.getByPlaceholderText('Type your culinary conundrum here...');
    await user.type(input, 'https://example.com/recipe/chocolate-lava-cake');
    
    // Send message
    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    // Wait for approval dialog
    await waitFor(() => {
      expect(screen.getByText('🤖 AI Action Approval Required')).toBeInTheDocument();
    });

    // Verify dialog content
    expect(screen.getByText('Create New Recipe')).toBeInTheDocument();
    expect(screen.getByText('Chocolate Lava Cake')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument(); // servings
    expect(screen.getByText('3 items')).toBeInTheDocument(); // ingredients
    expect(screen.getByText('3 steps')).toBeInTheDocument(); // instructions
    
    // Click approve
    const approveButton = screen.getByText('✅ Approve & Execute');
    fireEvent.click(approveButton);

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/Successfully imported "Chocolate Lava Cake"!/)).toBeInTheDocument();
    });

    // Verify approval dialog is gone
    expect(screen.queryByText('🤖 AI Action Approval Required')).not.toBeInTheDocument();
  });

  test('recipe import flow with rejection', async () => {
    let approvalCallback;
    let rejectFunction;
    
    aiActionServiceEnhanced.setApprovalCallback = jest.fn((cb) => {
      approvalCallback = cb;
    });
    
    aiActionServiceEnhanced.importRecipeFromUrlWithApproval = jest.fn(() => {
      return new Promise((resolve, reject) => {
        approvalCallback({
          type: 'create_recipe',
          aiMessage: 'Found a recipe to import',
          data: { recipe: { name: 'Test Recipe' } },
          actionId: 'action_456'
        });
        
        rejectFunction = reject;
        aiActionServiceEnhanced.handleApproval = jest.fn((actionId, approved) => {
          if (!approved) {
            reject(new Error('Recipe import cancelled'));
          }
        });
      });
    });

    render(<AIChat context={{ type: 'dashboard' }} />);

    // Open chat and send URL
    fireEvent.click(screen.getByLabelText('Open AI Assistant'));
    await user.type(screen.getByPlaceholderText('Type your culinary conundrum here...'), 'https://example.com/recipe');
    fireEvent.click(screen.getByText('Send'));

    // Wait for approval dialog
    await waitFor(() => {
      expect(screen.getByText('🤖 AI Action Approval Required')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByText('❌ Cancel');
    fireEvent.click(cancelButton);

    // Wait for cancellation message
    await waitFor(() => {
      expect(screen.getByText(/No worries! Import cancelled/)).toBeInTheDocument();
    });
  });

  test('modify action flow', async () => {
    let approvalCallback;
    
    aiActionServiceEnhanced.setApprovalCallback = jest.fn((cb) => {
      approvalCallback = cb;
    });
    
    aiActionServiceEnhanced.scaleRecipeWithApproval = jest.fn(() => {
      return new Promise((resolve, reject) => {
        approvalCallback({
          type: 'scale_recipe',
          aiMessage: 'I\'ll scale this recipe for you',
          data: {
            recipeName: 'Pasta Primavera',
            originalServings: 4,
            newServings: 20,
            scaleFactor: 5
          },
          actionId: 'action_789'
        });
        
        aiActionServiceEnhanced.handleApproval = jest.fn((actionId, approved) => {
          if (!approved) {
            reject(new Error('Action rejected by user'));
          }
        });
      });
    });

    render(<AIChat context={{ type: 'recipes' }} />);

    // Trigger a scale action (mock the flow)
    aiActionServiceEnhanced.scaleRecipeWithApproval('recipe123', 20);

    // Wait for approval dialog
    await waitFor(() => {
      expect(screen.getByText('🤖 AI Action Approval Required')).toBeInTheDocument();
    });

    // Click modify
    const modifyButton = screen.getByText('✏️ Let me modify this');
    fireEvent.click(modifyButton);

    // Should see modification prompt
    await waitFor(() => {
      expect(screen.getByText(/Tell me what you'd like to change/)).toBeInTheDocument();
    });
  });

  test('multiple sequential approvals', async () => {
    let approvalCallback;
    let pendingActions = [];
    
    aiActionServiceEnhanced.setApprovalCallback = jest.fn((cb) => {
      approvalCallback = cb;
    });
    
    aiActionServiceEnhanced.executeBatchOperationsWithApproval = jest.fn(() => {
      // Queue up multiple approval requests
      const actions = [
        {
          type: 'create_recipe',
          aiMessage: 'Creating appetizer recipe',
          data: { recipe: { name: 'Bruschetta' } },
          actionId: 'batch_1'
        },
        {
          type: 'create_recipe', 
          aiMessage: 'Creating main course recipe',
          data: { recipe: { name: 'Lasagna' } },
          actionId: 'batch_2'
        }
      ];
      
      // Show batch approval first
      approvalCallback({
        type: 'batch_operation',
        aiMessage: 'I\'ll create multiple recipes for your event',
        data: {
          operations: [
            { type: 'create_recipe', description: 'Create appetizer' },
            { type: 'create_recipe', description: 'Create main course' }
          ]
        },
        actionId: 'batch_main'
      });
      
      return new Promise((resolve) => {
        aiActionServiceEnhanced.handleApproval = jest.fn((actionId, approved) => {
          if (actionId === 'batch_main' && approved) {
            resolve([
              { success: true, result: { recipeId: 'app123' } },
              { success: true, result: { recipeId: 'main456' } }
            ]);
          }
        });
      });
    });

    render(<AIChat context={{ type: 'events' }} />);

    // Trigger batch operation
    aiActionServiceEnhanced.executeBatchOperationsWithApproval([]);

    // First approval dialog
    await waitFor(() => {
      expect(screen.getByText('Batch Operation')).toBeInTheDocument();
      expect(screen.getByText('⚠️ This will perform 2 operations')).toBeInTheDocument();
    });

    // Approve batch
    fireEvent.click(screen.getByText('✅ Approve & Execute'));

    // Verify batch completion
    await waitFor(() => {
      expect(screen.queryByText('Batch Operation')).not.toBeInTheDocument();
    });
  });

  test('approval dialog prevents background interaction', async () => {
    let approvalCallback;
    
    aiActionServiceEnhanced.setApprovalCallback = jest.fn((cb) => {
      approvalCallback = cb;
    });

    render(<AIChat context={{ type: 'dashboard' }} />);

    // Open chat
    fireEvent.click(screen.getByLabelText('Open AI Assistant'));

    // Trigger approval
    approvalCallback({
      type: 'create_recipe',
      aiMessage: 'Test',
      data: { recipe: { name: 'Test' } },
      actionId: 'test_123'
    });

    // Try to interact with chat input while dialog is open
    const input = screen.getByPlaceholderText('Type your culinary conundrum here...');
    await user.type(input, 'This should not work');

    // Input should still be empty (dialog blocks interaction)
    expect(input.value).toBe('');
  });
});