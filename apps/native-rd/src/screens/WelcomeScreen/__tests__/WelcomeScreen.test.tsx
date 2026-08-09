import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { themeA11yLabel } from "../../../i18n/labels";
import { themeOptions } from "../../../hooks/useTheme";

import { WelcomeScreen } from "../WelcomeScreen";

const themeLabelOf = (id: (typeof themeOptions)[number]["id"]) =>
  themeA11yLabel(i18n.t.bind(i18n), id);

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
      expect(
        screen.getByText(i18n.t("welcome:hero.greeting")),
      ).toBeOnTheScreen();
      expect(screen.getByText(i18n.t("welcome:hero.title"))).toBeOnTheScreen();
    });

    it("renders the body intro copy", () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(screen.getByText(i18n.t("welcome:intro.body1"))).toBeOnTheScreen();
    });

    it("renders the picker label", () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      expect(
        screen.getByText(i18n.t("welcome:themePicker.label")),
      ).toBeOnTheScreen();
    });

    // The rail renders only the selected theme's name as visible text; the
    // other 6 exist solely as each swatch's accessibilityLabel, so this asserts
    // reachability via label, not via getByText.
    it("renders all 7 theme options as labelled swatches", () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      for (const option of themeOptions) {
        expect(
          screen.getByLabelText(themeLabelOf(option.id)),
        ).toBeOnTheScreen();
      }
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
      expect(
        screen.getByText(i18n.t("common:theme.preview.title")),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("common:theme.preview.progress")),
      ).toBeOnTheScreen();
    });
  });

  describe("interaction", () => {
    it('calls onGetStarted when "Get Started" is pressed', () => {
      const onGetStarted = jest.fn();
      renderWithProviders(<WelcomeScreen onGetStarted={onGetStarted} />);
      fireEvent.press(
        screen.getByRole("button", {
          name: i18n.t("welcome:cta.getStarted"),
        }),
      );
      expect(onGetStarted).toHaveBeenCalledTimes(1);
    });

    it("calls setTheme when a swatch is pressed", () => {
      renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
      fireEvent.press(screen.getByLabelText(themeLabelOf("dark-default")));
      expect(mockSetTheme).toHaveBeenCalledWith("dark-default");
    });
  });

  // A pseudo-render smoke check catches reverts to hard-coded English that
  // the en-mode assertions miss: in en, `i18n.t(...)` returns the same
  // English literal a hard-coded `<Text>` would, so the assertion passes
  // either way. Under pseudo it returns bracketed text, so the assertion
  // only passes if the component is actually routing through t().
  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    // Multiple representative keys raise the cost of a partial-revert
    // regression: a developer would have to revert ALL of these to escape
    // detection. Covers hero/body/picker/CTA axes.
    it.each([
      "welcome:hero.greeting",
      "welcome:hero.title",
      "welcome:intro.body1",
      "welcome:themePicker.label",
      "welcome:cta.getStarted",
    ] as const)(
      "renders %s as bracketed copy under pseudo locale",
      async (key) => {
        await i18n.changeLanguage("pseudo");
        renderWithProviders(<WelcomeScreen onGetStarted={jest.fn()} />);
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        expect(screen.getByText(pseudo)).toBeOnTheScreen();
      },
    );
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
      // Queried via label, not getByRole: the rail deliberately omits
      // `accessible` (#500) so its radios stay individually reachable, and
      // RNTL's role query only matches elements with a truthy `accessible`.
      const radiogroup = screen.getByLabelText(
        i18n.t("common:theme.picker.groupLabel"),
      );
      expect(radiogroup.props.accessibilityRole).toBe("radiogroup");
    });
  });
});
