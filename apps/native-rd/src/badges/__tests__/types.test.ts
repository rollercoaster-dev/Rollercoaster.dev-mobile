/**
 * Tests for BadgeDesign type and createDefaultBadgeDesign
 */
import {
  BadgeShape,
  BadgeFrame,
  BadgeIconWeight,
  BadgeCenterMode,
  BADGE_COLOR_THEME_SENTINEL,
  PathTextPosition,
  BannerPosition,
  createDefaultBadgeDesign,
  isValidHexColor,
  parseBadgeDesign,
} from "../types";
import type { BadgeDesign } from "../types";
import { reportError } from "../../services/sentry-report";

jest.mock("../../services/sentry-report", () => ({
  reportError: jest.fn(),
}));

const mockedReportError = reportError as jest.MockedFunction<
  typeof reportError
>;

describe("BadgeDesign enums", () => {
  test("BadgeShape has all 6 shapes", () => {
    expect(Object.keys(BadgeShape)).toHaveLength(6);
    expect(BadgeShape.circle).toBe("circle");
    expect(BadgeShape.shield).toBe("shield");
    expect(BadgeShape.hexagon).toBe("hexagon");
    expect(BadgeShape.roundedRect).toBe("roundedRect");
    expect(BadgeShape.star).toBe("star");
    expect(BadgeShape.diamond).toBe("diamond");
  });

  test("BadgeFrame has all 6 frame styles", () => {
    expect(Object.keys(BadgeFrame)).toHaveLength(6);
    expect(BadgeFrame.none).toBe("none");
    expect(BadgeFrame.boldBorder).toBe("boldBorder");
    expect(BadgeFrame.guilloche).toBe("guilloche");
    expect(BadgeFrame.crossHatch).toBe("crossHatch");
    expect(BadgeFrame.microprint).toBe("microprint");
    expect(BadgeFrame.rosette).toBe("rosette");
  });

  test("BadgeIconWeight has all 6 weights", () => {
    expect(Object.keys(BadgeIconWeight)).toHaveLength(6);
    expect(BadgeIconWeight.thin).toBe("thin");
    expect(BadgeIconWeight.light).toBe("light");
    expect(BadgeIconWeight.regular).toBe("regular");
    expect(BadgeIconWeight.bold).toBe("bold");
    expect(BadgeIconWeight.fill).toBe("fill");
    expect(BadgeIconWeight.duotone).toBe("duotone");
  });
});

describe("createDefaultBadgeDesign", () => {
  test("returns valid BadgeDesign with title and color", () => {
    const design = createDefaultBadgeDesign("Learn TypeScript", "#ffe50c");

    expect(design).toEqual<BadgeDesign>({
      shape: "roundedRect",
      frame: "none",
      color: "#ffe50c",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Learn TypeScript",
      centerMode: "monogram",
      monogram: "L",
      borderColor: "#000000",
    });
  });

  test("uses default purple when color is null", () => {
    const design = createDefaultBadgeDesign("My Goal", null);
    expect(design.color).toBe("#a78bfa");
  });

  test("uses default purple when color is undefined", () => {
    const design = createDefaultBadgeDesign("My Goal");
    expect(design.color).toBe("#a78bfa");
  });

  test("falls back to default purple for invalid hex color", () => {
    expect(createDefaultBadgeDesign("G", "not-a-hex").color).toBe("#a78bfa");
    expect(createDefaultBadgeDesign("G", "red").color).toBe("#a78bfa");
    expect(createDefaultBadgeDesign("G", "#xyz").color).toBe("#a78bfa");
    expect(createDefaultBadgeDesign("G", "").color).toBe("#a78bfa");
  });

  test("preserves empty string title", () => {
    const design = createDefaultBadgeDesign("");
    expect(design.title).toBe("");
  });

  test("preserves long title without truncation", () => {
    const longTitle = "A".repeat(500);
    const design = createDefaultBadgeDesign(longTitle, "#000000");
    expect(design.title).toBe(longTitle);
  });

  test("does not include optional fields by default", () => {
    const design = createDefaultBadgeDesign("Test");
    expect(design.frameParams).toBeUndefined();
    expect(design.bottomLabel).toBeUndefined();
    expect(design.pathText).toBeUndefined();
    expect(design.pathTextPosition).toBeUndefined();
    expect(design.pathTextBottom).toBeUndefined();
    expect(design.banner).toBeUndefined();
  });

  test("defaults to monogram centerMode with the title's first letter", () => {
    const design = createDefaultBadgeDesign("Test");
    expect(design.centerMode).toBe("monogram");
    expect(design.monogram).toBe("T");
  });

  test("uses '?' as the monogram when title is empty or whitespace-only", () => {
    expect(createDefaultBadgeDesign("").monogram).toBe("?");
    expect(createDefaultBadgeDesign("   ").monogram).toBe("?");
  });

  test("uppercases the monogram when title starts with a lowercase letter", () => {
    expect(createDefaultBadgeDesign("apple").monogram).toBe("A");
  });

  test("result is JSON-serializable", () => {
    const design = createDefaultBadgeDesign("Serialize Test", "#d4f4e7");
    const json = JSON.stringify(design);
    const parsed = JSON.parse(json) as BadgeDesign;
    expect(parsed).toEqual(design);
  });
});

