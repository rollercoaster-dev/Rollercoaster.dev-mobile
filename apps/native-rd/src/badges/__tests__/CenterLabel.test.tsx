import {
  CenterLabel,
  CENTER_LABEL_SIZE_RATIO,
  CENTER_LABEL_TOP_MARGIN_RATIO,
  getCenterLabelY,
} from "../text/CenterLabel";

const DARK_FILL = "#1a1a2e";
const LIGHT_FILL = "#fef3c7";

describe("CenterLabel", () => {
  // ── Null guards ──────────────────────────────────────────────────────

  it.each([
    ["undefined", undefined],
    ["empty string", ""],
    ["whitespace only", "   "],
  ])("returns null for %s label", (_desc, label) => {
    const result = CenterLabel({ label, size: 256, fillColor: DARK_FILL });
    expect(result).toBeNull();
  });

  // ── Font size ────────────────────────────────────────────────────────

  it.each([128, 256])("scales font size for badge size %d", (size) => {
    const el = CenterLabel({ label: "Test", size, fillColor: DARK_FILL });
    expect(el!.props.fontSize).toBe(size * CENTER_LABEL_SIZE_RATIO);
  });

  // ── Positioning ──────────────────────────────────────────────────────

  it("centers horizontally", () => {
    const el = CenterLabel({ label: "Test", size: 256, fillColor: DARK_FILL });
    expect(el!.props.x).toBe(128);
    expect(el!.props.textAnchor).toBe("middle");
  });

  it("positions below badge center", () => {
    const el = CenterLabel({ label: "Test", size: 256, fillColor: DARK_FILL });
    expect(el!.props.y).toBeCloseTo(getCenterLabelY(256), 5);
  });

  it("keeps a small margin below the badge edge", () => {
    const el = CenterLabel({ label: "Test", size: 256, fillColor: DARK_FILL });
    const fontSize = 256 * CENTER_LABEL_SIZE_RATIO;
    const textTop = Number(el!.props.y) - fontSize / 2;
    expect(textTop).toBeCloseTo(256 + 256 * CENTER_LABEL_TOP_MARGIN_RATIO, 5);
  });

  it("scales font size with scale prop", () => {
    const el = CenterLabel({
      label: "Test",
      size: 256,
      fillColor: DARK_FILL,
      scale: 0.72,
    });
    expect(el!.props.fontSize).toBeCloseTo(
      256 * CENTER_LABEL_SIZE_RATIO * 0.72,
      5,
    );
  });

  it("adjusts y position when scale changes", () => {
    const defaultEl = CenterLabel({
      label: "Test",
      size: 256,
      fillColor: DARK_FILL,
    });
    const scaledEl = CenterLabel({
      label: "Test",
      size: 256,
      fillColor: DARK_FILL,
      scale: 0.72,
    });
    // Smaller scale → smaller fontSize → y moves up (closer to badge edge)
    expect(scaledEl!.props.y).toBeLessThan(defaultEl!.props.y);
  });

  // ── Color contrast ───────────────────────────────────────────────────

  it("uses white text on dark fill", () => {
    const el = CenterLabel({ label: "Test", size: 256, fillColor: DARK_FILL });
    expect(el!.props.fill).toBe("#FFFFFF");
  });

  it("uses black text on light fill", () => {
    const el = CenterLabel({ label: "Test", size: 256, fillColor: LIGHT_FILL });
    expect(el!.props.fill).toBe("#000000");
  });

  // ── Font attributes ──────────────────────────────────────────────────

  it("uses Instrument Sans font by default", () => {
    const el = CenterLabel({ label: "Test", size: 256, fillColor: DARK_FILL });
    expect(el!.props.fontFamily).toBe("Instrument Sans");
  });

  it("accepts custom fontFamily", () => {
    const el = CenterLabel({
      label: "Test",
      size: 256,
      fillColor: DARK_FILL,
      fontFamily: "Lexend",
    });
    expect(el!.props.fontFamily).toBe("Lexend");
  });

  // ── Label clamping ───────────────────────────────────────────────────

  it("clamps label to 10 characters", () => {
    const el = CenterLabel({
      label: "This is too long",
      size: 256,
      fillColor: DARK_FILL,
    });
    expect(el!.props.children).toBe("This is to");
  });
});
