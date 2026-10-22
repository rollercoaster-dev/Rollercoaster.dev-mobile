import { CHROME_CAP, capFor, capForRole, themeScaleOf } from "../typeScale";
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
    ["display", 1.5],
    ["headline", 1.5],
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
    expect(capFor("headline", false, 1.25)).toBeCloseTo(1.2);
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
    ["chrome", 1.25, 1.04],
    ["headline", 1.25, 1.2],
    ["body", 1.25, 1.6],
  ] as const)("%s at theme scale %s → %s", (role, themeScale, expected) => {
    expect(capForRole(role, themeScale)).toBeCloseTo(expected);
  });
});
