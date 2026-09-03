import React from "react";
import { Alert, Platform } from "react-native";
import * as Application from "expo-application";
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { themeA11yLabel } from "../../../i18n/labels";
import { capturedLoggerFor } from "../../../__tests__/logger-helpers";

import { isSentryDebugToolsEnabled, SettingsScreen } from "../SettingsScreen";

// Must be captured at module scope, before beforeEach's clearAllMocks — see the
// helper's own note on why.
const settingsScreenLogger = capturedLoggerFor("SettingsScreen");

// RN's jest setup sets __DEV__ as a runtime global; TS doesn't see it here.
const devGlobal = global as unknown as { __DEV__: boolean };

/** The 7 theme options the swatch rail renders, in `themeOptions` order. */
const THEME_IDS = [
  "light-default",
  "dark-default",
  "light-highContrast",
  "light-dyslexia",
  "light-autismFriendly",
  "light-lowVision",
  "light-lowInfo",
] as const;

/**
 * SettingsScreen component tests.
 *
 * Tests cover the screen's WIRING of the presentational sections — theme
 * (SettingsThemeSection → useThemeContext), density (SettingsDensityRows →
 * useDensity), the Onboarding replay row, About, and the footer. The sections'
 * own visuals/a11y are covered by their component tests and #415's stories.
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
const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      canGoBack: jest.fn(() => true),
    }),
  };
});

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
  // setTheme/setDensity return a success boolean; default to success so a
  // press doesn't spuriously trip the failure toast.
  mockSetTheme.mockReturnValue(true);
  mockSetDensity.mockReturnValue(true);
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

  it("renders the theme section with a swatch per theme option", () => {
    renderWithProviders(<SettingsScreen />);
    expect(screen.getByText(i18n.t("settings:theme.title"))).toBeOnTheScreen();
    for (const id of THEME_IDS) {
      expect(
        screen.getByLabelText(themeA11yLabel(i18n.t, id)),
      ).toBeOnTheScreen();
    }
  });

  it("renders theme and density options as radios", () => {
    renderWithProviders(<SettingsScreen />);
    // 7 theme swatches + 3 density rows.
    expect(screen.getAllByRole("radio")).toHaveLength(THEME_IDS.length + 3);
  });

  it("calls setTheme when a theme swatch is pressed", () => {
    renderWithProviders(<SettingsScreen />);
    fireEvent.press(
      screen.getByLabelText(themeA11yLabel(i18n.t, "dark-default")),
    );
    expect(mockSetTheme).toHaveBeenCalledWith("dark-default");
  });

  it("shows a toast when setTheme reports a failed persist", () => {
    mockSetTheme.mockReturnValue(false);
    renderWithProviders(<SettingsScreen />);
    fireEvent.press(
      screen.getByLabelText(themeA11yLabel(i18n.t, "dark-default")),
    );
    expect(
      screen.getByText(i18n.t("settings:errors.themeSaveFailed")),
    ).toBeOnTheScreen();
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

  it("calls setDensity with the pressed level", () => {
    renderWithProviders(<SettingsScreen />);
    fireEvent.press(
      screen.getByText(i18n.t("settings:density.options.compact.label")),
    );
    expect(mockSetDensity).toHaveBeenCalledWith("compact");
  });

  it("shows a toast when setDensity reports a failed persist", () => {
    mockSetDensity.mockReturnValue(false);
    renderWithProviders(<SettingsScreen />);
    fireEvent.press(
      screen.getByText(i18n.t("settings:density.options.compact.label")),
    );
    expect(
      screen.getByText(i18n.t("settings:errors.densitySaveFailed")),
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

  it("renders the Onboarding section and navigates to the Welcome replay", () => {
    renderWithProviders(<SettingsScreen />);
    expect(
      screen.getByText(i18n.t("settings:onboarding.title")),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByText(i18n.t("settings:onboarding.replayWelcome")),
    );
    expect(mockNavigate).toHaveBeenCalledWith("Welcome");
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
      screen.getByText(Application.nativeApplicationVersion ?? "unknown"),
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

    // Multiple keys across header/density/onboarding/about so a partial-revert
    // regression can't escape detection by sneaking past one asserted key.
    it.each([
      "settings:title",
      "settings:theme.title",
      "settings:density.title",
      "settings:density.options.compact.label",
      "settings:onboarding.title",
      "settings:onboarding.replayWelcome",
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

    it("logs an error via the SettingsScreen logger when changeLanguage rejects", async () => {
      devGlobal.__DEV__ = true;
      const boom = new Error("loader exploded");
      const changeSpy = jest
        .spyOn(i18n, "changeLanguage")
        .mockRejectedValueOnce(boom);

      renderWithProviders(<SettingsScreen />);
      const toggle = screen.getByLabelText(i18n.t("settings:language.pseudo"));

      fireEvent(toggle, "valueChange", true);

      await waitFor(() => {
        expect(settingsScreenLogger.error).toHaveBeenCalledWith(
          "changeLanguage failed",
          { error: boom },
        );
      });

      changeSpy.mockRestore();
    });
  });
});
