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
 *
 * NOTE — the section BACKGROUND does not follow the picked theme, by design.
 * `SettingsSection`'s chrome is styled with unistyles reactive tokens, which
 * always resolve to the single globally-active theme. Only `ThemeSampleCard`
 * previews `selectedThemeId` (it reads `themes[id]` statically). This section is
 * context-free and never calls `setTheme`, so the active theme — and thus the bg
 * — only changes once #416 wires `onSelect` → `useThemeContext().setTheme`. In
 * the assembled Settings screen a tap flips the global theme and the whole app
 * (this bg included) recolors. Corollary: the `AllThemesMatrix` story can't show
 * 7 real section bgs at once (one active theme) — the per-theme bg there is faked
 * by the outer wrapper.
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
