import React from "react";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { themeOptions } from "../../../hooks/useTheme";

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

  it("is display-only — exposes no interactive a11y role", () => {
    renderWithProviders(<ThemeSampleCard themeId="light-default" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });
});
