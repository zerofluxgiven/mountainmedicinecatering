import React from 'react';
import { render } from '@testing-library/react';

// Basic smoke test to verify testing setup
describe('Testing Setup', () => {
  test('basic arithmetic', () => {
    expect(2 + 2).toBe(4);
  });

  test('React Testing Library is working', () => {
    const TestComponent = () => <div>Test</div>;
    const { container } = render(<TestComponent />);
    
    expect(container.textContent).toBe('Test');
  });
});