describe("isValidHexColor", () => {
  test.each([
    ["#abc", true],
    ["#AABBCC", true],
    ["#a78bfa", true],
    ["#a78bfa00", true], // 8-digit with alpha
    ["abc", false],
    ["#xy", false],
    ["#abcde", false],
    ["red", false],
    ["", false],
  ])("isValidHexColor(%s) === %s", (input, expected) => {
    expect(isValidHexColor(input)).toBe(expected);
  });
});

describe("parseBadgeDesign", () => {
  test("parses valid JSON into BadgeDesign", () => {
    const design = createDefaultBadgeDesign("Test");
    const result = parseBadgeDesign(JSON.stringify(design));
    expect(result).toEqual(design);
  });

  test("returns null for null/undefined/empty input", () => {
    expect(parseBadgeDesign(null)).toBeNull();
    expect(parseBadgeDesign(undefined)).toBeNull();
    expect(parseBadgeDesign("")).toBeNull();
  });

  test("returns null for invalid JSON", () => {
    expect(parseBadgeDesign("not-json")).toBeNull();
    expect(parseBadgeDesign("{broken")).toBeNull();
  });

  test("parses legacy design without new fields (backward compat)", () => {
    const legacyJson = JSON.stringify({
      shape: "circle",
      frame: "none",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Old Badge",
    });
    const result = parseBadgeDesign(legacyJson);
    expect(result).not.toBeNull();
    // Legacy JSON has no centerMode — parseBadgeDesign applies default
    expect(result!.centerMode).toBe("icon");
    expect(result!.monogram).toBeUndefined();
    expect(result!.banner).toBeUndefined();
  });

  test("parses design with all new fields", () => {
    const fullDesign: BadgeDesign = {
      shape: "circle",
      frame: "guilloche",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Full Badge",
      centerMode: "monogram",
      monogram: "ABC",
      bottomLabel: "Level 5",
      pathText: "ACHIEVEMENT UNLOCKED",
      pathTextPosition: "top",
      pathTextBottom: "EARNED 2026",
      banner: { text: "CERTIFIED", position: "top" },
      frameParams: {
        variant: 2,
        stepCount: 5,
        evidenceCount: 12,
        daysToComplete: 30,
        evidenceTypes: 3,
        stepNames: ["Step 1", "Step 2"],
      },
      // Custom-color fields added in #248. Parser defaults missing
      // borderColor → 'theme'; iconColor/frameColor stay absent.
      borderColor: BADGE_COLOR_THEME_SENTINEL,
    };
    const result = parseBadgeDesign(JSON.stringify(fullDesign));
    expect(result).toEqual(fullDesign);
  });

  test("falls back to icon for invalid centerMode value", () => {
    const json = JSON.stringify({
      shape: "circle",
      frame: "none",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Bad Mode",
      centerMode: "invalid_value",
    });
    const result = parseBadgeDesign(json);
    expect(result!.centerMode).toBe("icon");
  });

  test("sanitizes frameParams with invalid numeric fields", () => {
    const json = JSON.stringify({
      shape: "circle",
      frame: "none",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Bad Params",
      centerMode: "icon",
      frameParams: {
        variant: 1,
        stepCount: "not-a-number",
        evidenceCount: NaN,
        daysToComplete: Infinity,
        evidenceTypes: 3,
      },
    });
    const result = parseBadgeDesign(json);
    expect(result!.frameParams).toEqual({
      variant: 1,
      stepCount: 0, // invalid → default 0
      evidenceCount: 0, // NaN → default 0
      daysToComplete: 0, // Infinity → default 0
      evidenceTypes: 3,
      stepNames: undefined,
    });
  });

  test("strips frameParams when variant is missing", () => {
    const json = JSON.stringify({
      shape: "circle",
      frame: "none",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "No Variant",
      centerMode: "icon",
      frameParams: { stepCount: 5 },
    });
    const result = parseBadgeDesign(json);
    expect(result!.frameParams).toBeUndefined();
  });

  test("filters non-string values from stepNames", () => {
    const json = JSON.stringify({
      shape: "circle",
      frame: "none",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Mixed Names",
      centerMode: "icon",
      frameParams: {
        variant: 0,
        stepCount: 2,
        evidenceCount: 1,
        daysToComplete: 7,
        evidenceTypes: 1,
        stepNames: ["Valid", 42, null, "Also Valid"],
      },
    });
    const result = parseBadgeDesign(json);
    expect(result!.frameParams!.stepNames).toEqual(["Valid", "Also Valid"]);
  });
});

