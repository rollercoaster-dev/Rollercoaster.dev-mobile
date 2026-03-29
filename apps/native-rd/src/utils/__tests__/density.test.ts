import {
  getDensityMultiplier,
  applyDensity,
  scaleSpacing,
  densityOptions,
  DENSITY_MULTIPLIERS,
  type DensityLevel,
} from "../density";

const mockSpace = {
  "0": 0,
  "1": 4,
  "2": 8,
  "3": 12,
  "4": 16,
  "5": 20,
  "6": 24,
  "8": 32,
  "10": 40,
  "12": 48,
  "16": 64,
} as const;

describe("density utilities", () => {
  test.each([
    ["compact", 0.75],
    ["default", 1.0],
    ["comfortable", 1.25],
  ] as const)("getDensityMultiplier(%s) = %f", (level, expected) => {
    expect(getDensityMultiplier(level)).toBe(expected);
  });

  test.each([
    [16, "compact", 12],
    [16, "default", 16],
    [16, "comfortable", 20],
    [5, "compact", 4],
    [0, "compact", 0],
  ] as const)("applyDensity(%i, %s) = %i", (value, level, expected) => {
    expect(applyDensity(value, level)).toBe(expected);
  });

  test("scaleSpacing returns same reference for default", () => {
    expect(scaleSpacing(mockSpace as any, "default")).toBe(mockSpace);
  });

  test.each([
    ["compact", { "0": 0, "1": 3, "4": 12, "16": 48 }],
    ["comfortable", { "0": 0, "1": 5, "4": 20, "16": 80 }],
  ] as const)("scaleSpacing scales for %s", (level, expected) => {
    const result = scaleSpacing(mockSpace as any, level);
    for (const [key, val] of Object.entries(expected)) {
      expect(result[key as keyof typeof result]).toBe(val);
    }
  });

  test("densityOptions covers all levels with labels", () => {
    expect(densityOptions).toHaveLength(3);
    expect(densityOptions.map((o) => o.id)).toEqual([
      "compact",
      "default",
      "comfortable",
    ]);
    for (const option of densityOptions) {
      expect(option.label).toBeTruthy();
      expect(option.description).toBeTruthy();
    }
  });

  test("DENSITY_MULTIPLIERS has positive entries for all levels", () => {
    const levels: DensityLevel[] = ["compact", "default", "comfortable"];
    for (const level of levels) {
      expect(DENSITY_MULTIPLIERS[level]).toBeGreaterThan(0);
    }
  });
});
