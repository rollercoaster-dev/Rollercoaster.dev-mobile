import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { MiniTimeline, type MiniTimelineStep, type StepStatus } from '../MiniTimeline';

const defaultProps = {
  currentIndex: 0,
  onStepTap: jest.fn(),
  onTimelineTap: jest.fn(),
};

const makeSteps = (...statuses: StepStatus[]): MiniTimelineStep[] =>
  statuses.map((status) => ({ status }));

describe('MiniTimeline', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('rendering', () => {
    it('renders correct number of step + goal nodes', () => {
      renderWithProviders(
        <MiniTimeline
          steps={makeSteps('completed', 'in-progress', 'pending')}
          {...defaultProps}
        />,
      );
      // 3 step nodes + 1 goal node + 1 hint area = 5 buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);
    });

    it('renders hint text', () => {
      renderWithProviders(
        <MiniTimeline steps={makeSteps('pending')} {...defaultProps} />,
      );
      expect(screen.getByText('Tap to expand timeline')).toBeOnTheScreen();
    });

    it('renders goal node', () => {
      renderWithProviders(
        <MiniTimeline steps={makeSteps('pending')} {...defaultProps} />,
      );
      expect(screen.getByLabelText('Goal evidence')).toBeOnTheScreen();
    });
  });

  describe('interactions', () => {
    it('calls onStepTap with correct index when node pressed', () => {
      const onStepTap = jest.fn();
      renderWithProviders(
        <MiniTimeline
          steps={makeSteps('completed', 'in-progress', 'pending')}
          {...defaultProps}
          onStepTap={onStepTap}
        />,
      );
      fireEvent.press(screen.getByLabelText('Step 2: in-progress'));
      expect(onStepTap).toHaveBeenCalledWith(1);
    });

    it('calls onStepTap with steps.length when goal node pressed', () => {
      const onStepTap = jest.fn();
      renderWithProviders(
        <MiniTimeline
          steps={makeSteps('completed', 'pending')}
          {...defaultProps}
          onStepTap={onStepTap}
        />,
      );
      fireEvent.press(screen.getByLabelText('Goal evidence'));
      expect(onStepTap).toHaveBeenCalledWith(2);
    });

    it('calls onTimelineTap when hint area pressed', () => {
      const onTimelineTap = jest.fn();
      renderWithProviders(
        <MiniTimeline
          steps={makeSteps('pending')}
          {...defaultProps}
          onTimelineTap={onTimelineTap}
        />,
      );
      fireEvent.press(
        screen.getByLabelText('Step progress timeline \u2014 tap to expand'),
      );
      expect(onTimelineTap).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it.each([
      ['completed', 'Step 1: completed'],
      ['in-progress', 'Step 1: in-progress'],
      ['pending', 'Step 1: pending'],
    ] satisfies [StepStatus, string][])(
      'step node has correct label for %s status',
      (status, expectedLabel) => {
        renderWithProviders(
          <MiniTimeline
            steps={makeSteps(status)}
            {...defaultProps}
          />,
        );
        expect(screen.getByLabelText(expectedLabel)).toBeOnTheScreen();
      },
    );

    it('hint area has accessible role and label', () => {
      renderWithProviders(
        <MiniTimeline steps={makeSteps('pending')} {...defaultProps} />,
      );
      const hintArea = screen.getByLabelText(
        'Step progress timeline \u2014 tap to expand',
      );
      expect(hintArea).toBeOnTheScreen();
      expect(hintArea.props.accessibilityRole).toBe('button');
    });

    it('hint area has accessibility hint', () => {
      renderWithProviders(
        <MiniTimeline steps={makeSteps('pending')} {...defaultProps} />,
      );
      const hintArea = screen.getByLabelText(
        'Step progress timeline \u2014 tap to expand',
      );
      expect(hintArea.props.accessibilityHint).toBe(
        'Opens full timeline view',
      );
    });

    it('supports custom accessibilityLabel', () => {
      renderWithProviders(
        <MiniTimeline
          steps={makeSteps('pending')}
          {...defaultProps}
          accessibilityLabel="Custom label"
        />,
      );
      expect(screen.getByLabelText('Custom label')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('renders only goal node when steps array is empty', () => {
      renderWithProviders(
        <MiniTimeline steps={[]} {...defaultProps} />,
      );
      expect(screen.getByLabelText('Goal evidence')).toBeOnTheScreen();
      // Goal node + hint area = 2 buttons
      expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    it('single step renders correctly', () => {
      renderWithProviders(
        <MiniTimeline
          steps={makeSteps('in-progress')}
          {...defaultProps}
        />,
      );
      expect(screen.getByLabelText('Step 1: in-progress')).toBeOnTheScreen();
      expect(screen.getByLabelText('Goal evidence')).toBeOnTheScreen();
    });
  });
});
