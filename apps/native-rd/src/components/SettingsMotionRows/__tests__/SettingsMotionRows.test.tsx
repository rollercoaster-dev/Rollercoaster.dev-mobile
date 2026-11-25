import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import {
  animationPrefOptions,
  type AnimationPref,
} from "../../../hooks/useAnimationPref";
import { motionA11yLabel } from "../../../i18n/labels";

import { SettingsMotionRows } from "../SettingsMotionRows";

const t = i18n.t.bind(i18n);
const a11yLabelOf = (id: AnimationPref) => motionA11yLabel(t, id);

describe("SettingsMotionRows", () => {
  it("renders Full, Reduced and None as radios", () => {
    renderWithProviders(
      <SettingsMotionRows
        selectedPref="full"
        override={null}
        onSelect={jest.fn()}
      />,
    );
    expect(
      screen.getAllByRole("radio").map((r) => r.props.accessibilityLabel),
    ).toEqual(animationPrefOptions.map(a11yLabelOf));
  });

  it("marks only the saved choice as checked", () => {
    renderWithProviders(
      <SettingsMotionRows
        selectedPref="reduced"
        override={null}
        onSelect={jest.fn()}
      />,
    );
    const checked = screen
      .getAllByRole("radio")
      .filter((r) => r.props.accessibilityState?.checked === true);
    expect(checked).toHaveLength(1);
    expect(checked[0].props.accessibilityLabel).toBe(a11yLabelOf("reduced"));
  });

  it.each(animationPrefOptions)("calls onSelect with %s", (id) => {
    const onSelect = jest.fn();
    renderWithProviders(
      <SettingsMotionRows
        selectedPref="full"
        override={null}
        onSelect={onSelect}
      />,
    );
    fireEvent.press(screen.getByRole("radio", { name: a11yLabelOf(id) }));
    expect(onSelect).toHaveBeenCalledWith(id);
  });

  it("shows no note when nothing overrides the choice", () => {
    renderWithProviders(
      <SettingsMotionRows
        selectedPref="full"
        override={null}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("settings-motion-override-note")).toBeNull();
  });

  it("names Still Water when the theme keeps motion off", () => {
    renderWithProviders(
      <SettingsMotionRows
        selectedPref="full"
        override="theme"
        onSelect={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId("settings-motion-override-note"),
    ).toHaveTextContent(
      t("settings:motion.override.theme", {
        theme: t("common:theme.options.light-autismFriendly.label"),
      }),
    );
  });

  it("names the device setting when the OS keeps motion off, rows still selectable", () => {
    const onSelect = jest.fn();
    renderWithProviders(
      <SettingsMotionRows
        selectedPref="full"
        override="os"
        onSelect={onSelect}
      />,
    );
    expect(
      screen.getByTestId("settings-motion-override-note"),
    ).toHaveTextContent(t("settings:motion.override.os"));
    fireEvent.press(screen.getByRole("radio", { name: a11yLabelOf("none") }));
    expect(onSelect).toHaveBeenCalledWith("none");
  });
});
