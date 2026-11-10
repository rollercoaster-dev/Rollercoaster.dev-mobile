/**
 * Every routed screen is wrapped in the shared ErrorBoundary via the
 * navigators' `screenLayout`, and the tab bar has its own compact boundary.
 *
 * The real navigators need a native host, so the navigator factories are
 * replaced with a fake that renders exactly one registered route the way React
 * Navigation does: `screen.layout ?? navigator.screenLayout` around the screen
 * component. Every screen module is mocked to throw. If a stack stops passing
 * `screenLayout` (or a new route opts out with a bare `layout`), the throw
 * escapes `render` and the case fails.
 */
import React from "react";
import { render, screen } from "@testing-library/react-native";
import { i18n } from "../../i18n";
import { reportError } from "../../services/sentry-report";
import { GoalsStack } from "../GoalsStack";
import { BadgesStack } from "../BadgesStack";
import { SettingsStack } from "../SettingsStack";
import { TabNavigator } from "../TabNavigator";

jest.mock("../../services/sentry-report", () => ({
  reportError: jest.fn(),
}));

const mockTarget: { route: string; throwTabBar: boolean } = {
  route: "",
  throwTabBar: false,
};

type MockLayout = (props: { children: React.ReactNode }) => React.ReactNode;
interface MockScreenProps {
  name: string;
  component: React.ComponentType<Record<string, unknown>>;
  layout?: MockLayout;
}

function mockCollectScreens(children: React.ReactNode): MockScreenProps[] {
  const out: MockScreenProps[] = [];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Children, isValidElement } = require("react");
  Children.forEach(children, (child: React.ReactNode) => {
    if (!isValidElement(child)) return;
    const props = (child as React.ReactElement<Record<string, unknown>>).props;
    if (typeof props.name === "string") {
      out.push(props as unknown as MockScreenProps);
    } else if (props.children) {
      out.push(...mockCollectScreens(props.children as React.ReactNode));
    }
  });
  return out;
}

function mockCreateNavigator() {
  return {
    Navigator: ({
      children,
      screenLayout,
      tabBar,
    }: {
      children: React.ReactNode;
      screenLayout?: MockLayout;
      tabBar?: (props: unknown) => React.ReactNode;
    }) => {
      const match = mockCollectScreens(children).find(
        (s) => s.name === mockTarget.route,
      );
      const Component = match?.component;
      const element = Component ? (
        <Component
          navigation={{ goBack: jest.fn(), navigate: jest.fn() }}
          route={{ key: mockTarget.route, name: mockTarget.route }}
        />
      ) : null;
      const layout = match?.layout ?? screenLayout;
      return (
        <>
          {layout ? layout({ children: element }) : element}
          {tabBar ? tabBar({}) : null}
        </>
      );
    },
    Screen: () => null,
  };
}

jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: mockCreateNavigator,
}));
jest.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: mockCreateNavigator,
}));

function mockThrowingScreen(): React.ReactElement {
  throw new Error("screen render failed");
}

jest.mock("../../screens/GoalsScreen", () => ({
  GoalsScreen: mockThrowingScreen,
}));
jest.mock("../../screens/FocusModeScreen", () => ({
  FocusModeScreen: mockThrowingScreen,
}));
jest.mock("../../screens/NewGoalScreen", () => ({
  NewGoalScreen: mockThrowingScreen,
}));
jest.mock("../../screens/CapturePhoto", () => ({
  CapturePhoto: mockThrowingScreen,
}));
jest.mock("../../screens/CaptureVideoScreen", () => ({
  CaptureVideoScreen: mockThrowingScreen,
}));
jest.mock("../../screens/VoiceMemoScreen", () => ({
  VoiceMemoScreen: mockThrowingScreen,
}));
jest.mock("../../screens/CaptureFile", () => ({
  CaptureFile: mockThrowingScreen,
}));
jest.mock("../../screens/CaptureLinkScreen", () => ({
  CaptureLinkScreen: mockThrowingScreen,
}));
jest.mock("../../screens/CaptureTextNote", () => ({
  CaptureTextNote: mockThrowingScreen,
}));
jest.mock("../../screens/EditModeScreen", () => ({
  EditModeScreen: mockThrowingScreen,
}));
jest.mock("../../screens/CompletionFlowScreen", () => ({
  CompletionFlowScreen: mockThrowingScreen,
}));
jest.mock("../../screens/TimelineJourneyScreen", () => ({
  TimelineJourneyScreen: mockThrowingScreen,
}));
jest.mock("../../screens/BadgeDesignerScreen", () => ({
  BadgeDesignerScreen: mockThrowingScreen,
}));
jest.mock("../../screens/EvidenceViewerScreen", () => ({
  EvidenceViewerScreen: mockThrowingScreen,
}));
jest.mock("../../screens/BadgesScreen", () => ({
  BadgesScreen: mockThrowingScreen,
}));
jest.mock("../../screens/BadgeDetailScreen", () => ({
  BadgeDetailScreen: mockThrowingScreen,
}));
jest.mock("../../screens/SettingsScreen", () => ({
  SettingsScreen: mockThrowingScreen,
}));
jest.mock("../../screens/WelcomeScreen", () => ({
  WelcomeScreen: mockThrowingScreen,
}));
jest.mock("../../dev/IntlProbeScreen", () => ({
  IntlProbeScreen: mockThrowingScreen,
}));

