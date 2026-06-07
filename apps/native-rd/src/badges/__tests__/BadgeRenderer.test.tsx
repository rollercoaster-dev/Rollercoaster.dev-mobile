/**
 * Tests for the BadgeRenderer component.
 *
 * Verifies layer composition (shadow + shape + icon), icon color contrast,
 * accessibility attributes, size scaling, and theme variant behavior.
 */

import React from "react";
import { renderWithProviders, screen } from "../../__tests__/test-utils";
import { BadgeRenderer } from "../BadgeRenderer";
import type { BadgeDesign } from "../types";
import {
  BadgeShape,
  BadgeFrame,
  BadgeIconWeight,
  BADGE_COLOR_THEME_SENTINEL,
} from "../types";
import { BANNER_HEIGHT_RATIO, BANNER_TOP_VISIBLE_RATIO } from "../text/Banner";
import { getBottomLabelBottomOverflow } from "../text/BottomLabel";
import { getSafeTextColor } from "../../utils/accessibility";
import { mockTheme } from "../../__tests__/mocks/unistyles";

// Mock the icon registry instead of phosphor-react-native directly.
// phosphor-react-native v3 changed its export structure, so mocking the
// library module can fail on CI while passing locally. Mocking the registry
// gives us a stable seam that works regardless of the library internals.
jest.mock("../iconRegistry", () => {
  const React = require("react");
  const { View, Text } = require("react-native");

  const createMockIcon = (name: string) => {
    const MockIcon: React.FC<{
      size?: number;
      weight?: string;
      color?: string;
      duotoneOpacity?: number;
      testID?: string;
    }> = ({ size, weight, color, duotoneOpacity, testID }) => (
      <View
        testID={testID ?? `icon-${name}`}
        accessibilityLabel={`${name} icon`}
        accessibilityHint={`size=${size} weight=${weight} color=${color} duotoneOpacity=${duotoneOpacity}`}
      >
        <Text>{name}</Text>
      </View>
    );
    MockIcon.displayName = name;
    return MockIcon;
  };

  const iconNames = [
    "Trophy",
    "Medal",
    "Star",
    "Crown",
    "Heart",
    "Book",
    "Code",
    "Brain",
    "Rocket",
    "Fire",
  ];

  const registry: Record<string, unknown> = {};
  for (const name of iconNames) {
    registry[name] = createMockIcon(name);
  }

  return {
    ICON_REGISTRY: registry,
    getIconComponent: (name: string) => registry[name],
    getRegisteredIconNames: () => Object.keys(registry),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createDesign(overrides: Partial<BadgeDesign> = {}): BadgeDesign {
  return {
    shape: BadgeShape.circle,
    frame: BadgeFrame.none,
    color: "#a78bfa",
    iconName: "Trophy",
    iconWeight: BadgeIconWeight.regular,
    title: "Test Badge",
    centerMode: "icon" as const,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BadgeRenderer", () => {
  it("renders with correct accessibility label including title and shape", () => {
    renderWithProviders(
      <BadgeRenderer
        design={createDesign({ title: "My Badge", shape: BadgeShape.hexagon })}
      />,
    );

    const badge = screen.getByTestId("badge-renderer");
    expect(badge).toBeOnTheScreen();
    expect(badge.props.accessibilityLabel).toBe(
      "My Badge badge, hexagon shape",
    );
  });

  it("has image accessibility role", () => {
    renderWithProviders(<BadgeRenderer design={createDesign()} />);

    const badge = screen.getByTestId("badge-renderer");
    expect(badge.props.accessibilityRole).toBe("image");
  });

  it("renders the icon component", () => {
    renderWithProviders(
      <BadgeRenderer design={createDesign({ iconName: "Trophy" })} />,
    );

    expect(screen.getByText("Trophy")).toBeOnTheScreen();
  });

  it("passes the correct icon weight", () => {
    renderWithProviders(
      <BadgeRenderer
        design={createDesign({
          iconName: "Trophy",
          iconWeight: BadgeIconWeight.bold,
        })}
      />,
    );

    const icon = screen.getByLabelText("Trophy icon");
    expect(icon.props.accessibilityHint).toContain("weight=bold");
  });

  it("passes opacity only to duotone icons", () => {
    const { rerender } = renderWithProviders(
      <BadgeRenderer
        design={createDesign({
          iconWeight: BadgeIconWeight.duotone,
          iconDuotoneOpacity: 0.6,
        })}
      />,
    );
    expect(
      screen.getByLabelText("Trophy icon").props.accessibilityHint,
    ).toContain("duotoneOpacity=0.6");

    rerender(
      <BadgeRenderer
        design={createDesign({
          iconWeight: BadgeIconWeight.bold,
          iconDuotoneOpacity: 0.6,
        })}
      />,
    );
    expect(
      screen.getByLabelText("Trophy icon").props.accessibilityHint,
    ).toContain("duotoneOpacity=undefined");
  });

  it("calculates icon color for WCAG AA contrast against dark fill", () => {
    // Dark fill -> should use white icon
    renderWithProviders(
      <BadgeRenderer
        design={createDesign({ color: "#1a1a2e", iconName: "Trophy" })}
      />,
    );

    const icon = screen.getByLabelText("Trophy icon");
    const expectedColor = getSafeTextColor("#1a1a2e");
    expect(expectedColor).toBe("#FFFFFF");
    expect(icon.props.accessibilityHint).toContain(`color=${expectedColor}`);
  });

  it("calculates icon color for WCAG AA contrast against light fill", () => {
    // Light fill -> should use black icon
    renderWithProviders(
      <BadgeRenderer
        design={createDesign({ color: "#fef3c7", iconName: "Star" })}
      />,
    );

    const icon = screen.getByLabelText("Star icon");
    const expectedColor = getSafeTextColor("#fef3c7");
    expect(expectedColor).toBe("#000000");
    expect(icon.props.accessibilityHint).toContain(`color=${expectedColor}`);
  });

  it("accepts a custom size prop (without shadow)", () => {
    renderWithProviders(
      <BadgeRenderer design={createDesign()} size={128} showShadow={false} />,
    );

    const badge = screen.getByTestId("badge-renderer");
    expect(badge.props.width).toBe(128);
    expect(badge.props.height).toBe(128);
  });

  it("uses default size of 256 when not specified (without shadow)", () => {
    renderWithProviders(
      <BadgeRenderer design={createDesign()} showShadow={false} />,
    );

    const badge = screen.getByTestId("badge-renderer");
    expect(badge.props.width).toBe(256);
    expect(badge.props.height).toBe(256);
  });

  it("width/height expand to include shadow offset when shadow is visible", () => {
    renderWithProviders(
      <BadgeRenderer design={createDesign()} size={200} showShadow={true} />,
    );

    const badge = screen.getByTestId("badge-renderer");
    // totalSize = size + SHADOW_OFFSET (5)
    expect(badge.props.width).toBe(205);
    expect(badge.props.height).toBe(205);
  });

  it("width/height equal size when shadow is hidden", () => {
    renderWithProviders(
      <BadgeRenderer design={createDesign()} size={200} showShadow={false} />,
    );

    const badge = screen.getByTestId("badge-renderer");
    expect(badge.props.width).toBe(200);
    expect(badge.props.height).toBe(200);
  });

  it("expands upward when a top banner sits above the badge", () => {
    const size = 200;
    renderWithProviders(
      <BadgeRenderer
        design={createDesign({
          banner: { text: "WINNER", position: "top" },
        })}
        size={size}
        showShadow={false}
      />,
    );

    const badge = screen.getByTestId("badge-renderer");
    const topOverflow =
      size * BANNER_HEIGHT_RATIO * (1 - BANNER_TOP_VISIBLE_RATIO);
    expect(badge.props.width).toBe(size);
    expect(badge.props.height).toBeCloseTo(size + topOverflow, 5);
  });

  it("expands downward when the bottom label sits below the badge", () => {
    const size = 200;
    renderWithProviders(
      <BadgeRenderer
        design={createDesign({ bottomLabel: "EXPERT" })}
        size={size}
        showShadow={false}
      />,
    );

    const badge = screen.getByTestId("badge-renderer");
    expect(badge.props.width).toBe(size);
    expect(badge.props.height).toBeCloseTo(
      size + getBottomLabelBottomOverflow(size),
      5,
    );
  });

  it("icon size scales with badge size (~45%)", () => {
    const size = 200;
    renderWithProviders(
      <BadgeRenderer
        design={createDesign({ iconName: "Trophy" })}
        size={size}
      />,
    );

    const icon = screen.getByLabelText("Trophy icon");
    const expectedIconSize = Math.round(size * 0.45);
    expect(icon.props.accessibilityHint).toContain(`size=${expectedIconSize}`);
  });

  it("accepts custom testID", () => {
    renderWithProviders(
      <BadgeRenderer design={createDesign()} testID="custom-badge" />,
    );

    expect(screen.getByTestId("custom-badge")).toBeOnTheScreen();
  });

  describe("shadow behavior", () => {
    it("renders fewer SVG children when shadow is hidden", () => {
      const { toJSON: withShadow } = renderWithProviders(
        <BadgeRenderer design={createDesign()} showShadow={true} />,
      );
      const withShadowCount = countElements(withShadow());

      const { toJSON: noShadow } = renderWithProviders(
        <BadgeRenderer design={createDesign()} showShadow={false} />,
      );
      const noShadowCount = countElements(noShadow());

      // Without shadow should have fewer elements (missing the shadow Path)
      expect(noShadowCount).toBeLessThan(withShadowCount);
    });

    it("shadow adds exactly one extra element", () => {
      const { toJSON: withShadow } = renderWithProviders(
        <BadgeRenderer design={createDesign()} showShadow={true} />,
      );
      const withShadowCount = countElements(withShadow());

      const { toJSON: noShadow } = renderWithProviders(
        <BadgeRenderer design={createDesign()} showShadow={false} />,
      );
      const noShadowCount = countElements(noShadow());

      // Shadow layer is exactly 1 extra Path element
      expect(withShadowCount - noShadowCount).toBe(1);
    });
  });

  describe("all shapes render", () => {
    const shapes = Object.values(BadgeShape);

    test.each(shapes)("renders %s shape without errors", (shape) => {
      renderWithProviders(
        <BadgeRenderer
          design={createDesign({ shape, title: `${shape} badge` })}
          testID={`badge-${shape}`}
        />,
      );

      expect(screen.getByTestId(`badge-${shape}`)).toBeOnTheScreen();
    });
  });

  it("gracefully handles an unknown icon name", () => {
    renderWithProviders(
      <BadgeRenderer design={createDesign({ iconName: "NonExistentIcon" })} />,
    );

    // Should render without crashing — just no icon
    const badge = screen.getByTestId("badge-renderer");
    expect(badge).toBeOnTheScreen();
  });

  describe("monogram mode", () => {
    it("renders monogram text and hides icon when centerMode is monogram", () => {
      const { toJSON } = renderWithProviders(
        <BadgeRenderer
          design={createDesign({
            centerMode: "monogram" as const,
            monogram: "AB",
            iconName: "Trophy",
          })}
        />,
      );

      const tree = JSON.stringify(toJSON());
      // Monogram text should be present
      expect(tree).toContain("AB");
      // Icon should NOT be rendered in monogram mode
      expect(screen.queryByText("Trophy")).toBeNull();
    });

    it("still renders icon when centerMode is icon", () => {
      renderWithProviders(
        <BadgeRenderer
          design={createDesign({
            centerMode: "icon" as const,
            iconName: "Trophy",
          })}
        />,
      );

      expect(screen.getByText("Trophy")).toBeOnTheScreen();
    });

    it("falls back to icon when centerMode is monogram but monogram is empty", () => {
      renderWithProviders(
        <BadgeRenderer
          design={createDesign({
            centerMode: "monogram" as const,
            monogram: "",
            iconName: "Trophy",
          })}
        />,
      );

      // Should fall back to icon rendering
      expect(screen.getByText("Trophy")).toBeOnTheScreen();
    });

    it("does not crash when centerMode is monogram with unknown iconName", () => {
      renderWithProviders(
        <BadgeRenderer
          design={createDesign({
            centerMode: "monogram" as const,
            monogram: "X",
            iconName: "NonExistent",
          })}
        />,
      );

      expect(screen.getByTestId("badge-renderer")).toBeOnTheScreen();
    });
  });

  describe("BottomLabel", () => {
    it("renders the label text when bottomLabel is set", () => {
      const { toJSON } = renderWithProviders(
        <BadgeRenderer
          design={createDesign({ bottomLabel: "Runner Up" })}
          showShadow={false}
        />,
      );

      expect(JSON.stringify(toJSON())).toContain("Runner Up");
    });

    it("does not render label text when bottomLabel is absent", () => {
      const { toJSON } = renderWithProviders(
        <BadgeRenderer design={createDesign()} showShadow={false} />,
      );

      expect(JSON.stringify(toJSON())).not.toContain("Runner Up");
    });

    it("renders monogram with BottomLabel without errors", () => {
      const { toJSON } = renderWithProviders(
        <BadgeRenderer
          design={createDesign({
            centerMode: "monogram" as const,
            monogram: "X",
            bottomLabel: "Novice",
          })}
        />,
      );

      const tree = JSON.stringify(toJSON());
      expect(tree).toContain("X");
      expect(tree).toContain("Novice");
    });
  });

  describe("custom color resolution", () => {
    // react-native-svg converts hex color strings into a packed AARRGGBB
    // integer wrapped as `{ type: 0, payload: <uint32> }` by the time props
    // hit toJSON(). Normalise back to a lowercase `#rrggbb` so assertions
    // stay readable.
    function payloadToHex(value: unknown): string | null {
      if (
        typeof value === "object" &&
        value !== null &&
        "payload" in value &&
        typeof (value as { payload: unknown }).payload === "number"
      ) {
        const rgb = (value as { payload: number }).payload & 0xffffff;
        return "#" + rgb.toString(16).padStart(6, "0");
      }
      if (typeof value === "string") return value.toLowerCase();
      return null;
    }

    type Json = ReturnType<ReturnType<typeof renderWithProviders>["toJSON"]>;

    function walk(node: Json, visit: (props: Record<string, unknown>) => void) {
      if (!node) return;
      if (Array.isArray(node)) {
        for (const child of node) walk(child, visit);
        return;
      }
      if (typeof node === "string") return;
      if (node.props) visit(node.props as Record<string, unknown>);
      if (node.children) {
        for (const child of node.children) walk(child as Json, visit);
      }
    }

    function findShapeStrokeHex(json: Json): string | null {
      // Shape Path is the unique node carrying both a fill (= design.color)
      // and a stroke. The shadow Path has fill="#000000" without stroke;
      // frame strokes have stroke without fill.
      const hits: string[] = [];
      walk(json, (props) => {
        if ("fill" in props && "stroke" in props) {
          const hex = payloadToHex(props.stroke);
          if (hex) hits.push(hex);
        }
      });
      return hits[0] ?? null;
    }

    function findAllStrokeHexes(json: Json): string[] {
      const hexes: string[] = [];
      walk(json, (props) => {
        if ("stroke" in props) {
          const hex = payloadToHex(props.stroke);
          if (hex) hexes.push(hex);
        }
      });
      return hexes;
    }

    function findAllFillHexes(json: Json): string[] {
      const hexes: string[] = [];
      walk(json, (props) => {
        if ("fill" in props) {
          const hex = payloadToHex(props.fill);
          if (hex) hexes.push(hex);
        }
      });
      return hexes;
    }

    it("shape stroke equals theme.colors.border when borderColor is the theme sentinel", () => {
      const { toJSON } = renderWithProviders(
        <BadgeRenderer
          design={createDesign({ borderColor: BADGE_COLOR_THEME_SENTINEL })}
          showShadow={false}
        />,
      );
      expect(findShapeStrokeHex(toJSON())).toBe(
        mockTheme.colors.border.toLowerCase(),
      );
    });

    it("shape stroke equals theme.colors.border when borderColor is absent", () => {
      const { toJSON } = renderWithProviders(
        <BadgeRenderer design={createDesign()} showShadow={false} />,
      );
      expect(findShapeStrokeHex(toJSON())).toBe(
        mockTheme.colors.border.toLowerCase(),
      );
    });

    it("shape stroke uses the explicit hex when borderColor is a hex string", () => {
      const { toJSON } = renderWithProviders(
        <BadgeRenderer
          design={createDesign({ borderColor: "#ff0000" })}
          showShadow={false}
        />,
      );
      expect(findShapeStrokeHex(toJSON())).toBe("#ff0000");
    });

    const FRAME_PARAMS = {
      variant: 1,
      stepCount: 2,
      evidenceCount: 0,
      daysToComplete: 0,
      evidenceTypes: 0,
    } as const;

    it("frame strokes fall back to theme.colors.border when frameColor is absent", () => {
      const { toJSON } = renderWithProviders(
        <BadgeRenderer
          design={createDesign({
            frame: BadgeFrame.boldBorder,
            frameParams: { ...FRAME_PARAMS },
            borderColor: "#ff0000",
          })}
          showShadow={false}
        />,
      );
      // Shape stroke is red; every frame stroke must be the theme border.
      const strokes = findAllStrokeHexes(toJSON());
      const themeBorder = mockTheme.colors.border.toLowerCase();
      const frameStrokes = strokes.filter((s) => s !== "#ff0000");
      expect(frameStrokes.length).toBeGreaterThan(0);
      for (const s of frameStrokes) expect(s).toBe(themeBorder);
    });

    it("frame strokes use frameColor hex when provided, independent of borderColor", () => {
      const { toJSON } = renderWithProviders(
        <BadgeRenderer
          design={createDesign({
            frame: BadgeFrame.boldBorder,
            frameParams: { ...FRAME_PARAMS },
            borderColor: "#ff0000",
            frameColor: "#00ff00",
          })}
          showShadow={false}
        />,
      );
      const strokes = findAllStrokeHexes(toJSON());
      expect(strokes).toContain("#ff0000"); // shape
      expect(strokes).toContain("#00ff00"); // frame
      // Frame paints multiple concentric rings; assert > 0 are green.
      expect(strokes.filter((s) => s === "#00ff00").length).toBeGreaterThan(0);
    });

    it("banner stroke stays on theme.colors.border regardless of borderColor / frameColor", () => {
      const { toJSON } = renderWithProviders(
        <BadgeRenderer
          design={createDesign({
            banner: { text: "WINNER", position: "top" },
            borderColor: "#ff0000",
            frameColor: "#00ff00",
          })}
          showShadow={false}
        />,
      );
      const strokes = findAllStrokeHexes(toJSON());
      // Banner contributes a theme-border stroke even when the shape stroke
      // is overridden — the banner is no longer scope-driven.
      expect(strokes).toContain(mockTheme.colors.border.toLowerCase());
    });

    it("icon color uses an explicit iconColor hex when set", () => {
      renderWithProviders(
        <BadgeRenderer
          design={createDesign({
            iconName: "Trophy",
            color: "#1a1a2e",
            iconColor: "#abcdef",
          })}
        />,
      );
      const icon = screen.getByLabelText("Trophy icon");
      expect(icon.props.accessibilityHint).toContain("color=#abcdef");
    });

    it("icon color falls back to getSafeTextColor when iconColor is absent", () => {
      renderWithProviders(
        <BadgeRenderer
          design={createDesign({ iconName: "Trophy", color: "#1a1a2e" })}
        />,
      );
      const icon = screen.getByLabelText("Trophy icon");
      const expected = getSafeTextColor("#1a1a2e");
      expect(icon.props.accessibilityHint).toContain(`color=${expected}`);
    });

    it("icon color falls back to getSafeTextColor when iconColor is the theme sentinel", () => {
      renderWithProviders(
        <BadgeRenderer
          design={createDesign({
            iconName: "Trophy",
            color: "#1a1a2e",
            iconColor: BADGE_COLOR_THEME_SENTINEL,
          })}
        />,
      );
      const icon = screen.getByLabelText("Trophy icon");
      const expected = getSafeTextColor("#1a1a2e");
      expect(icon.props.accessibilityHint).toContain(`color=${expected}`);
    });

    it("monogram text uses the same resolved iconColor", () => {
      const { toJSON } = renderWithProviders(
        <BadgeRenderer
          design={createDesign({
            centerMode: "monogram" as const,
            monogram: "Z",
            iconColor: "#abcdef",
            color: "#1a1a2e",
          })}
          showShadow={false}
        />,
      );
      // MonogramCenter renders <SvgText fill={textColor}> — find a node whose
      // `fill` is the requested icon color.
      expect(findAllFillHexes(toJSON())).toContain("#abcdef");
    });
  });

  describe("SVG element count", () => {
    it("stays under 50 elements per badge (with shadow)", () => {
      // With shadow: 1 Svg + 1 shadow Path + 1 shape Path + 1 G + 1 Icon = 5 elements
      // Well under the 50-element budget
      const { toJSON } = renderWithProviders(
        <BadgeRenderer design={createDesign()} showShadow={true} />,
      );

      const json = toJSON();
      const elementCount = countElements(json);
      expect(elementCount).toBeLessThan(50);
    });

    it("stays under 50 elements per badge (without shadow)", () => {
      const { toJSON } = renderWithProviders(
        <BadgeRenderer design={createDesign()} showShadow={false} />,
      );

      const json = toJSON();
      const elementCount = countElements(json);
      expect(elementCount).toBeLessThan(50);
    });
  });
});

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Recursively count elements in a React test renderer JSON tree */
function countElements(
  node: ReturnType<ReturnType<typeof renderWithProviders>["toJSON"]>,
): number {
  if (!node) return 0;
  if (Array.isArray(node)) {
    return node.reduce((sum, child) => sum + countElements(child), 0);
  }
  if (typeof node === "string") return 0;
  let count = 1; // this node
  if (node.children) {
    for (const child of node.children) {
      count += countElements(child as typeof node);
    }
  }
  return count;
}
