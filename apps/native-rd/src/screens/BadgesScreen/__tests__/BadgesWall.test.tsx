import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { withRepeat } from "react-native-reanimated";
import { BadgesWall } from "../BadgesWall";
import type { BadgesWallGalleryItem, BadgesWallSpotlight } from "../BadgesWall";
import { formatDate } from "../../../utils/format";
import { BadgeShape, BadgeFrame, BadgeIconWeight } from "../../../badges/types";
import type { BadgeDesign } from "../../../badges/types";

// Animation pref is mocked so we can drive the glow-gating branch directly
// (and avoid the hook's Evolu userSettings query in a unit test).
const mockUseAnimationPref = jest.fn();
jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: (...args: unknown[]) => mockUseAnimationPref(...args),
}));

// Stub BadgeRenderer to a testID'd host node (mirrors BadgeWallCell.test) so the
// "designed spotlight" assertion checks that SpotlightArt DELEGATES to the
// renderer, without pulling the real SVG/icon rendering into a unit test.
jest.mock("../../../badges/BadgeRenderer", () => ({
  BadgeRenderer: ({ testID = "badge-renderer" }: { testID?: string }) => {
    const ReactActual = require("react");
    const { View } = require("react-native");
    return ReactActual.createElement(View, { testID });
  },
}));

// Local reanimated mock exposing withRepeat as a jest.fn so the animation-gating
// tests can assert the loop starts only under the "full" pref. The shared mock
// (src/__tests__/mocks/reanimated.ts) doesn't track calls.
jest.mock("react-native-reanimated", () => {
  const withRepeat = jest.fn((anim: number) => anim);
  return {
    __esModule: true,
    default: { View: "Animated.View" },
    View: "Animated.View",
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (v: number) => v,
    withRepeat,
    Easing: {
      linear: (t: number) => t,
      out: () => (t: number) => t,
      in: () => (t: number) => t,
      cubic: (t: number) => t,
    },
  };
});

// `withRepeat` is imported at the top; jest.mock is hoisted above imports, so
// this binding is the jest.fn from the factory above.
const mockWithRepeat = withRepeat as jest.Mock;

const noop = () => {};

const SPOTLIGHT: BadgesWallSpotlight = {
  id: "spotlight-1",
  design: null,
  goalTitle: "Rewire the workshop",
  earnedAt: "2026-06-18T00:00:00.000Z",
};

const makeGallery = (n: number): BadgesWallGalleryItem[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `g-${i}`,
    title: `Badge ${i}`,
    design: null,
  }));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAnimationPref.mockReturnValue({ animationPref: "full" });
});

