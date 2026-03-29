import { getBadgeLayoutMetrics, type BadgeLayoutDensity } from "../layout";
import type { BadgeDesign } from "../types";

// ── Helpers ────────────────────────────────────────────────────────────

const SIZE = 256;
const INSET = 1.5;
const INNER_INSET = INSET + SIZE * 0.12;

function makeDesign(overrides: Partial<BadgeDesign> = {}): BadgeDesign {
  return {
    shape: "circle",
    frame: "none",
    color: "#a78bfa",
    iconName: "Trophy",
    iconWeight: "regular",
    title: "Test Badge",
    centerMode: "icon",
    ...overrides,
  };
}

function getMetrics(overrides: Partial<BadgeDesign> = {}) {
  return getBadgeLayoutMetrics(makeDesign(overrides), SIZE, INSET, INNER_INSET);
}

// ── Density classification ─────────────────────────────────────────────

describe("density classification", () => {
  it("returns default density for minimal design", () => {
    expect(getMetrics().density).toBe("default");
  });

  it("returns default for single feature (top path text only)", () => {
    expect(getMetrics({ pathText: "HELLO" }).density).toBe("default");
  });

  it("returns balanced for 2 features (path text + center label)", () => {
    expect(
      getMetrics({ pathText: "HELLO", centerLabel: "Expert" }).density,
    ).toBe("balanced");
  });

  it("returns compact for 3+ features", () => {
    expect(
      getMetrics({
        pathText: "HELLO",
        pathTextPosition: "both",
        pathTextBottom: "WORLD",
        centerLabel: "Expert",
      }).density,
    ).toBe("compact");
  });

  it("forces compact when bottom path text + center label", () => {
    expect(
      getMetrics({
        pathTextPosition: "bottom",
        pathTextBottom: "WORLD",
        centerLabel: "Expert",
      }).density,
    ).toBe("compact");
  });

  it("forces compact when bottom path text + center banner", () => {
    expect(
      getMetrics({
        pathTextPosition: "bottom",
        pathTextBottom: "WORLD",
        banner: { text: "WINNER", position: "center" },
      }).density,
    ).toBe("compact");
  });
});

// ── Scale factors ──────────────────────────────────────────────────────

describe("scale factors", () => {
  it.each([
    ["default", 1, 1, 1, 1],
    ["balanced", 0.88, 0.84, 0.94, 0.9],
    ["compact", 0.78, 0.72, 0.88, 0.82],
  ] as [BadgeLayoutDensity, number, number, number, number][])(
    "%s density returns correct scales",
    (_density, centerContent, centerLabel, banner, densityScale) => {
      // Build a design that produces the desired density
      const overrides: Partial<BadgeDesign> =
        _density === "compact"
          ? {
              pathText: "A",
              pathTextPosition: "both" as const,
              pathTextBottom: "B",
              centerLabel: "C",
            }
          : _density === "balanced"
            ? { pathText: "A", centerLabel: "B" }
            : {};

      const m = getMetrics(overrides);
      expect(m.density).toBe(_density);
      expect(m.centerContentScale).toBe(centerContent);
      expect(m.centerLabelScale).toBe(centerLabel);
      expect(m.bannerScale).toBe(banner);
      // pathTextFontScale includes per-shape multiplier
      expect(m.pathTextFontScale).toBeCloseTo(0.92 * densityScale, 4);
    },
  );
});

// ── Per-shape offsets ──────────────────────────────────────────────────

describe("per-shape behavior", () => {
  it("applies shape-specific center Y offset for star", () => {
    const star = getMetrics({ shape: "star" });
    const circle = getMetrics({ shape: "circle" });
    expect(star.centerY).toBeGreaterThan(circle.centerY);
  });

  it("applies shape-specific path text scale", () => {
    const star = getMetrics({ shape: "star" });
    const circle = getMetrics({ shape: "circle" });
    expect(star.pathTextFontScale).toBeLessThan(circle.pathTextFontScale);
  });
});

// ── pathTextInset floor ────────────────────────────────────────────────

describe("pathTextInset", () => {
  it("never goes below minimum inset", () => {
    const minTextInset = INSET + SIZE * 0.03;
    const m = getMetrics();
    expect(m.pathTextInset).toBeGreaterThanOrEqual(minTextInset);
  });
});

// ── compactTextCompression ─────────────────────────────────────────────

describe("compact text compression", () => {
  it("applies 0.78 multiplier when top + bottom path text + center banner all visible", () => {
    const m = getMetrics({
      pathText: "TOP",
      pathTextPosition: "both",
      pathTextBottom: "BOTTOM",
      banner: { text: "WINNER", position: "center" },
    });
    // pathTextFontScale = shapeScale * densityScale * 0.78
    // circle=0.92, compact=0.82, compression=0.78
    expect(m.pathTextFontScale).toBeCloseTo(0.92 * 0.82 * 0.78, 4);
  });

  it("does not apply compression when center banner is absent", () => {
    const m = getMetrics({
      pathText: "TOP",
      pathTextPosition: "both",
      pathTextBottom: "BOTTOM",
      centerLabel: "Expert",
    });
    // No compression — centerBanner not visible
    expect(m.pathTextFontScale).toBeCloseTo(0.92 * 0.82, 4);
  });
});
