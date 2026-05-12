import { renderHook } from "@testing-library/react-native";
import { useEvidenceStartBreadcrumb } from "../useEvidenceStartBreadcrumb";
import type { EvidenceTypeValue } from "../../types/evidence";

jest.mock("../../services/sentry-report", () => ({
  breadcrumb: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { breadcrumb: mockBreadcrumb } = require("../../services/sentry-report");

beforeEach(() => {
  mockBreadcrumb.mockClear();
});

describe("useEvidenceStartBreadcrumb", () => {
  it.each(["photo", "video", "voice_memo", "file", "link", "text"] as const)(
    "emits evidence/start with kind:%s on mount",
    (kind) => {
      renderHook(() => useEvidenceStartBreadcrumb(kind));
      expect(mockBreadcrumb).toHaveBeenCalledWith({
        category: "evidence",
        message: "start",
        kind,
      });
      expect(mockBreadcrumb).toHaveBeenCalledTimes(1);
    },
  );

  it("does not re-emit on re-render with the same kind", () => {
    const { rerender } = renderHook<void, { kind: EvidenceTypeValue }>(
      ({ kind }) => useEvidenceStartBreadcrumb(kind),
      { initialProps: { kind: "photo" } },
    );

    rerender({ kind: "photo" });
    rerender({ kind: "photo" });

    expect(mockBreadcrumb).toHaveBeenCalledTimes(1);
  });

  // The kind in the dep array means a CaptureScreen that swaps kind without
  // unmounting (not currently a pattern, but allowed by the hook contract)
  // would emit a fresh "start" — documents that behavior.
  it("emits again when kind changes", () => {
    const { rerender } = renderHook<void, { kind: EvidenceTypeValue }>(
      ({ kind }) => useEvidenceStartBreadcrumb(kind),
      { initialProps: { kind: "photo" } },
    );

    rerender({ kind: "video" });

    expect(mockBreadcrumb).toHaveBeenCalledTimes(2);
    expect(mockBreadcrumb).toHaveBeenNthCalledWith(2, {
      category: "evidence",
      message: "start",
      kind: "video",
    });
  });
});
