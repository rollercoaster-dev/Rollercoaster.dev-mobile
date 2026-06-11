import {
  getDensityMultiplier,
  applyDensity,
  scaleSpacing,
  densityOptions,
  DENSITY_MULTIPLIERS,
  DENSITY_LEVELS,
  isDensityLevel,
  narrowDensity,
  type DensityLevel,
} from "../density";

type StubLogger = {
  error: jest.Mock;
  warn: jest.Mock;
  info: jest.Mock;
  debug: jest.Mock;
};

const makeStubLogger = (): StubLogger => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
});

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

  test("densityOptions covers all levels in canonical order", () => {
    expect(densityOptions).toHaveLength(3);
    expect(densityOptions.map((o) => o.id)).toEqual([
      "compact",
      "default",
      "comfortable",
    ]);
  });

  test("DENSITY_MULTIPLIERS has positive entries for all levels", () => {
    const levels: DensityLevel[] = ["compact", "default", "comfortable"];
    for (const level of levels) {
      expect(DENSITY_MULTIPLIERS[level]).toBeGreaterThan(0);
    }
  });

  describe("isDensityLevel", () => {
    test.each(["compact", "default", "comfortable"] as const)(
      "returns true for valid level '%s'",
      (level) => {
        expect(isDensityLevel(level)).toBe(true);
      },
    );

    test.each(["cozy", "large", "", "Default", " compact "])(
      "returns false for invalid string '%s'",
      (value) => {
        expect(isDensityLevel(value)).toBe(false);
      },
    );

    test.each([null, undefined, 42, 0, {}, []] as const)(
      "returns false for non-string %p",
      (value) => {
        expect(isDensityLevel(value)).toBe(false);
      },
    );

    test("DENSITY_LEVELS contains exactly the three canonical levels", () => {
      expect([...DENSITY_LEVELS].sort()).toEqual(
        ["comfortable", "compact", "default"].sort(),
      );
    });
  });

  describe("narrowDensity", () => {
    test("returns 'default' for null without logging", () => {
      const logger = makeStubLogger();
      expect(narrowDensity(null, logger as never)).toBe("default");
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("returns 'default' for undefined without logging", () => {
      const logger = makeStubLogger();
      expect(narrowDensity(undefined, logger as never)).toBe("default");
      expect(logger.error).not.toHaveBeenCalled();
    });

    test.each(["compact", "default", "comfortable"] as const)(
      "returns valid level '%s' as-is without logging",
      (level) => {
        const logger = makeStubLogger();
        expect(narrowDensity(level, logger as never)).toBe(level);
        expect(logger.error).not.toHaveBeenCalled();
      },
    );

    test("falls back to 'default' and logs an Error for an unrecognised string", () => {
      const logger = makeStubLogger();
      expect(narrowDensity("cozy", logger as never)).toBe("default");
      expect(logger.error).toHaveBeenCalledTimes(1);
      const [firstArg, meta] = logger.error.mock.calls[0];
      expect(firstArg).toBeInstanceOf(Error);
      expect((firstArg as Error).message).toContain("cozy");
      expect(meta).toEqual({ rawDensity: "cozy" });
    });

    test("falls back to 'default' and logs an Error for a non-string value", () => {
      const logger = makeStubLogger();
      expect(narrowDensity(42, logger as never)).toBe("default");
      expect(logger.error).toHaveBeenCalledTimes(1);
      const [firstArg, meta] = logger.error.mock.calls[0];
      expect(firstArg).toBeInstanceOf(Error);
      expect(meta).toEqual({ rawDensity: 42 });
    });
  });
});
