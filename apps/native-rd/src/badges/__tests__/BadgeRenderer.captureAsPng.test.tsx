/**
 * Imperative-handle contract for BadgeRenderer.captureAsPng.
 *
 * Locks the defensive branches that guard against the
 * "Invalid svg returned from registry, expecting RNSVGSvgView, got: (null)"
 * race tracked in issue #93. The native `RCTLogError + return` path drops
 * the callback entirely, surfacing in JS as a 5000ms timeout. Forks/older
 * versions of react-native-svg can also pass null/empty directly.
 *
 * The mock pattern (forwardRef + useImperativeHandle exposing a controllable
 * `toDataURL`) is reused from CompletionFlowScreen.bake-pixels.test.tsx so
 * the production BadgeRenderer is exercised end-to-end against the same
 * bridge surface as the bake-pixels regression.
 */

import React, { createRef } from "react";
import { Buffer } from "buffer";

import { renderWithProviders } from "../../__tests__/test-utils";
import { BadgeRenderer, type BadgeRendererHandle } from "../BadgeRenderer";
import { createDefaultBadgeDesign } from "../types";

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

// Same icon-registry stub used by BadgeRenderer.test.tsx — keeps the tree
// rendering inert under jest without depending on phosphor-react-native.
jest.mock("../iconRegistry", () => {
  const ReactRuntime = require("react");
  const { View } = require("react-native");
  const Stub: React.FC = () => ReactRuntime.createElement(View);
  return {
    getIconComponent: () => Stub,
    iconRegistry: {},
    iconNames: [],
  };
});

function mountAndGetHandle() {
  const ref = createRef<BadgeRendererHandle>();
  const design = createDefaultBadgeDesign("Test", "#4caf50");
  renderWithProviders(<BadgeRenderer ref={ref} design={design} size={160} />);
  const handle = ref.current;
  if (!handle) throw new Error("BadgeRenderer ref did not attach");
  return handle;
}

// PNG magic number — captureAsPng wraps the base64 result in Buffer.from,
// so the resolved buffer first 8 bytes are the decoded payload bytes.
const VALID_PNG_BASE64 = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10,
]).toString("base64");

beforeEach(() => {
  mockToDataURL.mockReset();
});

describe("BadgeRenderer.captureAsPng — imperative handle contract", () => {
  it("resolves to a Buffer when toDataURL passes a valid base64 string", async () => {
    mockToDataURL.mockImplementation((cb: (b64: string) => void) => {
      cb(VALID_PNG_BASE64);
    });
    const handle = mountAndGetHandle();
    const buf = await handle.captureAsPng({ width: 160, height: 160 });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf[0]).toBe(137);
  });

  it("rejects with a 'non-string' message when toDataURL passes null", async () => {
    mockToDataURL.mockImplementation((cb: (b64: unknown) => void) => {
      cb(null);
    });
    const handle = mountAndGetHandle();
    await expect(
      handle.captureAsPng({ width: 160, height: 160 }),
    ).rejects.toThrow(/non-string/);
  });

  it("rejects when toDataURL passes an empty string", async () => {
    mockToDataURL.mockImplementation((cb: (b64: string) => void) => {
      cb("");
    });
    const handle = mountAndGetHandle();
    await expect(
      handle.captureAsPng({ width: 160, height: 160 }),
    ).rejects.toThrow(/empty result/);
  });

  it("rejects after 5000ms when toDataURL never invokes its callback", async () => {
    jest.useFakeTimers();
    try {
      // Capture the callback so it doesn't fire — simulates the native
      // RCTLogError + return path that drops the callback on registry miss.
      mockToDataURL.mockImplementation(() => {
        /* intentionally never invokes cb */
      });
      const handle = mountAndGetHandle();
      const pending = handle.captureAsPng({ width: 160, height: 160 });
      // Attach a rejection handler synchronously so jest doesn't see an
      // "unhandled rejection" when the timer fires.
      const assertion = expect(pending).rejects.toThrow(
        /did not respond within 5000ms/,
      );
      jest.advanceTimersByTime(5001);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it("treats late callbacks after timeout as no-ops (single settlement)", async () => {
    jest.useFakeTimers();
    try {
      let captured: ((b64: string) => void) | undefined;
      mockToDataURL.mockImplementation((cb: (b64: string) => void) => {
        captured = cb;
      });
      const handle = mountAndGetHandle();
      const pending = handle.captureAsPng({ width: 160, height: 160 });
      const assertion = expect(pending).rejects.toThrow(
        /did not respond within 5000ms/,
      );
      jest.advanceTimersByTime(5001);
      await assertion;
      // Now invoke the late callback. The latch in BadgeRenderer.captureAsPng
      // (settled = true) must swallow it without throwing or producing an
      // unhandled rejection.
      expect(() => captured?.(VALID_PNG_BASE64)).not.toThrow();
    } finally {
      jest.useRealTimers();
    }
  });
});
