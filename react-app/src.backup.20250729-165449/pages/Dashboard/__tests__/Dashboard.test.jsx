import React from 'react';
import { screen } from '@testing-library/react';
import { render, createMockEvent, createMockRecipe, createMockMenu } from '../../../test-utils/test-utils';
import Dashboard from '../Dashboard';

describe('Dashboard Component', () => {
  const mockAuthValue = {
    currentUser: { email: 'test@example.com', uid: '123' },
    userRole: 'admin',
    loading: false,
  };

  const mockAppValue = {
    selectedEventId: 'evt_123',
    activeEvent: createMockEvent({ 
      id: 'evt_123', 
      name: 'Summer Wedding',
      guest_count: 150 
    }),
    events: [
      createMockEvent({ id: 'evt_1', name: 'Event 1' }),
      createMockEvent({ id: 'evt_2', name: 'Event 2' }),
    ],
    recipes: [
      createMockRecipe({ id: 'rec_1' }),
      createMockRecipe({ id: 'rec_2' }),
      createMockRecipe({ id: 'rec_3' }),
    ],
    menus: [
      createMockMenu({ id: 'menu_1' }),
      createMockMenu({ id: 'menu_2' }),
    ],
    loading: false,
  };

  test('renders welcome message with user email', () => {
    render(<Dashboard />, {
      authValue: mockAuthValue,
      appValue: mockAppValue,
    });

    expect(screen.getByText(/Welcome back, test!/)).toBeInTheDocument();
  });

  test('displays active event name', () => {
    render(<Dashboard />, {
      authValue: mockAuthValue,
      appValue: mockAppValue,
    });

    expect(screen.getByText(/Working on: Summer Wedding/)).toBeInTheDocument();
  });

  test('shows correct statistics', () => {
    render(<Dashboard />, {
      authValue: mockAuthValue,
      appValue: mockAppValue,
    });

    // Check event count
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Check recipe count
    expect(screen.getByText('3')).toBeInTheDocument();
    
    // Check menu count  
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Check guest count
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  test('shows message when no event is selected', () => {
    render(<Dashboard />, {
      authValue: mockAuthValue,
      appValue: {
        ...mockAppValue,
        selectedEventId: null,
        activeEvent: null,
      },
    });

    expect(screen.getByText('Select an event to get started')).toBeInTheDocument();
  });

  test('displays quick action buttons when event is selected', () => {
    render(<Dashboard />, {
      authValue: mockAuthValue,
      appValue: mockAppValue,
    });

    expect(screen.getByText('Add Recipe')).toBeInTheDocument();
    expect(screen.getByText('Create Menu')).toBeInTheDocument();
    expect(screen.getByText('Shopping List')).toBeInTheDocument();
    expect(screen.getByText('Export PDF')).toBeInTheDocument();
  });

  test('shows upcoming events', () => {
    const futureEvent = createMockEvent({
      id: 'evt_future',
      name: 'Christmas Party',
      start_date: new Date('2024-12-25'),
      guest_count: 50,
    });

    render(<Dashboard />, {
      authValue: mockAuthValue,
      appValue: {
        ...mockAppValue,
        events: [...mockAppValue.events, futureEvent],
      },
    });

    expect(screen.getByText('Christmas Party')).toBeInTheDocument();
    expect(screen.getByText(/50 guests/)).toBeInTheDocument();
  });

  test('shows empty state when no upcoming events', () => {
    const pastEvents = mockAppValue.events.map(event => ({
      ...event,
      start_date: new Date('2020-01-01'),
      status: 'completed',
    }));

    render(<Dashboard />, {
      authValue: mockAuthValue,
      appValue: {
        ...mockAppValue,
        events: pastEvents,
      },
    });

    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
  });
});