import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { themeOptions } from '../../../hooks/useTheme';
import type { ThemeName } from '../../../themes/compose';

const mockSetTheme = jest.fn();

jest.mock('../../../hooks/useTheme', () => {
  const actual = jest.requireActual('../../../hooks/useTheme');
  return {
    ...actual,
    useThemeContext: () => ({
      themeName: 'light-default' as ThemeName,
      setTheme: mockSetTheme,
    }),
  };
});

import { ThemeSwitcher } from '../ThemeSwitcher';

beforeEach(() => {
  mockSetTheme.mockClear();
});

describe('ThemeSwitcher', () => {
  it('marks the active theme radio as checked and others as unchecked', () => {
    renderWithProviders(<ThemeSwitcher />);
    const radios = screen.getAllByRole('radio');

    const checkedRadio = radios.find(
      (r) => r.props.accessibilityState?.checked === true,
    );
    const uncheckedRadios = radios.filter(
      (r) => r.props.accessibilityState?.checked !== true,
    );

    expect(checkedRadio).toBeTruthy();
    expect(uncheckedRadios.length).toBe(radios.length - 1);
  });

  it('calls setTheme with the correct theme ID when a radio is pressed', () => {
    renderWithProviders(<ThemeSwitcher />);
    const secondOption = themeOptions[1];
    fireEvent.press(
      screen.getByLabelText(`${secondOption.label}. ${secondOption.description}`),
    );
    expect(mockSetTheme).toHaveBeenCalledWith(secondOption.id);
  });

  it('has accessibilityRole "radiogroup" on the container', () => {
    renderWithProviders(<ThemeSwitcher />);
    expect(screen.getByRole('radiogroup')).toBeOnTheScreen();
  });

  it('each option has accessibilityRole "radio" and a descriptive label', () => {
    renderWithProviders(<ThemeSwitcher />);
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBe(themeOptions.length);

    for (const option of themeOptions) {
      expect(
        screen.getByLabelText(`${option.label}. ${option.description}`),
      ).toBeOnTheScreen();
    }
  });
});