describe("BadgesWall", () => {
  describe("count header", () => {
    it("renders the count tally", () => {
      renderWithProviders(
        <BadgesWall
          count={24}
          spotlight={SPOTLIGHT}
          gallery={makeGallery(3)}
          onOpenBadge={noop}
          onSeeGoals={noop}
        />,
      );
      expect(
        screen.getByText(i18n.t("badges:wall.count", { count: 24 })),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("badges:wall.allVerifiable")),
      ).toBeOnTheScreen();
    });
  });

  describe("spotlight", () => {
    it("renders the spotlight overline, title, and formatted date when set", () => {
      renderWithProviders(
        <BadgesWall
          count={1}
          spotlight={SPOTLIGHT}
          gallery={[]}
          onOpenBadge={noop}
          onSeeGoals={noop}
        />,
      );
      expect(
        screen.getByText(i18n.t("badges:wall.justEarned")),
      ).toBeOnTheScreen();
      expect(screen.getByText("Rewire the workshop")).toBeOnTheScreen();
      // Assert the date the component actually renders, computed the same way
      // (formatDate + active language). A hardcoded "Jun 18, 2026" would be
      // timezone-fragile — the UTC-midnight instant renders "Jun 17" in any
      // UTC-negative zone (jest doesn't pin TZ). textTransform:uppercase is a
      // style, so the text node keeps formatDate's raw mixed casing.
      expect(
        screen.getByText(formatDate(SPOTLIGHT.earnedAt, i18n.language)),
      ).toBeOnTheScreen();
    });

    it("renders the spotlight badge art via BadgeRenderer when a design is set", () => {
      const design: BadgeDesign = {
        shape: BadgeShape.star,
        frame: BadgeFrame.none,
        color: "#ffe50c",
        iconName: "Star",
        iconWeight: BadgeIconWeight.regular,
        title: "Rewire the workshop",
        centerMode: "icon",
      };
      renderWithProviders(
        <BadgesWall
          count={1}
          spotlight={{ ...SPOTLIGHT, design }}
          gallery={[]}
          onOpenBadge={noop}
          onSeeGoals={noop}
        />,
      );
      // A designed spotlight draws the badge's own shape via BadgeRenderer, never
      // the initial-letter fallback tile — guards against an inverted/broken
      // `if (design)` shipping a letter "R" in place of the badge.
      expect(screen.getByTestId("badge-renderer")).toBeOnTheScreen();
      expect(screen.queryByText("R")).toBeNull();
    });

    it("omits the date row when earnedAt is null", () => {
      renderWithProviders(
        <BadgesWall
          count={1}
          spotlight={{ ...SPOTLIGHT, earnedAt: null }}
          gallery={[]}
          onOpenBadge={noop}
          onSeeGoals={noop}
        />,
      );
      expect(screen.getByTestId("badges-wall-spotlight")).toBeOnTheScreen();
      expect(screen.queryByText("Jun 18, 2026")).toBeNull();
    });

    it("does not render the spotlight when it is null", () => {
      renderWithProviders(
        <BadgesWall
          count={5}
          spotlight={null}
          gallery={makeGallery(5)}
          onOpenBadge={noop}
          onSeeGoals={noop}
        />,
      );
      expect(screen.queryByTestId("badges-wall-spotlight")).toBeNull();
      expect(screen.queryByText(i18n.t("badges:wall.justEarned"))).toBeNull();
    });

    it("calls onOpenBadge with the spotlight id when pressed", () => {
      const onOpenBadge = jest.fn();
      renderWithProviders(
        <BadgesWall
          count={1}
          spotlight={SPOTLIGHT}
          gallery={[]}
          onOpenBadge={onOpenBadge}
          onSeeGoals={noop}
        />,
      );
      fireEvent.press(screen.getByTestId("badges-wall-spotlight"));
      expect(onOpenBadge).toHaveBeenCalledWith("spotlight-1");
    });
  });

  describe("gallery", () => {
    it.each([0, 1, 20])(
      "renders exactly one cell per gallery item with no cap (%i items)",
      (n) => {
        renderWithProviders(
          <BadgesWall
            count={Math.max(1, n)}
            spotlight={null}
            gallery={makeGallery(n)}
            onOpenBadge={noop}
            onSeeGoals={noop}
          />,
        );
        expect(screen.queryAllByTestId(/^badge-wall-cell-/)).toHaveLength(n);
        // No "+N MORE" cap footer anywhere (D9).
        expect(screen.queryByText(/\bmore\b/i)).toBeNull();
      },
    );

    it("opens a gallery badge by its own id", () => {
      const onOpenBadge = jest.fn();
      renderWithProviders(
        <BadgesWall
          count={3}
          spotlight={null}
          gallery={makeGallery(3)}
          onOpenBadge={onOpenBadge}
          onSeeGoals={noop}
        />,
      );
      fireEvent.press(screen.getByTestId("badge-wall-cell-g-1"));
      expect(onOpenBadge).toHaveBeenCalledWith("g-1");
    });
  });

  describe("empty state", () => {
    it("renders the redesigned copy when count is 0", () => {
      renderWithProviders(
        <BadgesWall
          count={0}
          spotlight={null}
          gallery={[]}
          onOpenBadge={noop}
          onSeeGoals={noop}
        />,
      );
      expect(
        screen.getByText(i18n.t("badges:wall.empty.title")),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("badges:wall.empty.body")),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("badges:wall.empty.action")),
      ).toBeOnTheScreen();
    });

    it("renders neither the count header nor the spotlight in the empty state", () => {
      renderWithProviders(
        <BadgesWall
          count={0}
          spotlight={null}
          gallery={[]}
          onOpenBadge={noop}
          onSeeGoals={noop}
        />,
      );
      expect(screen.queryByTestId("badges-wall-count")).toBeNull();
      expect(screen.queryByTestId("badges-wall-spotlight")).toBeNull();
    });

    it("calls onSeeGoals when the CTA is pressed", () => {
      const onSeeGoals = jest.fn();
      renderWithProviders(
        <BadgesWall
          count={0}
          spotlight={null}
          gallery={[]}
          onOpenBadge={noop}
          onSeeGoals={onSeeGoals}
        />,
      );
      fireEvent.press(screen.getByTestId("badges-wall-see-goals"));
      expect(onSeeGoals).toHaveBeenCalledTimes(1);
    });
  });

  describe("animation gating", () => {
    it("starts the looping glow under the full animation pref", () => {
      mockUseAnimationPref.mockReturnValue({ animationPref: "full" });
      renderWithProviders(
        <BadgesWall
          count={1}
          spotlight={SPOTLIGHT}
          gallery={[]}
          onOpenBadge={noop}
          onSeeGoals={noop}
        />,
      );
      expect(mockWithRepeat).toHaveBeenCalled();
    });

    it.each(["reduced", "none"] as const)(
      "does not start the glow under the %s pref",
      (pref) => {
        mockUseAnimationPref.mockReturnValue({ animationPref: pref });
        renderWithProviders(
          <BadgesWall
            count={1}
            spotlight={SPOTLIGHT}
            gallery={[]}
            onOpenBadge={noop}
            onSeeGoals={noop}
          />,
        );
        expect(mockWithRepeat).not.toHaveBeenCalled();
      },
    );
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it.each(["badges:wall.allVerifiable", "badges:wall.justEarned"] as const)(
      "renders %s as bracketed copy under pseudo locale",
      async (key) => {
        await i18n.changeLanguage("pseudo");
        renderWithProviders(
          <BadgesWall
            count={3}
            spotlight={SPOTLIGHT}
            gallery={makeGallery(3)}
            onOpenBadge={noop}
            onSeeGoals={noop}
          />,
        );
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        expect(screen.getByText(pseudo)).toBeOnTheScreen();
      },
    );

    it("renders badges:wall.count as bracketed interpolated copy under pseudo locale", async () => {
      await i18n.changeLanguage("pseudo");
      renderWithProviders(
        <BadgesWall
          count={3}
          spotlight={SPOTLIGHT}
          gallery={makeGallery(3)}
          onOpenBadge={noop}
          onSeeGoals={noop}
        />,
      );
      const pseudo = i18n.t("badges:wall.count", { count: 3 });
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByText(pseudo)).toBeOnTheScreen();
    });

    it.each([
      "badges:wall.empty.title",
      "badges:wall.empty.body",
      "badges:wall.empty.action",
    ] as const)(
      "renders %s as bracketed copy in the empty state under pseudo locale",
      async (key) => {
        await i18n.changeLanguage("pseudo");
        renderWithProviders(
          <BadgesWall
            count={0}
            spotlight={null}
            gallery={[]}
            onOpenBadge={noop}
            onSeeGoals={noop}
          />,
        );
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        expect(screen.getByText(pseudo)).toBeOnTheScreen();
      },
    );
  });
});
