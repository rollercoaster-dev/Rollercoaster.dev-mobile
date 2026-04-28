import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FocusPillTabBar } from "./FocusPillTabBar";
import { GoalsStack } from "./GoalsStack";
import { BadgesStack } from "./BadgesStack";
import { SettingsStack } from "./SettingsStack";
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
      tabBar={(props) => <FocusPillTabBar {...props} />}
    >
      <Tab.Screen name="GoalsTab" component={GoalsStack} />
      <Tab.Screen name="BadgesTab" component={BadgesStack} />
      <Tab.Screen name="SettingsTab" component={SettingsStack} />
    </Tab.Navigator>
  );
}
