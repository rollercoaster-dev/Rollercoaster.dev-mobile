import { Platform } from "react-native";
import type { NavigationState, PartialState } from "@react-navigation/native";
import type { GoalsStackParamList, SettingsStackParamList } from "./types";

type FullScreenRoute = keyof GoalsStackParamList | keyof SettingsStackParamList;

/**
 * Stack routes that present as `presentation: "modal"`. On iOS a native-stack
 * modal is presented above the whole tab navigator, so it covers the tab bar.
 * On Android the same option renders the route as a normal screen inside its
 * tab, so the floating tab bar stays on top of it and of every in-tree sheet
 * it opens (#798). These routes hide the tab bar on Android instead.
 */
export const FULL_SCREEN_ROUTES: ReadonlySet<string> = new Set<FullScreenRoute>(
  ["NewGoal", "CompletionFlow", "Welcome"],
);

type TabRoute = {
  state?: NavigationState | PartialState<NavigationState>;
  params?: object;
};

/**
 * Name of the route focused inside a tab's nested stack. Before the stack
 * mounts (a `navigate("GoalsTab", { screen })` into an unvisited tab) there
 * is no state yet, so fall back to the `screen` param it was opened with.
 */
function focusedNestedRouteName(route: TabRoute): string | undefined {
  const nested = route.state;
  if (nested && nested.routes.length > 0) {
    const index = nested.index ?? nested.routes.length - 1;
    return nested.routes[index]?.name;
  }
  const screen = (route.params as { screen?: unknown } | undefined)?.screen;
  return typeof screen === "string" ? screen : undefined;
}

/**
 * Whether the tab bar should be hidden for the focused tab route. Only hides
 * on Android: iOS modals already cover the bar, and hiding it there would
 * make it vanish behind the page-sheet's visible edge.
 */
export function shouldHideTabBar(
  route: TabRoute,
  os: typeof Platform.OS = Platform.OS,
): boolean {
  if (os === "ios") return false;
  const name = focusedNestedRouteName(route);
  return name !== undefined && FULL_SCREEN_ROUTES.has(name);
}
