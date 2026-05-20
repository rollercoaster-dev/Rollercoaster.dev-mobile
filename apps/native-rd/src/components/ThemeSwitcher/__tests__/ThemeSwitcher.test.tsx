import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { themeOptions } from "../../../hooks/useTheme";
import type { ThemeName } from "../../../themes/compose";
import { i18n } from "../../../i18n";
import { themeA11yLabel } from "../../../i18n/labels";

import { ThemeSwitcher } from "../ThemeSwitcher";

const themeLabelOf = (id: ThemeName) => themeA11yLabel(i18n.t.bind(i18n), id);

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

describe("ThemeSwitcher", () => {
  it("marks the active theme radio as checked and others as unchecked", () => {
    renderWithProviders(<ThemeSwitcher />);
    const radios = screen.getAllByRole("radio");

    const checkedRadio = radios.find(
      (r) => r.props.accessibilityState?.checked === true,
    );
    const uncheckedRadios = radios.filter(
      (r) => r.props.accessibilityState?.checked !== true,
    );

    expect(checkedRadio).toBeTruthy();
    expect(uncheckedRadios.length).toBe(radios.length - 1);
  });

  it("calls setTheme with the correct theme ID when a radio is pressed", () => {
    renderWithProviders(<ThemeSwitcher />);
    const secondOption = themeOptions[1];
    fireEvent.press(screen.getByLabelText(themeLabelOf(secondOption.id)));
    expect(mockSetTheme).toHaveBeenCalledWith(secondOption.id);
  });

  it('has accessibilityRole "radiogroup" on the container', () => {
    renderWithProviders(<ThemeSwitcher />);
    expect(screen.getByRole("radiogroup")).toBeOnTheScreen();
  });

  it('each option has accessibilityRole "radio" and a descriptive label', () => {
    renderWithProviders(<ThemeSwitcher />);
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBe(themeOptions.length);

    for (const option of themeOptions) {
      expect(screen.getByLabelText(themeLabelOf(option.id))).toBeOnTheScreen();
    }
  });

  describe("E2E mode gating", () => {
    const originalE2E = process.env.EXPO_PUBLIC_E2E_MODE;
    beforeAll(() => {
      process.env.EXPO_PUBLIC_E2E_MODE = "true";
    });
    afterAll(() => {
      if (originalE2E === undefined) {
        delete process.env.EXPO_PUBLIC_E2E_MODE;
      } else {
        process.env.EXPO_PUBLIC_E2E_MODE = originalE2E;
      }
    });

    it("drops radiogroup wrapper so descendant option labels are reachable", () => {
      renderWithProviders(<ThemeSwitcher />);
      // Under EXPO_PUBLIC_E2E_MODE=true the outer grouping is disabled
      // so Maestro can resolve each option's composed accessibilityLabel
      // (e.g. "Night Ride. Dark mode"). Without this gate, iOS collapses
      // every option into the parent radiogroup's a11y node and Maestro
      // can no longer reach them.
      expect(screen.queryByRole("radiogroup")).toBeNull();
      const radios = screen.getAllByRole("radio");
      expect(radios.length).toBe(themeOptions.length);
    });
  });
});
