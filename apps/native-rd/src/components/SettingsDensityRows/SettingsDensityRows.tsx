import { useTranslation } from "react-i18next";
import { SettingsSection } from "../SettingsSection";
import { SettingsRow } from "../SettingsRow";
import { densityOptions, type DensityLevel } from "../../utils/density";

interface SettingsDensityRowsProps {
  selectedLevel: DensityLevel;
  onSelect: (level: DensityLevel) => void;
}

/**
 * Three-row content-density picker (Compact / Default / Comfortable) rendered as
 * a proper `radiogroup` of `SettingsRow` radios — never a slider. Controlled
 * (D6): the parent (#416 `SettingsScreen`) owns `selectedLevel` and persists it
 * via `useDensity()`. The active row shows `✓` and reports
 * `accessibilityState.checked`.
 *
 * Density IS a real, honored setting — `useDensity()` scales the spacing scale
 * across all 7 themes. For the inventory of which OTHER `userSettings` fields
 * are backed but have no UI (and which are dead), see the "Backed-but-unsurfaced
 * settings" findings in docs/plans/dev-plans/issue-415-settings-theme-density-rows.md.
 * Short version for anyone extending the Settings screen:
 *   • Reduce Motion (`animationPref`) — fully honored by 10+ components via
 *     useAnimationPref; `setAnimationPref` has no caller. This same radiogroup
 *     pattern (Full / Reduced / None) drops straight in. Best next real row.
 *   • Replay welcome (`hasSeenWelcome`) — needs a reset mutation (only a
 *     mark-seen path exists today).
 *   • fontScale — persisted + write-validated but NOTHING reads it; do not build
 *     a "text size" row on it without first wiring a consumer.
 */
export function SettingsDensityRows({
  selectedLevel,
  onSelect,
}: SettingsDensityRowsProps) {
  const { t } = useTranslation(["settings"]);

  // Mirror ThemeSwatchRail: the radiogroup wrapper collapses its descendant
  // rows into a single a11y node on iOS, which hides individual rows from
  // Maestro element lookup. Drop the grouping in E2E mode; each SettingsRow
  // keeps its own radio role + label so screen readers still treat the three
  // as discrete radios in production.
  const isE2E = process.env.EXPO_PUBLIC_E2E_MODE === "true";
  const groupingA11y = isE2E
    ? ({ accessible: false } as const)
    : ({
        accessible: true,
        accessibilityRole: "radiogroup" as const,
        accessibilityLabel: "Content density selection",
      } as const);

  return (
    <SettingsSection title={t("settings:density.title")} {...groupingA11y}>
      {densityOptions.map((option) => {
        const isSelected = selectedLevel === option.id;
        return (
          <SettingsRow
            key={option.id}
            label={t(`settings:density.options.${option.id}.label`)}
            value={
              isSelected
                ? "✓"
                : t(`settings:density.options.${option.id}.description`)
            }
            accessibilityRole="radio"
            checked={isSelected}
            onPress={() => onSelect(option.id)}
          />
        );
      })}
    </SettingsSection>
  );
}
