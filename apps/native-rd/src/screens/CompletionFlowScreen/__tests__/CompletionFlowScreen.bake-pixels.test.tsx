/**
 * Pixel-diversity regression test for issue #60.
 *
 * Pre-fix, the offscreen capture host went through `react-native-view-shot`'s
 * `captureRef`, which snapshotted the native view buffer. On cold-start bakes
 * of configured designs (multi-frame paint), the view buffer was still empty
 * when capture fired — and the captured PNG was 1536×1536 of pure transparent
 * pixels. Unit tests using the `captureRef` mock returned a fixed 1×1
 * transparent PNG that satisfied `isPNG`, so the silent failure shipped.
 *
 * Post-fix, capture goes through `react-native-svg`'s `Svg.toDataURL` via
 * BadgeRenderer's imperative handle — serializing the SVG model on the native
 * side instead of snapshotting a view buffer. This test exercises that real
 * path end-to-end:
 *
 *   captureBadge → BadgeRendererHandle.captureAsPng → Svg.toDataURL
 *
 * Neither `captureBadge` nor `BadgeRenderer` is mocked. Only `react-native-svg`
 * is replaced with a stub Svg (the native bridge isn't available in test env)
 * whose `toDataURL` returns a deterministic 2×2 RGBA PNG with four distinct
 * opaque colors. The assertions — mean alpha > 0.5 and RGB variance > 0 —
 * would have failed against the old transparent-snapshot output.
 */

// `react-native-svg`'s native `toDataURL` isn't reachable in Jest (no native
// bridge). Replace the module: Svg becomes a forwardRef exposing the same
// toDataURL contract; other primitives (G, Path, Circle, etc.) collapse to
// inert pass-through stubs so BadgeRenderer's tree mounts without errors.
// The `mock` prefix is required by Jest's babel transform — only `mock*`
// outer-scope identifiers may be referenced from a jest.mock factory.
import React, { createRef } from "react";
import { Buffer } from "buffer";
import { inflateSync } from "zlib";

import { renderWithProviders } from "../../../__tests__/test-utils";
import {
  BadgeRenderer,
  type BadgeRendererHandle,
} from "../../../badges/BadgeRenderer";
import { captureBadge } from "../../../badges/captureBadge";
import { createDefaultBadgeDesign } from "../../../badges/types";

const mockToDataURL = jest.fn();
jest.mock("react-native-svg", () => {
  const ReactRuntime = require("react");
  const passThrough = ({ children }: { children?: React.ReactNode }) =>
    children ?? null;
  const Svg = ReactRuntime.forwardRef(
    ({ children }: { children?: React.ReactNode }, ref: React.Ref<unknown>) => {
      ReactRuntime.useImperativeHandle(
        ref,
        () => ({ toDataURL: mockToDataURL }),
        [],
      );
      return children ?? null;
    },
  );
  // Proxy ensures any named import (Path, G, ClipPath, Defs, TextPath, …)
  // resolves to a stub without listing every primitive by hand.
  return new Proxy(
    { __esModule: true, default: Svg },
    {
      get(target, key) {
        if (key === "default" || key === "__esModule") {
          return (target as Record<string | symbol, unknown>)[key];
        }
        return passThrough;
      },
    },
  );
});

// 2×2 RGBA PNG with four distinct opaque pixels (red, green, blue, yellow).
// Pre-generated via Node's zlib so the test stays dependency-free.
// Mean alpha = 1.0; the four colors give non-zero RGB variance.
const NON_TRANSPARENT_2X2_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP4z8DwHwyBNBAw/AcAR8oI+ItOQ4UAAAAASUVORK5CYII=";

interface PngPixels {
  width: number;
  height: number;
  rgba: Uint8Array;
}

function decodeRgbaPng(buf: Buffer): PngPixels {
  // Skip signature (8 bytes); walk chunks until IEND.
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    offset += 4;
    const type = buf.subarray(offset, offset + 4).toString("ascii");
    offset += 4;
    const data = buf.subarray(offset, offset + length);
    offset += length + 4; // skip CRC
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(
      `decodeRgbaPng: expected 8-bit RGBA (depth=8, color=6), got depth=${bitDepth} color=${colorType}`,
    );
  }
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const stride = width * 4;
  const rgba = new Uint8Array(width * height * 4);
  // PNG IDAT data prefixes every row with a 1-byte filter type. The fixture
  // was generated with filter=0 (None) for every row; this decoder is
  // intentionally minimal and only supports that case.
  for (let row = 0; row < height; row++) {
    const filterByte = inflated[row * (1 + stride)];
    if (filterByte !== 0) {
      throw new Error(
        `decodeRgbaPng: row ${row} uses filter ${filterByte}, only None (0) is supported by this test decoder`,
      );
    }
    const src = row * (1 + stride) + 1;
    rgba.set(inflated.subarray(src, src + stride), row * stride);
  }
  return { width, height, rgba };
}

function meanAlpha(pixels: PngPixels): number {
  let sum = 0;
  const count = pixels.width * pixels.height;
  for (let i = 3; i < pixels.rgba.length; i += 4) sum += pixels.rgba[i];
  return sum / count / 255;
}

function rgbVariance(pixels: PngPixels): number {
  const samples: number[] = [];
  for (let i = 0; i < pixels.rgba.length; i += 4) {
    samples.push(pixels.rgba[i], pixels.rgba[i + 1], pixels.rgba[i + 2]);
  }
  const mean = samples.reduce((acc, v) => acc + v, 0) / samples.length;
  return samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / samples.length;
}

describe("Issue #60 regression — completion bake yields non-transparent pixels", () => {
  beforeEach(() => {
    mockToDataURL.mockReset();
    mockToDataURL.mockImplementation((cb: (base64: string) => void) => {
      cb(NON_TRANSPARENT_2X2_BASE64);
    });
  });

  it("captureBadge returns pixels with mean alpha > 0.5 and non-zero RGB variance", async () => {
    const ref = createRef<BadgeRendererHandle>();
    renderWithProviders(
      <BadgeRenderer
        ref={ref}
        design={createDefaultBadgeDesign("Test", "#4caf50")}
        size={64}
      />,
    );

    expect(ref.current).not.toBeNull();
    const buffer = await captureBadge(
      ref as React.RefObject<BadgeRendererHandle | null>,
      { width: 64, height: 64 },
    );

    expect(mockToDataURL).toHaveBeenCalled();
    const pixels = decodeRgbaPng(buffer);
    expect(pixels.width).toBe(2);
    expect(pixels.height).toBe(2);
    expect(meanAlpha(pixels)).toBeGreaterThan(0.5);
    expect(rgbVariance(pixels)).toBeGreaterThan(0);
  });

  it("captureBadge rejects when Svg.toDataURL yields an empty result (would have caught the original bug)", async () => {
    // Simulate the failure mode of the pre-fix path: a capture that resolves
    // with no meaningful data. The new wiring rejects rather than silently
    // returning the empty buffer that bakePNG would have written to disk.
    mockToDataURL.mockImplementation((cb: (base64: string) => void) => {
      cb("");
    });

    const ref = createRef<BadgeRendererHandle>();
    renderWithProviders(
      <BadgeRenderer
        ref={ref}
        design={createDefaultBadgeDesign("Test", "#4caf50")}
        size={64}
      />,
    );

    await expect(
      captureBadge(ref as React.RefObject<BadgeRendererHandle | null>, {
        width: 64,
        height: 64,
      }),
    ).rejects.toThrow(/empty/i);
  });
});
