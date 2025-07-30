import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AIApprovalDialog from '../components/AI/AIApprovalDialog';

describe('AIApprovalDialog', () => {
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders nothing when no action is provided', () => {
    const { container } = render(
      <AIApprovalDialog action={null} onApprove={mockOnApprove} onReject={mockOnReject} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders create recipe action correctly', () => {
    const action = {
      type: 'create_recipe',
      aiMessage: 'I will create a delicious recipe for you!',
      data: {
        recipe: {
          name: 'Chocolate Lava Cake',
          servings: 8,
          ingredients: new Array(12).fill({ item: 'ingredient' }),
          instructions: new Array(6).fill('step'),
          prep_time: '20 minutes',
          cook_time: '15 minutes'
        },
        source_url: 'https://example.com/recipe'
      }
    };

    render(<AIApprovalDialog action={action} onApprove={mockOnApprove} onReject={mockOnReject} />);

    expect(screen.getByText('🤖 AI Action Approval Required')).toBeInTheDocument();
    expect(screen.getByText('I will create a delicious recipe for you!')).toBeInTheDocument();
    expect(screen.getByText('Create New Recipe')).toBeInTheDocument();
    expect(screen.getByText('Chocolate Lava Cake')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('12 items')).toBeInTheDocument();
    expect(screen.getByText('6 steps')).toBeInTheDocument();
    expect(screen.getByText('20 minutes')).toBeInTheDocument();
    expect(screen.getByText('15 minutes')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/recipe')).toBeInTheDocument();
  });

  test('renders scale recipe action correctly', () => {
    const action = {
      type: 'scale_recipe',
      aiMessage: 'Scaling your recipe for a bigger crowd!',
      data: {
        recipeName: 'Pasta Primavera',
        originalServings: 4,
        newServings: 20,
        scaleFactor: 5,
        scaledIngredients: [
          { item: 'pasta', originalAmount: '1', scaledAmount: '5', unit: 'lb' },
          { item: 'tomatoes', originalAmount: '2', scaledAmount: '10', unit: 'cups' }
        ]
      }
    };

    render(<AIApprovalDialog action={action} onApprove={mockOnApprove} onReject={mockOnReject} />);

    expect(screen.getByText('Scale Recipe')).toBeInTheDocument();
    expect(screen.getByText('Pasta Primavera')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('5x')).toBeInTheDocument();
    expect(screen.getByText(/5 lb pasta/)).toBeInTheDocument();
    expect(screen.getByText(/was: 1 lb/)).toBeInTheDocument();
  });

  test('renders batch operation with warning', () => {
    const action = {
      type: 'batch_operation',
      aiMessage: 'Performing multiple operations',
      data: {
        operations: [
          { type: 'create_recipe', description: 'Create appetizer recipe' },
          { type: 'create_menu', description: 'Create event menu' },
          { type: 'add_recipe_to_menu', description: 'Add recipes to menu' }
        ]
      }
    };

    render(<AIApprovalDialog action={action} onApprove={mockOnApprove} onReject={mockOnReject} />);

    expect(screen.getByText('Batch Operation')).toBeInTheDocument();
    expect(screen.getByText('⚠️ This will perform 3 operations')).toBeInTheDocument();
    expect(screen.getByText('create_recipe:')).toBeInTheDocument();
    expect(screen.getByText('Create appetizer recipe')).toBeInTheDocument();
  });

  test('approve button calls onApprove', () => {
    const action = {
      type: 'create_recipe',
      aiMessage: 'Test',
      data: { recipe: { name: 'Test Recipe' } }
    };

    render(<AIApprovalDialog action={action} onApprove={mockOnApprove} onReject={mockOnReject} />);

    const approveBtn = screen.getByText('✅ Approve & Execute');
    fireEvent.click(approveBtn);

    expect(mockOnApprove).toHaveBeenCalledTimes(1);
    expect(mockOnReject).not.toHaveBeenCalled();
  });

  test('cancel button calls onReject', () => {
    const action = {
      type: 'create_recipe',
      aiMessage: 'Test',
      data: { recipe: { name: 'Test Recipe' } }
    };

    render(<AIApprovalDialog action={action} onApprove={mockOnApprove} onReject={mockOnReject} />);

    const cancelBtn = screen.getByText('❌ Cancel');
    fireEvent.click(cancelBtn);

    expect(mockOnReject).toHaveBeenCalledTimes(1);
    expect(mockOnApprove).not.toHaveBeenCalled();
  });

  test('modify button calls onReject with modify reason', () => {
    const action = {
      type: 'create_recipe',
      aiMessage: 'Test',
      data: { recipe: { name: 'Test Recipe' } }
    };

    render(<AIApprovalDialog action={action} onApprove={mockOnApprove} onReject={mockOnReject} />);

    const modifyBtn = screen.getByText('✏️ Let me modify this');
    fireEvent.click(modifyBtn);

    expect(mockOnReject).toHaveBeenCalledWith('modify');
    expect(mockOnApprove).not.toHaveBeenCalled();
  });

  test('renders unknown action type as JSON', () => {
    const action = {
      type: 'unknown_action',
      aiMessage: 'Unknown action',
      data: { foo: 'bar', baz: 42 }
    };

    render(<AIApprovalDialog action={action} onApprove={mockOnApprove} onReject={mockOnReject} />);

    expect(screen.getByText('unknown_action')).toBeInTheDocument();
    expect(screen.getByText(/foo.*bar/)).toBeInTheDocument();
  });

  test('overlay click does not close dialog', () => {
    const action = {
      type: 'create_recipe',
      aiMessage: 'Test',
      data: { recipe: { name: 'Test Recipe' } }
    };

    const { container } = render(
      <AIApprovalDialog action={action} onApprove={mockOnApprove} onReject={mockOnReject} />
    );

    const overlay = container.querySelector('.ai-approval-overlay');
    fireEvent.click(overlay);

    // Dialog should still be visible
    expect(screen.getByText('🤖 AI Action Approval Required')).toBeInTheDocument();
    
    // No callbacks should be triggered
    expect(mockOnApprove).not.toHaveBeenCalled();
    expect(mockOnReject).not.toHaveBeenCalled();
  });
});