import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { ProgressDots, type ProgressDotsStep, type StepStatus } from '../ProgressDots';

const defaultProps = {
  currentIndex: 0,
  onDotTap: jest.fn(),
};

const makeSteps = (...statuses: StepStatus[]): ProgressDotsStep[] =>
  statuses.map((status) => ({ status }));

describe('ProgressDots', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('rendering', () => {
    it('renders correct number of dots including goal dot', () => {
      renderWithProviders(
        <ProgressDots
          steps={makeSteps('completed', 'in-progress', 'pending')}
          {...defaultProps}
        />,
      );
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4); // 3 step dots + 1 goal dot
    });

    it('renders without goal dot when showGoalDot is false', () => {
      renderWithProviders(
        <ProgressDots
          steps={makeSteps('completed', 'pending')}
          {...defaultProps}
          showGoalDot={false}
        />,
      );
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2); // 2 step dots only
      expect(screen.queryByLabelText('Goal evidence')).toBeNull();
    });

    it('renders goal dot by default', () => {
      renderWithProviders(
        <ProgressDots steps={makeSteps('pending')} {...defaultProps} />,
      );
      expect(screen.getByLabelText('Goal evidence')).toBeOnTheScreen();
    });
  });

  describe('interactions', () => {
    it('calls onDotTap with correct index when step dot pressed', () => {
      const onDotTap = jest.fn();
      renderWithProviders(
        <ProgressDots
          steps={makeSteps('completed', 'in-progress', 'pending')}
          {...defaultProps}
          onDotTap={onDotTap}
        />,
      );
      fireEvent.press(screen.getByLabelText('Step 2: in-progress'));
      expect(onDotTap).toHaveBeenCalledWith(1);
    });

    it('updates selected state after rerender with new currentIndex', () => {
      const onDotTap = jest.fn();
      const steps = makeSteps('completed', 'in-progress', 'pending');
      const { rerender } = renderWithProviders(
        <ProgressDots steps={steps} currentIndex={0} onDotTap={onDotTap} />,
      );

      fireEvent.press(screen.getByLabelText('Step 2: in-progress'));
      expect(onDotTap).toHaveBeenCalledWith(1);

      // Simulate parent updating currentIndex after tap
      rerender(
        <ProgressDots
          steps={makeSteps('completed', 'completed', 'pending')}
          currentIndex={1}
          onDotTap={onDotTap}
        />,
      );

      const step2 = screen.getByLabelText('Step 2: completed');
      expect(step2.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
    });

    it('calls onDotTap with steps.length when goal dot pressed', () => {
      const onDotTap = jest.fn();
      renderWithProviders(
        <ProgressDots
          steps={makeSteps('completed', 'pending')}
          {...defaultProps}
          onDotTap={onDotTap}
        />,
      );
      fireEvent.press(screen.getByLabelText('Goal evidence'));
      expect(onDotTap).toHaveBeenCalledWith(2);
    });
  });

  describe('accessibility', () => {
    it.each([
      ['completed', 'Step 1: completed'],
      ['in-progress', 'Step 1: in-progress'],
      ['pending', 'Step 1: pending'],
    ] satisfies [StepStatus, string][])(
      'step dot has correct label for %s status',
      (status, expectedLabel) => {
        renderWithProviders(
          <ProgressDots steps={makeSteps(status)} {...defaultProps} />,
        );
        expect(screen.getByLabelText(expectedLabel)).toBeOnTheScreen();
      },
    );

    it('current dot has selected state', () => {
      renderWithProviders(
        <ProgressDots
          steps={makeSteps('in-progress', 'pending')}
          currentIndex={0}
          onDotTap={jest.fn()}
        />,
      );
      const currentDot = screen.getByLabelText('Step 1: in-progress');
      expect(currentDot.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
    });

    it('non-current dot does not have selected state', () => {
      renderWithProviders(
        <ProgressDots
          steps={makeSteps('completed', 'pending')}
          currentIndex={0}
          onDotTap={jest.fn()}
        />,
      );
      const otherDot = screen.getByLabelText('Step 2: pending');
      expect(otherDot.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false }),
      );
    });

    it('goal dot has selected state when current', () => {
      renderWithProviders(
        <ProgressDots
          steps={makeSteps('completed', 'completed')}
          currentIndex={2}
          onDotTap={jest.fn()}
        />,
      );
      const goalDot = screen.getByLabelText('Goal evidence');
      expect(goalDot.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
    });

    it('goal dot is not selected when step is current', () => {
      renderWithProviders(
        <ProgressDots
          steps={makeSteps('completed', 'pending')}
          currentIndex={0}
          onDotTap={jest.fn()}
        />,
      );
      const goalDot = screen.getByLabelText('Goal evidence');
      expect(goalDot.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false }),
      );
    });

    it('container has tablist role and label', () => {
      renderWithProviders(
        <ProgressDots steps={makeSteps('pending')} {...defaultProps} />,
      );
      const container = screen.getByLabelText('Step navigation');
      expect(container).toBeOnTheScreen();
      expect(container.props.accessibilityRole).toBe('tablist');
    });
  });

  describe('edge cases', () => {
    it('renders only goal dot when steps array is empty', () => {
      renderWithProviders(
        <ProgressDots steps={[]} {...defaultProps} />,
      );
      expect(screen.getByLabelText('Goal evidence')).toBeOnTheScreen();
      expect(screen.getAllByRole('tab')).toHaveLength(1);
    });

    it('renders nothing when steps empty and goal dot hidden', () => {
      renderWithProviders(
        <ProgressDots steps={[]} {...defaultProps} showGoalDot={false} />,
      );
      expect(screen.queryAllByRole('tab')).toHaveLength(0);
    });
  });
});
