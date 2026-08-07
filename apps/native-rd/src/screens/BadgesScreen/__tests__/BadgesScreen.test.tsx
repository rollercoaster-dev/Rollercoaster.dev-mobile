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

// `design: null` throughout — this is a wiring test, so cells and the spotlight
// render their initial-letter fallback tiles rather than dragging in
// BadgeRenderer/react-native-svg. Visuals are BadgesWall.test.tsx's job.
const makeBadgeRow = (overrides: Record<string, unknown> = {}) => ({
  id: "badge-1",
  goalId: "goal-1",
  imageUri: "pending:baked-image",
  design: null,
  createdAt: "2026-01-28T00:00:00.000Z",
  goalTitle: "Learn TypeScript",
  goalDescription: null,
  completedAt: "2026-01-28T00:00:00.000Z",
  ...overrides,
});

/**
 * Route rows by query brand. BadgesWall's useAnimationPref also calls useQuery
 * (with `userSettingsQuery`, which the db mock doesn't export) — the unbranded
 * fall-through keeps badge rows from leaking into the animation pref.
 */
const mockBadges = (badges: Record<string, unknown>[]) => {
  mockUseQuery.mockImplementation((query: { __brand?: string }) =>
    query?.__brand === "badgesWithGoalsQuery" ? badges : [],
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBadges([]);
  mockGetParent.mockReturnValue({ navigate: mockNavigate });
});

describe("BadgesScreen", () => {
  describe("empty state", () => {
    it("renders the plain Badges header above the wall's empty state", () => {
      renderWithProviders(<BadgesScreen />);
      expect(screen.getByText(i18n.t("badges:header"))).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("badges:wall.empty.title")),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("badges:wall.empty.body")),
      ).toBeOnTheScreen();
    });

    it("navigates to the Goals tab when the empty-state CTA is pressed", () => {
      renderWithProviders(<BadgesScreen />);
      fireEvent.press(screen.getByTestId("badges-wall-see-goals"));
      expect(mockNavigate).toHaveBeenCalledWith("GoalsTab", {
        screen: "Goals",
      });
    });
  });

  describe("populated", () => {
    const threeBadges = [
      makeBadgeRow({ id: "badge-1", goalTitle: "Learn TypeScript" }),
      makeBadgeRow({ id: "badge-2", goalTitle: "Learn Rust" }),
      makeBadgeRow({ id: "badge-3", goalTitle: "Learn Elixir" }),
    ];

    it("passes the total badge count to the wall header", () => {
      mockBadges(threeBadges);
      renderWithProviders(<BadgesScreen />);
      expect(
        screen.getByText(i18n.t("badges:wall.count", { count: 3 })),
      ).toBeOnTheScreen();
    });

    it("spotlights the most recent badge and galleries the rest", () => {
      mockBadges(threeBadges);
      renderWithProviders(<BadgesScreen />);

      expect(screen.getByTestId("badges-wall-spotlight")).toHaveProp(
        "accessibilityLabel",
        "Learn TypeScript",
      );
      expect(screen.getByTestId("badge-wall-cell-badge-2")).toBeOnTheScreen();
      expect(screen.getByTestId("badge-wall-cell-badge-3")).toBeOnTheScreen();
      // The spotlight badge is not repeated as a gallery cell.
      expect(screen.queryByTestId("badge-wall-cell-badge-1")).toBeNull();
    });

    it("renders no purple ScreenHeader over the populated wall", () => {
      mockBadges(threeBadges);
      renderWithProviders(<BadgesScreen />);
      expect(screen.queryByText(i18n.t("badges:header"))).toBeNull();
    });

    it("falls back to the untitled label when the goal was deleted", () => {
      mockBadges([
        makeBadgeRow({ id: "badge-1", goalTitle: null }),
        makeBadgeRow({ id: "badge-2", goalTitle: null }),
      ]);
      renderWithProviders(<BadgesScreen />);

      const fallback = i18n.t("badges:card.untitledFallback");
      expect(screen.getByTestId("badges-wall-spotlight")).toHaveProp(
        "accessibilityLabel",
        fallback,
      );
      expect(screen.getByTestId("badge-wall-cell-badge-2")).toHaveProp(
        "accessibilityLabel",
        fallback,
      );
    });
  });

  describe("navigation", () => {
    beforeEach(() => {
      mockBadges([
        makeBadgeRow({ id: "badge-1", goalTitle: "Learn TypeScript" }),
        makeBadgeRow({ id: "badge-2", goalTitle: "Learn Rust" }),
      ]);
    });

    it("opens BadgeDetail from the spotlight", () => {
      renderWithProviders(<BadgesScreen />);
      fireEvent.press(screen.getByTestId("badges-wall-spotlight"));
      expect(mockNavigate).toHaveBeenCalledWith("BadgeDetail", {
        badgeId: "badge-1",
      });
    });

    it("opens BadgeDetail from a gallery cell", () => {
      renderWithProviders(<BadgesScreen />);
      fireEvent.press(screen.getByTestId("badge-wall-cell-badge-2"));
      expect(mockNavigate).toHaveBeenCalledWith("BadgeDetail", {
        badgeId: "badge-2",
      });
    });
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it.each([
      "badges:header",
      "badges:wall.empty.title",
      "badges:wall.empty.body",
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
      mockBadges([makeBadgeRow({ goalTitle: null })]);
      renderWithProviders(<BadgesScreen />);
      const pseudo = i18n.t("badges:card.untitledFallback");
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByText(pseudo)).toBeOnTheScreen();
    });
  });
});
