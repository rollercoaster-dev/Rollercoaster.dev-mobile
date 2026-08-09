import React from "react";
import { StyleSheet } from "react-native";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { themeOptions } from "../../../hooks/useTheme";
import { themes } from "../../../themes/compose";

import { ThemeSampleCard } from "../ThemeSampleCard";

const themeIds = themeOptions.map((o) => o.id);

describe("ThemeSampleCard", () => {
  it.each(themeIds)("renders without crashing for %s", (id) => {
    renderWithProviders(<ThemeSampleCard themeId={id} />);
    // The title is theme-independent — its presence confirms the card mounted.
    expect(screen.getByText("Daily reading")).toBeOnTheScreen();
  });

  it("renders the preview i18n strings", () => {
    renderWithProviders(<ThemeSampleCard themeId="light-default" />);
    expect(screen.getByText("Daily reading")).toBeOnTheScreen();
    expect(screen.getByText("3 of 5 done")).toBeOnTheScreen();
    expect(screen.getByText("+ ADD")).toBeOnTheScreen();
  });

  // The card previews a theme on top of a screen painted in that theme's
  // `colors.background` (WelcomeScreen.tsx). It used to fill with that same
  // token behind a 1pt border, leaving no visible card edge in the variants
  // whose shadows are disabled. Fill must stay on the `Card` treatment.
  it.each(themeIds)(
    "reads as a card against the page background for %s",
    (id) => {
      renderWithProviders(<ThemeSampleCard themeId={id} />);
      const card = StyleSheet.flatten(
        screen.getByTestId("theme-sample-card").props.style,
      );
      expect(card.backgroundColor).toBe(themes[id].colors.backgroundSecondary);
      expect(card.backgroundColor).not.toBe(themes[id].colors.background);
      expect(card.borderWidth).toBe(themes[id].borderWidth.thick);
    },
  );

  it("is display-only — exposes no interactive a11y role", () => {
    renderWithProviders(<ThemeSampleCard themeId="light-default" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });
});
