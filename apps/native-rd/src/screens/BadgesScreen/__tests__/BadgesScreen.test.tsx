import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { BadgesScreen } from "../BadgesScreen";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetParent = jest.fn();

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      canGoBack: jest.fn(() => true),
      getParent: mockGetParent,
    }),
  };
});

const mockUseQuery = jest.fn();
jest.mock("@evolu/react", () => {
  const actual = jest.requireActual("@evolu/react");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
  };
});

jest.mock("../../../db", () => ({
  badgesWithGoalsQuery: { __brand: "badgesWithGoalsQuery" },
}));

const makeBadgeRow = (overrides: Record<string, unknown> = {}) => ({
  id: "badge-1",
  goalId: "goal-1",
  imageUri: "pending:baked-image",
  createdAt: "2026-01-28T00:00:00.000Z",
  goalTitle: "Learn TypeScript",
  completedAt: "2026-01-28T00:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseQuery.mockReturnValue([]);
  mockGetParent.mockReturnValue({ navigate: mockNavigate });
});

describe("BadgesScreen", () => {
  describe("empty state", () => {
    it("renders empty state when no badges exist", () => {
      renderWithProviders(<BadgesScreen />);
      expect(screen.getByText(i18n.t("badges:empty.title"))).toBeOnTheScreen();
      expect(screen.getByText(i18n.t("badges:empty.body"))).toBeOnTheScreen();
    });

    it("renders Go to Goals action button", () => {
      renderWithProviders(<BadgesScreen />);
      expect(screen.getByText(i18n.t("badges:empty.action"))).toBeOnTheScreen();
    });

    it("navigates to Goals tab when Go to Goals is pressed", () => {
      renderWithProviders(<BadgesScreen />);
      fireEvent.press(screen.getByText(i18n.t("badges:empty.action")));
      expect(mockNavigate).toHaveBeenCalledWith("GoalsTab", {
        screen: "Goals",
      });
    });
  });

  describe("header", () => {
    it("renders Badges title", () => {
      renderWithProviders(<BadgesScreen />);
      expect(screen.getByText(i18n.t("badges:header"))).toBeOnTheScreen();
    });
  });

  describe("badge list", () => {
    it("renders badge cards when badges exist", () => {
      const badges = [
        makeBadgeRow({ id: "badge-1", goalTitle: "Learn TypeScript" }),
        makeBadgeRow({ id: "badge-2", goalTitle: "Learn Rust" }),
      ];
      mockUseQuery.mockReturnValue(badges);

      renderWithProviders(<BadgesScreen />);
      expect(screen.getByText("Learn TypeScript")).toBeOnTheScreen();
      expect(screen.getByText("Learn Rust")).toBeOnTheScreen();
    });

    it("navigates to BadgeDetail when a badge card is pressed", () => {
      const badges = [
        makeBadgeRow({ id: "badge-1", goalTitle: "Learn TypeScript" }),
      ];
      mockUseQuery.mockReturnValue(badges);

      renderWithProviders(<BadgesScreen />);
      fireEvent.press(screen.getByText("Learn TypeScript"));
      expect(mockNavigate).toHaveBeenCalledWith("BadgeDetail", {
        badgeId: "badge-1",
      });
    });

    it("formats earned date correctly", () => {
      const badges = [
        makeBadgeRow({ completedAt: "2026-01-28T00:00:00.000Z" }),
      ];
      mockUseQuery.mockReturnValue(badges);

      renderWithProviders(<BadgesScreen />);
      expect(screen.getByText("Jan 28, 2026")).toBeOnTheScreen();
    });
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it.each([
      "badges:header",
      "badges:empty.title",
      "badges:empty.body",
      "badges:empty.action",
    ] as const)(
      "renders %s as bracketed copy under pseudo locale",
      async (key) => {
        await i18n.changeLanguage("pseudo");
        renderWithProviders(<BadgesScreen />);
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        expect(screen.getByText(pseudo)).toBeOnTheScreen();
      },
    );

    it("renders badges:card.untitledFallback as bracketed copy when goalTitle is null", async () => {
      await i18n.changeLanguage("pseudo");
      mockUseQuery.mockReturnValue([makeBadgeRow({ goalTitle: null })]);
      renderWithProviders(<BadgesScreen />);
      const pseudo = i18n.t("badges:card.untitledFallback");
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByText(pseudo)).toBeOnTheScreen();
    });
  });
});
