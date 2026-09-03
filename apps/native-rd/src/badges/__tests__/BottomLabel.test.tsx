import type { ReactElement } from "react";
import { Rect } from "react-native-svg";
import {
  BottomLabel,
  BOTTOM_LABEL_HORIZONTAL_PADDING,
  BOTTOM_LABEL_INPUT_MAX_CHARS,
  BOTTOM_LABEL_PLATE_BORDER_WIDTH,
  BOTTOM_LABEL_SIZE_RATIO,
  BOTTOM_LABEL_TOP_MARGIN_RATIO,
  getBottomLabelAvailableWidth,
  getBottomLabelBottomOverflow,
  getBottomLabelFontSize,
  getBottomLabelPlateBox,
  getBottomLabelY,
  type BottomLabelProps,
} from "../text/BottomLabel";
import { measureTextWidth } from "../text/measureTextWidth";

const DARK_FILL = "#1a1a2e";
const LIGHT_FILL = "#fef3c7";
const BORDER = "#3a2d5c";

type SvgProps = Record<string, string | number | undefined>;
type RenderProps = Omit<BottomLabelProps, "borderColor"> &
  Partial<Pick<BottomLabelProps, "borderColor">>;

/**
 * BottomLabel renders a fragment of a plate Rect and a label Text. Pick them
 * by element type so a reorder of the fragment can't silently swap the two.
 */
function render(props: RenderProps) {
  const el = BottomLabel({ borderColor: BORDER, ...props }) as ReactElement<{
    children: ReactElement<SvgProps>[];
  }>;
  const plate = el.props.children.find((child) => child.type === Rect);
  const text = el.props.children.find((child) => child.type !== Rect);
  if (!plate || !text)
    throw new Error("BottomLabel did not render plate + text");
  return { plate, text };
}

