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
jest.mock("../navigation", () => {
  const { View } = jest.requireActual("react-native");
  return { TabNavigator: () => <View testID="tab-navigator" /> };
});

// The global db setup mocks ./db/evolu without EvoluAppProvider, which left
// AppRoot rendering an undefined element. Supply a passthrough so the tree
// below it really mounts.
jest.mock("../db", () => ({
  ...jest.requireActual("../db"),
  EvoluAppProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// StartupGate's own suite covers its Evolu error and timeout paths; here it
// would need an Evolu error source, so it passes its children through.
jest.mock("../components/StartupGate", () => ({
  StartupGate: ({ children }: { children: React.ReactNode }) => children,
}));

const mockFailAt: { layer: "fonts" | "theme" | "shell" | null } = {
  layer: null,
};
const mockStartup: { isFirstLaunch: boolean | null; isThemeRestored: boolean } =
  { isFirstLaunch: null, isThemeRestored: false };

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
    return { isFirstLaunch: mockStartup.isFirstLaunch, markSeen: jest.fn() };
  },
}));

jest.mock("../hooks/useThemePersistence", () => ({
  useThemePersistence: () => ({
    setTheme: jest.fn(),
    isThemeRestored: mockStartup.isThemeRestored,
  }),
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
  mockFailAt.layer = null;
  mockStartup.isFirstLaunch = null;
  mockStartup.isThemeRestored = false;
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

// A screen that mounts in the default theme and is switched a tick later keeps
// stale ink on Android (Goals header title black on Night Ride's dark band).
describe("App startup: the navigator waits for the saved theme", () => {
  it("shows the loading view, not the navigator, while the theme is not restored", () => {
    mockStartup.isFirstLaunch = false;
    mockStartup.isThemeRestored = false;
    render(<App />);
    expect(screen.getByTestId("app-loading")).toBeTruthy();
    expect(screen.queryByTestId("tab-navigator")).toBeNull();
  });

  it("mounts the navigator once the theme is restored", () => {
    mockStartup.isFirstLaunch = false;
    mockStartup.isThemeRestored = true;
    render(<App />);
    expect(screen.getByTestId("tab-navigator")).toBeTruthy();
  });
});
