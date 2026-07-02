import { View } from "react-native";
import { useTranslation } from "react-i18next";
import type { ThemeName } from "../../themes/compose";
import { SettingsSection } from "../SettingsSection";
import { ThemeSwatchRail } from "../ThemeSwatchRail";
import { ThemeSampleCard } from "../ThemeSampleCard";
import { styles } from "./SettingsThemeSection.styles";

interface SettingsThemeSectionProps {
  selectedThemeId: ThemeName;
  onSelect: (id: ThemeName) => void;
}

/**
 * Settings-screen theme picker: the reused Welcome rail (#413 `ThemeSwatchRail`)
 * plus a live `ThemeSampleCard` preview, wrapped in `SettingsSection` chrome.
 * Controlled (D1) — the parent (#416 `SettingsScreen`) owns the selected theme;
 * tapping a swatch calls `onSelect` and the preview re-renders. Rail + card sit
 * inside a single wrapper `View` (D2) so `SettingsSection`'s inter-child divider
 * doesn't split the picker from its live preview.
 */
export function SettingsThemeSection({
  selectedThemeId,
  onSelect,
}: SettingsThemeSectionProps) {
  const { t } = useTranslation(["settings"]);

  return (
    <SettingsSection title={t("settings:theme.title")}>
      <View style={styles.content}>
        <ThemeSwatchRail
          selectedThemeId={selectedThemeId}
          onSelect={onSelect}
        />
        <ThemeSampleCard themeId={selectedThemeId} />
      </View>
    </SettingsSection>
  );
}
