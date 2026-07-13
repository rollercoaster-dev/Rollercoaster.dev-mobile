import React from "react";
import { Text, AccessibilityInfo, BackHandler } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
  act,
} from "../../../__tests__/test-utils";
import { AnimatedSheet } from "../AnimatedSheet";
import { expectModalAccessibility } from "../../../__tests__/a11y-helpers";

// findNodeHandle is a lazy getter on react-native's index — jest.spyOn can't
// replace it in place, so redefine it to resolve any view instance to a fixed
// tag (111). Numeric restoreFocusRef currents bypass it entirely, so a distinct
// value (555 below) proves focus went to the trigger, not the title.
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  Object.defineProperty(RN, "findNodeHandle", {
    configurable: true,
    value: jest.fn(() => 111),
  });
  return RN;
});

let mockAnimationPref = "full";
jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: mockAnimationPref,
    shouldAnimate: mockAnimationPref !== "none",
    shouldReduceMotion: mockAnimationPref === "none",
    setAnimationPref: jest.fn(),
  }),
}));

const TITLE_TAG = 111;

function Sheet(props: Partial<React.ComponentProps<typeof AnimatedSheet>>) {
  return (
    <AnimatedSheet
      visible={false}
      onClose={jest.fn()}
      title="Sheet title"
      closeLabel="Close"
      {...props}
    >
      <Text>Body</Text>
    </AnimatedSheet>
  );
}

describe("AnimatedSheet", () => {
  let setFocus: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    mockAnimationPref = "full";
    setFocus = jest
      .spyOn(AccessibilityInfo, "setAccessibilityFocus")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    setFocus.mockRestore();
  });

  it("focuses the title once when visible flips true", () => {
    const { rerender } = renderWithProviders(<Sheet visible={false} />);
    expect(setFocus).not.toHaveBeenCalled();

    rerender(<Sheet visible={true} />);
    act(() => {
      jest.runAllTimers();
    });
    expect(setFocus).toHaveBeenCalledWith(TITLE_TAG);
    expect(setFocus).toHaveBeenCalledTimes(1);
  });

  it("restores focus to restoreFocusRef once the sheet finishes closing", () => {
    // Numeric current = a captured native tag; resolved without findNodeHandle
    // so it's distinct from the title's tag.
    const restoreFocusRef = { current: 555 } as React.RefObject<number>;
    const { rerender } = renderWithProviders(
      <Sheet visible={true} restoreFocusRef={restoreFocusRef} />,
    );
    act(() => {
      jest.runAllTimers();
    });
    // Title focused on open; isolate the close-restore that follows.
    setFocus.mockClear();

    rerender(<Sheet visible={false} restoreFocusRef={restoreFocusRef} />);
    act(() => {
      jest.runAllTimers();
    });
    expect(setFocus).toHaveBeenCalledWith(555);
    expect(setFocus).toHaveBeenCalledTimes(1);
  });

  it("does not fire a stale restore when reopened before the delay elapses", () => {
    // Numeric current = a captured native tag; distinct from the title's 111.
    const restoreFocusRef = { current: 555 } as React.RefObject<number>;
    const { rerender } = renderWithProviders(
      <Sheet visible={true} restoreFocusRef={restoreFocusRef} />,
    );
    act(() => {
      jest.runAllTimers();
    });
    // Title focused on open; isolate what follows the close→reopen.
    setFocus.mockClear();

    // Close then reopen within the same pending-timer window: act() flushes the
    // effects (so close schedules the restore timer) but does NOT advance the
    // fake timer, so the reopen must cancel the pending restore before it fires.
    act(() => {
      rerender(<Sheet visible={false} restoreFocusRef={restoreFocusRef} />);
    });
    act(() => {
      rerender(<Sheet visible={true} restoreFocusRef={restoreFocusRef} />);
    });
    act(() => {
      jest.runAllTimers();
    });

    // Reopen re-focuses the title; the cancelled restore must never land on 555.
    expect(setFocus).toHaveBeenCalledWith(TITLE_TAG);
    expect(setFocus).not.toHaveBeenCalledWith(555);
  });

  it("marks the overlay as a modal so content behind it is hidden (iOS)", () => {
    renderWithProviders(<Sheet visible={true} />);
    expectModalAccessibility(screen.getByTestId("animated-sheet-overlay"));
  });

  it("does not throw when restoreFocusRef is omitted", () => {
    const { rerender } = renderWithProviders(<Sheet visible={true} />);
    act(() => {
      jest.runAllTimers();
    });
    setFocus.mockClear();
    expect(() => {
      rerender(<Sheet visible={false} />);
      act(() => {
        jest.runAllTimers();
      });
    }).not.toThrow();
    // Nothing to restore to → no focus call on close.
    expect(setFocus).not.toHaveBeenCalled();
  });

  it("still focuses the title on open when motion is off (animationPref none)", () => {
    mockAnimationPref = "none";
    const { rerender } = renderWithProviders(<Sheet visible={false} />);
    rerender(<Sheet visible={true} />);
    act(() => {
      jest.runAllTimers();
    });
    expect(setFocus).toHaveBeenCalledWith(TITLE_TAG);
  });

  it("dismisses on Android hardware back while open", () => {
    const onClose = jest.fn();
    const addSpy = jest.spyOn(BackHandler, "addEventListener");
    renderWithProviders(<Sheet visible={true} onClose={onClose} />);
    const handler = addSpy.mock.calls.find(
      ([event]) => event === "hardwareBackPress",
    )?.[1];
    expect(handler).toBeDefined();
    expect(handler?.()).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    addSpy.mockRestore();
  });

  it("does not render its chrome while closed", () => {
    renderWithProviders(<Sheet visible={false} />);
    expect(screen.queryByText("Sheet title")).toBeNull();
    expect(screen.queryByText("Body")).toBeNull();
  });

  it("renders the title, close control, and body while open", () => {
    renderWithProviders(<Sheet visible={true} closeTestID="sheet-close" />);
    expect(screen.getByText("Sheet title")).toBeOnTheScreen();
    expect(screen.getByText("Body")).toBeOnTheScreen();
    const close = screen.getByTestId("sheet-close");
    expect(close.props.accessibilityRole).toBe("button");
    expect(close.props.accessibilityLabel).toBe("Close");
    fireEvent.press(close);
  });
});
