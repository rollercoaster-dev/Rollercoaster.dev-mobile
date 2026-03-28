import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useUnistyles } from 'react-native-unistyles';
import { getRecommendedTextColor } from '../utils/accessibility';
import { GoalsStack } from './GoalsStack';
import { BadgesStack } from './BadgesStack';
import { SettingsStack } from './SettingsStack';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const tabLetters: Record<keyof RootTabParamList, string> = {
  GoalsTab: 'G',
  BadgesTab: 'B',
  SettingsTab: 'S',
};

export function TabNavigator() {
  const { theme } = useUnistyles();

  // Dynamically determine text colors based on theme's accentPurple background
  // This ensures WCAG AA compliance across all 12 theme variants
  const activeTextColor = getRecommendedTextColor(theme.colors.accentPurple);
  // For inactive state, use a slightly muted version while maintaining 3:1 contrast
  // If active is white, inactive is light gray; if active is black, inactive is dark gray
  const inactiveTextColor = activeTextColor === '#FFFFFF' ? '#e5e5e5' : '#404040';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ color }) => (
          <Text
            style={{
              color,
              fontSize: theme.size['2xl'],
              fontWeight: theme.fontWeight.black,
              fontFamily: theme.fontFamily.headline,
              letterSpacing: theme.letterSpacing.tight,
              lineHeight: theme.size['2xl'] * 1.2,
            }}
          >
            {tabLetters[route.name]}
          </Text>
        ),
        // Dynamically computed colors ensure WCAG AA across all theme variants
        tabBarActiveTintColor: activeTextColor,
        tabBarInactiveTintColor: inactiveTextColor,
        tabBarStyle: {
          backgroundColor: theme.colors.accentPurple,
          borderTopWidth: theme.borderWidth.medium,
          borderTopColor: theme.colors.border,
          height: 56,
        },
      })}
    >
      <Tab.Screen name="GoalsTab" component={GoalsStack} />
      <Tab.Screen name="BadgesTab" component={BadgesStack} />
      <Tab.Screen name="SettingsTab" component={SettingsStack} />
    </Tab.Navigator>
  );
}
