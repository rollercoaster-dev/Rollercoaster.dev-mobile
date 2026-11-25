import React from "react";
import * as ReactNative from "react-native";
import {
  act,
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { Play } from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { composeTheme } from "../../../themes/compose";
import { mockTheme } from "../../../__tests__/mocks/unistyles";
import {
  GoalsCockpit,
  type CockpitHeroGoal,
  type CockpitKeepWarmGoal,
} from "../GoalsCockpit";
import { mockFontScale } from "../../../__tests__/fontScale";

/** Simulate the hidden measuring twin reporting how many lines the text needs. */
function measureLines(testID: string, lineCount: number) {
  fireEvent(
    screen.getByTestId(`${testID}-measure`, { includeHiddenElements: true }),
    "textLayout",
    {
      nativeEvent: {
        lines: Array.from({ length: lineCount }, (_, i) => ({ text: `l${i}` })),
      },
    },
  );
}

const makeHero = (overrides?: Partial<CockpitHeroGoal>): CockpitHeroGoal => ({
  id: "hero",
  title: "Learn TypeScript",
  nextStepTitle: "Read the handbook",
  progress: 0.5,
  stepsCompleted: 3,
  stepsTotal: 6,
  ...overrides,
});

const keepWarm: CockpitKeepWarmGoal[] = [
  {
    id: "kw-1",
    title: "Build a component library",
    nextStepTitle: "Document variants",
    progress: 0.75,
  },
  {
    id: "kw-2",
    title: "Understand local-first sync",
    nextStepTitle: "Read the mutation docs",
    progress: 0.2,
  },
];

const handlers = () => ({
  onStartResume: jest.fn(),
  onOpenGoal: jest.fn(),
  onNewGoal: jest.fn(),
  onDeleteGoal: jest.fn(),
  onOpenGoalMenu: jest.fn(),
  heroIsPinned: false,
  onPinGoal: jest.fn(),
  onUnpinGoal: jest.fn(),
});

describe("GoalsCockpit", () => {
  it("matches the leading Play icon to the dark-theme action foreground", () => {
    const dark = composeTheme("dark", "default");
    jest
      .mocked(useUnistyles)
      .mockReturnValue({ theme: dark } as ReturnType<typeof useUnistyles>);
    try {
      renderWithProviders(
        <GoalsCockpit hero={makeHero()} keepWarm={[]} {...handlers()} />,
      );
      expect(screen.UNSAFE_getByType(Play).props.color).toBe(
        dark.action.actionPrimaryFg,
      );
    } finally {
      jest
        .mocked(useUnistyles)
        .mockReturnValue({ theme: mockTheme } as ReturnType<
          typeof useUnistyles
        >);
    }
  });
  it.each([
    { stepsCompleted: 0, expectStart: true },
    { stepsCompleted: 3, expectStart: false },
  ])(
    "labels the CTA by stepsCompleted=$stepsCompleted",
    ({ stepsCompleted, expectStart }) => {
      renderWithProviders(
        <GoalsCockpit
          hero={makeHero({ stepsCompleted })}
          keepWarm={[]}
          {...handlers()}
        />,
      );
      const expected = expectStart
        ? i18n.t("goals:cockpit.start")
        : i18n.t("goals:cockpit.resume");
      expect(screen.getByText(expected)).toBeOnTheScreen();
    },
  );

  it("renders the hero title, next-step headline and overline", () => {
    const hero = makeHero();
    renderWithProviders(
      <GoalsCockpit hero={hero} keepWarm={[]} {...handlers()} />,
    );
    expect(
      screen.getByText(i18n.t("goals:cockpit.doThisNext")),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: hero.title }).props.numberOfLines,
    ).toBe(2);
    expect(
      screen.getByTestId("goals-cockpit-next-step").props.numberOfLines,
    ).toBe(2);
  });

  it("renders every keep-warm goal it is given", () => {
    renderWithProviders(
      <GoalsCockpit hero={makeHero()} keepWarm={keepWarm} {...handlers()} />,
    );
    expect(screen.getByText("Build a component library")).toBeOnTheScreen();
    expect(screen.getByText("Understand local-first sync")).toBeOnTheScreen();
  });

  it("expands overflowing hero titles in place and leaves short ones alone", () => {
    const hero = makeHero({
      title: "Learn accessible interface design with long study notes",
    });
    renderWithProviders(
      <GoalsCockpit hero={hero} keepWarm={keepWarm} {...handlers()} />,
    );

    // Short next step: measured to fit, so no toggle appears.
    measureLines("goals-cockpit-next-step", 1);
    expect(screen.queryByTestId("goals-cockpit-next-step-toggle")).toBeNull();

    // Long goal title: measured to overflow, toggle expands it in place.
    measureLines("goals-cockpit-hero-title", 3);
    fireEvent.press(screen.getByTestId("goals-cockpit-hero-title-toggle"));
    expect(
      screen.getByTestId("goals-cockpit-hero-title").props.numberOfLines,
    ).toBeUndefined();
  });

  it("uses a full-width keep-warm card when OS text is enlarged", () => {
    mockFontScale(1.5);
    renderWithProviders(
      <GoalsCockpit hero={makeHero()} keepWarm={keepWarm} {...handlers()} />,
    );
    const cell = screen.getByTestId("keep-warm-cell-kw-1");
    expect(ReactNative.StyleSheet.flatten(cell.props.style).width).toBe("100%");
    expect(
      screen.getByText("Build a component library").props.numberOfLines,
    ).toBe(3);
  });

  // #688: two columns only when each title keeps >=140pt beside the pin.
  // Default chrome: 0.48 * grid - 6 border - 24 padding - 32 pin reserve.
  it.each([
    [288, "100%", 3], // 320pt phone
    [343, "100%", 3], // 375pt phone
    [361, "100%", 3], // 393pt phone: ~111pt titles, still too cramped
    [420, "100%", 3], // 139.6pt title, just under the budget
    [421, "48%", 2], // 140.1pt title, two columns
  ])(
    "lays keep-warm out for a %ipt-wide grid as %s cells, %i title lines",
    (gridWidth, cellWidth, titleLines) => {
      renderWithProviders(
        <GoalsCockpit hero={makeHero()} keepWarm={keepWarm} {...handlers()} />,
      );
      fireEvent(screen.getByTestId("keep-warm-grid"), "layout", {
        nativeEvent: { layout: { width: gridWidth, height: 200, x: 0, y: 0 } },
      });
      const cell = screen.getByTestId("keep-warm-cell-kw-1");
      expect(ReactNative.StyleSheet.flatten(cell.props.style).width).toBe(
        cellWidth,
      );
      expect(
        screen.getByText("Build a component library").props.numberOfLines,
      ).toBe(titleLines);
    },
  );

  // Before the grid's first layout the window width (minus the screen's
  // space[4] padding) decides, so a phone never flashes two columns.
  describe("before the grid is measured", () => {
    const original = ReactNative.Dimensions.get("window");
    afterEach(() => {
      act(() => ReactNative.Dimensions.set({ window: original }));
    });

    it.each([
      [375, "100%"],
      [480, "48%"],
    ])("seeds a %ipt window as %s cells", (windowWidth, cellWidth) => {
      act(() =>
        ReactNative.Dimensions.set({
          window: { ...original, width: windowWidth },
        }),
      );
      renderWithProviders(
        <GoalsCockpit hero={makeHero()} keepWarm={keepWarm} {...handlers()} />,
      );
      const cell = screen.getByTestId("keep-warm-cell-kw-1");
      expect(ReactNative.StyleSheet.flatten(cell.props.style).width).toBe(
        cellWidth,
      );
    });
  });

  it("fires onStartResume with the hero id", () => {
    const h = handlers();
    renderWithProviders(
      <GoalsCockpit hero={makeHero()} keepWarm={[]} {...h} />,
    );
    fireEvent.press(screen.getByTestId("goals-cockpit-start-resume"));
    expect(h.onStartResume).toHaveBeenCalledWith("hero");
  });

  // A keep-warm tap opens FocusMode, so its hint must describe that — not
  // card.a11y.hint's "view details", which would misdescribe the destination.
  it("hints keep-warm cards with the focus-mode resume hint", () => {
    renderWithProviders(
      <GoalsCockpit hero={makeHero()} keepWarm={keepWarm} {...handlers()} />,
    );
    const card = screen.getByTestId("keep-warm-kw-1");
    expect(card.props.accessibilityHint).toBe(
      i18n.t("goals:cockpit.resumeHint", {
        title: "Build a component library",
      }),
    );
  });

  it("fires onOpenGoal with the tapped keep-warm id", () => {
    const h = handlers();
    renderWithProviders(
      <GoalsCockpit hero={makeHero()} keepWarm={keepWarm} {...h} />,
    );
    fireEvent.press(screen.getByTestId("keep-warm-kw-2"));
    expect(h.onOpenGoal).toHaveBeenCalledWith("kw-2");
  });

  it("fires onDeleteGoal with the hero id on long-press", () => {
    const h = handlers();
    renderWithProviders(
      <GoalsCockpit hero={makeHero()} keepWarm={[]} {...h} />,
    );
    fireEvent(screen.getByTestId("goals-cockpit-hero"), "onLongPress");
    expect(h.onDeleteGoal).toHaveBeenCalledWith("hero");
  });

  it("fires onDeleteGoal with the keep-warm id on long-press", () => {
    const h = handlers();
    renderWithProviders(
      <GoalsCockpit hero={makeHero()} keepWarm={keepWarm} {...h} />,
    );
    fireEvent(screen.getByTestId("keep-warm-kw-1"), "onLongPress");
    expect(h.onDeleteGoal).toHaveBeenCalledWith("kw-1");
  });

  // #695: goal management has a visible entry on every card, not only the
  // long press, and it names which goal it is for.
  it.each([
    {
      testID: "goals-cockpit-hero-menu",
      id: "hero",
      title: "Ship the redesign",
    },
    {
      testID: "keep-warm-menu-kw-1",
      id: "kw-1",
      title: "Build a component library",
    },
  ])("the ⋯ on $id opens its goal menu", ({ testID, id, title }) => {
    const h = handlers();
    renderWithProviders(
      <GoalsCockpit
        hero={makeHero({ title: "Ship the redesign" })}
        keepWarm={keepWarm}
        {...h}
      />,
    );
    const button = screen.getByTestId(testID);
    expect(button).toHaveProp(
      "accessibilityLabel",
      `More options for ${title}`,
    );
    fireEvent.press(button);
    expect(h.onOpenGoalMenu).toHaveBeenCalledWith(id);
    // Opening the menu is not a delete; that still needs a menu choice.
    expect(h.onDeleteGoal).not.toHaveBeenCalled();
  });

  it("fires onNewGoal from the ghost button", () => {
    const h = handlers();
    renderWithProviders(
      <GoalsCockpit hero={makeHero()} keepWarm={[]} {...h} />,
    );
    fireEvent.press(screen.getByTestId("goals-cockpit-new-goal"));
    expect(h.onNewGoal).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state with no hero and wires its CTA to onNewGoal", () => {
    const h = handlers();
    renderWithProviders(<GoalsCockpit hero={null} keepWarm={[]} {...h} />);
    expect(
      screen.getByText(i18n.t("goals:emptyState.title")),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("goals-cockpit-hero")).toBeNull();
    fireEvent.press(screen.getByLabelText(i18n.t("goals:emptyState.cta")));
    expect(h.onNewGoal).toHaveBeenCalledTimes(1);
  });

  describe("pin toggle (#396)", () => {
    it.each([
      {
        name: "hero, unpinned",
        heroIsPinned: false,
        testID: "goals-cockpit-hero-pin",
        label: "goals:cockpit.pinGoal",
        hint: "goals:cockpit.pinHint",
        title: "Learn TypeScript",
      },
      {
        name: "hero, pinned",
        heroIsPinned: true,
        testID: "goals-cockpit-hero-pin",
        label: "goals:cockpit.unpinGoal",
        hint: "goals:cockpit.unpinHint",
        title: "Learn TypeScript",
      },
      {
        name: "keep-warm tile",
        heroIsPinned: false,
        testID: "keep-warm-pin-kw-1",
        label: "goals:cockpit.pinGoal",
        hint: "goals:cockpit.pinHint",
        title: "Build a component library",
      },
    ] as const)(
      "labels the $name toggle and exposes its selected state",
      ({ heroIsPinned, testID, label, hint, title }) => {
        renderWithProviders(
          <GoalsCockpit
            hero={makeHero()}
            keepWarm={keepWarm}
            {...handlers()}
            heroIsPinned={heroIsPinned}
          />,
        );
        const toggle = screen.getByTestId(testID);
        expect(toggle.props.accessibilityLabel).toBe(i18n.t(label));
        expect(toggle.props.accessibilityHint).toBe(i18n.t(hint, { title }));
        // Only the hero can be the pinned one, so a keep-warm toggle is always
        // inactive regardless of heroIsPinned.
        expect(toggle.props.accessibilityState.selected).toBe(
          testID === "goals-cockpit-hero-pin" ? heroIsPinned : false,
        );
        expect(toggle.props.accessibilityRole).toBe("button");
      },
    );

    it("pins the hero when the toggle is inactive", () => {
      const h = handlers();
      renderWithProviders(
        <GoalsCockpit hero={makeHero()} keepWarm={[]} {...h} />,
      );
      fireEvent.press(screen.getByTestId("goals-cockpit-hero-pin"));
      expect(h.onPinGoal).toHaveBeenCalledWith("hero");
      expect(h.onUnpinGoal).not.toHaveBeenCalled();
    });

    it("unpins the hero when the toggle is active", () => {
      const h = handlers();
      renderWithProviders(
        <GoalsCockpit
          hero={makeHero()}
          keepWarm={[]}
          {...h}
          heroIsPinned={true}
        />,
      );
      fireEvent.press(screen.getByTestId("goals-cockpit-hero-pin"));
      expect(h.onUnpinGoal).toHaveBeenCalledTimes(1);
      expect(h.onPinGoal).not.toHaveBeenCalled();
    });

    // A keep-warm tile sets `accessible`, which collapses everything inside it
    // into one screen-reader node. The pin therefore has to live outside that
    // Pressable, or VoiceOver/TalkBack can neither reach nor activate it.
    // getByTestId reads the element tree directly and would pass either way, so
    // assert on the a11y tree instead.
    it("exposes the keep-warm pin as its own screen-reader control", () => {
      const h = handlers();
      renderWithProviders(
        <GoalsCockpit hero={makeHero()} keepWarm={keepWarm} {...h} />,
      );
      const tile = screen.getByTestId("keep-warm-kw-1");
      const pin = screen.getByTestId("keep-warm-pin-kw-1");

      // The pin must not be a descendant of the collapsed tile node.
      const descendants: unknown[] = [];
      const walk = (node: { children?: unknown[] }) => {
        for (const child of node.children ?? []) {
          descendants.push(child);
          walk(child as { children?: unknown[] });
        }
      };
      walk(tile);
      // The title *is* inside the collapsed node — proves the walk descends, so
      // the assertion below fails for the right reason rather than vacuously.
      expect(descendants).toContain(
        screen.getByText("Build a component library"),
      );
      expect(descendants).not.toContain(pin);
      expect(tile.props.accessible).toBe(true);
    });

    // The pin sits over the tile, whose own press opens the goal and whose
    // long-press deletes it. Tapping the pin must do neither.
    it("pins a keep-warm goal without opening or deleting it", () => {
      const h = handlers();
      renderWithProviders(
        <GoalsCockpit hero={makeHero()} keepWarm={keepWarm} {...h} />,
      );
      fireEvent.press(screen.getByTestId("keep-warm-pin-kw-2"));
      expect(h.onPinGoal).toHaveBeenCalledWith("kw-2");
      expect(h.onOpenGoal).not.toHaveBeenCalled();
      expect(h.onDeleteGoal).not.toHaveBeenCalled();
    });
  });
});
