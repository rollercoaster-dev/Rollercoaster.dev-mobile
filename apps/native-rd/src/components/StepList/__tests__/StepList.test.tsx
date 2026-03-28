import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { StepList, type Step } from '../StepList';

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: { Pan: () => ({ onStart: () => ({}), onUpdate: () => ({}), onEnd: () => ({}) }) },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('../../../utils/haptics', () => ({
  triggerDragStart: jest.fn(),
  triggerDragDrop: jest.fn(),
}));

jest.mock('../../../hooks/useAnimationPref', () => ({
  useAnimationPref: () => ({
    animationPref: 'full',
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  }),
}));

const mockSteps: Step[] = [
  { id: '1', title: 'Step one', completed: false },
  { id: '2', title: 'Step two', completed: true },
];

describe('StepList', () => {
  it('renders steps with header and count', () => {
    renderWithProviders(
      <StepList steps={mockSteps} />,
    );
    expect(screen.getByText('Steps')).toBeOnTheScreen();
    expect(screen.getByText('2 steps')).toBeOnTheScreen();
    expect(screen.getByText('Step one')).toBeOnTheScreen();
    expect(screen.getByText('Step two')).toBeOnTheScreen();
  });

  it('renders singular step count for one step', () => {
    renderWithProviders(
      <StepList steps={[{ id: '1', title: 'Only step', completed: false }]} />,
    );
    expect(screen.getByText('1 step')).toBeOnTheScreen();
  });

  it('renders drag handles for each step', () => {
    renderWithProviders(
      <StepList steps={mockSteps} />,
    );
    const handles = screen.getAllByText('≡', { includeHiddenElements: true });
    expect(handles).toHaveLength(mockSteps.length);
  });

  it('shows add step input and button when onCreateStep is provided', () => {
    renderWithProviders(
      <StepList
        steps={mockSteps}
        onCreateStep={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Add a new step')).toBeOnTheScreen();
    expect(screen.getByLabelText('Add step')).toBeOnTheScreen();
  });

  it('calls onCreateStep when add step button is pressed', () => {
    const onCreate = jest.fn();
    renderWithProviders(
      <StepList
        steps={mockSteps}
        onCreateStep={onCreate}
      />,
    );
    const addInput = screen.getByLabelText('Add a new step');
    fireEvent.changeText(addInput, 'New step');
    fireEvent.press(screen.getByLabelText('Add step'));
    expect(onCreate).toHaveBeenCalledWith('New step', ['text']);
  });

  it('renders delete buttons when onDeleteStep is provided', () => {
    renderWithProviders(
      <StepList
        steps={mockSteps}
        onDeleteStep={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Delete "Step one"')).toBeOnTheScreen();
    expect(screen.getByLabelText('Delete "Step two"')).toBeOnTheScreen();
  });
});
