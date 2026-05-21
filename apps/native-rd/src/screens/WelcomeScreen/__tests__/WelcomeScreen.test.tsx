import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";

import { WelcomeScreen } from "../WelcomeScreen";

const mockSetTheme = jest.fn();

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe("WelcomeScreen", () => {
  describe("content", () => {
    it("renders the welcome greeting", () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(screen.getByText(/Hey there/)).toBeOnTheScreen();
      expect(screen.getByText(i18n.t("welcome:hero.title"))).toBeOnTheScreen();
    });

    it("renders the body intro copy", () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(
        screen.getByText(/rollercoaster\.dev is your personal goal tracker\./),
      ).toBeOnTheScreen();
    });

    it("renders the picker label", () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(
        screen.getByText(i18n.t("welcome:themePicker.label")),
      ).toBeOnTheScreen();
    });

    it("renders all 7 theme option labels", () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(
        screen.getByText(i18n.t("theme.options.light-default.label")),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("theme.options.dark-default.label")),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("theme.options.light-highContrast.label")),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("theme.options.light-dyslexia.label")),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("theme.options.light-autismFriendly.label")),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("theme.options.light-lowVision.label")),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("theme.options.light-lowInfo.label")),
      ).toBeOnTheScreen();
    });

    it('renders "Get Started" button', () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(
        screen.getByText(i18n.t("welcome:cta.getStarted")),
      ).toBeOnTheScreen();
    });

    it("renders the settings reminder text", () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(
        screen.getByText(i18n.t("welcome:cta.footnote")),
      ).toBeOnTheScreen();
    });

    it("renders the sample card content", () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(screen.getByText(i18n.t("theme.preview.title"))).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("welcome:sample.progress")),
      ).toBeOnTheScreen();
    });
  });

  describe("interaction", () => {
    it('calls onGetStarted when "Get Started" is pressed', () => {
      const onGetStarted = jest.fn();
      renderWithProviders(<WelcomeScreen onGetStarted={onGetStarted} />);
      fireEvent.press(screen.getByText(i18n.t("welcome:cta.getStarted")));
      expect(onGetStarted).toHaveBeenCalledTimes(1);
    });
  });

  describe("accessibility", () => {
    it('"Get Started" button has accessibilityRole="button"', () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      const button = screen.getByRole("button", { name: /get started/i });
      expect(button).toBeOnTheScreen();
    });

    it('theme options have accessibilityRole="radio"', () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      const radios = screen.getAllByRole("radio");
      expect(radios.length).toBe(7);
    });

    it('theme options container has accessibilityRole="radiogroup"', () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      const radiogroup = screen.getByRole("radiogroup");
      expect(radiogroup).toBeOnTheScreen();
    });
  });
});
