import React, { Suspense, useEffect, useState } from "react";
import {
  ScrollView,
  View,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as Sentry from "@sentry/react-native";
import { Text } from "../../components/Text";
import { useTabScreenContentInset } from "../../navigation/useTabScreenContentInset";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { ScreenHeader } from "../../components/ScreenHeader";
import { SettingsSection } from "../../components/SettingsSection";
import { SettingsRow } from "../../components/SettingsRow";
import { ThemeSwitcher } from "../../components/ThemeSwitcher";
import { useDensity } from "../../hooks/useDensity";
import { densityOptions } from "../../utils/density";
import { i18n } from "../../i18n";
import { styles } from "./SettingsScreen.styles";

export function isSentryDebugToolsEnabled(value: string | undefined): boolean {
  return value === "true";
}

const SENTRY_DEBUG_TOOLS_ENABLED = isSentryDebugToolsEnabled(
  process.env.EXPO_PUBLIC_SENTRY_DEBUG_TOOLS,
);

export function triggerSentryNativeCrash(): void {
  if (Platform.OS === "android" && __DEV__) {
    const message =
      "Android native crash verification requires a release-mode preview build.";
    Alert.alert("Native crash unavailable", message);
    console.warn(`Sentry native crash skipped: ${message}`);
    return;
  }

  Sentry.nativeCrash();
}

function DensityPicker() {
  const { densityLevel, setDensity } = useDensity();

  return (
    <SettingsSection title="Content Density">
      {densityOptions.map((option) => (
        <SettingsRow
          key={option.id}
          label={option.label}
          value={densityLevel === option.id ? "✓" : option.description}
          onPress={() => setDensity(option.id)}
        />
      ))}
    </SettingsSection>
  );
}

/**
 * Dev-only language switcher. `__DEV__` gates this in production bundles so
 * pseudo can't leak to users. Re-renders on i18next `languageChanged` so the
 * toggle stays in sync if anything else flips the language.
 */
function LanguagePicker() {
  const [language, setLanguage] = useState(i18n.language);

  useEffect(() => {
    const onChange = (lng: string) => setLanguage(lng);
    i18n.on("languageChanged", onChange);
    return () => {
      i18n.off("languageChanged", onChange);
    };
  }, []);

  const isPseudo = language === "pseudo";

  return (
    <SettingsSection title="Language (dev)">
      <SettingsRow
        label="Pseudo locale"
        toggle={{
          value: isPseudo,
          onValueChange: (next) => {
            void i18n.changeLanguage(next ? "pseudo" : "en");
          },
        }}
      />
    </SettingsSection>
  );
}

export function SettingsScreen({
  sentryDebugToolsEnabled = SENTRY_DEBUG_TOOLS_ENABLED,
}: {
  sentryDebugToolsEnabled?: boolean;
} = {}) {
  const tabInset = useTabScreenContentInset();

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings" />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, tabInset]}
        style={styles.scrollContainer}
      >
        <ThemeSwitcher />

        <ErrorBoundary>
          <Suspense fallback={<ActivityIndicator />}>
            <DensityPicker />
          </Suspense>
        </ErrorBoundary>

        {__DEV__ && <LanguagePicker />}

        <SettingsSection title="About">
          <SettingsRow label="App" value="rollercoaster.dev" />
          <SettingsRow
            label="Version"
            value="0.1.0"
            onLongPress={
              sentryDebugToolsEnabled ? triggerSentryNativeCrash : undefined
            }
          />
        </SettingsSection>

        <Text style={styles.version}>Built with Expo + Evolu + Unistyles</Text>
      </ScrollView>
    </View>
  );
}
