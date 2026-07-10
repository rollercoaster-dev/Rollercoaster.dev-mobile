import { toLocalTop, normalizePointerY } from "../geometryNormalize";

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

  describe("normalizePointerY (scroll-delta pointer normalization)", () => {
    it("is a passthrough when there is no scroll delta", () => {
      expect(normalizePointerY(100, 0)).toBe(100);
    });

    it("adds a positive scroll delta (scrolled down moves rows up)", () => {
      // Rows measured at drag start are now scrollDelta higher in the
      // measurement frame than the stationary finger, so the pointer is
      // adjusted up by adding the delta to find the right row.
      expect(normalizePointerY(100, 50)).toBe(150);
    });

    it("adds a negative scroll delta (scrolled up)", () => {
      expect(normalizePointerY(100, -20)).toBe(80);
    });

    it("composes with toLocalTop to locate a drop slot in list-local space", () => {
      const pointerScreenY = 250;
      const scrollDelta = 60;
      const listOriginY = 40;
      const localPointer = toLocalTop(
        normalizePointerY(pointerScreenY, scrollDelta),
        listOriginY,
      );
      // (250 + 60) - 40 = 270
      expect(localPointer).toBe(270);
    });
  });
});
