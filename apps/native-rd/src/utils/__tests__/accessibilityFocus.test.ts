import { AccessibilityInfo, findNodeHandle } from "react-native";
import { focusAccessibilityRef } from "../accessibilityFocus";

// findNodeHandle is a lazy getter on react-native's index, so jest.spyOn can't
// replace it in place. The helper only touches findNodeHandle + AccessibilityInfo
// and this suite renders nothing, so a minimal module mock is enough (spreading
// the real module trips its lazy native-component getters).
jest.mock("react-native", () => ({
  findNodeHandle: jest.fn((inst: unknown) => (inst == null ? null : 4242)),
  AccessibilityInfo: { setAccessibilityFocus: jest.fn() },
}));

const setFocus = AccessibilityInfo.setAccessibilityFocus as jest.Mock;
const findHandle = findNodeHandle as unknown as jest.Mock;

describe("focusAccessibilityRef", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setFocus.mockClear();
    findHandle.mockClear();
    findHandle.mockImplementation((inst: unknown) =>
      inst == null ? null : 4242,
    );
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("focuses the resolved native tag after the delay elapses", () => {
    focusAccessibilityRef({ current: {} });
    // Nothing fires synchronously — the delay lets the view register first.
    expect(setFocus).not.toHaveBeenCalled();
    jest.advanceTimersByTime(50);
    expect(setFocus).toHaveBeenCalledWith(4242);
  });

  it("uses an already-numeric current as the tag without findNodeHandle", () => {
    focusAccessibilityRef({ current: 77 });
    jest.runAllTimers();
    expect(findHandle).not.toHaveBeenCalled();
    expect(setFocus).toHaveBeenCalledWith(77);
  });

  it("no-ops immediately (no timer) for a null ref", () => {
    expect(focusAccessibilityRef(null)).toBeUndefined();
    jest.runAllTimers();
    expect(setFocus).not.toHaveBeenCalled();
  });

  it("does not focus when the ref's current stays null through the delay", () => {
    focusAccessibilityRef({ current: null });
    jest.runAllTimers();
    expect(setFocus).not.toHaveBeenCalled();
  });

  it("resolves current lazily — a ref populated after scheduling still focuses", () => {
    const ref: { current: unknown } = { current: null };
    focusAccessibilityRef(ref);
    // The view mounts after the focus request is scheduled.
    ref.current = {};
    jest.runAllTimers();
    expect(setFocus).toHaveBeenCalledWith(4242);
  });

  it("does not focus when findNodeHandle resolves to null", () => {
    findHandle.mockReturnValue(null);
    focusAccessibilityRef({ current: {} });
    jest.runAllTimers();
    expect(setFocus).not.toHaveBeenCalled();
  });

  it("cancel function prevents the delayed focus from firing", () => {
    const cancel = focusAccessibilityRef({ current: {} });
    cancel?.();
    jest.runAllTimers();
    expect(setFocus).not.toHaveBeenCalled();
  });

  it("honors a custom delay", () => {
    focusAccessibilityRef({ current: 9 }, 200);
    jest.advanceTimersByTime(199);
    expect(setFocus).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(setFocus).toHaveBeenCalledWith(9);
  });
});
