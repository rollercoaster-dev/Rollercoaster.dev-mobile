import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders, screen } from '../../../__tests__/test-utils';
import { SettingsSection } from '../SettingsSection';

describe('SettingsSection', () => {
  it('inserts n-1 separators for n children', () => {
    renderWithProviders(
      <SettingsSection title="Section">
        <Text>A</Text>
        <Text>B</Text>
        <Text>C</Text>
      </SettingsSection>,
    );
    // 3 children -> 2 separators
    expect(screen.getAllByTestId('settings-separator')).toHaveLength(2);
  });

  it('renders no separator for a single child', () => {
    renderWithProviders(
      <SettingsSection title="Section">
        <Text>Only</Text>
      </SettingsSection>,
    );
    expect(screen.queryAllByTestId('settings-separator')).toHaveLength(0);
  });

  it('renders no separator with zero children', () => {
    renderWithProviders(
      <SettingsSection title="Section">{[]}</SettingsSection>,
    );
    expect(screen.queryAllByTestId('settings-separator')).toHaveLength(0);
  });
});
