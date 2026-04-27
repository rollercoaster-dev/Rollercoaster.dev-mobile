import { measureTextWidth } from "../text/measureTextWidth";

describe("measureTextWidth", () => {
  it("returns 0 for empty input", () => {
    expect(measureTextWidth("", 16)).toBe(0);
  });

  it("scales linearly with text length", () => {
    const single = measureTextWidth("A", 16);
    const tenChars = measureTextWidth("AAAAAAAAAA", 16);
    expect(tenChars).toBeCloseTo(single * 10);
  });

  it("scales linearly with font size", () => {
    const small = measureTextWidth("HELLO", 10);
    const large = measureTextWidth("HELLO", 30);
    expect(large).toBeCloseTo(small * 3);
  });

  it("matches the 0.7em char-width approximation", () => {
    expect(measureTextWidth("ABCDE", 20)).toBeCloseTo(5 * 20 * 0.7);
  });

  // Boundary safety: invalid inputs must not propagate NaN/Infinity into
  // arc geometry — downstream Math.min/max produces NaN that ends up in
  // an SVG `d` string, silently breaking the inscription path.
  it("returns 0 for NaN fontSize", () => {
    expect(measureTextWidth("ABC", NaN)).toBe(0);
  });

  it("returns 0 for negative fontSize", () => {
    expect(measureTextWidth("ABC", -10)).toBe(0);
  });

  it("returns 0 for zero fontSize", () => {
    expect(measureTextWidth("ABC", 0)).toBe(0);
  });

  it("returns 0 for Infinity fontSize", () => {
    expect(measureTextWidth("ABC", Infinity)).toBe(0);
  });
});
