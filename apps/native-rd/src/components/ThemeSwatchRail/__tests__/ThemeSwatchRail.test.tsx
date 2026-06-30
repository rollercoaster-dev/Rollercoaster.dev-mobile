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

import { ThemeSwatchRail } from "../ThemeSwatchRail";

const themeLabelOf = (id: ThemeName) => themeA11yLabel(i18n.t.bind(i18n), id);

describe("ThemeSwatchRail", () => {
  it("renders one radio per theme option with descriptive labels", () => {
    renderWithProviders(
      <ThemeSwatchRail selectedThemeId="light-default" onSelect={jest.fn()} />,
    );
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBe(themeOptions.length);

    for (const option of themeOptions) {
      expect(screen.getByLabelText(themeLabelOf(option.id))).toBeOnTheScreen();
    }
  });

  it("marks only the selected theme as checked", () => {
    renderWithProviders(
      <ThemeSwatchRail selectedThemeId="dark-default" onSelect={jest.fn()} />,
    );
    const radios = screen.getAllByRole("radio");
    const checked = radios.filter(
      (r) => r.props.accessibilityState?.checked === true,
    );
    expect(checked.length).toBe(1);
    expect(checked[0].props.accessibilityLabel).toBe(
      themeLabelOf("dark-default"),
    );
  });

  it("calls onSelect with the correct theme ID when a swatch is pressed", () => {
    const onSelect = jest.fn();
    renderWithProviders(
      <ThemeSwatchRail selectedThemeId="light-default" onSelect={onSelect} />,
    );
    const target = themeOptions[2]; // Bold Ink
    fireEvent.press(screen.getByLabelText(themeLabelOf(target.id)));
    expect(onSelect).toHaveBeenCalledWith(target.id);
  });

  it('exposes the rail as accessibilityRole "radiogroup"', () => {
    renderWithProviders(
      <ThemeSwatchRail selectedThemeId="light-default" onSelect={jest.fn()} />,
    );
    expect(screen.getByRole("radiogroup")).toBeOnTheScreen();
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

    it("drops radiogroup wrapper so descendant swatch labels are reachable", () => {
      renderWithProviders(
        <ThemeSwatchRail
          selectedThemeId="light-default"
          onSelect={jest.fn()}
        />,
      );
      // Under EXPO_PUBLIC_E2E_MODE=true the outer grouping is disabled so
      // Maestro can resolve each swatch's composed accessibilityLabel without
      // colliding with the parent radiogroup's label.
      expect(screen.queryByRole("radiogroup")).toBeNull();
      const radios = screen.getAllByRole("radio");
      expect(radios.length).toBe(themeOptions.length);
    });
  });
});
