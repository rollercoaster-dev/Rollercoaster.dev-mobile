import React from 'react';
import { renderWithProviders, screen } from '../../../__tests__/test-utils';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders the default label for a variant', () => {
    renderWithProviders(<StatusBadge variant="active" />);
    expect(screen.getByText('Active')).toBeOnTheScreen();
  });

  it('renders a custom label when provided', () => {
    renderWithProviders(<StatusBadge variant="completed" label="Finished" />);
    expect(screen.getByText('Finished')).toBeOnTheScreen();
  });

  it('has accessible status label', () => {
    renderWithProviders(<StatusBadge variant="locked" />);
    expect(screen.getByLabelText('Status: Locked')).toBeOnTheScreen();
  });
});