describe("BadgeDesign new type enums", () => {
  test("BadgeCenterMode has icon and monogram", () => {
    expect(BadgeCenterMode.icon).toBe("icon");
    expect(BadgeCenterMode.monogram).toBe("monogram");
    expect(Object.keys(BadgeCenterMode)).toHaveLength(2);
  });

  test("PathTextPosition has top, bottom, both", () => {
    expect(PathTextPosition.top).toBe("top");
    expect(PathTextPosition.bottom).toBe("bottom");
    expect(PathTextPosition.both).toBe("both");
    expect(Object.keys(PathTextPosition)).toHaveLength(3);
  });

  test("BannerPosition has top and bottom", () => {
    expect(BannerPosition.top).toBe("top");
    expect(BannerPosition.bottom).toBe("bottom");
    expect(Object.keys(BannerPosition)).toHaveLength(2);
  });

  test("BADGE_COLOR_THEME_SENTINEL is the literal 'theme'", () => {
    expect(BADGE_COLOR_THEME_SENTINEL).toBe("theme");
  });
});

describe("parseBadgeDesign — custom color fields", () => {
  function makeRaw(overrides: Record<string, unknown>): string {
    return JSON.stringify({
      shape: "circle",
      frame: "none",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Color Test",
      centerMode: "icon",
      ...overrides,
    });
  }

  test("missing borderColor defaults to 'theme' (back-compat with pre-#248 designs)", () => {
    const result = parseBadgeDesign(makeRaw({}));
    expect(result!.borderColor).toBe(BADGE_COLOR_THEME_SENTINEL);
  });

  test.each([
    ["theme sentinel", { borderColor: "theme" }, "theme"],
    ["valid 6-digit hex", { borderColor: "#ff0000" }, "#ff0000"],
    ["valid 3-digit hex", { borderColor: "#abc" }, "#abc"],
    ["valid 8-digit hex", { borderColor: "#ff0000aa" }, "#ff0000aa"],
    ["invalid string", { borderColor: "not-valid" }, "theme"],
    ["empty string", { borderColor: "" }, "theme"],
    ["non-string (number)", { borderColor: 123 }, "theme"],
    ["non-string (null)", { borderColor: null }, "theme"],
  ])("sanitizes borderColor: %s", (_label, overrides, expected) => {
    const result = parseBadgeDesign(makeRaw(overrides));
    expect(result!.borderColor).toBe(expected);
  });

  test.each([
    ["valid hex passes through", { iconColor: "#123456" }, "#123456"],
    ["'theme' sentinel passes through", { iconColor: "theme" }, "theme"],
    ["invalid string → undefined", { iconColor: "nope" }, undefined],
    ["non-string → undefined", { iconColor: 42 }, undefined],
  ])("sanitizes iconColor: %s", (_label, overrides, expected) => {
    const result = parseBadgeDesign(makeRaw(overrides));
    expect(result!.iconColor).toBe(expected);
  });

  test("missing iconColor stays undefined (falls back to getSafeTextColor)", () => {
    const result = parseBadgeDesign(makeRaw({}));
    expect(result!.iconColor).toBeUndefined();
  });

  test.each([
    ["valid hex passes through", { frameColor: "#abcdef" }, "#abcdef"],
    ["'theme' sentinel passes through", { frameColor: "theme" }, "theme"],
    ["invalid string → undefined", { frameColor: "nope" }, undefined],
    ["non-string → undefined", { frameColor: 99 }, undefined],
  ])("sanitizes frameColor: %s", (_label, overrides, expected) => {
    const result = parseBadgeDesign(makeRaw(overrides));
    expect(result!.frameColor).toBe(expected);
  });

  test("missing frameColor stays undefined (renderer falls back to theme.colors.border)", () => {
    const result = parseBadgeDesign(makeRaw({}));
    expect(result!.frameColor).toBeUndefined();
  });

  test("strips retired borderScope field on read", () => {
    // Pre-#248 designs may have `borderScope` stored. The renderer no longer
    // reads it; the parser drops it so consumers can't accidentally branch on a
    // value that has no effect.
    const result = parseBadgeDesign(
      makeRaw({ borderScope: "shapeAndFrame" }),
    ) as Record<string, unknown> | null;
    expect(result).not.toHaveProperty("borderScope");
  });

  test("round-trips a fully-customised design unchanged", () => {
    const design: BadgeDesign = {
      ...createDefaultBadgeDesign("Round-trip"),
      borderColor: "#112233",
      iconColor: "#445566",
      frameColor: "#778899",
    };
    const result = parseBadgeDesign(JSON.stringify(design));
    expect(result).toEqual(design);
  });
});

