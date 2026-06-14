import React from "react";
import { render } from "@testing-library/react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
  act,
} from "../../../__tests__/test-utils";
import { Toast } from "../Toast";
import { ToastProvider, useToast } from "../ToastContext";
import { AccessibilityInfo, Platform, Pressable, Text } from "react-native";

// Platform.OS is a runtime property; defineProperty swaps it without re-mocking
// the whole react-native module.
function setPlatform(os: "ios" | "android") {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: "none",
    shouldAnimate: false,
    shouldReduceMotion: true,
    setAnimationPref: jest.fn(),
  }),
}));

// The shared reanimated mock fires withTiming's completion callback
// synchronously with finished === true, which can't distinguish "unmounts only
// after the slide-out completes" from the old synchronous unmount, nor reach
// the finished === false guard. Wrap withTiming so that, when a test opts in
// via deferSlideOut(), completion callbacks are queued instead of invoked — and
// the test flushes them on its own terms (true OR false). The function the
// component binds at import time is stable; its behavior is steered by the
// module-level queue it closes over, so this works despite Babel's named-import
// interop copying the reference. Default (queue null) keeps the synchronous
// finished === true behavior every other test relies on.
let mockSlideOutQueue: ((finished: boolean) => void)[] | null = null;

jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("../../../__tests__/mocks/reanimated");
  const withTiming = (
    toValue: number,
    _config?: object,
    cb?: (finished: boolean) => void,
  ) => {
    if (typeof cb === "function") {
      if (mockSlideOutQueue) mockSlideOutQueue.push(cb);
      else cb(true);
    }
    return toValue;
  };
  return { ...actual, withTiming, default: { ...actual.default, withTiming } };
});

function deferSlideOut() {
  const queue: ((finished: boolean) => void)[] = [];
  mockSlideOutQueue = queue;
  return {
    flush: (finished: boolean) => queue.splice(0).forEach((cb) => cb(finished)),
    restore: () => {
      mockSlideOutQueue = null;
    },
  };
}

