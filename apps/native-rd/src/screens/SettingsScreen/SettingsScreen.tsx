import React, { Suspense } from 'react';
import { ScrollView, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { SettingsSection } from '../../components/SettingsSection';
import { SettingsRow } from '../../components/SettingsRow';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { useDensity } from '../../hooks/useDensity';
import { densityOptions } from '../../utils/density';
import { styles } from './SettingsScreen.styles';

function DensityPicker() {
  const { densityLevel, setDensity } = useDensity();

  return (
    <SettingsSection title="Content Density">
      {densityOptions.map((option) => (
        <SettingsRow
          key={option.id}
          label={option.label}
          value={densityLevel === option.id ? '✓' : option.description}
          onPress={() => setDensity(option.id)}
        />
      ))}
    </SettingsSection>
  );
}

export function SettingsScreen() {
  const { theme } = useUnistyles();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.accentYellow }}>
      <View style={styles.header}>
        <Text variant="display">Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} style={{ backgroundColor: theme.colors.background }}>
        <ThemeSwitcher />

        <ErrorBoundary>
          <Suspense fallback={<ActivityIndicator />}>
            <DensityPicker />
          </Suspense>
        </ErrorBoundary>

        <SettingsSection title="About">
          <SettingsRow label="App" value="rollercoaster.dev" />
          <SettingsRow label="Version" value="0.1.0" />
        </SettingsSection>

        <Text style={styles.version}>
          Built with Expo + Evolu + Unistyles
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
