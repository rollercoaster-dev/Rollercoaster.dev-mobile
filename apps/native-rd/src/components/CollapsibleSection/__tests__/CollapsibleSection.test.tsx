import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { CollapsibleSection } from '../CollapsibleSection';

jest.mock('../../../hooks/useAnimationPref', () => ({
  useAnimationPref: () => ({
    animationPref: 'full' as const,
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  }),
}));

describe('CollapsibleSection', () => {
  it('starts expanded by default and renders children', () => {
    renderWithProviders(
      <CollapsibleSection title="Details">
        <Text>Child content</Text>
      </CollapsibleSection>,
    );
    expect(screen.getByText('Child content')).toBeOnTheScreen();
  });

  it('starts collapsed when defaultExpanded is false', () => {
    renderWithProviders(
      <CollapsibleSection title="Details" defaultExpanded={false}>
        <Text>Hidden content</Text>
      </CollapsibleSection>,
    );
    expect(screen.queryByText('Hidden content')).toBeNull();
  });

  it('toggles expanded state when header is pressed', () => {
    renderWithProviders(
      <CollapsibleSection title="Details">
        <Text>Toggleable content</Text>
      </CollapsibleSection>,
    );
    // Initially expanded
    expect(screen.getByText('Toggleable content')).toBeOnTheScreen();

    // Collapse
    fireEvent.press(screen.getByLabelText('Details, collapse'));
    expect(screen.queryByText('Toggleable content')).toBeNull();

    // Expand again
    fireEvent.press(screen.getByLabelText('Details, expand'));
    expect(screen.getByText('Toggleable content')).toBeOnTheScreen();
  });

  describe('accessibility', () => {
    it('has dynamic label reflecting expanded state', () => {
      renderWithProviders(
        <CollapsibleSection title="Section">
          <Text>Content</Text>
        </CollapsibleSection>,
      );
      expect(screen.getByLabelText('Section, collapse')).toBeOnTheScreen();

      fireEvent.press(screen.getByLabelText('Section, collapse'));
      expect(screen.getByLabelText('Section, expand')).toBeOnTheScreen();
    });

    it('tracks expanded state in accessibilityState', () => {
      renderWithProviders(
        <CollapsibleSection title="Section">
          <Text>Content</Text>
        </CollapsibleSection>,
      );
      const header = screen.getByRole('button', { name: 'Section, collapse' });
      expect(header.props.accessibilityState).toEqual(
        expect.objectContaining({ expanded: true }),
      );

      fireEvent.press(header);
      const collapsed = screen.getByRole('button', { name: 'Section, expand' });
      expect(collapsed.props.accessibilityState).toEqual(
        expect.objectContaining({ expanded: false }),
      );
    });
  });
});
