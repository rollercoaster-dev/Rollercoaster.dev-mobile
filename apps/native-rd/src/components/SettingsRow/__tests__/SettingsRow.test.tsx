import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";

import { SettingsRow } from "../SettingsRow";

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

  it("fires onLongPress when long-pressed", () => {
    const onLongPress = jest.fn();
    renderWithProviders(
      <SettingsRow label="Version" onLongPress={onLongPress} />,
    );
    fireEvent(screen.getByRole("button", { name: "Version" }), "longPress");
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("renders as a Pressable when only onLongPress is provided", () => {
    renderWithProviders(<SettingsRow label="Version" onLongPress={() => {}} />);
    expect(screen.getByRole("button", { name: "Version" })).toBeOnTheScreen();
  });

  it("exposes long press as an accessibility action", () => {
    const onLongPress = jest.fn();
    renderWithProviders(
      <SettingsRow label="Version" onLongPress={onLongPress} />,
    );
    const button = screen.getByRole("button", { name: "Version" });

    expect(button.props.accessibilityActions).toEqual([
      { name: "longpress", label: "Long press" },
    ]);
    fireEvent(button, "accessibilityAction", {
      nativeEvent: { actionName: "longpress" },
    });
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  describe("radio role (opt-in)", () => {
    it('exposes accessibilityRole "radio" with checked state when selected', () => {
      renderWithProviders(
        <SettingsRow
          label="Compact"
          accessibilityRole="radio"
          checked
          onPress={() => {}}
        />,
      );
      const radio = screen.getByRole("radio", { name: "Compact" });
      expect(radio.props.accessibilityState).toEqual({ checked: true });
    });

    it("reports checked false for an unselected radio row", () => {
      renderWithProviders(
        <SettingsRow
          label="Default"
          accessibilityRole="radio"
          checked={false}
          onPress={() => {}}
        />,
      );
      const radio = screen.getByRole("radio", { name: "Default" });
      expect(radio.props.accessibilityState).toEqual({ checked: false });
    });

    it("defaults checked to false when a radio row omits the prop", () => {
      renderWithProviders(
        <SettingsRow
          label="Comfortable"
          accessibilityRole="radio"
          onPress={() => {}}
        />,
      );
      const radio = screen.getByRole("radio", { name: "Comfortable" });
      expect(radio.props.accessibilityState).toEqual({ checked: false });
    });

    it('still renders as a "button" when accessibilityRole is omitted', () => {
      renderWithProviders(<SettingsRow label="Account" onPress={() => {}} />);
      expect(screen.getByRole("button", { name: "Account" })).toBeOnTheScreen();
      expect(screen.queryByRole("radio")).toBeNull();
    });
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
