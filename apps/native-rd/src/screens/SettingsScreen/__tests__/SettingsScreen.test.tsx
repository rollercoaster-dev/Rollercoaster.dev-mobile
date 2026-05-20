import React from "react";
import { Alert, Platform } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";

import { isSentryDebugToolsEnabled, SettingsScreen } from "../SettingsScreen";

/**
 * SettingsScreen component tests.
 *
 * Tests cover: header, ThemeSwitcher (variant picker), DensityPicker,
 * About section, and footer.
 */

// Mock RN components that hit src/private/specs_DEPRECATED ESM files in RN 0.81
jest.mock("react-native/Libraries/Components/ScrollView/ScrollView", () => {
  const mockReact = require("react");
  const { View: MockView } = require("react-native");
  const MockScrollView = (props: Record<string, unknown>) =>
    mockReact.createElement(MockView, { testID: "scroll-view", ...props });
  return { __esModule: true, default: MockScrollView };
});

jest.mock(
  "react-native/Libraries/Components/ActivityIndicator/ActivityIndicator",
  () => {
    const mockReact = require("react");
    const { View: MockView } = require("react-native");
    const MockActivityIndicator = (props: Record<string, unknown>) =>
      mockReact.createElement(MockView, {
        testID: "activity-indicator",
        ...props,
      });
    return { __esModule: true, default: MockActivityIndicator };
  },
);

// Switch reaches RN 0.81's spec_DEPRECATED ESM file via Libraries/Switch;
// stub it the same way ScrollView is stubbed above so SettingsRow's toggle
// branch renders under jest.
jest.mock("react-native/Libraries/Components/Switch/Switch", () => {
  const mockReact = require("react");
  const { View: MockView } = require("react-native");
  const MockSwitch = (props: Record<string, unknown>) =>
    mockReact.createElement(MockView, { testID: "switch", ...props });
  return { __esModule: true, default: MockSwitch };
});

const mockNativeCrash = jest.fn();
jest.mock("@sentry/react-native", () => ({
  __esModule: true,
  nativeCrash: (...args: unknown[]) => mockNativeCrash(...args),
}));

const mockSetTheme = jest.fn();
const mockSetDensity = jest.fn();

jest.mock("../../../hooks/useTheme", () => {
  const actual = jest.requireActual("../../../hooks/useTheme");
  return {
    ...actual,
    useThemeContext: () => ({
      themeName: "light-default" as const,
      theme: require("../../../__tests__/mocks/unistyles").mockTheme,
      isDark: false,
      variant: "default" as const,
      setTheme: mockSetTheme,
    }),
  };
});

jest.mock("../../../hooks/useDensity", () => ({
  useDensity: () => ({
    densityLevel: "default",
    setDensity: mockSetDensity,
  }),
}));

const originalPlatform = Platform.OS;
const mockAlert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
const mockWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    value: originalPlatform,
  });
});

afterAll(() => {
  mockAlert.mockRestore();
  mockWarn.mockRestore();
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    value: originalPlatform,
  });
});

describe("SettingsScreen", () => {
  it("renders the header", () => {
    renderWithProviders(<SettingsScreen />);
    expect(screen.getByText("Settings")).toBeOnTheScreen();
  });

  it("renders the ThemeSwitcher with all theme options", () => {
    renderWithProviders(<SettingsScreen />);
    expect(screen.getByText("Pick what feels right")).toBeOnTheScreen();
    expect(screen.getByText("The Full Ride")).toBeOnTheScreen();
    expect(screen.getByText("Night Ride")).toBeOnTheScreen();
    expect(screen.getByText("Bold Ink")).toBeOnTheScreen();
    expect(screen.getByText("Warm Studio")).toBeOnTheScreen();
    expect(screen.getByText("Still Water")).toBeOnTheScreen();
    expect(screen.getByText("Loud & Clear")).toBeOnTheScreen();
    expect(screen.getByText("Clean Signal")).toBeOnTheScreen();
  });

  it("renders theme options with radio accessibility roles", () => {
    renderWithProviders(<SettingsScreen />);
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBe(7); // 7 theme options
  });

  it("calls setTheme when a theme option is pressed", () => {
    renderWithProviders(<SettingsScreen />);
    fireEvent.press(screen.getByText("Night Ride"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark-default");
  });

  it("renders the Content Density section with all options", () => {
    renderWithProviders(<SettingsScreen />);
    expect(screen.getByText("Content Density")).toBeOnTheScreen();
    expect(screen.getByText("Compact")).toBeOnTheScreen();
    expect(screen.getByText("Default")).toBeOnTheScreen();
    expect(screen.getByText("Comfortable")).toBeOnTheScreen();
  });

  it("shows checkmark for current density level and descriptions for others", () => {
    renderWithProviders(<SettingsScreen />);
    // densityLevel is 'default', so Compact and Comfortable show descriptions
    expect(screen.getByText("Tighter spacing (0.75\u00d7)")).toBeOnTheScreen();
    expect(screen.getByText("Roomier spacing (1.25\u00d7)")).toBeOnTheScreen();
  });

  it("renders the About section", () => {
    renderWithProviders(<SettingsScreen />);
    expect(screen.getByText("About")).toBeOnTheScreen();
    expect(screen.getByText("App")).toBeOnTheScreen();
    expect(screen.getByText("rollercoaster.dev")).toBeOnTheScreen();
    expect(screen.getByText("Version")).toBeOnTheScreen();
    expect(screen.getByText("0.1.0")).toBeOnTheScreen();
  });

  it("renders the footer text", () => {
    renderWithProviders(<SettingsScreen />);
    expect(
      screen.getByText("Built with Expo + Evolu + Unistyles"),
    ).toBeOnTheScreen();
  });

  describe("native crash trigger gating", () => {
    it.each([
      ["true", true],
      [undefined, false],
      ["1", false],
    ])("parses EXPO_PUBLIC_SENTRY_DEBUG_TOOLS=%s", (value, expected) => {
      expect(isSentryDebugToolsEnabled(value)).toBe(expected);
    });

    it("triggers Sentry.nativeCrash on Version long-press when debug tools enabled on iOS", () => {
      renderWithProviders(<SettingsScreen sentryDebugToolsEnabled />);
      fireEvent(screen.getByRole("button", { name: "Version" }), "longPress");
      expect(mockNativeCrash).toHaveBeenCalledTimes(1);
    });

    it("shows the Android debug limitation instead of no-oping", () => {
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        value: "android",
      });
      renderWithProviders(<SettingsScreen sentryDebugToolsEnabled />);
      fireEvent(screen.getByRole("button", { name: "Version" }), "longPress");
      expect(mockNativeCrash).not.toHaveBeenCalled();
      expect(mockAlert).toHaveBeenCalledWith(
        "Native crash unavailable",
        "Android native crash verification requires a release-mode preview build.",
      );
      expect(mockWarn).toHaveBeenCalledWith(
        "Sentry native crash skipped: Android native crash verification requires a release-mode preview build.",
      );
    });

    it("does not expose Version as a button when debug tools disabled", () => {
      renderWithProviders(<SettingsScreen sentryDebugToolsEnabled={false} />);
      expect(screen.queryByRole("button", { name: "Version" })).toBeNull();
      expect(mockNativeCrash).not.toHaveBeenCalled();
    });
  });
});
