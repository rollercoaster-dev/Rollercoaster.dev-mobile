import React from "react";
import {
  PathText,
  PATH_TEXT_FONT_SIZE_RATIO,
  PATH_TEXT_OPACITY,
} from "../text/PathText";
import type { PathTextProps } from "../text/PathText";
import { BadgeShape } from "../types";

const DARK_FILL = "#1a1a2e";
const LIGHT_FILL = "#fef3c7";
const SIZE = 256;

function makeProps(overrides: Partial<PathTextProps> = {}): PathTextProps {
  return {
    pathText: "TOP TEXT",
    pathTextBottom: "BOTTOM TEXT",
    pathTextPosition: "both",
    shape: "circle" as const,
    size: SIZE,
    fillColor: DARK_FILL,
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helpers need to traverse unknown element trees
type AnyElement = React.ReactElement<any>;

/** Flatten the element tree into a flat array of React elements */
function flatElements(el: AnyElement): AnyElement[] {
  const result: AnyElement[] = [el];
  const children = React.Children.toArray(el.props.children);
  for (const child of children) {
    if (React.isValidElement(child)) {
      result.push(...flatElements(child as AnyElement));
    }
  }
  return result;
}

/** Find all elements matching a displayName or type name */
function findByType(el: AnyElement, typeName: string): AnyElement[] {
  const all = flatElements(el);
  return all.filter((e) => {
    const type = e.type as { displayName?: string; name?: string } | string;
    if (typeof type === "string") return type === typeName;
    return type.displayName === typeName || type.name === typeName;
  });
}

describe("PathText", () => {
  // ── Null guards ──────────────────────────────────────────────────────

  it("returns null when both texts are undefined", () => {
    expect(
      PathText(makeProps({ pathText: undefined, pathTextBottom: undefined })),
    ).toBeNull();
  });

  it("returns null when both texts are empty strings", () => {
    expect(
      PathText(makeProps({ pathText: "", pathTextBottom: "" })),
    ).toBeNull();
  });

  it("returns null when both texts are whitespace", () => {
    expect(
      PathText(makeProps({ pathText: "   ", pathTextBottom: "   " })),
    ).toBeNull();
  });

  it("returns null when position is top but pathText is empty", () => {
    expect(
      PathText(
        makeProps({
          pathText: "",
          pathTextPosition: "top",
          pathTextBottom: "BOTTOM",
        }),
      ),
    ).toBeNull();
  });

  it("returns null when position is bottom but pathTextBottom is empty", () => {
    expect(
      PathText(
        makeProps({
          pathText: "TOP",
          pathTextPosition: "bottom",
          pathTextBottom: "",
        }),
      ),
    ).toBeNull();
  });

  // ── Position rendering ─────────────────────────────────────────────

  it('renders only top arc for position "top"', () => {
    const el = PathText(makeProps({ pathTextPosition: "top" }))!;
    const textPaths = findByType(el, "TextPath");
    expect(textPaths).toHaveLength(1);
    expect(textPaths[0].props.children).toBe("TOP TEXT");
  });

  it('renders only bottom arc for position "bottom"', () => {
    const el = PathText(makeProps({ pathTextPosition: "bottom" }))!;
    const textPaths = findByType(el, "TextPath");
    expect(textPaths).toHaveLength(1);
    expect(textPaths[0].props.children).toBe("BOTTOM TEXT");
  });

  it('renders both arcs for position "both"', () => {
    const el = PathText(makeProps({ pathTextPosition: "both" }))!;
    const textPaths = findByType(el, "TextPath");
    expect(textPaths).toHaveLength(2);
  });

  it("defaults to top arc when pathTextPosition is undefined", () => {
    const el = PathText(
      makeProps({ pathTextPosition: undefined, pathTextBottom: undefined }),
    )!;
    const textPaths = findByType(el, "TextPath");
    expect(textPaths).toHaveLength(1);
    expect(textPaths[0].props.children).toBe("TOP TEXT");
  });

  // ── SVG structure ──────────────────────────────────────────────────

  it("renders Defs with Path elements having unique ids", () => {
    const el = PathText(makeProps())!;
    const defs = findByType(el, "Defs");
    expect(defs).toHaveLength(1);

    const paths = findByType(defs[0], "Path");
    expect(paths.length).toBeGreaterThanOrEqual(2);
    const ids = paths.map((p) => p.props.id);
    expect(ids[0]).toMatch(/^pathtext-top-\d+$/);
    expect(ids[1]).toMatch(/^pathtext-bottom-\d+$/);
  });

  it("TextPath href references matching Defs path id", () => {
    const el = PathText(makeProps({ pathTextPosition: "top" }))!;
    const paths = findByType(el, "Path");
    const textPaths = findByType(el, "TextPath");

    const defPath = paths.find((p) =>
      String(p.props.id ?? "").startsWith("pathtext-top-"),
    );
    expect(defPath).toBeDefined();
    expect(textPaths[0].props.href).toBe(`#${String(defPath!.props.id)}`);
  });

  it("centers inscriptions on their arc paths", () => {
    const el = PathText(makeProps({ pathTextPosition: "both" }))!;
    const texts = findByType(el, "Text");
    const textPaths = findByType(el, "TextPath");

    expect(texts).toHaveLength(2);
    expect(texts[0].props.textAnchor).toBe("middle");
    expect(texts[1].props.textAnchor).toBe("middle");
    expect(textPaths[0].props.startOffset).toBe("50%");
    expect(textPaths[1].props.startOffset).toBe("50%");
  });

  it("keeps the top path distinct from the bottom path geometry", () => {
    const el = PathText(makeProps({ pathTextPosition: "both" }))!;
    const paths = findByType(el, "Path");
    const topPath = paths.find((p) =>
      String(p.props.id ?? "").startsWith("pathtext-top-"),
    );
    const bottomPath = paths.find((p) =>
      String(p.props.id ?? "").startsWith("pathtext-bottom-"),
    );

    expect(topPath).toBeDefined();
    expect(bottomPath).toBeDefined();
    expect(topPath!.props.d).not.toBe(bottomPath!.props.d);
    expect(topPath!.props.d).toMatch(/A [\d.]+ [\d.]+ 0 0 1 /);
    expect(bottomPath!.props.d).toMatch(/A [\d.]+ [\d.]+ 0 0 0 /);
  });

  it("renders top and bottom inscriptions without a wrapping rotate group", () => {
    // Previously a `<G transform="rotate(180 ...)">` wrapped both texts so
    // the legacy half-circle arcs would read right-side-up. Now arcs are
    // sized to text and oriented for natural reading direction, so the
    // rotation transform is removed and the texts render at the SVG root.
    const el = PathText(makeProps({ pathTextPosition: "both" }))!;
    const textPaths = findByType(el, "TextPath");
    const groups = findByType(el, "G");
    expect(groups).toHaveLength(0);
    expect(textPaths).toHaveLength(2);
    expect(textPaths[0].props.children).toBe("TOP TEXT");
    expect(textPaths[1].props.children).toBe("BOTTOM TEXT");
  });

  // ── Opacity ────────────────────────────────────────────────────────

  it("applies PATH_TEXT_OPACITY as fillOpacity", () => {
    const el = PathText(makeProps({ pathTextPosition: "top" }))!;
    const texts = findByType(el, "Text");
    expect(texts[0].props.fillOpacity).toBe(PATH_TEXT_OPACITY);
  });

  // ── Font size ──────────────────────────────────────────────────────

  it.each([128, 256, 512])("scales font size for badge size %d", (size) => {
    const el = PathText(makeProps({ size, pathTextPosition: "top" }))!;
    const texts = findByType(el, "Text");
    expect(texts[0].props.fontSize).toBe(size * PATH_TEXT_FONT_SIZE_RATIO);
  });

  // ── Font family ────────────────────────────────────────────────────

  it("uses DM Mono by default", () => {
    const el = PathText(makeProps({ pathTextPosition: "top" }))!;
    const texts = findByType(el, "Text");
    expect(texts[0].props.fontFamily).toBe("DM Mono");
  });

  it("accepts custom fontFamily", () => {
    const el = PathText(
      makeProps({ pathTextPosition: "top", fontFamily: "Lexend" }),
    )!;
    const texts = findByType(el, "Text");
    expect(texts[0].props.fontFamily).toBe("Lexend");
  });

  // ── Color contrast ─────────────────────────────────────────────────

  it("uses white text on dark fill", () => {
    const el = PathText(
      makeProps({ fillColor: DARK_FILL, pathTextPosition: "top" }),
    )!;
    const texts = findByType(el, "Text");
    expect(texts[0].props.fill).toBe("#FFFFFF");
  });

  it("uses black text on light fill", () => {
    const el = PathText(
      makeProps({ fillColor: LIGHT_FILL, pathTextPosition: "top" }),
    )!;
    const texts = findByType(el, "Text");
    expect(texts[0].props.fill).toBe("#000000");
  });

  // ── All shapes ─────────────────────────────────────────────────────

  const ALL_SHAPES = Object.values(BadgeShape);

  test.each(ALL_SHAPES)('renders without throwing for shape "%s"', (shape) => {
    expect(() =>
      PathText(makeProps({ shape, pathTextPosition: "both" })),
    ).not.toThrow();
  });

  // ── Text centering ─────────────────────────────────────────────────

  it("sizes the top arc's angular sweep to the text width", () => {
    // Short and long inscriptions still produce distinct arc geometries; the
    // text is then centered on that arc by TextPath startOffset/textAnchor.
    const elShort = PathText(
      makeProps({ pathText: "AB", pathTextPosition: "top" }),
    )!;
    const elLong = PathText(
      makeProps({ pathText: "ACHIEVEMENT UNLOCKED", pathTextPosition: "top" }),
    )!;
    const shortPaths = findByType(elShort, "Path");
    const longPaths = findByType(elLong, "Path");
    const shortTopPath = shortPaths.find((p) =>
      String(p.props.id ?? "").startsWith("pathtext-top-"),
    );
    const longTopPath = longPaths.find((p) =>
      String(p.props.id ?? "").startsWith("pathtext-top-"),
    );
    expect(shortTopPath).toBeDefined();
    expect(longTopPath).toBeDefined();
    expect(shortTopPath!.props.d).not.toBe(longTopPath!.props.d);
  });
});
