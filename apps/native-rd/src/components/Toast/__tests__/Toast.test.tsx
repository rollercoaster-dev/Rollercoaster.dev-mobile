import React from 'react';
import { render } from '@testing-library/react-native';
import { renderWithProviders, screen, fireEvent, act } from '../../../__tests__/test-utils';
import { Toast } from '../Toast';
import { ToastProvider, useToast } from '../ToastContext';
import { Pressable, Text } from 'react-native';

jest.mock('../../../hooks/useAnimationPref', () => ({
  useAnimationPref: () => ({
    animationPref: 'none',
    shouldAnimate: false,
    shouldReduceMotion: true,
    setAnimationPref: jest.fn(),
  }),
}));

describe('Toast', () => {
  it('renders message when visible', () => {
    renderWithProviders(
      <Toast visible message="Item deleted" />,
    );
    expect(screen.getByText('Item deleted')).toBeOnTheScreen();
  });

  it('does not render when not visible', () => {
    renderWithProviders(
      <Toast visible={false} message="Item deleted" />,
    );
    expect(screen.queryByText('Item deleted')).toBeNull();
  });

  it('renders action button when provided', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <Toast visible message="Deleted" action={{ label: 'Undo', onPress }} />,
    );
    expect(screen.getByLabelText('Undo')).toBeOnTheScreen();
  });

  it('calls action onPress when button is pressed', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <Toast visible message="Deleted" action={{ label: 'Undo', onPress }} />,
    );
    fireEvent.press(screen.getByLabelText('Undo'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has accessible alert role', () => {
    renderWithProviders(
      <Toast visible message="Evidence deleted" />,
    );
    expect(screen.getByLabelText('Evidence deleted')).toBeOnTheScreen();
  });

  it('calls onDismiss after duration', () => {
    jest.useFakeTimers();
    const onDismiss = jest.fn();
    renderWithProviders(
      <Toast visible message="Deleted" duration={3000} onDismiss={onDismiss} />,
    );
    act(() => { jest.advanceTimersByTime(3000); });
    expect(onDismiss).toHaveBeenCalled();
    jest.useRealTimers();
  });
});

describe('ToastContext', () => {
  function TestConsumer() {
    const { showToast, hideToast } = useToast();
    return (
      <>
        <Pressable
          testID="show-toast"
          onPress={() => showToast({ message: 'Context toast', action: { label: 'Undo', onPress: hideToast } })}
        >
          <Text>Show Toast</Text>
        </Pressable>
        <Pressable testID="hide-toast" onPress={hideToast}>
          <Text>Hide Toast</Text>
        </Pressable>
      </>
    );
  }

  it('shows toast via context', () => {
    renderWithProviders(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.press(screen.getByTestId('show-toast'));
    expect(screen.getByText('Context toast')).toBeOnTheScreen();
  });

  it('hides toast via context', () => {
    renderWithProviders(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.press(screen.getByTestId('show-toast'));
    expect(screen.getByText('Context toast')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('hide-toast'));
    expect(screen.queryByText('Context toast')).toBeNull();
  });

  it('throws when useToast is used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useToast must be used within a ToastProvider');
    consoleError.mockRestore();
  });
});
