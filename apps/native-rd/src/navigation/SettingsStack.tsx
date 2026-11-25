import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsScreen } from "../screens/SettingsScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { IntlProbeScreen } from "../dev/IntlProbeScreen";
import { screenErrorBoundaryLayout } from "./screenErrorBoundary";
import type { SettingsStackParamList } from "./types";

const Stack = createNativeStackNavigator<SettingsStackParamList>();

/**
 * Settings › Onboarding › "Replay welcome" target. Renders the unmodified
 * first-launch `WelcomeScreen`; its "Get started" CTA just dismisses the modal
 * (#416 D3). Deliberately does NOT reset `hasSeenWelcome` — only a mark-seen
 * mutation exists in the DB layer today, so replay is a read-only re-view.
 */
function WelcomeReplayScreen({
  navigation,
}: NativeStackScreenProps<SettingsStackParamList, "Welcome">) {
  return <WelcomeScreen onGetStarted={() => navigation.goBack()} />;
}

export function SettingsStack() {
  return (
    <Stack.Navigator
      initialRouteName="Settings"
      screenOptions={{ headerShown: false }}
      screenLayout={screenErrorBoundaryLayout}
    >
      <Stack.Screen name="Settings" component={SettingsScreen} />
      {/* presentation: "modal" covers the tab bar on iOS only. On Android it
          renders inside the tab, so TabNavigator hides the bar for this route
          (FULL_SCREEN_ROUTES, #798) — same as GoalsStack's NewGoal. */}
      <Stack.Screen
        name="Welcome"
        component={WelcomeReplayScreen}
        options={{ presentation: "modal" }}
      />
      {__DEV__ && <Stack.Screen name="IntlProbe" component={IntlProbeScreen} />}
    </Stack.Navigator>
  );
}
