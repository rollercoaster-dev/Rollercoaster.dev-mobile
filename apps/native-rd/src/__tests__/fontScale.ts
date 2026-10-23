/**
 * Test helper for the OS font scale (Dynamic Type). `useTypeScale` reads it
 * from `useWindowDimensions`, which re-renders on a Dimensions change, so
 * calling this after render updates mounted components too.
 *
 * `setup-font-scale.ts` pins every test to 1 and restores 1 after each test,
 * so call this inside the test or a beforeEach — a beforeAll or
 * describe-level call only holds for the first test.
 */
import { act } from "@testing-library/react-native";
import { Dimensions } from "react-native";

export function setFontScale(fontScale: number) {
  const window = Dimensions.get("window");
  const screen = Dimensions.get("screen");
  Dimensions.set({
    window: { ...window, fontScale },
    screen: { ...screen, fontScale },
  });
}

export function mockFontScale(fontScale: number) {
  act(() => setFontScale(fontScale));
}
