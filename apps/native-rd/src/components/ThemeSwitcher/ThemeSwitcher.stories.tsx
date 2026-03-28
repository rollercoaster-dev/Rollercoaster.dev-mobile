import React from 'react';
import { View } from 'react-native';
import { ThemeSwitcher } from './ThemeSwitcher';

export default {
  title: 'Components/ThemeSwitcher',
  component: ThemeSwitcher,
};

export function Default() {
  return (
    <View style={{ padding: 16 }}>
      <ThemeSwitcher />
    </View>
  );
}
