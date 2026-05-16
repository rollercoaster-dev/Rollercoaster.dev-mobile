import { Buffer } from "buffer";
import { captureBadge, getCaptureDimensions } from "../captureBadge";
import { createDefaultBadgeDesign, BannerPosition } from "../types";
import { MOCK_PNG_BASE64 } from "../../__tests__/mocks/react-native-view-shot";
import { isPNG, bakePNG } from "../png-baking";
import { getBadgeLayoutBoxes } from "../layoutBoxes";
import type { BadgeRendererHandle } from "../BadgeRenderer";

// Build a fresh mock ref with a jest.fn `captureAsPng` per test. captureBadge
// calls `ref.current.captureAsPng({ width, height })`; the handle is what
// react-native-svg's `Svg.toDataURL` provides at runtime, wrapped in a Buffer
// by BadgeRenderer's imperative handle.
function makeMockRef(
  impl?: jest.Mock,
): React.RefObject<BadgeRendererHandle | null> {
  const captureAsPng =
    impl ?? jest.fn().mockResolvedValue(Buffer.from(MOCK_PNG_BASE64, "base64"));
  return {
    current: { captureAsPng } as BadgeRendererHandle,
  } as React.RefObject<BadgeRendererHandle | null>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("captureBadge", () => {
  it("returns a Buffer on successful capture", async () => {
    const result = await captureBadge(makeMockRef());
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a valid PNG", async () => {
    const result = await captureBadge(makeMockRef());
    expect(isPNG(result)).toBe(true);
  });

  it("uses default 512x512 dimensions when no options passed", async () => {
    const captureAsPng = jest
      .fn()
      .mockResolvedValue(Buffer.from(MOCK_PNG_BASE64, "base64"));
    const ref = makeMockRef(captureAsPng);
    await captureBadge(ref);
    expect(captureAsPng).toHaveBeenCalledWith({ width: 512, height: 512 });
  });

  it("accepts custom width/height options", async () => {
    const captureAsPng = jest
      .fn()
      .mockResolvedValue(Buffer.from(MOCK_PNG_BASE64, "base64"));
    const ref = makeMockRef(captureAsPng);
    await captureBadge(ref, { width: 256, height: 256 });
    expect(captureAsPng).toHaveBeenCalledWith({ width: 256, height: 256 });
  });

  it("passes non-square dimensions to the imperative handle", async () => {
    const captureAsPng = jest
      .fn()
      .mockResolvedValue(Buffer.from(MOCK_PNG_BASE64, "base64"));
    const ref = makeMockRef(captureAsPng);
    await captureBadge(ref, { width: 512, height: 420 });
    expect(captureAsPng).toHaveBeenCalledWith({ width: 512, height: 420 });
  });

  it("throws when ref.current is null", async () => {
    const nullRef = {
      current: null,
    } as React.RefObject<BadgeRendererHandle | null>;
    await expect(captureBadge(nullRef)).rejects.toThrow(
      "captureBadge: ref.current is null",
    );
  });

  it("throws when the handle rejects", async () => {
    const ref = makeMockRef(
      jest.fn().mockRejectedValue(new Error("View not mounted")),
    );
    await expect(captureBadge(ref)).rejects.toThrow(
      "captureBadge: capture failed — View not mounted",
    );
  });

  it("throws when captured data is not a valid PNG", async () => {
    const ref = makeMockRef(
      jest.fn().mockResolvedValue(Buffer.from("not a png")),
    );
    await expect(captureBadge(ref)).rejects.toThrow(
      "captureBadge: captured data is not a valid PNG",
    );
  });

  it("produces a PNG that can be baked without errors", async () => {
    const pngBuffer = await captureBadge(makeMockRef());
    const credential = JSON.stringify({
      "@context": [
        "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
      ],
      type: ["VerifiableCredential", "OpenBadgeCredential"],
    });
    const baked = bakePNG(pngBuffer, credential);
    expect(isPNG(baked)).toBe(true);
  });
});

describe("getCaptureDimensions", () => {
  const baseDesign = createDefaultBadgeDesign("Test", "#4caf50");

  function aspectRatio(w: number, h: number) {
    return w / h;
  }

  it("returns the max dimension for a square design (no banner, no label)", () => {
    const { width, height } = getCaptureDimensions(baseDesign, 512);
    // With no banner/label/pathText, viewBox is (size + shadow) on both axes,
    // so the aspect ratio is exactly 1 and both dimensions equal maxDimension.
    expect(width).toBe(512);
    expect(height).toBe(512);
  });

  it("returns portrait dims when a top banner is present", () => {
    const design = {
      ...baseDesign,
      banner: { text: "ZIPPY!!!", position: BannerPosition.top },
    };
    const { width, height } = getCaptureDimensions(design, 512);
    expect(height).toBe(512);
    expect(width).toBeLessThan(512);
  });

  it("returns portrait dims when a bottom label is present", () => {
    const design = { ...baseDesign, bottomLabel: "Bam" };
    const { width, height } = getCaptureDimensions(design, 512);
    expect(height).toBe(512);
    expect(width).toBeLessThan(512);
  });

  it("returns the same aspect ratio as the rendered viewBox", () => {
    const design = {
      ...baseDesign,
      banner: { text: "ZIPPY!!!", position: BannerPosition.top },
      bottomLabel: "Bam",
    };
    const { width, height } = getCaptureDimensions(design, 512);
    const { viewBox } = getBadgeLayoutBoxes(design, 512);
    expect(aspectRatio(width, height)).toBeCloseTo(
      aspectRatio(viewBox.w, viewBox.h),
      2,
    );
  });

  it("scales proportionally for non-default max dimensions", () => {
    const design = { ...baseDesign, bottomLabel: "Bam" };
    const big = getCaptureDimensions(design, 1024);
    const small = getCaptureDimensions(design, 256);
    expect(aspectRatio(big.width, big.height)).toBeCloseTo(
      aspectRatio(small.width, small.height),
      2,
    );
  });
});
