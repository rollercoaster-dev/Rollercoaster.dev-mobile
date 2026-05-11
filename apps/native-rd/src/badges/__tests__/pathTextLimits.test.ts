import { getPathTextMaxChars } from "../text/pathTextLimits";
import { BadgeShape } from "../types";

const ALL_SHAPES = Object.values(BadgeShape) as BadgeShape[];

describe("getPathTextMaxChars", () => {
  test.each(
    ALL_SHAPES.flatMap((shape) => [
      ["top", shape],
      ["bottom", shape],
    ]),
  )("returns a positive integer for %s %s", (side, shape) => {
    const max = getPathTextMaxChars(
      shape as BadgeShape,
      side as "top" | "bottom",
    );
    expect(Number.isInteger(max)).toBe(true);
    expect(max).toBeGreaterThan(0);
  });

  // Diamond's tiny inscribed circle gives the smallest arc; star rides outside
  // the silhouette on the largest radius. The cap ordering must reflect that
  // so input validation never overpromises room the geometry doesn't have.
  it("diamond caps are tighter than star caps", () => {
    expect(getPathTextMaxChars("diamond", "top")).toBeLessThan(
      getPathTextMaxChars("star", "top"),
    );
    expect(getPathTextMaxChars("diamond", "bottom")).toBeLessThan(
      getPathTextMaxChars("star", "bottom"),
    );
  });
});
