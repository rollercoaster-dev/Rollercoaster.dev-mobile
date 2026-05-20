import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { themeOptions } from "../../../hooks/useTheme";
import type { ThemeName } from "../../../themes/compose";
import { i18n } from "../../../i18n";

import { ThemeChipGrid } from "../ThemeChipGrid";

const themeLabelOf = (id: ThemeName) =>
  `${i18n.t(`theme.options.${id}.label`)}. ${i18n.t(
    `theme.options.${id}.description`,
  )}`;

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
      expect(screen.getByLabelText(themeLabelOf(option.id))).toBeOnTheScreen();
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
    fireEvent.press(screen.getByLabelText(themeLabelOf(target.id)));
    expect(mockSetTheme).toHaveBeenCalledWith(target.id);
  });

  describe("E2E mode gating", () => {
    const originalE2E = process.env.EXPO_PUBLIC_E2E_MODE;
    beforeAll(() => {
      process.env.EXPO_PUBLIC_E2E_MODE = "true";
    });
    afterAll(() => {
      process.env.EXPO_PUBLIC_E2E_MODE = originalE2E;
    });

    it("drops radiogroup wrapper so descendant chip labels are reachable", () => {
      renderWithProviders(<ThemeChipGrid />);
      // Under EXPO_PUBLIC_E2E_MODE=true, the outer grouping is disabled
      // so Maestro can resolve each chip's composed accessibilityLabel
      // (e.g. "The Full Ride. Standard theme") without colliding with
      // the parent radiogroup's "Theme" label.
      expect(screen.queryByRole("radiogroup")).toBeNull();
      // Individual radios remain reachable because each Pressable has
      // its own `accessible+role=radio+label`.
      const radios = screen.getAllByRole("radio");
      expect(radios.length).toBe(themeOptions.length);
    });
  });
});
