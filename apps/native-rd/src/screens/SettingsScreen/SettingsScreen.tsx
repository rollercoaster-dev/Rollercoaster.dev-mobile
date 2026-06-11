import React, { Suspense } from "react";
import {
  ScrollView,
  View,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as Application from "expo-application";
import * as Sentry from "@sentry/react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { SettingsStackParamList } from "../../navigation/types";
import { Text } from "../../components/Text";
import { useTabScreenContentInset } from "../../navigation/useTabScreenContentInset";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { ScreenHeader } from "../../components/ScreenHeader";
import { SettingsSection } from "../../components/SettingsSection";
import { SettingsRow } from "../../components/SettingsRow";
import { ThemeSwitcher } from "../../components/ThemeSwitcher";
import { useDensity } from "../../hooks/useDensity";
import { densityOptions } from "../../utils/density";
import { Logger } from "../../shims/rd-logger";
import { styles } from "./SettingsScreen.styles";

const logger = new Logger("SettingsScreen");

export function isSentryDebugToolsEnabled(value: string | undefined): boolean {
  return value === "true";
}

const SENTRY_DEBUG_TOOLS_ENABLED = isSentryDebugToolsEnabled(
  process.env.EXPO_PUBLIC_SENTRY_DEBUG_TOOLS,
);

export function triggerSentryNativeCrash(): void {
  if (Platform.OS === "android" && __DEV__) {
    // i18n-skip: dev-only, double-gated by __DEV__ && Platform.OS === "android"
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
  const { t } = useTranslation(["settings"]);

  return (
    <SettingsSection title={t("settings:density.title")}>
      {densityOptions.map((option) => (
        <SettingsRow
          key={option.id}
          label={t(`density.options.${option.id}.label`)}
          value={
            densityLevel === option.id
              ? "✓"
              : t(`density.options.${option.id}.description`)
          }
          onPress={() => setDensity(option.id)}
        />
      ))}
    </SettingsSection>
  );
}

/** Dev-only language switcher. `__DEV__` gates this in production bundles so pseudo can't leak to users. */
function LanguagePicker() {
  const { t, i18n } = useTranslation(["settings"]);
  const isPseudo = i18n.language === "pseudo";

  return (
    <SettingsSection title={t("settings:language.title")}>
      <SettingsRow
        label={t("settings:language.pseudo")}
        toggle={{
          value: isPseudo,
          onValueChange: (next) => {
            i18n
              .changeLanguage(next ? "pseudo" : "en")
              .catch((err: unknown) => {
                const error =
                  err instanceof Error ? err : new Error(String(err));
                logger.error("changeLanguage failed", { error });
              });
          },
        }}
      />
    </SettingsSection>
  );
}

/**
 * Dev-only tools section. `__DEV__` gates rendering so the probe screens are
 * unreachable in production (the modules are still bundled — gating controls
 * reachability, not bundle exclusion). Copy is intentionally untranslated
 * (i18n-skip).
 */
function DevToolsSection() {
  const navigation =
    useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  return (
    <SettingsSection title="Dev tools">
      <SettingsRow
        label="Intl probe (#66)"
        onPress={() => navigation.navigate("IntlProbe")}
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
  const { t } = useTranslation(["settings"]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("settings:title")} />
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

        {__DEV__ && <DevToolsSection />}

        <SettingsSection title={t("settings:about.title")}>
          <SettingsRow
            label={t("settings:about.appLabel")}
            value="rollercoaster.dev"
          />
          <SettingsRow
            label={t("settings:about.versionLabel")}
            value={Application.nativeApplicationVersion ?? "unknown"}
            onLongPress={
              sentryDebugToolsEnabled ? triggerSentryNativeCrash : undefined
            }
          />
        </SettingsSection>

        <Text style={styles.version}>{t("settings:about.builtWith")}</Text>
      </ScrollView>
    </View>
  );
}