// Tab-level children: when a tab route is the target, its stack throws as a
// whole (the stack's own routes are covered above); otherwise the real stack
// renders. The tab bar throws on demand so screen and tab-bar cases stay
// independent.
function mockStackModule(path: string, exportName: string, tabRoute: string) {
  const actual = jest.requireActual(path);
  const Real = actual[exportName] as React.ComponentType;
  return {
    [exportName]: () =>
      mockTarget.route === tabRoute ? mockThrowingScreen() : <Real />,
  };
}
jest.mock("../GoalsStack", () =>
  mockStackModule("../GoalsStack", "GoalsStack", "GoalsTab"),
);
jest.mock("../BadgesStack", () =>
  mockStackModule("../BadgesStack", "BadgesStack", "BadgesTab"),
);
jest.mock("../SettingsStack", () =>
  mockStackModule("../SettingsStack", "SettingsStack", "SettingsTab"),
);

jest.mock("../FocusPillTabBar", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require("react-native");
  return {
    FocusPillTabBar: () => {
      if (mockTarget.throwTabBar) throw new Error("tab bar render failed");
      return <Text>tab bar</Text>;
    },
  };
});

const originalConsoleError = console.error;
beforeAll(() => {
  // React logs every caught render error; the boundary's own log is expected.
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

beforeEach(() => {
  (reportError as jest.Mock).mockClear();
  mockTarget.throwTabBar = false;
});

function expectScreenFallback() {
  expect(screen.getByTestId("error-boundary-fallback-screen")).toBeTruthy();
  expect(screen.getByText(i18n.t("common:errorBoundary.title"))).toBeTruthy();
  expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
    area: "render",
  });
}

describe("screen error boundaries", () => {
  test.each([
    "Goals",
    "FocusMode",
    "CompletionFlow",
    "TimelineJourney",
    "EvidenceViewer",
    "NewGoal",
    "CapturePhoto",
    "CaptureVideo",
    "CaptureVoiceMemo",
    "CaptureTextNote",
    "CaptureLink",
    "CaptureFile",
    "EditMode",
    "BadgeDesigner",
  ])("GoalsStack › %s shows the fallback when it throws", (route) => {
    mockTarget.route = route;
    render(<GoalsStack />);
    expectScreenFallback();
  });

  test.each(["Badges", "BadgeDetail", "BadgeDesigner"])(
    "BadgesStack › %s shows the fallback when it throws",
    (route) => {
      mockTarget.route = route;
      render(<BadgesStack />);
      expectScreenFallback();
    },
  );

  test.each(["Settings", "Welcome", "IntlProbe"])(
    "SettingsStack › %s shows the fallback when it throws",
    (route) => {
      mockTarget.route = route;
      render(<SettingsStack />);
      expectScreenFallback();
    },
  );

  test.each(["GoalsTab", "BadgesTab", "SettingsTab"])(
    "TabNavigator › %s shows the fallback and keeps the tab bar",
    (route) => {
      mockTarget.route = route;
      render(<TabNavigator />);
      expectScreenFallback();
      expect(screen.getByText("tab bar")).toBeTruthy();
    },
  );

  it("contains a tab bar throw in a compact fallback", () => {
    mockTarget.route = "GoalsTab";
    mockTarget.throwTabBar = true;
    render(<TabNavigator />);
    expect(screen.getByTestId("error-boundary-fallback-compact")).toBeTruthy();
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
      area: "render",
    });
  });
});
