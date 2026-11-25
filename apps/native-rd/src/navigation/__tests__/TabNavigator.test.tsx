/**
 * TabNavigator hides its tab bar while a full-screen modal route is focused
 * on Android (#798). The real bottom-tab navigator needs a native host, so
 * the factory is replaced with a fake that calls `tabBar` with the tab state
 * the test sets, and FocusPillTabBar is a marker view.
 */
import React from "react";
import { Platform } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { TabNavigator } from "../TabNavigator";

const mockTabState: { value: unknown } = { value: undefined };

jest.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({
      tabBar,
    }: {
      tabBar: (props: { state: unknown }) => React.ReactNode;
    }) => tabBar({ state: mockTabState.value }),
    Screen: () => null,
  }),
}));

jest.mock("../FocusPillTabBar", () => {
  const { View: MockView } = jest.requireActual("react-native");
  return { FocusPillTabBar: () => <MockView testID="focus-pill-tab-bar" /> };
});
jest.mock("../GoalsStack", () => ({ GoalsStack: () => null }));
jest.mock("../BadgesStack", () => ({ BadgesStack: () => null }));
jest.mock("../SettingsStack", () => ({ SettingsStack: () => null }));

function goalsTabFocusing(names: string[]) {
  return {
    index: 0,
    routes: [
      {
        key: "GoalsTab-key",
        name: "GoalsTab",
        state: {
          index: names.length - 1,
          routes: names.map((name) => ({ key: `${name}-key`, name })),
        },
      },
    ],
  };
}

const originalOS = Platform.OS;
function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
}

afterEach(() => setOS(originalOS));

describe("TabNavigator tab bar visibility (#798)", () => {
  it("hides the tab bar on Android while the New goal wizard is focused", () => {
    setOS("android");
    mockTabState.value = goalsTabFocusing(["Goals", "NewGoal"]);
    render(<TabNavigator />);
    expect(screen.queryByTestId("focus-pill-tab-bar")).toBeNull();
  });

  it("shows the tab bar on Android on a regular screen", () => {
    setOS("android");
    mockTabState.value = goalsTabFocusing(["Goals"]);
    render(<TabNavigator />);
    expect(screen.getByTestId("focus-pill-tab-bar")).toBeTruthy();
  });

  it("keeps the tab bar on iOS, where the modal covers it", () => {
    setOS("ios");
    mockTabState.value = goalsTabFocusing(["Goals", "NewGoal"]);
    render(<TabNavigator />);
    expect(screen.getByTestId("focus-pill-tab-bar")).toBeTruthy();
  });
});
