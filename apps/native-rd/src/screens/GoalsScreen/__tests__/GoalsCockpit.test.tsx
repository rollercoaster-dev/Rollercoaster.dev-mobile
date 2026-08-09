import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import {
  GoalsCockpit,
  type CockpitHeroGoal,
  type CockpitKeepWarmGoal,
} from "../GoalsCockpit";

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
  heroIsPinned: false,
  onPinGoal: jest.fn(),
  onUnpinGoal: jest.fn(),
});

describe("GoalsCockpit", () => {
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

  it("renders the hero next-step headline and overline", () => {
    const hero = makeHero();
    renderWithProviders(
      <GoalsCockpit hero={hero} keepWarm={[]} {...handlers()} />,
    );
    expect(screen.getByText(hero.nextStepTitle!)).toBeOnTheScreen();
    expect(
      screen.getByText(
        i18n.t("goals:cockpit.doThisNext", { title: hero.title }),
      ),
    ).toBeOnTheScreen();
  });

  it("renders every keep-warm goal it is given", () => {
    renderWithProviders(
      <GoalsCockpit hero={makeHero()} keepWarm={keepWarm} {...handlers()} />,
    );
    expect(screen.getByText("Build a component library")).toBeOnTheScreen();
    expect(screen.getByText("Understand local-first sync")).toBeOnTheScreen();
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
