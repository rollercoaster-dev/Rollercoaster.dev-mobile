import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { CollapsibleSection } from "../CollapsibleSection";

/** Flatten the Animated.View's style and pull just the keys we want to assert. */
function getContentStyleKeys(keys: readonly string[]): Record<string, unknown> {
  const node = screen.getByTestId("collapsible-content");
  const flat = StyleSheet.flatten(node.props.style) as Record<
    string,
    unknown
  > | null;
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = flat?.[k];
  return out;
}

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

    it("calls onExpandedChange and reflects only the expanded prop in controlled mode", () => {
      // Controlled-mode contract: pressing always proposes a toggle via
      // onExpandedChange, and the rendered open/closed state is driven
      // solely by the `expanded` prop. If the parent declines to update
      // the prop, the section stays in its current state.
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

    it("announces string summary via accessibilityHint", () => {
      // Without a hint, the visual summary Text is silent because the
      // Pressable header is `accessible` and only exposes its label.
      renderWithProviders(
        <CollapsibleSection title="Shape" summary="Shield">
          <Text>Body</Text>
        </CollapsibleSection>,
      );
      const header = screen.getByRole("button", { name: "Shape, collapse" });
      expect(header.props.accessibilityHint).toBe("Shield");
    });

    it("respects explicit accessibilityHint over summary", () => {
      renderWithProviders(
        <CollapsibleSection
          title="Shape"
          summary="Shield"
          accessibilityHint="Shield, with stars"
        >
          <Text>Body</Text>
        </CollapsibleSection>,
      );
      const header = screen.getByRole("button", { name: "Shape, collapse" });
      expect(header.props.accessibilityHint).toBe("Shield, with stars");
    });

    it("suppresses the auto hint when accessibilityHint is null", () => {
      renderWithProviders(
        <CollapsibleSection
          title="Shape"
          summary="Shield"
          accessibilityHint={null}
        >
          <Text>Body</Text>
        </CollapsibleSection>,
      );
      const header = screen.getByRole("button", { name: "Shape, collapse" });
      expect(header.props.accessibilityHint).toBeUndefined();
    });
  });

  describe("testID", () => {
    it("does not emit a default content testID", () => {
      // Multiple CollapsibleSections in a tree must not collide. Callers
      // opt in by passing testID; default omits it entirely.
      renderWithProviders(
        <CollapsibleSection title="Section">
          <Text>Body</Text>
        </CollapsibleSection>,
      );
      expect(screen.queryByTestId("collapsible-content")).toBeNull();
    });

    it("derives content testID from the prop", () => {
      renderWithProviders(
        <CollapsibleSection title="Section" testID="shape">
          <Text>Body</Text>
        </CollapsibleSection>,
      );
      expect(screen.getByTestId("shape-content")).toBeOnTheScreen();
    });
  });

  describe("animated content style (regression)", () => {
    // The original implementation tried to animate maxHeight between 0 (when
    // collapsed) and `undefined` (when expanded). On native, Reanimated does
    // not reliably clear a previously-applied numeric style prop by setting
    // it back to `undefined`, so opened sections stayed clamped at 0px — the
    // bug surfaced as "accordions open but show no content" in the badge
    // designer. All previous tests still passed because RTL never runs the
    // native layout engine and only checks whether children are in the React
    // tree. This suite asserts the contract directly: the animated style
    // must NEVER set a numeric `maxHeight` (or any other height clamp) on
    // the content view in any state.
    it.each([
      ["collapsed", false],
      ["expanded", true],
    ] as const)("does not clamp height when %s", (_label, expanded) => {
      renderWithProviders(
        <CollapsibleSection
          title="Section"
          expanded={expanded}
          testID="collapsible"
        >
          <Text>Body</Text>
        </CollapsibleSection>,
      );
      const style = getContentStyleKeys(["maxHeight", "height"]);
      expect(typeof style.maxHeight).not.toBe("number");
      expect(typeof style.height).not.toBe("number");
    });

    it("does not clamp height after pressing the header to open", () => {
      function Harness() {
        const [open, setOpen] = useState(false);
        return (
          <CollapsibleSection
            title="Section"
            expanded={open}
            onExpandedChange={setOpen}
            testID="collapsible"
          >
            <Text>Body</Text>
          </CollapsibleSection>
        );
      }
      renderWithProviders(<Harness />);
      fireEvent.press(screen.getByLabelText("Section, expand"));
      const style = getContentStyleKeys(["maxHeight", "height"]);
      expect(typeof style.maxHeight).not.toBe("number");
      expect(typeof style.height).not.toBe("number");
    });
  });
});