describe("BottomLabel", () => {
  // ── Null guards ──────────────────────────────────────────────────────

  it.each([
    ["undefined", undefined],
    ["empty string", ""],
    ["whitespace only", "   "],
  ])("returns null for %s label", (_desc, label) => {
    const result = BottomLabel({
      label,
      size: 256,
      fillColor: DARK_FILL,
      borderColor: BORDER,
    });
    expect(result).toBeNull();
  });

  // ── Font size ────────────────────────────────────────────────────────

  it.each([128, 256])("scales font size for badge size %d", (size) => {
    const { text: el } = render({ label: "Test", size, fillColor: DARK_FILL });
    expect(el.props.fontSize).toBe(size * BOTTOM_LABEL_SIZE_RATIO);
  });

  // ── Positioning ──────────────────────────────────────────────────────

  it("centers horizontally", () => {
    const { text: el } = render({
      label: "Test",
      size: 256,
      fillColor: DARK_FILL,
    });
    expect(el.props.x).toBe(128);
    expect(el.props.textAnchor).toBe("middle");
  });

  it("positions below badge center", () => {
    const { text: el } = render({
      label: "Test",
      size: 256,
      fillColor: DARK_FILL,
    });
    expect(el.props.y).toBeCloseTo(getBottomLabelY(256), 5);
  });

  it("keeps a small margin between the badge edge and the plate", () => {
    const plate = getBottomLabelPlateBox("Test", 256);
    expect(plate.y).toBeCloseTo(256 + 256 * BOTTOM_LABEL_TOP_MARGIN_RATIO, 5);
  });

  it("scales font size with scale prop", () => {
    const { text: el } = render({
      label: "Test",
      size: 256,
      fillColor: DARK_FILL,
      scale: 0.72,
    });
    expect(el.props.fontSize).toBeCloseTo(
      256 * BOTTOM_LABEL_SIZE_RATIO * 0.72,
      5,
    );
  });

  it("adjusts y position when scale changes", () => {
    const { text: defaultEl } = render({
      label: "Test",
      size: 256,
      fillColor: DARK_FILL,
    });
    const { text: scaledEl } = render({
      label: "Test",
      size: 256,
      fillColor: DARK_FILL,
      scale: 0.72,
    });
    // Smaller scale → smaller fontSize → y moves up (closer to badge edge)
    expect(scaledEl.props.y).toBeLessThan(Number(defaultEl.props.y));
  });

  // ── Color contrast ───────────────────────────────────────────────────

  it("uses white text on dark fill", () => {
    const { text: el } = render({
      label: "Test",
      size: 256,
      fillColor: DARK_FILL,
    });
    expect(el.props.fill).toBe("#FFFFFF");
  });

  it("uses black text on light fill", () => {
    const { text: el } = render({
      label: "Test",
      size: 256,
      fillColor: LIGHT_FILL,
    });
    expect(el.props.fill).toBe("#000000");
  });

  // ── Font attributes ──────────────────────────────────────────────────

  it("uses Instrument Sans font by default", () => {
    const { text: el } = render({
      label: "Test",
      size: 256,
      fillColor: DARK_FILL,
    });
    expect(el.props.fontFamily).toBe("Instrument Sans");
  });

  it("accepts custom fontFamily", () => {
    const { text: el } = render({
      label: "Test",
      size: 256,
      fillColor: DARK_FILL,
      fontFamily: "Lexend",
    });
    expect(el.props.fontFamily).toBe("Lexend");
  });

  // ── Label sizing ─────────────────────────────────────────────────────

  it("extends the label cap beyond the old 10-character limit", () => {
    const { text: el } = render({
      label: "This is too long",
      size: 256,
      fillColor: DARK_FILL,
    });
    expect(el.props.children).toBe("This is too long");
  });

  it("still applies an input-length safety cap", () => {
    const longLabel = "A".repeat(BOTTOM_LABEL_INPUT_MAX_CHARS + 5);
    const { text: el } = render({
      label: longLabel,
      size: 256,
      fillColor: DARK_FILL,
    });
    expect(el.props.children).toHaveLength(BOTTOM_LABEL_INPUT_MAX_CHARS);
  });

  it("sizes long labels to the frame width with 4px horizontal padding", () => {
    const label = "This is too long";
    const size = 256;
    const fontSize = getBottomLabelFontSize(label, size);
    const renderedWidth = measureTextWidth(label, fontSize);

    expect(getBottomLabelAvailableWidth(size)).toBe(
      size - BOTTOM_LABEL_HORIZONTAL_PADDING * 2,
    );
    // Allow tiny FP drift from the shrink ratio (availableWidth / measuredWidth).
    expect(renderedWidth).toBeLessThanOrEqual(
      getBottomLabelAvailableWidth(size) + 1e-9,
    );
  });

  // ── Plate ────────────────────────────────────────────────────────────

  it("draws a plate in the badge color behind the text", () => {
    const { plate, text } = render({
      label: "Test",
      size: 256,
      fillColor: DARK_FILL,
      borderColor: "#123456",
    });
    expect(plate.props.fill).toBe(DARK_FILL);
    expect(plate.props.stroke).toBe("#123456");
    expect(plate.props.strokeWidth).toBe(BOTTOM_LABEL_PLATE_BORDER_WIDTH);
    // Text is centered on the plate.
    expect(text.props.y).toBeCloseTo(
      Number(plate.props.y) -
        BOTTOM_LABEL_PLATE_BORDER_WIDTH / 2 +
        getBottomLabelPlateBox("Test", 256).h / 2,
      5,
    );
  });

  it("pads the plate around the measured text width", () => {
    const box = getBottomLabelPlateBox("Test", 256);
    const textWidth = measureTextWidth("Test", box.fontSize);
    expect(box.w).toBeCloseTo(
      textWidth + BOTTOM_LABEL_HORIZONTAL_PADDING * 2,
      5,
    );
    expect(box.x + box.w / 2).toBeCloseTo(128, 5);
  });

  it("keeps a long label's plate inside the badge width", () => {
    const box = getBottomLabelPlateBox("This is too long", 256);
    expect(box.x).toBeGreaterThanOrEqual(-1e-9);
    expect(box.x + box.w).toBeLessThanOrEqual(256 + 1e-9);
  });

  it("reports a bottom overflow that covers the plate's outer edge", () => {
    for (const scale of [1, 0.72]) {
      const box = getBottomLabelPlateBox("Test", 256, scale);
      expect(box.y + box.h).toBeLessThanOrEqual(
        256 + getBottomLabelBottomOverflow(256, scale) + 1e-9,
      );
    }
  });

  it("shifts the plate down by extraOffset", () => {
    const base = getBottomLabelPlateBox("Test", 256);
    const shifted = getBottomLabelPlateBox("Test", 256, 1, 40);
    expect(shifted.y - base.y).toBeCloseTo(40, 5);
    expect(shifted.h).toBeCloseTo(base.h, 5);
  });
});
