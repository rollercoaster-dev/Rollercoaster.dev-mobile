/**
 * Accessibility + behavior contract tests for FocusPillTabBar.
 *
 * The tab bar is the primary navigation surface — a regression here
 * breaks every screen-reader and motor-accessibility user. These tests
 * lock in the contracts called out in docs/accessibility-guidelines.md.
 */

import React from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { renderWithProviders, screen, fireEvent } from "./test-utils";
import { i18n } from "../i18n";
import { FocusPillTabBar } from "../navigation/FocusPillTabBar";
import {
  expectAccessibleRole,
  expectAccessibleLabel,
  expectAccessibleState,
} from "./a11y-helpers";

jest.mock("../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: "full",
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  }),
}));

interface MockTabBarOpts {
  activeIndex?: number;
}

function buildProps({ activeIndex = 0 }: MockTabBarOpts = {}) {
  const dispatch = jest.fn();
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  const navigate = jest.fn();

  const routes = [
    { key: "GoalsTab-1", name: "GoalsTab" as const, params: undefined },
    { key: "BadgesTab-1", name: "BadgesTab" as const, params: undefined },
    { key: "SettingsTab-1", name: "SettingsTab" as const, params: undefined },
  ];

  // The component only reads a small subset of BottomTabBarProps; the
  // `unknown` cast acknowledges the partial shape without inviting `any`
  // into the surrounding code.
  const props = {
    state: {
      index: activeIndex,
      key: "tab",
      routes,
      routeNames: routes.map((r) => r.name),
      type: "tab",
      stale: false,
      history: [],
    },
    navigation: { dispatch, emit, navigate },
    descriptors: {},
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  } as unknown as BottomTabBarProps;

  return { props, dispatch, emit };
}

describe("FocusPillTabBar", () => {
  it("renders three tabs with role and label", () => {
    const { props } = buildProps();
    renderWithProviders(<FocusPillTabBar {...props} />);

    const goals = screen.getByTestId("tab-GoalsTab");
    const badges = screen.getByTestId("tab-BadgesTab");
    const settings = screen.getByTestId("tab-SettingsTab");

    expectAccessibleRole(goals, "tab");
    expectAccessibleLabel(goals, "Goals");
    expectAccessibleRole(badges, "tab");
    expectAccessibleLabel(badges, "Badges");
    expectAccessibleRole(settings, "tab");
    expectAccessibleLabel(settings, "Settings");
  });

  it("marks the active tab with selected state and shows only its label", () => {
    const { props } = buildProps({ activeIndex: 1 });
    renderWithProviders(<FocusPillTabBar {...props} />);

    expectAccessibleState(screen.getByTestId("tab-GoalsTab"), {
      selected: false,
    });
    expectAccessibleState(screen.getByTestId("tab-BadgesTab"), {
      selected: true,
    });
    expectAccessibleState(screen.getByTestId("tab-SettingsTab"), {
      selected: false,
    });

    expect(screen.getByText("Badges")).toBeOnTheScreen();
    expect(screen.queryByText("Goals")).toBeNull();
    expect(screen.queryByText("Settings")).toBeNull();
  });

  it.each([
    { from: 0, to: "BadgesTab", testId: "tab-BadgesTab" },
    { from: 0, to: "SettingsTab", testId: "tab-SettingsTab" },
    { from: 2, to: "GoalsTab", testId: "tab-GoalsTab" },
    { from: 2, to: "BadgesTab", testId: "tab-BadgesTab" },
  ])(
    "pressing inactive $to dispatches navigate (from index $from)",
    ({ from, to, testId }) => {
      const { props, dispatch, emit } = buildProps({ activeIndex: from });
      renderWithProviders(<FocusPillTabBar {...props} />);

      fireEvent.press(screen.getByTestId(testId));

      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: "tabPress", target: `${to}-1` }),
      );
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "NAVIGATE",
          target: "tab",
          payload: expect.objectContaining({ name: to }),
        }),
      );
    },
  );

  it("pressing the already-active tab does not dispatch navigate", () => {
    const { props, dispatch } = buildProps({ activeIndex: 0 });
    renderWithProviders(<FocusPillTabBar {...props} />);

    fireEvent.press(screen.getByTestId("tab-GoalsTab"));

    // emit fires for tabPress, but navigate dispatch should not.
    const navigateCalls = dispatch.mock.calls.filter(
      ([action]) => action?.type === "NAVIGATE",
    );
    expect(navigateCalls).toHaveLength(0);
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it.each([
      "common:navigation.tabs.goals",
      "common:navigation.tabs.badges",
      "common:navigation.tabs.settings",
    ] as const)("renders %s under pseudo locale", async (key) => {
      await i18n.changeLanguage("pseudo");
      const { props } = buildProps();
      renderWithProviders(<FocusPillTabBar {...props} />);
      const pseudo = i18n.t(key);
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByLabelText(pseudo)).toBeOnTheScreen();
    });
  });
});
