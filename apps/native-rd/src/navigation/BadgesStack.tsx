import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BadgesScreen } from '../screens/BadgesScreen';
import { BadgeDetailScreen } from '../screens/BadgeDetailScreen';
import { BadgeDesignerScreen } from '../screens/BadgeDesignerScreen';
import type { BadgesStackParamList } from './types';

const Stack = createNativeStackNavigator<BadgesStackParamList>();

export function BadgesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Badges" component={BadgesScreen} />
      <Stack.Screen name="BadgeDetail" component={BadgeDetailScreen} />
      <Stack.Screen name="BadgeDesigner" component={BadgeDesignerScreen} />
    </Stack.Navigator>
  );
}
