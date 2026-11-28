import {
  CHROME_CAP,
  capFor,
  capForRole,
  cappedSpacing,
  themeScaleOf,
} from "../typeScale";
import { size, sizeL } from "../../themes/tokens";

describe("themeScaleOf", () => {
  it.each([
    ["size", size, 1],
    ["sizeL (Low Vision)", sizeL, 1.25],
  ])("%s → %s", (_name, scale, expected) => {
    expect(themeScaleOf(scale)).toBe(expected);
  });

  it("falls back to 1 for a scale without a usable md size", () => {
    expect(themeScaleOf({ md: 0 })).toBe(1);
    expect(themeScaleOf({ md: Number.NaN })).toBe(1);
  });
});

describe("capFor", () => {
  it.each([
    ["display", 1],
    ["headline", 1],
    ["title", 2.0],
    ["body", 2.0],
    ["label", 2.0],
    ["caption", 2.0],
    ["mono", 2.0],
  ] as const)("%s caps at %s on the default theme", (variant, cap) => {
    expect(capFor(variant, false, 1)).toBe(cap);
  });

  it("chrome overrides the variant's cap", () => {
    expect(capFor("body", true, 1)).toBe(CHROME_CAP);
    expect(capFor("display", true, 1)).toBe(CHROME_CAP);
  });

  it("divides by the theme scale so Low Vision stays within the combined cap", () => {
    expect(capFor("body", false, 1.25)).toBeCloseTo(1.6);
    expect(capFor("title", false, 1.25)).toBeCloseTo(1.6);
    expect(capFor("body", true, 1.25)).toBeCloseTo(1.04);
  });

  it.each([0, -1, Number.NaN])(
    "keeps the plain cap when the theme scale is %s",
    (themeScale) => {
      expect(capFor("body", false, themeScale)).toBe(2);
      expect(capFor("body", true, themeScale)).toBe(CHROME_CAP);
    },
  );

  it("never returns an RN multiplier below 1", () => {
    expect(capFor("display", false, 2)).toBe(1);
    expect(capFor("body", true, 1.5)).toBe(1);
  });
});

describe("capForRole", () => {
  it.each([
    ["chrome", 1, CHROME_CAP],
    ["control", 1, 1.25],
    ["control", 1.25, 1],
    ["chrome", 1.25, 1.04],
    ["headline", 1.25, 1],
    ["body", 1.25, 1.6],
  ] as const)("%s at theme scale %s → %s", (role, themeScale, expected) => {
    expect(capForRole(role, themeScale)).toBeCloseTo(expected);
  });
});

describe("cappedSpacing", () => {
  const style = { lineHeight: 40, letterSpacing: 2 };

  it("shrinks line and letter gaps on Android when the cap bites", () => {
    // Heading capped at 1.0 under a 2.0 OS scale: RN would double the gaps.
    expect(cappedSpacing(style, 2, 1, "android")).toEqual({
      lineHeight: 20,
      letterSpacing: 1,
    });
    // Chrome cap 1.3 under 2.0.
    expect(cappedSpacing(style, 2, 1.3, "android")?.lineHeight).toBeCloseTo(26);
  });

  it("leaves text alone below the cap", () => {
    expect(cappedSpacing(style, 1.2, 1.3, "android")).toBeUndefined();
  });

  it("leaves iOS alone: it already caps both", () => {
    expect(cappedSpacing(style, 3, 1, "ios")).toBeUndefined();
  });

  it("only touches the properties that are set", () => {
    expect(cappedSpacing({ lineHeight: 30 }, 2, 1, "android")).toEqual({
      lineHeight: 15,
    });
    expect(
      cappedSpacing({ fontSize: 16 } as object, 2, 1, "android"),
    ).toBeUndefined();
  });
});
