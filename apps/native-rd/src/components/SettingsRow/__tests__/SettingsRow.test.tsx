import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";

// Mock Switch's internal RN module to avoid ESM parse errors in test-renderer.
// Same pattern used in SettingsScreen tests for ScrollView/ActivityIndicator.
jest.mock("react-native/Libraries/Components/Switch/Switch", () => {
  const mockReact = require("react");
  const { View: MockView } = require("react-native");
  const MockSwitch = (props: Record<string, unknown>) =>
    mockReact.createElement(MockView, {
      testID: "mock-switch",
      accessible: true,
      accessibilityRole: "switch",
      accessibilityLabel: props.accessibilityLabel,
      accessibilityState: { checked: props.value },
      onValueChange: props.onValueChange,
    });
  return { __esModule: true, default: MockSwitch };
});

import { SettingsRow } from "../SettingsRow";

describe("SettingsRow", () => {
  describe("rendering modes", () => {
    it("renders as a plain View when no onPress or toggle is provided", () => {
      renderWithProviders(<SettingsRow label="Language" />);
      expect(screen.getByText("Language")).toBeOnTheScreen();
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("renders as a Pressable with onPress", () => {
      const onPress = jest.fn();
      renderWithProviders(<SettingsRow label="Account" onPress={onPress} />);
      fireEvent.press(screen.getByRole("button", { name: "Account" }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("renders a Switch when toggle is provided", () => {
      renderWithProviders(
        <SettingsRow
          label="Notifications"
          toggle={{ value: false, onValueChange: jest.fn() }}
        />,
      );
      expect(screen.getByRole("switch")).toBeOnTheScreen();
    });
  });

  it('has accessibilityRole "button" only when onPress is provided', () => {
    const { unmount } = renderWithProviders(
      <SettingsRow label="Theme" onPress={() => {}} />,
    );
    expect(screen.getByRole("button")).toBeOnTheScreen();
    unmount();

    renderWithProviders(<SettingsRow label="Theme" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows chevron for pressable non-toggle rows", () => {
    renderWithProviders(<SettingsRow label="About" onPress={() => {}} />);
    expect(screen.getByText("›")).toBeOnTheScreen();
  });

  it("does not show chevron when toggle is provided", () => {
    renderWithProviders(
      <SettingsRow
        label="Dark Mode"
        toggle={{ value: true, onValueChange: jest.fn() }}
      />,
    );
    expect(screen.queryByText("›")).toBeNull();
  });

  it("fires toggle.onValueChange when switch is toggled", () => {
    const onValueChange = jest.fn();
    renderWithProviders(
      <SettingsRow
        label="Notifications"
        toggle={{ value: false, onValueChange }}
      />,
    );
    fireEvent(screen.getByRole("switch"), "onValueChange", true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it("renders value text only when value prop is provided", () => {
    const { unmount } = renderWithProviders(
      <SettingsRow label="Version" value="1.2.3" />,
    );
    expect(screen.getByText("1.2.3")).toBeOnTheScreen();
    unmount();

    renderWithProviders(<SettingsRow label="Version" />);
    expect(screen.queryByText("1.2.3")).toBeNull();
  });
});
