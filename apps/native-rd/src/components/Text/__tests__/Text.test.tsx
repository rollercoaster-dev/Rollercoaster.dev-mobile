import React from 'react';
import { renderWithProviders, screen } from '../../../__tests__/test-utils';
import { Text, type TextVariant } from '../Text';

describe('Text', () => {
  const variants: TextVariant[] = ['display', 'headline', 'title', 'body', 'caption', 'label', 'mono'];

  test.each(variants)('renders variant "%s" without crashing', (variant) => {
    renderWithProviders(<Text variant={variant}>Sample</Text>);
    expect(screen.getByText('Sample')).toBeOnTheScreen();
  });

  it('passes additional TextProps through (testID, numberOfLines)', () => {
    renderWithProviders(
      <Text testID="my-text" numberOfLines={2}>
        Truncated
      </Text>,
    );
    expect(screen.getByTestId('my-text')).toBeOnTheScreen();
  });

  it('allows style override without throwing', () => {
    renderWithProviders(<Text style={{ color: 'red' }}>Styled</Text>);
    expect(screen.getByText('Styled')).toBeOnTheScreen();
  });
});
