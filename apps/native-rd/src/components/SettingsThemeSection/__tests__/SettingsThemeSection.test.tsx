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

import { SettingsThemeSection } from "../SettingsThemeSection";

const t = i18n.t.bind(i18n);
const themeLabelOf = (id: ThemeName) => themeA11yLabel(t, id);
const themeIds = themeOptions.map((o) => o.id);

describe("SettingsThemeSection", () => {
  it("renders the section title from settings:theme.title", () => {
    renderWithProviders(
      <SettingsThemeSection
        selectedThemeId="light-default"
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText(t("settings:theme.title"))).toBeOnTheScreen();
  });

  it("mounts the reused rail (one radio per theme) and the sample card", () => {
    renderWithProviders(
      <SettingsThemeSection
        selectedThemeId="light-default"
        onSelect={jest.fn()}
      />,
    );
    // The rail contributes one radio per theme option...
    expect(screen.getAllByRole("radio")).toHaveLength(themeOptions.length);
    // ...and the ThemeSampleCard renders its theme-independent preview title.
    expect(screen.getByText("Daily reading")).toBeOnTheScreen();
  });

  it("calls onSelect with the tapped theme id", () => {
    const onSelect = jest.fn();
    renderWithProviders(
      <SettingsThemeSection
        selectedThemeId="light-default"
        onSelect={onSelect}
      />,
    );
    const target = themeOptions[2];
    fireEvent.press(screen.getByLabelText(themeLabelOf(target.id)));
    expect(onSelect).toHaveBeenCalledWith(target.id);
  });

  it.each(themeIds)("renders for the %s theme", (id) => {
    renderWithProviders(
      <SettingsThemeSection selectedThemeId={id} onSelect={jest.fn()} />,
    );
    expect(screen.getByText(t("settings:theme.title"))).toBeOnTheScreen();
    expect(screen.getByText("Daily reading")).toBeOnTheScreen();
  });
});
