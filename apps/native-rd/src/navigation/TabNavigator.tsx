import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FocusPillTabBar } from "./FocusPillTabBar";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { screenErrorBoundaryLayout } from "./screenErrorBoundary";
import { GoalsStack } from "./GoalsStack";
import { BadgesStack } from "./BadgesStack";
import { SettingsStack } from "./SettingsStack";
import { shouldHideTabBar } from "./tabBarVisibility";
import type { RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () => null,
      }}
      // The tab bar sits outside every screen's boundary; a compact fallback
      // keeps the screen above it usable if the bar itself throws, and the
      // next navigation (a new state object) brings the bar back (#266).
      // Full-screen modal routes (New goal, Completion, Welcome replay) hide
      // the bar on Android, where they render inside the tab (#798).
      tabBar={(props) =>
        shouldHideTabBar(props.state.routes[props.state.index]) ? null : (
          <ErrorBoundary variant="compact" resetKeys={[props.state]}>
            <FocusPillTabBar {...props} />
          </ErrorBoundary>
        )
      }
      screenLayout={screenErrorBoundaryLayout}
    >
      <Tab.Screen name="GoalsTab" component={GoalsStack} />
      <Tab.Screen name="BadgesTab" component={BadgesStack} />
      <Tab.Screen name="SettingsTab" component={SettingsStack} />
    </Tab.Navigator>
  );
}
