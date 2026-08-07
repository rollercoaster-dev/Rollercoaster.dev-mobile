import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
  act,
} from "../../../__tests__/test-utils";
import { themeOptions } from "../../../hooks/useTheme";
import type { ThemeName } from "../../../themes/compose";
import { i18n } from "../../../i18n";
import { themeA11yLabel } from "../../../i18n/labels";

import { ThemeSwatchRail } from "../ThemeSwatchRail";

const t = i18n.t.bind(i18n);
const themeLabelOf = (id: ThemeName) => themeA11yLabel(t, id);
const captionLabelOf = (id: ThemeName) => t(`common:theme.options.${id}.label`);
const captionDescriptionOf = (id: ThemeName) =>
  t(`common:theme.options.${id}.description`);
const groupLabel = () => t("common:theme.picker.groupLabel");

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

  it('exposes the rail as accessibilityRole "radiogroup" with a localized label', () => {
    renderWithProviders(
      <ThemeSwatchRail selectedThemeId="light-default" onSelect={jest.fn()} />,
    );
    // Queried via label, not getByRole: the rail deliberately omits
    // `accessible` (so it doesn't swallow its radios) and RNTL's role query
    // only matches elements whose `accessible` prop is truthy.
    const rail = screen.getByLabelText(groupLabel());
    expect(rail.props.accessibilityRole).toBe("radiogroup");
  });

  it("keeps every swatch individually reachable in production (no E2E branch)", () => {
    expect(process.env.EXPO_PUBLIC_E2E_MODE).toBeUndefined();
    renderWithProviders(
      <ThemeSwatchRail selectedThemeId="light-default" onSelect={jest.fn()} />,
    );
    // Regression guard for #500: the wrapper used to set `accessible={true}`
    // outside E2E mode, collapsing all 7 swatches into one VoiceOver node.
    expect(screen.getAllByRole("radio")).toHaveLength(themeOptions.length);
    for (const option of themeOptions) {
      expect(screen.getByLabelText(themeLabelOf(option.id))).toBeOnTheScreen();
    }
  });

  it("renders the ✓ overlay on exactly the selected swatch", () => {
    renderWithProviders(
      <ThemeSwatchRail selectedThemeId="dark-default" onSelect={jest.fn()} />,
    );
    expect(screen.getAllByText("✓")).toHaveLength(1);
  });

  it("shows the selected theme's name and description in the caption", () => {
    renderWithProviders(
      <ThemeSwatchRail selectedThemeId="dark-default" onSelect={jest.fn()} />,
    );
    expect(screen.getByText(captionLabelOf("dark-default"))).toBeOnTheScreen();
    expect(
      screen.getByText(captionDescriptionOf("dark-default")),
    ).toBeOnTheScreen();
  });

  it("updates the caption when the selected theme changes", () => {
    const { rerender } = renderWithProviders(
      <ThemeSwatchRail selectedThemeId="light-default" onSelect={jest.fn()} />,
    );
    expect(screen.getByText(captionLabelOf("light-default"))).toBeOnTheScreen();

    rerender(
      <ThemeSwatchRail selectedThemeId="dark-default" onSelect={jest.fn()} />,
    );
    expect(screen.getByText(captionLabelOf("dark-default"))).toBeOnTheScreen();
    expect(
      screen.queryByText(captionLabelOf("light-default")),
    ).not.toBeOnTheScreen();
  });

  describe("pseudo locale (proves the group label is routed through i18n)", () => {
    afterEach(async () => {
      if (i18n.language !== "en") {
        await act(async () => {
          await i18n.changeLanguage("en");
        });
      }
    });

    it("renders the radiogroup label as bracketed pseudo copy", async () => {
      await act(async () => {
        await i18n.changeLanguage("pseudo");
      });
      renderWithProviders(
        <ThemeSwatchRail
          selectedThemeId="light-default"
          onSelect={jest.fn()}
        />,
      );
      const label = i18n.t("common:theme.picker.groupLabel");
      expect(label.startsWith("[")).toBe(true);
      expect(screen.getByLabelText(label)).toBeOnTheScreen();
    });
  });
});
