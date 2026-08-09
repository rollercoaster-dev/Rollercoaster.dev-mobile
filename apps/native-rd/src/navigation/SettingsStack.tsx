import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsScreen } from "../screens/SettingsScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { IntlProbeScreen } from "../dev/IntlProbeScreen";
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
    >
      <Stack.Screen name="Settings" component={SettingsScreen} />
      {/* presentation: "modal" is a true full-screen native modal on both
          platforms, so it covers the tab bar with no tabBarStyle plumbing —
          the same precedent GoalsStack's NewGoal/CompletionFlow screens set. */}
      <Stack.Screen
        name="Welcome"
        component={WelcomeReplayScreen}
        options={{ presentation: "modal" }}
      />
      {__DEV__ && <Stack.Screen name="IntlProbe" component={IntlProbeScreen} />}
    </Stack.Navigator>
  );
}
