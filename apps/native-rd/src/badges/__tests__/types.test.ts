/**
 * Tests for BadgeDesign type and createDefaultBadgeDesign
 */
import {
  BadgeShape,
  BadgeFrame,
  BadgeIconWeight,
  BadgeCenterMode,
  PathTextPosition,
  BannerPosition,
  createDefaultBadgeDesign,
  isValidHexColor,
  parseBadgeDesign,
} from "../types";
import type { BadgeDesign, FrameDataParams } from "../types";

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
      shape: "circle",
      frame: "none",
      color: "#ffe50c",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Learn TypeScript",
      centerMode: "icon",
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
    expect(design.label).toBeUndefined();
    expect(design.frameParams).toBeUndefined();
    expect(design.monogram).toBeUndefined();
    expect(design.centerLabel).toBeUndefined();
    expect(design.pathText).toBeUndefined();
    expect(design.pathTextPosition).toBeUndefined();
    expect(design.pathTextBottom).toBeUndefined();
    expect(design.banner).toBeUndefined();
  });

  test("defaults to icon centerMode", () => {
    const design = createDefaultBadgeDesign("Test");
    expect(design.centerMode).toBe("icon");
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
      centerLabel: "Level 5",
      pathText: "ACHIEVEMENT UNLOCKED",
      pathTextPosition: "top",
      pathTextBottom: "EARNED 2026",
      banner: { text: "CERTIFIED", position: "center" },
      frameParams: {
        variant: 2,
        stepCount: 5,
        evidenceCount: 12,
        daysToComplete: 30,
        evidenceTypes: 3,
        stepNames: ["Step 1", "Step 2"],
      },
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

  test("BannerPosition has center and bottom", () => {
    expect(BannerPosition.center).toBe("center");
    expect(BannerPosition.bottom).toBe("bottom");
    expect(Object.keys(BannerPosition)).toHaveLength(2);
  });
});
