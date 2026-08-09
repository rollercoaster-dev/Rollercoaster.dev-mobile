import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";
import { useTranslation } from "react-i18next";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { BrandMark } from "../../components/BrandMark";
import { HeaderBand } from "../../components/ScreenHeader/HeaderBand";
import { ThemeSwatchRail } from "../../components/ThemeSwatchRail";
import { ThemeSampleCard } from "../../components/ThemeSampleCard";
import { useToast } from "../../components/Toast";
import { useThemeContext } from "../../hooks/useTheme";
import type { ThemeName } from "../../themes/compose";
import { styles } from "./WelcomeScreen.styles";

export interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const { theme } = useUnistyles();
  const { themeName, setTheme } = useThemeContext();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(["welcome", "common", "settings"]);

  // setTheme applies the theme in-session immediately and returns false only
  // when persisting it failed. The swatch still reads as selected (the theme
  // did change); the toast tells the user it won't survive a restart. Mirrors
  // ThemeSwitcher — without it, a first-run pick silently reverts on relaunch.
  const handleSelectTheme = (id: ThemeName) => {
    if (!setTheme(id)) {
      showToast({ message: t("settings:errors.themeSaveFailed") });
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <HeaderBand safeAreaTop>
        <View style={styles.heroRow}>
          <BrandMark size={56} />
          <View style={styles.heroText}>
            <Text variant="label" style={styles.heroGreeting}>
              {t("welcome:hero.greeting")}
            </Text>
            <Text variant="display" style={styles.heroTitle}>
              {t("welcome:hero.title")}
            </Text>
          </View>
        </View>
      </HeaderBand>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
      >
        <Text variant="body" style={styles.copy}>
          {t("welcome:intro.body1")}
        </Text>

        <Text variant="body" style={styles.copy}>
          {t("welcome:intro.body2")}
        </Text>

        <ThemeSampleCard themeId={themeName} />

        <Text variant="label" style={styles.pickerLabel}>
          {t("welcome:themePicker.label")}
        </Text>
        <ThemeSwatchRail
          selectedThemeId={themeName}
          onSelect={handleSelectTheme}
        />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: theme.space[2] + insets.bottom },
        ]}
      >
        <Button
          label={t("welcome:cta.getStarted")}
          onPress={onGetStarted}
          size="lg"
        />
        <Text variant="caption" style={styles.footnote}>
          {t("welcome:cta.footnote")}
        </Text>
      </View>
    </View>
  );
}
