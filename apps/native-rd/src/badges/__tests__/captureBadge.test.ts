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

  it("uses default 160x160 dimensions when no options passed", async () => {
    const captureAsPng = jest
      .fn()
      .mockResolvedValue(Buffer.from(MOCK_PNG_BASE64, "base64"));
    const ref = makeMockRef(captureAsPng);
    await captureBadge(ref);
    expect(captureAsPng).toHaveBeenCalledWith({ width: 160, height: 160 });
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

  // Documents the error chain Sentry observes when the
  // RNSVGSvgViewModule.mm registry lookup returns nil — the native side
  // logs and returns without invoking the callback, BadgeRenderer's 5000ms
  // setTimeout fires, and the rejection bubbles through captureBadge.
  // See issue #93 / NATIVE-RD-B.
  it("prefixes handle timeout rejections with 'capture failed —'", async () => {
    const ref = makeMockRef(
      jest
        .fn()
        .mockRejectedValue(
          new Error(
            "BadgeRenderer.captureAsPng: toDataURL did not respond within 5000ms — native bridge may have dropped the call",
          ),
        ),
    );
    await expect(captureBadge(ref)).rejects.toThrow(
      /capture failed — BadgeRenderer\.captureAsPng: toDataURL did not respond within 5000ms/,
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

  it("returns viewBox dims for a square design (no banner, no label)", () => {
    const { width, height } = getCaptureDimensions(baseDesign, 512);
    const { viewBox } = getBadgeLayoutBoxes(baseDesign, 512);
    // Dimensions must equal the renderer's viewBox so iOS's toDataURL fills
    // the PNG canvas. With shadow, viewBox extends slightly beyond `size`.
    expect(width).toBe(Math.round(viewBox.w));
    expect(height).toBe(Math.round(viewBox.h));
    expect(width).toBe(height); // square
  });

  it("returns portrait dims when a top banner is present", () => {
    const design = {
      ...baseDesign,
      banner: { text: "ZIPPY!!!", position: BannerPosition.top },
    };
    const { width, height } = getCaptureDimensions(design, 512);
    expect(height).toBeGreaterThan(width);
  });

  it("returns portrait dims when a bottom label is present", () => {
    const design = { ...baseDesign, bottomLabel: "Bam" };
    const { width, height } = getCaptureDimensions(design, 512);
    expect(height).toBeGreaterThan(width);
  });

  it("returns exactly the rendered viewBox dimensions", () => {
    const design = {
      ...baseDesign,
      banner: { text: "ZIPPY!!!", position: BannerPosition.top },
      bottomLabel: "Bam",
    };
    const { width, height } = getCaptureDimensions(design, 512);
    const { viewBox } = getBadgeLayoutBoxes(design, 512);
    expect(width).toBe(Math.round(viewBox.w));
    expect(height).toBe(Math.round(viewBox.h));
  });

  it("scales proportionally for non-default size", () => {
    const design = { ...baseDesign, bottomLabel: "Bam" };
    const big = getCaptureDimensions(design, 1024);
    const small = getCaptureDimensions(design, 256);
    expect(aspectRatio(big.width, big.height)).toBeCloseTo(
      aspectRatio(small.width, small.height),
      2,
    );
  });
});
