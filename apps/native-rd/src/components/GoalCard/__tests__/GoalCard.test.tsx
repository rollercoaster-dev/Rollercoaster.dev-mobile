import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { GoalCard, type GoalCardGoal } from '../GoalCard';

const makeGoal = (overrides?: Partial<GoalCardGoal>): GoalCardGoal => ({
  id: '1',
  title: 'Learn TypeScript',
  status: 'active',
  stepsTotal: 5,
  stepsCompleted: 2,
  ...overrides,
});

describe('GoalCard', () => {
  it('renders progress bar and step label when stepsTotal > 0', () => {
    renderWithProviders(<GoalCard goal={makeGoal()} />);
    expect(screen.getByText('2/5 steps')).toBeOnTheScreen();
  });

  it('hides progress bar and step label when stepsTotal is 0', () => {
    renderWithProviders(
      <GoalCard goal={makeGoal({ stepsTotal: 0, stepsCompleted: 0 })} />,
    );
    expect(screen.queryByText(/steps/)).toBeNull();
  });

  it('composes accessibilityLabel from goal data', () => {
    const onPress = jest.fn();
    renderWithProviders(<GoalCard goal={makeGoal()} onPress={onPress} />);
    expect(
      screen.getByLabelText('Learn TypeScript, 2 of 5 steps completed, active'),
    ).toBeOnTheScreen();
  });

  it('forwards onPress to the underlying Card', () => {
    const onPress = jest.fn();
    renderWithProviders(<GoalCard goal={makeGoal()} onPress={onPress} />);
    fireEvent.press(
      screen.getByLabelText('Learn TypeScript, 2 of 5 steps completed, active'),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('forwards onLongPress to the underlying Card', () => {
    const onLongPress = jest.fn();
    const onPress = jest.fn();
    renderWithProviders(
      <GoalCard goal={makeGoal()} onPress={onPress} onLongPress={onLongPress} />,
    );
    fireEvent(
      screen.getByLabelText('Learn TypeScript, 2 of 5 steps completed, active'),
      'onLongPress',
    );
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('omits accessibilityLabel when onPress is not provided', () => {
    renderWithProviders(<GoalCard goal={makeGoal()} />);
    expect(
      screen.queryByLabelText('Learn TypeScript, 2 of 5 steps completed, active'),
    ).toBeNull();
  });

  describe('statusVariant mapping', () => {
    it('shows "Done" badge for completed goals', () => {
      renderWithProviders(
        <GoalCard goal={makeGoal({ status: 'completed' })} />,
      );
      expect(screen.getByText('Done')).toBeOnTheScreen();
    });

    it('shows "Active" badge for active goals', () => {
      renderWithProviders(<GoalCard goal={makeGoal({ status: 'active' })} />);
      expect(screen.getByText('Active')).toBeOnTheScreen();
    });
  });
});
