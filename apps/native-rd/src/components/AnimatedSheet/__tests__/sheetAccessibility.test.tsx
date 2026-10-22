import React from "react";
import { AccessibilityInfo, Pressable, Text } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
  act,
} from "../../../__tests__/test-utils";
import { AnimatedSheet } from "../AnimatedSheet";
import { SheetBackground, useSheetTrigger } from "../sheetAccessibility";

jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: "none",
    shouldAnimate: false,
    shouldReduceMotion: true,
    setAnimationPref: jest.fn(),
  }),
}));

function Sheet({ visible, testID }: { visible: boolean; testID: string }) {
  return (
    <AnimatedSheet
      visible={visible}
      onClose={jest.fn()}
      title={testID}
      closeLabel="Close"
      backdropTestID={testID}
    >
      <Text>Body</Text>
    </AnimatedSheet>
  );
}

// The background region sits beside the sheets, as a screen's body does.
function Screen({ first, second }: { first: boolean; second?: boolean }) {
  return (
    <>
      <SheetBackground testID="background">
        <Text>Behind</Text>
      </SheetBackground>
      <Sheet visible={first} testID="first" />
      {second !== undefined ? <Sheet visible={second} testID="second" /> : null}
    </>
  );
}

const background = () =>
  screen.getByTestId("background", { includeHiddenElements: true }).props;

describe("SheetBackground (#686)", () => {
  it("hides its subtree from VoiceOver and TalkBack only while a sheet is open", () => {
    const { rerender } = renderWithProviders(<Screen first={false} />);
    expect(background()).toMatchObject({
      accessibilityElementsHidden: false,
      importantForAccessibility: "auto",
    });

    rerender(<Screen first />);
    expect(background()).toMatchObject({
      accessibilityElementsHidden: true,
      importantForAccessibility: "no-hide-descendants",
    });

    rerender(<Screen first={false} />);
    expect(background().importantForAccessibility).toBe("auto");
  });

  it("stays hidden until every open sheet has closed", () => {
    const { rerender } = renderWithProviders(<Screen first second />);
    rerender(<Screen first={false} second />);
    expect(background().importantForAccessibility).toBe("no-hide-descendants");

    rerender(<Screen first={false} second={false} />);
    expect(background().importantForAccessibility).toBe("auto");
  });

  it("releases the background when an open sheet unmounts", () => {
    const { rerender } = renderWithProviders(<Screen first second />);
    rerender(<Screen first={false} />);
    expect(background().importantForAccessibility).toBe("auto");
  });
});

describe("useSheetTrigger (#686)", () => {
  function TriggeredSheet({ open }: { open: boolean }) {
    const { restoreFocusRef, rememberTrigger } = useSheetTrigger();
    return (
      <>
        <Pressable testID="trigger" onPress={rememberTrigger} />
        <AnimatedSheet
          visible={open}
          onClose={jest.fn()}
          title="Sheet"
          closeLabel="Close"
          restoreFocusRef={restoreFocusRef}
        >
          <Text>Body</Text>
        </AnimatedSheet>
      </>
    );
  }

  it("returns focus to the pressed trigger when the sheet closes", () => {
    jest.useFakeTimers();
    const setFocus = jest
      .spyOn(AccessibilityInfo, "setAccessibilityFocus")
      .mockImplementation(() => undefined);
    try {
      const { rerender } = renderWithProviders(<TriggeredSheet open={false} />);
      fireEvent.press(screen.getByTestId("trigger"), {
        nativeEvent: { target: 777 },
      });
      rerender(<TriggeredSheet open />);
      act(() => {
        jest.runAllTimers();
      });
      setFocus.mockClear();

      rerender(<TriggeredSheet open={false} />);
      act(() => {
        jest.runAllTimers();
      });
      expect(setFocus).toHaveBeenCalledWith(777);
    } finally {
      setFocus.mockRestore();
      jest.useRealTimers();
    }
  });
});
