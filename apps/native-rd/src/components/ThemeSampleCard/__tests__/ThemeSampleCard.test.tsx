import React from "react";
import { StyleSheet } from "react-native";
import {
  renderWithProviders,
  screen,
  act,
} from "../../../__tests__/test-utils";
import { themeOptions } from "../../../hooks/useTheme";
import { themes } from "../../../themes/compose";
import { i18n } from "../../../i18n";

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

  // The assertions above compare against English literals, which pass whether
  // or not the copy routes through t() — a hard-coded <Text>"Daily reading"
  // satisfies them. Under pseudo the keys return bracketed text, so these only
  // pass if the card really is going through i18n. This copy moved from
  // welcome:sample.* to common:theme.preview.* in #414 and lost the
  // pseudo-locale case WelcomeScreen used to carry for it; this is its home now.
  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") {
        await act(async () => {
          await i18n.changeLanguage("en");
        });
      }
    });

    it.each([
      "common:theme.preview.title",
      "common:theme.preview.progress",
      "common:theme.preview.cta",
    ] as const)("renders %s as bracketed copy", async (key) => {
      await act(async () => {
        await i18n.changeLanguage("pseudo");
      });
      renderWithProviders(<ThemeSampleCard themeId="light-default" />);
      const pseudo = i18n.t(key);
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByText(pseudo)).toBeOnTheScreen();
    });
  });
});
