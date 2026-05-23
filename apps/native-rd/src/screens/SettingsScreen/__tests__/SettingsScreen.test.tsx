import React from "react";
import { Alert, Platform } from "react-native";
import * as Application from "expo-application";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";

import { isSentryDebugToolsEnabled, SettingsScreen } from "../SettingsScreen";

// RN's jest setup sets __DEV__ as a runtime global; TS doesn't see it here.
const devGlobal = global as unknown as { __DEV__: boolean };

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
    expect(screen.getByText(i18n.t("settings:title"))).toBeOnTheScreen();
  });

  it("renders the ThemeSwitcher with all theme options", () => {
    renderWithProviders(<SettingsScreen />);
    expect(
      screen.getByText(i18n.t("common:theme.picker.title")),
    ).toBeOnTheScreen();
    const themeIds = [
      "light-default",
      "dark-default",
      "light-highContrast",
      "light-dyslexia",
      "light-autismFriendly",
      "light-lowVision",
      "light-lowInfo",
    ] as const;
    for (const id of themeIds) {
      expect(
        screen.getByText(i18n.t(`common:theme.options.${id}.label`)),
      ).toBeOnTheScreen();
    }
  });

  it("renders theme options with radio accessibility roles", () => {
    renderWithProviders(<SettingsScreen />);
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBe(7); // 7 theme options
  });

  it("calls setTheme when a theme option is pressed", () => {
    renderWithProviders(<SettingsScreen />);
    fireEvent.press(
      screen.getByText(i18n.t("common:theme.options.dark-default.label")),
    );
    expect(mockSetTheme).toHaveBeenCalledWith("dark-default");
  });

  it("renders the Content Density section with all options", () => {
    renderWithProviders(<SettingsScreen />);
    expect(
      screen.getByText(i18n.t("settings:density.title")),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(i18n.t("settings:density.options.compact.label")),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(i18n.t("settings:density.options.default.label")),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(i18n.t("settings:density.options.comfortable.label")),
    ).toBeOnTheScreen();
  });

  it("shows checkmark for current density level and descriptions for others", () => {
    renderWithProviders(<SettingsScreen />);
    // densityLevel is 'default', so Compact and Comfortable show descriptions
    expect(
      screen.getByText(i18n.t("settings:density.options.compact.description")),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        i18n.t("settings:density.options.comfortable.description"),
      ),
    ).toBeOnTheScreen();
  });

  it("renders the About section", () => {
    renderWithProviders(<SettingsScreen />);
    expect(screen.getByText(i18n.t("settings:about.title"))).toBeOnTheScreen();
    expect(
      screen.getByText(i18n.t("settings:about.appLabel")),
    ).toBeOnTheScreen();
    expect(screen.getByText("rollercoaster.dev")).toBeOnTheScreen();
    expect(
      screen.getByText(i18n.t("settings:about.versionLabel")),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(Application.nativeApplicationVersion as string),
    ).toBeOnTheScreen();
  });

  it("renders the footer text", () => {
    renderWithProviders(<SettingsScreen />);
    expect(
      screen.getByText(i18n.t("settings:about.builtWith")),
    ).toBeOnTheScreen();
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    // Multiple keys across header/density/about so a partial-revert
    // regression can't escape detection by sneaking past one asserted key.
    it.each([
      "settings:title",
      "settings:density.title",
      "settings:density.options.compact.label",
      "settings:about.title",
      "settings:about.builtWith",
    ] as const)(
      "renders %s as bracketed copy under pseudo locale",
      async (key) => {
        await i18n.changeLanguage("pseudo");
        renderWithProviders(<SettingsScreen />);
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        expect(screen.getByText(pseudo)).toBeOnTheScreen();
      },
    );
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
      fireEvent(
        screen.getByRole("button", {
          name: i18n.t("settings:about.versionLabel"),
        }),
        "longPress",
      );
      expect(mockNativeCrash).toHaveBeenCalledTimes(1);
    });

    it("shows the Android debug limitation instead of no-oping", () => {
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        value: "android",
      });
      renderWithProviders(<SettingsScreen sentryDebugToolsEnabled />);
      fireEvent(
        screen.getByRole("button", {
          name: i18n.t("settings:about.versionLabel"),
        }),
        "longPress",
      );
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
      expect(
        screen.queryByRole("button", {
          name: i18n.t("settings:about.versionLabel"),
        }),
      ).toBeNull();
      expect(mockNativeCrash).not.toHaveBeenCalled();
    });
  });

  describe("LanguagePicker (dev-only)", () => {
    const originalDev = devGlobal.__DEV__;

    afterEach(async () => {
      devGlobal.__DEV__ = originalDev;
      // Restore default language so a stray pseudo state can't poison sibling tests.
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it("renders the dev language section when __DEV__ is true", () => {
      devGlobal.__DEV__ = true;
      renderWithProviders(<SettingsScreen />);
      expect(
        screen.getByText(i18n.t("settings:language.title")),
      ).toBeOnTheScreen();
      expect(
        screen.getByLabelText(i18n.t("settings:language.pseudo")),
      ).toBeOnTheScreen();
    });

    it("does not render the dev language section when __DEV__ is false", () => {
      devGlobal.__DEV__ = false;
      renderWithProviders(<SettingsScreen />);
      expect(screen.queryByText(i18n.t("settings:language.title"))).toBeNull();
    });

    it("switches language to pseudo and back when the toggle changes", async () => {
      devGlobal.__DEV__ = true;
      const changeSpy = jest.spyOn(i18n, "changeLanguage");
      renderWithProviders(<SettingsScreen />);
      const toggle = screen.getByLabelText(i18n.t("settings:language.pseudo"));

      fireEvent(toggle, "valueChange", true);
      expect(changeSpy).toHaveBeenLastCalledWith("pseudo");

      fireEvent(toggle, "valueChange", false);
      expect(changeSpy).toHaveBeenLastCalledWith("en");

      changeSpy.mockRestore();
    });
  });
});
