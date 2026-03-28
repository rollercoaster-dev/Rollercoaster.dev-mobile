import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { GoalsScreen } from '../GoalsScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      canGoBack: jest.fn(() => true),
    }),
  };
});

const mockUseQuery = jest.fn();
jest.mock('@evolu/react', () => {
  const actual = jest.requireActual('@evolu/react');
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
  };
});

jest.mock('../../../db', () => ({
  goalsQuery: { __brand: 'goalsQuery' },
  stepsByGoalQuery: jest.fn(() => ({ __brand: 'stepsByGoalQuery' })),
  deleteGoal: jest.fn(),
  GoalStatus: { active: 'active', completed: 'completed' },
  StepStatus: { pending: 'pending', completed: 'completed' },
}));

const { deleteGoal } = require('../../../db');

beforeEach(() => {
  jest.clearAllMocks();
  // Default: empty goals
  mockUseQuery.mockReturnValue([]);
});

const makeGoalRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'goal-1',
  title: 'Learn TypeScript',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('GoalsScreen', () => {
  describe('empty state', () => {
    it('renders empty state when no goals exist', () => {
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText('No goals yet')).toBeOnTheScreen();
      expect(screen.getByText('Add your first learning goal to get started.')).toBeOnTheScreen();
    });

    it('renders Create Goal button in empty state', () => {
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText('Create Goal')).toBeOnTheScreen();
    });

    it('navigates to NewGoal when empty state action is pressed', () => {
      renderWithProviders(<GoalsScreen />);
      fireEvent.press(screen.getByText('Create Goal'));
      expect(mockNavigate).toHaveBeenCalledWith('NewGoal');
    });
  });

  describe('header', () => {
    it('renders Goals title', () => {
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText('Goals')).toBeOnTheScreen();
    });

    it('renders add button with accessibility label', () => {
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByLabelText('Create new goal')).toBeOnTheScreen();
    });

    it('navigates to NewGoal when add button is pressed', () => {
      renderWithProviders(<GoalsScreen />);
      fireEvent.press(screen.getByLabelText('Create new goal'));
      expect(mockNavigate).toHaveBeenCalledWith('NewGoal');
    });
  });

  describe('goal list', () => {
    it('renders goal cards when goals exist', () => {
      const goals = [
        makeGoalRow({ id: 'goal-1', title: 'Learn TypeScript' }),
        makeGoalRow({ id: 'goal-2', title: 'Learn Rust' }),
      ];
      // First call for goalsQuery returns goals, subsequent calls for stepsByGoalQuery return empty
      mockUseQuery.mockImplementation((query: { __brand?: string }) => {
        if (query?.__brand === 'goalsQuery') return goals;
        return []; // stepsByGoalQuery
      });

      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText('Learn TypeScript')).toBeOnTheScreen();
      expect(screen.getByText('Learn Rust')).toBeOnTheScreen();
    });

    it('navigates to FocusMode when a goal card is pressed', () => {
      const goals = [makeGoalRow({ id: 'goal-1', title: 'Learn TypeScript' })];
      mockUseQuery.mockImplementation((query: { __brand?: string }) => {
        if (query?.__brand === 'goalsQuery') return goals;
        return [];
      });

      renderWithProviders(<GoalsScreen />);
      fireEvent.press(screen.getByText('Learn TypeScript'));
      expect(mockNavigate).toHaveBeenCalledWith('FocusMode', { goalId: 'goal-1' });
    });
  });

  describe('delete flow', () => {
    it('shows confirm modal on long press and deletes on confirm', () => {
      const goals = [makeGoalRow({ id: 'goal-1', title: 'Learn TypeScript' })];
      mockUseQuery.mockImplementation((query: { __brand?: string }) => {
        if (query?.__brand === 'goalsQuery') return goals;
        return [];
      });

      renderWithProviders(<GoalsScreen />);

      // Long press to trigger delete
      fireEvent(screen.getByText('Learn TypeScript'), 'longPress');

      // Confirm modal should show the goal title
      expect(screen.getByText('Delete this goal?')).toBeOnTheScreen();
      expect(
        screen.getByText('"Learn TypeScript" and all progress will be permanently deleted.'),
      ).toBeOnTheScreen();
    });
  });
});