describe("parseBadgeDesign — diagnostics", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    mockedReportError.mockClear();
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test("malformed hex on borderColor emits a dev warn naming the field", () => {
    const raw = JSON.stringify({
      shape: "circle",
      frame: "none",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Bad",
      centerMode: "icon",
      borderColor: "#zzzzzz",
    });
    const result = parseBadgeDesign(raw);
    expect(result!.borderColor).toBe(BADGE_COLOR_THEME_SENTINEL);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("borderColor"),
      expect.objectContaining({ raw: "#zzzzzz" }),
    );
    expect(mockedReportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid stored BadgeDesign borderColor",
      }),
      { area: "badge.parse", kind: "color-field" },
    );
  });

  test("absent borderColor does NOT warn (documented fallback path)", () => {
    const raw = JSON.stringify({
      shape: "circle",
      frame: "none",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Missing",
      centerMode: "icon",
    });
    parseBadgeDesign(raw);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(mockedReportError).not.toHaveBeenCalled();
  });

  test("JSON parse failure reports to Sentry with area=badge.parse", () => {
    const result = parseBadgeDesign("{not valid json");
    expect(result).toBeNull();
    expect(mockedReportError).toHaveBeenCalledWith(expect.any(Error), {
      area: "badge.parse",
      kind: "design-json",
    });
  });
});
