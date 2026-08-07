import React from "react";
import { Text } from "react-native";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { SettingsSection } from "../SettingsSection";

describe("SettingsSection", () => {
  it("inserts n-1 separators for n children", () => {
    renderWithProviders(
      <SettingsSection title="Section">
        <Text>A</Text>
        <Text>B</Text>
        <Text>C</Text>
      </SettingsSection>,
    );
    // 3 children -> 2 separators
    expect(screen.getAllByTestId("settings-separator")).toHaveLength(2);
  });

  it("renders no separator for a single child", () => {
    renderWithProviders(
      <SettingsSection title="Section">
        <Text>Only</Text>
      </SettingsSection>,
    );
    expect(screen.queryAllByTestId("settings-separator")).toHaveLength(0);
  });

  it("renders no separator with zero children", () => {
    renderWithProviders(
      <SettingsSection title="Section">{[]}</SettingsSection>,
    );
    expect(screen.queryAllByTestId("settings-separator")).toHaveLength(0);
  });

  describe("accessibility grouping (opt-in)", () => {
    it("exposes a radiogroup role + label when passed", () => {
      renderWithProviders(
        <SettingsSection
          title="Content Density"
          accessibilityRole="radiogroup"
          accessibilityLabel="Content density selection"
        >
          <Text>A</Text>
        </SettingsSection>,
      );
      // Queried via label, not getByRole: the container deliberately omits
      // `accessible` (so it doesn't swallow its rows) and RNTL's role query
      // only matches elements whose `accessible` prop is truthy.
      const group = screen.getByLabelText("Content density selection");
      expect(group.props.accessibilityRole).toBe("radiogroup");
    });

    it("never sets accessible on the rows container, so children stay reachable", () => {
      renderWithProviders(
        <SettingsSection
          title="Content Density"
          accessibilityRole="radiogroup"
          accessibilityLabel="Content density selection"
        >
          <Text>A</Text>
        </SettingsSection>,
      );
      // Regression guard for #500 — `accessible` collapses the whole section
      // into one VoiceOver node on iOS.
      expect(
        screen.getByLabelText("Content density selection").props.accessible,
      ).toBeUndefined();
    });

    it("exposes no group role by default", () => {
      renderWithProviders(
        <SettingsSection title="Section">
          <Text>A</Text>
        </SettingsSection>,
      );
      expect(screen.queryByRole("radiogroup")).toBeNull();
      expect(screen.queryByLabelText("Section")).toBeNull();
    });
  });
});
