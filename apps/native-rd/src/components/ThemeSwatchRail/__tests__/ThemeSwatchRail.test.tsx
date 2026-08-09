import React from "react";
import { ScrollView, StyleSheet } from "react-native";
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

  // Regression guard for #500: the wrapper used to set `accessible={true}`
  // outside E2E mode, collapsing all 7 swatches into one VoiceOver node. The
  // component must now render the same tree either way — hence both cases.
  it.each([
    ["unset", undefined],
    ['"true"', "true"],
  ])(
    "keeps every swatch individually reachable with EXPO_PUBLIC_E2E_MODE %s",
    (_name, value) => {
      const original = process.env.EXPO_PUBLIC_E2E_MODE;
      if (value === undefined) {
        delete process.env.EXPO_PUBLIC_E2E_MODE;
      } else {
        process.env.EXPO_PUBLIC_E2E_MODE = value;
      }
      try {
        renderWithProviders(
          <ThemeSwatchRail
            selectedThemeId="light-default"
            onSelect={jest.fn()}
          />,
        );
        expect(screen.getAllByRole("radio")).toHaveLength(themeOptions.length);
        for (const option of themeOptions) {
          expect(
            screen.getByLabelText(themeLabelOf(option.id)),
          ).toBeOnTheScreen();
        }
      } finally {
        if (original === undefined) {
          delete process.env.EXPO_PUBLIC_E2E_MODE;
        } else {
          process.env.EXPO_PUBLIC_E2E_MODE = original;
        }
      }
    },
  );

  // Regression guard: the swatches used to sit in a horizontal ScrollView with
  // no scroll indicator. At 408pt of content in ~361pt of usable width the 7th
  // theme was ~1pt from the edge — visually "there are only 6 themes". They
  // must wrap so every option is on screen on every device.
  it("wraps the swatches instead of hiding them in a horizontal scroller", () => {
    renderWithProviders(
      <ThemeSwatchRail selectedThemeId="light-default" onSelect={jest.fn()} />,
    );
    expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0);
    const row = screen.getByTestId("theme-swatch-row");
    expect(StyleSheet.flatten(row.props.style).flexWrap).toBe("wrap");
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
