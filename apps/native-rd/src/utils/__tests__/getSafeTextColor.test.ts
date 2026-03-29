import { getSafeTextColor } from "../accessibility";

describe("getSafeTextColor", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns white for dark background", () => {
    expect(getSafeTextColor("#1a1a2e")).toBe("#FFFFFF");
  });

  it("returns black for light background", () => {
    expect(getSafeTextColor("#fef3c7")).toBe("#000000");
  });

  it.each(["not-a-color", "rgb(0,0,0)", "#fff", ""])(
    "returns #FFFFFF fallback for invalid input: %s",
    (input) => {
      expect(getSafeTextColor(input)).toBe("#FFFFFF");
      expect(warnSpy).toHaveBeenCalledTimes(1);
    },
  );

  it("includes caller name in warning", () => {
    getSafeTextColor("invalid-unique", "TestCaller");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("TestCaller"));
  });

  it("warns once per caller/background pair", () => {
    getSafeTextColor("repeat-me", "RepeatCaller");
    getSafeTextColor("repeat-me", "RepeatCaller");

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("warns again when the caller changes for the same invalid background", () => {
    getSafeTextColor("shared-invalid", "CallerOne");
    getSafeTextColor("shared-invalid", "CallerTwo");

    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("CallerOne"),
    );
    expect(warnSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("CallerTwo"),
    );
  });
});
