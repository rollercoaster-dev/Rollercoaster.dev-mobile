import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { BadgeCard } from '../BadgeCard';
import type { BadgeDesign } from '../../../badges/types';

jest.mock('../../../badges/BadgeRenderer', () => ({
  BadgeRenderer: () => 'BadgeRenderer',
}));

const baseProps = {
  title: 'First Steps',
  earnedDate: 'Jan 1, 2025',
};

describe('BadgeCard', () => {
  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    renderWithProviders(<BadgeCard {...baseProps} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('Badge: First Steps, earned Jan 1, 2025'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders BadgeRenderer when design prop is provided and hides initials', () => {
    const design: BadgeDesign = {
      shape: 'circle',
      frame: 'none',
      color: '#a78bfa',
      iconName: 'Trophy',
      iconWeight: 'regular',
      title: 'First Steps',
      centerMode: 'icon',
    };
    renderWithProviders(<BadgeCard {...baseProps} design={design} />);
    // Initials fallback should NOT be present when design is provided
    expect(screen.queryByText('F')).toBeNull();
  });

  it('renders initials fallback when design is not provided', () => {
    renderWithProviders(<BadgeCard {...baseProps} />);
    expect(screen.getByText('F')).toBeOnTheScreen();
  });

  describe('evidence count', () => {
    it.each([
      [1, '1 piece of evidence'],
      [3, '3 pieces of evidence'],
      [0, '0 pieces of evidence'],
    ])('displays "%s" as "%s"', (count, expected) => {
      renderWithProviders(<BadgeCard {...baseProps} evidenceCount={count} />);
      expect(screen.getByText(expected)).toBeOnTheScreen();
    });

    it('does not display evidence text when evidenceCount is undefined', () => {
      renderWithProviders(<BadgeCard {...baseProps} />);
      expect(screen.queryByText(/evidence/)).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('has role "button" when onPress is provided', () => {
      renderWithProviders(<BadgeCard {...baseProps} onPress={() => {}} />);
      expect(screen.getByRole('button')).toBeOnTheScreen();
    });

    it('does not have role "button" when onPress is omitted', () => {
      renderWithProviders(<BadgeCard {...baseProps} />);
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('includes title and date in accessibilityLabel', () => {
      renderWithProviders(<BadgeCard {...baseProps} />);
      expect(screen.getByLabelText('Badge: First Steps, earned Jan 1, 2025')).toBeOnTheScreen();
    });
  });
});
