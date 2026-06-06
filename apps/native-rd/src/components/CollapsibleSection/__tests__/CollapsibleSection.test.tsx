import React, { useState } from "react";
import { Text } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { CollapsibleSection } from "../CollapsibleSection";

jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: "full" as const,
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  }),
}));

describe("CollapsibleSection", () => {
  it("starts expanded by default and renders children", () => {
    renderWithProviders(
      <CollapsibleSection title="Details">
        <Text>Child content</Text>
      </CollapsibleSection>,
    );
    expect(screen.getByText("Child content")).toBeOnTheScreen();
  });

  it("starts collapsed when defaultExpanded is false", () => {
    renderWithProviders(
      <CollapsibleSection title="Details" defaultExpanded={false}>
        <Text>Hidden content</Text>
      </CollapsibleSection>,
    );
    expect(screen.queryByText("Hidden content")).toBeNull();
  });

  it("toggles expanded state when header is pressed", () => {
    renderWithProviders(
      <CollapsibleSection title="Details">
        <Text>Toggleable content</Text>
      </CollapsibleSection>,
    );
    // Initially expanded
    expect(screen.getByText("Toggleable content")).toBeOnTheScreen();

    // Collapse
    fireEvent.press(screen.getByLabelText("Details, collapse"));
    expect(screen.queryByText("Toggleable content")).toBeNull();

    // Expand again
    fireEvent.press(screen.getByLabelText("Details, expand"));
    expect(screen.getByText("Toggleable content")).toBeOnTheScreen();
  });

  describe("accessibility", () => {
    it("has dynamic label reflecting expanded state", () => {
      renderWithProviders(
        <CollapsibleSection title="Section">
          <Text>Content</Text>
        </CollapsibleSection>,
      );
      expect(screen.getByLabelText("Section, collapse")).toBeOnTheScreen();

      fireEvent.press(screen.getByLabelText("Section, collapse"));
      expect(screen.getByLabelText("Section, expand")).toBeOnTheScreen();
    });

    it("tracks expanded state in accessibilityState", () => {
      renderWithProviders(
        <CollapsibleSection title="Section">
          <Text>Content</Text>
        </CollapsibleSection>,
      );
      const header = screen.getByRole("button", { name: "Section, collapse" });
      expect(header.props.accessibilityState).toEqual(
        expect.objectContaining({ expanded: true }),
      );

      fireEvent.press(header);
      const collapsed = screen.getByRole("button", { name: "Section, expand" });
      expect(collapsed.props.accessibilityState).toEqual(
        expect.objectContaining({ expanded: false }),
      );
    });

    it("uses translated expand/collapse verbs when provided", () => {
      renderWithProviders(
        <CollapsibleSection
          title="Section"
          expandLabel="öffnen"
          collapseLabel="schließen"
        >
          <Text>Content</Text>
        </CollapsibleSection>,
      );
      expect(screen.getByLabelText("Section, schließen")).toBeOnTheScreen();

      fireEvent.press(screen.getByLabelText("Section, schließen"));
      expect(screen.getByLabelText("Section, öffnen")).toBeOnTheScreen();
    });
  });

  describe("controlled mode", () => {
    it("renders expanded body when expanded prop is true", () => {
      renderWithProviders(
        <CollapsibleSection title="Section" expanded>
          <Text>Body</Text>
        </CollapsibleSection>,
      );
      expect(screen.getByText("Body")).toBeOnTheScreen();
    });

    it("renders collapsed body when expanded prop is false", () => {
      renderWithProviders(
        <CollapsibleSection title="Section" expanded={false}>
          <Text>Body</Text>
        </CollapsibleSection>,
      );
      expect(screen.queryByText("Body")).toBeNull();
    });

    it("calls onExpandedChange and follows parent — controlled caller can refuse to collapse", () => {
      // Press always proposes a toggle; if the parent ignores it, the
      // section stays open. This is the invariant the accordion relies on:
      // pressing the open section does NOT collapse it.
      const onExpandedChange = jest.fn();
      renderWithProviders(
        <CollapsibleSection
          title="Section"
          expanded
          onExpandedChange={onExpandedChange}
        >
          <Text>Body</Text>
        </CollapsibleSection>,
      );

      fireEvent.press(screen.getByLabelText("Section, collapse"));

      expect(onExpandedChange).toHaveBeenCalledWith(false);
      // Parent declined the change — body remains visible.
      expect(screen.getByText("Body")).toBeOnTheScreen();
    });

    it("parent owning state can switch which section is open", () => {
      function Harness() {
        const [open, setOpen] = useState<"a" | "b">("a");
        return (
          <>
            <CollapsibleSection
              title="A"
              expanded={open === "a"}
              onExpandedChange={(next) => {
                if (next) setOpen("a");
              }}
            >
              <Text>Body A</Text>
            </CollapsibleSection>
            <CollapsibleSection
              title="B"
              expanded={open === "b"}
              onExpandedChange={(next) => {
                if (next) setOpen("b");
              }}
            >
              <Text>Body B</Text>
            </CollapsibleSection>
          </>
        );
      }

      renderWithProviders(<Harness />);
      expect(screen.getByText("Body A")).toBeOnTheScreen();
      expect(screen.queryByText("Body B")).toBeNull();

      fireEvent.press(screen.getByLabelText("B, expand"));
      expect(screen.queryByText("Body A")).toBeNull();
      expect(screen.getByText("Body B")).toBeOnTheScreen();
    });
  });

  describe("summary", () => {
    it("renders string summary alongside the title", () => {
      renderWithProviders(
        <CollapsibleSection title="Shape" summary="Shield">
          <Text>Body</Text>
        </CollapsibleSection>,
      );
      expect(screen.getByText("Shield")).toBeOnTheScreen();
    });

    it("renders ReactNode summary as-is", () => {
      renderWithProviders(
        <CollapsibleSection
          title="Shape"
          summary={<Text testID="custom-summary">★ Shield</Text>}
        >
          <Text>Body</Text>
        </CollapsibleSection>,
      );
      expect(screen.getByTestId("custom-summary")).toBeOnTheScreen();
    });
  });

  describe("variant", () => {
    it("renders card variant without crashing and keeps the existing a11y contract", () => {
      renderWithProviders(
        <CollapsibleSection title="Card" variant="card" summary="Hello">
          <Text>Card body</Text>
        </CollapsibleSection>,
      );
      // The accessibility label, role, and state come from the same header,
      // regardless of variant.
      const header = screen.getByRole("button", { name: "Card, collapse" });
      expect(header.props.accessibilityState).toEqual(
        expect.objectContaining({ expanded: true }),
      );
      expect(screen.getByText("Card body")).toBeOnTheScreen();
    });
  });
});
