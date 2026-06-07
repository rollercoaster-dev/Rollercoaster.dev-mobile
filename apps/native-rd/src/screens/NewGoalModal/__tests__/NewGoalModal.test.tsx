import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { NewGoalModal } from "../NewGoalModal";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

const mockReplace = jest.fn();

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      replace: mockReplace,
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      canGoBack: jest.fn(() => true),
    }),
  };
});

jest.mock("../../../db", () => ({
  createGoal: jest.fn(),
}));

jest.mock("../../../services/sentry-report", () => ({
  reportError: jest.fn(),
}));

const { createGoal } = require("../../../db");
const { reportError } = require("../../../services/sentry-report");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("NewGoalModal", () => {
  it("renders form with title input", () => {
    renderWithProviders(<NewGoalModal />);
    expect(screen.getByText(i18n.t("newGoal:title"))).toBeOnTheScreen();
    expect(
      screen.getByText(i18n.t("newGoal:fields.title.label")),
    ).toBeOnTheScreen();
  });

  it("renders Create Goal button", () => {
    renderWithProviders(<NewGoalModal />);
    expect(screen.getByText(i18n.t("newGoal:cta.create"))).toBeOnTheScreen();
  });

  it("has close button with accessibility label", () => {
    renderWithProviders(<NewGoalModal />);
    expect(
      screen.getByLabelText(i18n.t("common:actions.close")),
    ).toBeOnTheScreen();
  });

  it("navigates back when close button is pressed", () => {
    renderWithProviders(<NewGoalModal />);
    fireEvent.press(screen.getByLabelText(i18n.t("common:actions.close")));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it("disables Create Goal button when title is empty", () => {
    renderWithProviders(<NewGoalModal />);
    const button = screen.getByLabelText(i18n.t("newGoal:cta.create"));
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it("shows validation error on submit editing with empty title", () => {
    renderWithProviders(<NewGoalModal />);
    fireEvent(
      screen.getByLabelText(i18n.t("newGoal:fields.title.label")),
      "submitEditing",
    );
    expect(
      screen.getByText(i18n.t("newGoal:errors.titleRequired")),
    ).toBeOnTheScreen();
    expect(createGoal).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
  });

  it("shows validation error on submit editing with whitespace title", () => {
    renderWithProviders(<NewGoalModal />);
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("newGoal:fields.title.label")),
      "   ",
    );
    fireEvent(
      screen.getByLabelText(i18n.t("newGoal:fields.title.label")),
      "submitEditing",
    );
    expect(
      screen.getByText(i18n.t("newGoal:errors.titleRequired")),
    ).toBeOnTheScreen();
    expect(createGoal).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
  });

  it("creates goal and navigates to BadgeDesigner on valid submit", () => {
    createGoal.mockReturnValue({ ok: true, value: { id: "goal-123" } });
    renderWithProviders(<NewGoalModal />);
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("newGoal:fields.title.label")),
      "Learn TypeScript",
    );
    fireEvent.press(
      screen.getByRole("button", { name: i18n.t("newGoal:cta.create") }),
    );
    expect(createGoal).toHaveBeenCalledWith("Learn TypeScript");
    expect(mockReplace).toHaveBeenCalledWith("BadgeDesigner", {
      mode: "new-goal",
      goalId: "goal-123",
    });
    expect(reportError).not.toHaveBeenCalled();
  });

  it("trims title before creating goal", () => {
    createGoal.mockReturnValue({ ok: true, value: { id: "goal-456" } });
    renderWithProviders(<NewGoalModal />);
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("newGoal:fields.title.label")),
      "  Learn Rust  ",
    );
    fireEvent.press(
      screen.getByRole("button", { name: i18n.t("newGoal:cta.create") }),
    );
    expect(createGoal).toHaveBeenCalledWith("Learn Rust");
    expect(reportError).not.toHaveBeenCalled();
  });

  it("shows error and reports to Sentry when createGoal returns !ok", () => {
    const evoluError = { type: "ValidMutationSizeError" };
    createGoal.mockReturnValue({ ok: false, error: evoluError });
    renderWithProviders(<NewGoalModal />);
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("newGoal:fields.title.label")),
      "Learn Go",
    );
    fireEvent.press(
      screen.getByRole("button", { name: i18n.t("newGoal:cta.create") }),
    );
    expect(createGoal).toHaveBeenCalledWith("Learn Go");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(
      screen.getByText(i18n.t("newGoal:errors.createFailed")),
    ).toBeOnTheScreen();
    expect(reportError).toHaveBeenCalledWith(evoluError, {
      area: "goal.mutate",
      kind: "create",
    });
    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it("shows error and reports to Sentry when createGoal throws", () => {
    const thrown = new Error("db locked");
    createGoal.mockImplementation(() => {
      throw thrown;
    });
    renderWithProviders(<NewGoalModal />);
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("newGoal:fields.title.label")),
      "Learn Zig",
    );
    fireEvent.press(
      screen.getByRole("button", { name: i18n.t("newGoal:cta.create") }),
    );
    expect(createGoal).toHaveBeenCalledWith("Learn Zig");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(
      screen.getByText(i18n.t("newGoal:errors.createFailed")),
    ).toBeOnTheScreen();
    expect(reportError).toHaveBeenCalledWith(thrown, {
      area: "goal.mutate",
      kind: "create",
    });
    expect(reportError).toHaveBeenCalledTimes(1);
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    // Multiple keys across title/field/CTA so a partial-revert regression
    // can't escape detection by sneaking past a single asserted key.
    // Placeholder text is a TextInput prop, not a Text node, so we cover it
    // separately via getByPlaceholderText.
    it.each([
      "newGoal:title",
      "newGoal:fields.title.label",
      "newGoal:cta.create",
    ] as const)(
      "renders %s as bracketed copy under pseudo locale",
      async (key) => {
        await i18n.changeLanguage("pseudo");
        renderWithProviders(<NewGoalModal />);
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        expect(screen.getByText(pseudo)).toBeOnTheScreen();
      },
    );

    it("renders the title input placeholder as bracketed copy under pseudo locale", async () => {
      await i18n.changeLanguage("pseudo");
      renderWithProviders(<NewGoalModal />);
      const pseudo = i18n.t("newGoal:fields.title.placeholder");
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByPlaceholderText(pseudo)).toBeOnTheScreen();
    });
  });

  it("clears validation error when typing after failed submit", () => {
    renderWithProviders(<NewGoalModal />);
    // Submit empty via keyboard
    fireEvent(
      screen.getByLabelText(i18n.t("newGoal:fields.title.label")),
      "submitEditing",
    );
    expect(
      screen.getByText(i18n.t("newGoal:errors.titleRequired")),
    ).toBeOnTheScreen();

    // Then type something — error should clear
    fireEvent.changeText(
      screen.getByLabelText(i18n.t("newGoal:fields.title.label")),
      "L",
    );
    expect(
      screen.queryByText(i18n.t("newGoal:errors.titleRequired")),
    ).not.toBeOnTheScreen();
  });
});