describe("Toast", () => {
  it("renders message when visible", () => {
    renderWithProviders(<Toast visible message="Item deleted" />);
    expect(screen.getByText("Item deleted")).toBeOnTheScreen();
  });

  it("does not render when not visible", () => {
    renderWithProviders(<Toast visible={false} message="Item deleted" />);
    expect(screen.queryByText("Item deleted")).toBeNull();
  });

  it("renders action button when provided", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <Toast visible message="Deleted" action={{ label: "Undo", onPress }} />,
    );
    expect(screen.getByLabelText("Undo")).toBeOnTheScreen();
  });

  it("calls action onPress when button is pressed", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <Toast visible message="Deleted" action={{ label: "Undo", onPress }} />,
    );
    fireEvent.press(screen.getByLabelText("Undo"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("has accessible alert role", () => {
    renderWithProviders(<Toast visible message="Evidence deleted" />);
    expect(screen.getByLabelText("Evidence deleted")).toBeOnTheScreen();
  });

  it("calls onDismiss after duration", () => {
    jest.useFakeTimers();
    const onDismiss = jest.fn();
    renderWithProviders(
      <Toast visible message="Deleted" duration={3000} onDismiss={onDismiss} />,
    );
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(onDismiss).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("stays mounted through the slide-out and unmounts only once it finishes", () => {
    // Regression (#264): the old `if (!visible) return null` unmounted before
    // the slide-out could run. With the completion callback deferred, the toast
    // must remain on screen after `visible` flips false (mounted lingers) and
    // disappear only when the slide-out reports finished === true. Asserting the
    // still-mounted phase is what distinguishes this from the old synchronous
    // unmount — the buggy code would already be gone by the first assertion.
    const slideOut = deferSlideOut();
    try {
      const { rerender } = renderWithProviders(<Toast visible message="Bye" />);
      expect(screen.getByText("Bye")).toBeOnTheScreen();
      act(() => {
        rerender(<Toast visible={false} message="Bye" />);
      });
      // Completion callback not yet fired: still mounted through the exit.
      expect(screen.getByText("Bye")).toBeOnTheScreen();
      act(() => {
        slideOut.flush(true);
      });
      expect(screen.queryByText("Bye")).toBeNull();
    } finally {
      slideOut.restore();
    }
  });

  it("does not unmount when the slide-out is interrupted (finished === false)", () => {
    // The finished guard (Toast.tsx) protects against an interrupted slide-out:
    // its callback fires with finished === false, and that stale callback must
    // NOT tear down a toast that's becoming visible again. Drive the false path
    // directly — the synchronous mock only ever sends true, so without this the
    // guard's branch is never exercised and removing `if (finished)` would still
    // pass.
    const slideOut = deferSlideOut();
    try {
      const { rerender } = renderWithProviders(<Toast visible message="Bye" />);
      act(() => {
        rerender(<Toast visible={false} message="Bye" />);
      });
      act(() => {
        slideOut.flush(false);
      });
      // mounted stays true (guard skipped setMounted(false)), so the toast is
      // still rendered despite visible being false.
      expect(screen.getByText("Bye")).toBeOnTheScreen();
    } finally {
      slideOut.restore();
    }
  });

  it("fires onExitComplete once the slide-out finishes (finished === true)", () => {
    // The owner releases its toast state on this callback, so it must fire only
    // after the exit animation actually completes — not on `visible` flipping.
    const slideOut = deferSlideOut();
    const onExitComplete = jest.fn();
    try {
      const { rerender } = renderWithProviders(
        <Toast visible message="Bye" onExitComplete={onExitComplete} />,
      );
      act(() => {
        rerender(
          <Toast
            visible={false}
            message="Bye"
            onExitComplete={onExitComplete}
          />,
        );
      });
      expect(onExitComplete).not.toHaveBeenCalled();
      act(() => {
        slideOut.flush(true);
      });
      expect(onExitComplete).toHaveBeenCalledTimes(1);
    } finally {
      slideOut.restore();
    }
  });

  it("does not fire onExitComplete when the slide-out is interrupted (finished === false)", () => {
    // An interrupted exit (re-show mid-slide) reports finished === false; tearing
    // down the toast state then would drop a toast that's becoming visible again.
    const slideOut = deferSlideOut();
    const onExitComplete = jest.fn();
    try {
      const { rerender } = renderWithProviders(
        <Toast visible message="Bye" onExitComplete={onExitComplete} />,
      );
      act(() => {
        rerender(
          <Toast
            visible={false}
            message="Bye"
            onExitComplete={onExitComplete}
          />,
        );
      });
      act(() => {
        slideOut.flush(false);
      });
      expect(onExitComplete).not.toHaveBeenCalled();
    } finally {
      slideOut.restore();
    }
  });

  it("announces the message for screen readers on show (iOS)", () => {
    // accessibilityLiveRegion only fires on Android; iOS VoiceOver needs this.
    const originalPlatform = Platform.OS;
    setPlatform("ios");
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});
    try {
      renderWithProviders(<Toast visible message="Evidence deleted" />);
      expect(announce).toHaveBeenCalledWith("Evidence deleted");
    } finally {
      announce.mockRestore();
      setPlatform(originalPlatform as "ios" | "android");
    }
  });

  it("does not explicitly announce on Android (live region handles it)", () => {
    // accessibilityLiveRegion="assertive" already announces on Android;
    // an explicit announceForAccessibility would double-speak in TalkBack.
    const originalPlatform = Platform.OS;
    setPlatform("android");
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});
    try {
      renderWithProviders(<Toast visible message="Evidence deleted" />);
      expect(announce).not.toHaveBeenCalled();
    } finally {
      announce.mockRestore();
      setPlatform(originalPlatform as "ios" | "android");
    }
  });
});

describe("ToastContext", () => {
  function TestConsumer() {
    const { showToast, hideToast } = useToast();
    return (
      <>
        <Pressable
          testID="show-toast"
          onPress={() =>
            showToast({
              message: "Context toast",
              action: { label: "Undo", onPress: hideToast },
            })
          }
        >
          <Text>Show Toast</Text>
        </Pressable>
        <Pressable testID="hide-toast" onPress={hideToast}>
          <Text>Hide Toast</Text>
        </Pressable>
      </>
    );
  }

  it("shows toast via context", () => {
    renderWithProviders(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.press(screen.getByTestId("show-toast"));
    expect(screen.getByText("Context toast")).toBeOnTheScreen();
  });

  it("hides toast via context", () => {
    renderWithProviders(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.press(screen.getByTestId("show-toast"));
    expect(screen.getByText("Context toast")).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId("hide-toast"));
    expect(screen.queryByText("Context toast")).toBeNull();
  });

  it("throws when useToast is used outside provider", () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() => {
      render(<TestConsumer />);
    }).toThrow("useToast must be used within a ToastProvider");
    consoleError.mockRestore();
  });
});
