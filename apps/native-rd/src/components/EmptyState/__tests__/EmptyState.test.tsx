import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  const baseProps = { title: 'No items', body: 'Add your first item' };

  it('renders icon when icon prop is provided', () => {
    renderWithProviders(<EmptyState {...baseProps} icon="📦" />);
    expect(screen.getByText('📦')).toBeOnTheScreen();
  });

  it('does not render icon when icon prop is omitted', () => {
    renderWithProviders(<EmptyState {...baseProps} />);
    expect(screen.queryByText('📦')).not.toBeOnTheScreen();
  });

  it('renders action button when action prop is provided', () => {
    const action = { label: 'Add item', onPress: jest.fn() };
    renderWithProviders(<EmptyState {...baseProps} action={action} />);
    expect(screen.getByText('Add item')).toBeOnTheScreen();
  });

  it('does not render action button when action prop is omitted', () => {
    renderWithProviders(<EmptyState {...baseProps} />);
    expect(screen.queryByText('Add item')).not.toBeOnTheScreen();
  });

  it('fires action.onPress when button is tapped', () => {
    const onPress = jest.fn();
    const action = { label: 'Add item', onPress };
    renderWithProviders(<EmptyState {...baseProps} action={action} />);
    fireEvent.press(screen.getByText('Add item'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('title has accessibilityRole="header"', () => {
    renderWithProviders(<EmptyState {...baseProps} />);
    expect(screen.getByRole('header', { name: 'No items' })).toBeOnTheScreen();
  });
});
