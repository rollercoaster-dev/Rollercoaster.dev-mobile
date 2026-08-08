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
import { SettingsThemeSection } from "../../components/SettingsThemeSection";
import { SettingsDensityRows } from "../../components/SettingsDensityRows";
import { useToast } from "../../components/Toast";
import { useDensity } from "../../hooks/useDensity";
import { useThemeContext } from "../../hooks/useTheme";
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

/**
 * Owns the density state for `SettingsDensityRows` (#416 D2). `useDensity()`
 * reads an Evolu query and can suspend, so the hook stays INSIDE the screen's
 * Suspense/ErrorBoundary rather than being hoisted to `SettingsScreen` — the
 * boundary placement the old inline picker had.
 */
function DensitySection() {
  const { densityLevel, setDensity } = useDensity();
  const { showToast } = useToast();
  const { t } = useTranslation(["settings"]);

  return (
    <SettingsDensityRows
      selectedLevel={densityLevel}
      onSelect={(level) => {
        // setDensity returns false only when the persist failed; surface a
        // toast so the row doesn't look "saved" while nothing persisted.
        if (!setDensity(level)) {
          showToast({ message: t("settings:errors.densitySaveFailed") });
        }
      }}
    />
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
 * Onboarding section — one row that re-opens the first-launch welcome as a
 * modal (#416 D3/D6). Uses the plain `SettingsRow` button affordance (its `›`
 * chevron) rather than a bespoke card, and never mutates `hasSeenWelcome`.
 */
function OnboardingSection() {
  const navigation =
    useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { t } = useTranslation(["settings"]);

  return (
    <SettingsSection title={t("settings:onboarding.title")}>
      <SettingsRow
        label={t("settings:onboarding.replayWelcome")}
        onPress={() => navigation.navigate("Welcome")}
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
  const { themeName, setTheme } = useThemeContext();
  const { showToast } = useToast();

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("settings:title")} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, tabInset]}
        style={styles.scrollContainer}
      >
        <SettingsThemeSection
          selectedThemeId={themeName}
          onSelect={(id) => {
            // setTheme applies the theme in-session immediately and returns
            // false only when persisting it failed — the swatch still shows as
            // selected; the toast says the choice won't survive a restart.
            if (!setTheme(id)) {
              showToast({ message: t("settings:errors.themeSaveFailed") });
            }
          }}
        />

        <ErrorBoundary>
          <Suspense fallback={<ActivityIndicator />}>
            <DensitySection />
          </Suspense>
        </ErrorBoundary>

        {__DEV__ && <LanguagePicker />}

        {__DEV__ && <DevToolsSection />}

        <OnboardingSection />

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
