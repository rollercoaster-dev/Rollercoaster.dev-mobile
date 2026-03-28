import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { IconButton } from '../IconButton';

describe('IconButton', () => {
  it('renders the icon and is accessible', () => {
    renderWithProviders(
      <IconButton
        icon={<Text>X</Text>}
        onPress={jest.fn()}
        accessibilityLabel="Close"
      />,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeOnTheScreen();
    expect(screen.getByText('X')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <IconButton
        icon={<Text>+</Text>}
        onPress={onPress}
        accessibilityLabel="Add"
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <IconButton
        icon={<Text>+</Text>}
        onPress={onPress}
        accessibilityLabel="Add"
        disabled
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
