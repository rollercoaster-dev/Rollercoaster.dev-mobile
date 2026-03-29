/**
 * Mock for react-native-unistyles (v3 with Babel plugin)
 *
 * In Unistyles v3, StyleSheet.create receives a function (theme) => styles
 * and the Babel plugin makes it reactive. In tests, we call the function
 * with a real composed theme to produce static styles.
 */

import { composeTheme, type ComposedTheme } from "../../themes/compose";

/** Real composed theme — always matches ComposedTheme type exactly */
export const mockTheme: ComposedTheme = composeTheme("light", "default");

/**
 * Adds a no-op useVariants to the returned stylesheet, matching Unistyles v3
 * behavior where each stylesheet gets a useVariants hook for variant selection.
 */
function addUseVariants<T>(
  styles: T,
): T & { useVariants: (variants: Record<string, string>) => void } {
  return Object.assign(styles as object, {
    useVariants: jest.fn(),
  }) as unknown as T & {
    useVariants: (variants: Record<string, string>) => void;
  };
}

/**
 * StyleSheet.create mock — if given a function, calls it with mockTheme;
 * if given an object, returns it as-is. Adds useVariants to the result.
 */
const StyleSheet = {
  create: <T>(fnOrObj: ((theme: ComposedTheme) => T) | T): T => {
    const result =
      typeof fnOrObj === "function"
        ? (fnOrObj as (theme: ComposedTheme) => T)(mockTheme)
        : fnOrObj;
    return addUseVariants(result) as T;
  },
  configure: jest.fn(),
};

const useUnistyles = jest.fn(() => ({ theme: mockTheme }));

const UnistylesRuntime = {
  themeName: "light-default",
  setTheme: jest.fn(),
  updateTheme: jest.fn(),
  hasAdaptiveThemes: false,
  colorScheme: "light",
  contentSizeCategory: "Medium",
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  statusBar: { height: 0 },
  navigationBar: { height: 0 },
};

module.exports = { StyleSheet, useUnistyles, UnistylesRuntime, mockTheme };
