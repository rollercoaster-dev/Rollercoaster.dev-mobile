/**
 * UserSettings CRUD operation tests
 *
 * Tests singleton pattern, validation, and fixed updateUserSettings API
 */

import { createUserSettings, updateUserSettings } from '../queries';
import type { UserSettingsId } from '../schema';

const mockSettingsId = 'settings_test_123' as UserSettingsId;

describe('UserSettings CRUD Operations', () => {
  test('createUserSettings should succeed', () => {
    expect(() => createUserSettings()).not.toThrow();
  });

  test.each([
    ['theme', 'dark', 'Theme'],
    ['density', 'compact', 'Density'],
    ['animationPref', 'reduced', 'Animation preference'],
  ] as const)('should validate %s field (empty rejects, valid/null accepts)', (field, validValue, errorLabel) => {
    expect(() =>
      updateUserSettings(mockSettingsId, { [field]: '' }),
    ).toThrow(`${errorLabel} must be 1-1000 characters`);

    expect(() =>
      updateUserSettings(mockSettingsId, { [field]: 'a'.repeat(1001) }),
    ).toThrow(`${errorLabel} must be 1-1000 characters`);

    expect(() =>
      updateUserSettings(mockSettingsId, { [field]: validValue }),
    ).not.toThrow();

    expect(() =>
      updateUserSettings(mockSettingsId, { [field]: null }),
    ).not.toThrow();
  });

  test('should throw when fontScale is not an integer', () => {
    expect(() =>
      updateUserSettings(mockSettingsId, { fontScale: 1.5 }),
    ).toThrow('Font scale must be an integer');
  });

  test.each([80, 100, 150])('should accept fontScale %i', (scale) => {
    expect(() =>
      updateUserSettings(mockSettingsId, { fontScale: scale }),
    ).not.toThrow();
  });

  test('should accept null fontScale', () => {
    expect(() =>
      updateUserSettings(mockSettingsId, { fontScale: null }),
    ).not.toThrow();
  });

  test('should succeed updating multiple fields', () => {
    expect(() =>
      updateUserSettings(mockSettingsId, {
        theme: 'dark',
        density: 'compact',
        animationPref: 'full',
        fontScale: 100,
      }),
    ).not.toThrow();
  });

  test('should succeed with mix of values and nulls', () => {
    expect(() =>
      updateUserSettings(mockSettingsId, {
        theme: 'light',
        density: null,
        animationPref: 'reduced',
        fontScale: null,
      }),
    ).not.toThrow();
  });
});
