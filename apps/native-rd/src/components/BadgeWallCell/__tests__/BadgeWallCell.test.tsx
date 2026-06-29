import React from "react";
import { StyleSheet } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { BadgeWallCell } from "../BadgeWallCell";
import type { BadgeDesign } from "../../../badges/types";

// BadgeRenderer renders SVG, which JSDOM does not render — mock it to a host
// View carrying a testID. Its presence proves the badge goes through the real
// shape renderer rather than a circular clip / initials fallback.
jest.mock("../../../badges/BadgeRenderer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    BadgeRenderer: () =>
      React.createElement(View, { testID: "badge-renderer-mock" }),
  };
});

const design: BadgeDesign = {
  shape: "shield",
  frame: "none",
  color: "#a78bfa",
  iconName: "ShieldCheck",
  iconWeight: "regular",
  title: "Trophy Goal",
  centerMode: "icon",
};

describe("BadgeWallCell", () => {
  it("renders the badge through BadgeRenderer (its own shape) when a design is provided", () => {
    renderWithProviders(
      <BadgeWallCell
        badge={{ title: "Trophy Goal", design }}
        onPress={() => {}}
      />,
    );
    // The shape-preserving renderer is used — no initial-letter fallback.
    expect(screen.getByTestId("badge-renderer-mock")).toBeOnTheScreen();
    expect(screen.queryByText(/^[A-Z]$/)).toBeNull();
  });

  it("renders the initial-letter fallback when design is null", () => {
    renderWithProviders(
      <BadgeWallCell
        badge={{ title: "Trophy Goal", design: null }}
        onPress={() => {}}
      />,
    );
    expect(screen.getByText("T")).toBeOnTheScreen();
  });

  it("fires onPress when pressed", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <BadgeWallCell
        badge={{ title: "Trophy Goal", design: null }}
        onPress={onPress}
      />,
    );
    fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has accessibilityRole="button"', () => {
    renderWithProviders(
      <BadgeWallCell
        badge={{ title: "Trophy Goal", design: null }}
        onPress={() => {}}
      />,
    );
    expect(screen.getByRole("button")).toBeOnTheScreen();
  });

  it("uses the badge title as the accessibilityLabel", () => {
    renderWithProviders(
      <BadgeWallCell
        badge={{ title: "Trophy Goal", design: null }}
        onPress={() => {}}
      />,
    );
    expect(screen.getByLabelText("Trophy Goal")).toBeOnTheScreen();
  });

  it("guarantees a 44x44pt minimum touch target", () => {
    renderWithProviders(
      <BadgeWallCell
        badge={{ title: "Trophy Goal", design: null }}
        onPress={() => {}}
      />,
    );
    const flattened = StyleSheet.flatten(
      screen.getByRole("button").props.style,
    );
    expect(flattened.minWidth).toBeGreaterThanOrEqual(44);
    expect(flattened.minHeight).toBeGreaterThanOrEqual(44);
  });

  describe("initial-letter fallback", () => {
    it.each([
      ["Trophy Goal", "T"],
      ["apple", "A"],
      ["zebra crossing", "Z"],
      ["", "?"],
    ])("title %p renders %p", (title, expected) => {
      renderWithProviders(
        <BadgeWallCell badge={{ title, design: null }} onPress={() => {}} />,
      );
      expect(screen.getByText(expected)).toBeOnTheScreen();
    });
  });
});
