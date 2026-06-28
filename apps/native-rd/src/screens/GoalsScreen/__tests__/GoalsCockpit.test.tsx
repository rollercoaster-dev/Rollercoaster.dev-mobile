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
});
