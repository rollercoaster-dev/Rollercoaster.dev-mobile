import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { themeOptions } from "../../../hooks/useTheme";
import type { ThemeName } from "../../../themes/compose";

const mockSetTheme = jest.fn();

jest.mock("../../../hooks/useTheme", () => {
  const actual = jest.requireActual("../../../hooks/useTheme");
  return {
    ...actual,
    useThemeContext: () => ({
      themeName: "light-default" as ThemeName,
      setTheme: mockSetTheme,
    }),
  };
});

import { ThemeChipGrid } from "../ThemeChipGrid";

beforeEach(() => {
  mockSetTheme.mockClear();
});

describe("ThemeChipGrid", () => {
  it('exposes the grid as accessibilityRole="radiogroup"', () => {
    renderWithProviders(<ThemeChipGrid />);
    expect(screen.getByRole("radiogroup")).toBeOnTheScreen();
  });

  it("renders one radio per theme option with descriptive labels", () => {
    renderWithProviders(<ThemeChipGrid />);
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBe(themeOptions.length);

    for (const option of themeOptions) {
      expect(
        screen.getByLabelText(`${option.label}. ${option.description}`),
      ).toBeOnTheScreen();
    }
  });

  it("marks the active theme as checked and the others as unchecked", () => {
    renderWithProviders(<ThemeChipGrid />);
    const radios = screen.getAllByRole("radio");
    const checked = radios.filter(
      (r) => r.props.accessibilityState?.checked === true,
    );
    expect(checked.length).toBe(1);
    expect(checked[0].props.accessibilityLabel).toContain("The Full Ride");
  });

  it("calls setTheme with the correct theme ID when a chip is pressed", () => {
    renderWithProviders(<ThemeChipGrid />);
    const target = themeOptions[2]; // Bold Ink
    fireEvent.press(
      screen.getByLabelText(`${target.label}. ${target.description}`),
    );
    expect(mockSetTheme).toHaveBeenCalledWith(target.id);
  });
});
