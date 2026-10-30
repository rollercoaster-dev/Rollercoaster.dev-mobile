import React from "react";
import { AccessibilityInfo, Pressable, Text } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
  act,
} from "../../../__tests__/test-utils";
import { NavigationContext } from "@react-navigation/native";
import { AnimatedSheet } from "../AnimatedSheet";
import { SheetBackground, useSheetTrigger } from "../sheetAccessibility";

// The shared navigation mock has no NavigationContext; give this suite a real
// one so a test can play the hosting screen losing focus.
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("../../../__tests__/mocks/navigation"),
  NavigationContext: jest.requireActual("react").createContext(undefined),
}));

// The production trigger is a host instance, which focusAccessibilityRef
// resolves through findNodeHandle; resolve test instances to the tag they carry.
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  Object.defineProperty(RN, "findNodeHandle", {
    configurable: true,
    value: jest.fn((instance: { tag?: number } | null) => instance?.tag ?? 111),
  });
  return RN;
});

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
    expect(background()).toMatchObject({
      accessibilityElementsHidden: false,
      importantForAccessibility: "auto",
    });
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

  // Bottom tabs keep an unfocused tab mounted: a sheet left open there must not
  // keep hiding the tab bar and headers of the tab the user switched to.
  it("releases the background while the sheet's screen is not focused", () => {
    let focused = true;
    const listeners = new Set<() => void>();
    const navigation = {
      isFocused: () => focused,
      addListener: (_event: string, listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    const setFocused = (next: boolean) =>
      act(() => {
        focused = next;
        listeners.forEach((listener) => listener());
      });
    renderWithProviders(
      <>
        <SheetBackground testID="background">
          <Text>Behind</Text>
        </SheetBackground>
        <NavigationContext.Provider value={navigation as never}>
          <Sheet visible testID="first" />
        </NavigationContext.Provider>
      </>,
    );
    expect(background().importantForAccessibility).toBe("no-hide-descendants");

    setFocused(false);
    expect(background().importantForAccessibility).toBe("auto");

    setFocused(true);
    expect(background().importantForAccessibility).toBe("no-hide-descendants");
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

  // currentTarget (the Pressable itself) beats nativeEvent.target (the deepest
  // view touched, e.g. its label), which is only a fallback.
  it.each([
    {
      source: "the pressed control",
      event: { currentTarget: { tag: 888 }, nativeEvent: { target: 777 } },
      expected: 888,
    },
    {
      source: "the touched view when no currentTarget is set",
      event: { nativeEvent: { target: 777 } },
      expected: 777,
    },
  ])(
    "returns focus to $source when the sheet closes",
    ({ event, expected }) => {
      jest.useFakeTimers();
      const setFocus = jest
        .spyOn(AccessibilityInfo, "setAccessibilityFocus")
        .mockImplementation(() => undefined);
      try {
        const { rerender } = renderWithProviders(
          <TriggeredSheet open={false} />,
        );
        fireEvent.press(screen.getByTestId("trigger"), event);
        rerender(<TriggeredSheet open />);
        act(() => {
          jest.runAllTimers();
        });
        setFocus.mockClear();

        rerender(<TriggeredSheet open={false} />);
        act(() => {
          jest.runAllTimers();
        });
        expect(setFocus).toHaveBeenCalledWith(expected);
      } finally {
        setFocus.mockRestore();
        jest.useRealTimers();
      }
    },
  );
});
