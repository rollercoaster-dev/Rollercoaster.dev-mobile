/**
 * The last-resort root ErrorBoundary in App.tsx.
 *
 * Each case makes a different layer above the routed screens throw — the
 * fonts hook, the theme state that feeds ThemeProvider, and the shell inside
 * every provider — and asserts the root fallback renders. The fallback must
 * not depend on ThemeProvider or any other React provider, which the
 * `useTheme` case proves: ThemeProvider never mounts there.
 */
import React from "react";
import { render, screen } from "@testing-library/react-native";
import { i18n } from "../i18n";
import { reportError } from "../services/sentry-report";
import { App } from "../../App";

jest.mock("../services/sentry-report", () => ({
  reportError: jest.fn(),
}));

jest.mock("expo", () => ({ reloadAppAsync: jest.fn() }));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
// Screen coverage lives in navigation/__tests__/screenErrorBoundary.test.tsx.
jest.mock("../navigation", () => ({ TabNavigator: () => null }));

const mockFailAt: { layer: "fonts" | "theme" | "shell" | null } = {
  layer: null,
};

jest.mock("../hooks/useFonts", () => ({
  useFonts: () => {
    if (mockFailAt.layer === "fonts") throw new Error("fonts failed");
    return { isReady: true };
  },
}));

jest.mock("../hooks/useTheme", () => {
  const actual = jest.requireActual("../hooks/useTheme");
  return {
    ...actual,
    useTheme: () => {
      if (mockFailAt.layer === "theme") throw new Error("theme failed");
      return actual.useTheme();
    },
  };
});

// ThemedApp's first hook: a throw here lands inside every provider and
// StartupGate, but outside any navigator's screen boundary.
jest.mock("../hooks/useFirstLaunch", () => ({
  useFirstLaunch: () => {
    if (mockFailAt.layer === "shell") throw new Error("shell failed");
    return { isFirstLaunch: null, markSeen: jest.fn() };
  },
}));

const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

beforeEach(() => {
  (reportError as jest.Mock).mockClear();
});

describe("App root error boundary", () => {
  test.each(["fonts", "theme", "shell"] as const)(
    "shows the root fallback when the %s layer throws",
    (layer) => {
      mockFailAt.layer = layer;
      render(<App />);
      expect(screen.getByTestId("error-boundary-fallback-root")).toBeTruthy();
      expect(
        screen.getByText(i18n.t("common:errorBoundary.title")),
      ).toBeTruthy();
      expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
        area: "render",
      });
    },
  );
});
