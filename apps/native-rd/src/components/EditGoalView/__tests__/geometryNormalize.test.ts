import { toLocalTop } from "../geometryNormalize";

describe("geometryNormalize", () => {
  describe("toLocalTop (absolute → list-local outline conversion)", () => {
    it("subtracts the measured list origin from an absolute y", () => {
      expect(toLocalTop(120, 40)).toBe(80);
    });

    it("is a passthrough when the list origin is 0", () => {
      expect(toLocalTop(200, 0)).toBe(200);
    });

    it("never returns the raw absolute y when the origin is non-zero", () => {
      // A row at screen-absolute y=300 inside a list whose origin is y=80 must
      // render its drop outline at local top 220, not 300.
      expect(toLocalTop(300, 80)).toBe(220);
      expect(toLocalTop(300, 80)).not.toBe(300);
    });

    it("handles a list scrolled below the top of the screen (negative origin)", () => {
      expect(toLocalTop(150, -30)).toBe(180);
    });
  });
});
