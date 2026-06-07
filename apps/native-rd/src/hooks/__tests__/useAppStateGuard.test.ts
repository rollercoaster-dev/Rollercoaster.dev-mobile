import { renderHook, act } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { useAppStateGuard } from "../useAppStateGuard";

type ChangeListener = (status: AppStateStatus) => void;

let listeners: ChangeListener[] = [];
let currentStateSpy: jest.SpyInstance | undefined;

function setCurrentState(status: AppStateStatus) {
  if (currentStateSpy) currentStateSpy.mockRestore();
  currentStateSpy = jest
    .spyOn(AppState, "currentState", "get")
    .mockReturnValue(status);
}

function emit(status: AppStateStatus) {
  setCurrentState(status);
  // Snapshot to allow listeners that mutate the array (e.g. unsubscribe).
  for (const fn of [...listeners]) fn(status);
}

beforeEach(() => {
  listeners = [];
  setCurrentState("active");
  jest.spyOn(AppState, "addEventListener").mockImplementation(((
    _: string,
    cb: ChangeListener,
  ) => {
    listeners.push(cb);
    return {
      remove: () => {
        listeners = listeners.filter((l) => l !== cb);
      },
    };
  }) as unknown as typeof AppState.addEventListener);
});

afterEach(() => {
  jest.restoreAllMocks();
  currentStateSpy = undefined;
});

describe("useAppStateGuard", () => {
  it("runs the callback immediately when AppState is active", () => {
    setCurrentState("active");
    const { result } = renderHook(() => useAppStateGuard());
    const fn = jest.fn();
    act(() => result.current.runWhenActive(fn));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("queues the callback when backgrounded and flushes on resume", () => {
    setCurrentState("background");
    const { result } = renderHook(() => useAppStateGuard());
    const fn = jest.fn();
    act(() => result.current.runWhenActive(fn));
    expect(fn).not.toHaveBeenCalled();

    act(() => emit("active"));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("flushes queued callbacks in FIFO order", () => {
    setCurrentState("background");
    const { result } = renderHook(() => useAppStateGuard());
    const order: string[] = [];
    act(() => {
      result.current.runWhenActive(() => order.push("a"));
      result.current.runWhenActive(() => order.push("b"));
      result.current.runWhenActive(() => order.push("c"));
    });
    act(() => emit("active"));
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("discards the queue on unmount (no late calls)", () => {
    setCurrentState("background");
    const { result, unmount } = renderHook(() => useAppStateGuard());
    const fn = jest.fn();
    act(() => result.current.runWhenActive(fn));
    unmount();
    act(() => emit("active"));
    expect(fn).not.toHaveBeenCalled();
  });

  it("only flushes on background-to-active transition, not active-to-active", () => {
    setCurrentState("active");
    const { result } = renderHook(() => useAppStateGuard());
    const fn = jest.fn();
    // Already active — fires immediately.
    act(() => result.current.runWhenActive(fn));
    fn.mockClear();
    // Re-emit 'active' (no transition) — should not re-fire anything.
    act(() => emit("active"));
    expect(fn).not.toHaveBeenCalled();
  });

  it.each<[AppStateStatus, AppStateStatus]>([
    ["background", "active"],
    ["inactive", "active"],
  ])(
    "queues while %s and flushes when transitioning to %s",
    (paused, resumed) => {
      setCurrentState(paused);
      const { result } = renderHook(() => useAppStateGuard());
      const fn = jest.fn();
      act(() => result.current.runWhenActive(fn));
      expect(fn).not.toHaveBeenCalled();
      act(() => emit(resumed));
      expect(fn).toHaveBeenCalledTimes(1);
    },
  );

  it("clears the queue after flushing so a second pause-resume cycle re-queues fresh", () => {
    setCurrentState("background");
    const { result } = renderHook(() => useAppStateGuard());
    const first = jest.fn();
    act(() => result.current.runWhenActive(first));
    act(() => emit("active"));
    expect(first).toHaveBeenCalledTimes(1);

    // Pause again.
    act(() => emit("background"));
    const second = jest.fn();
    act(() => result.current.runWhenActive(second));
    expect(second).not.toHaveBeenCalled();
    expect(first).toHaveBeenCalledTimes(1); // Not re-fired.

    act(() => emit("active"));
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
  });
});
