import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { SettingsSection } from "../SettingsSection";
import { SettingsRow } from "../SettingsRow";
import { Text } from "../Text";
import {
  animationPrefOptions,
  type AnimationOverride,
  type AnimationPref,
} from "../../hooks/useAnimationPref";
import { motionA11yLabel } from "../../i18n/labels";
import { styles } from "./SettingsMotionRows.styles";

interface SettingsMotionRowsProps {
  /** The saved choice (`useAnimationPref().userPref`), not the effective one. */
  selectedPref: AnimationPref;
  /** What currently holds motion off regardless of the choice, if anything. */
  override: AnimationOverride;
  onSelect: (pref: AnimationPref) => void;
}

/**
 * Full / Reduced / None motion picker — the same `radiogroup` of
 * `SettingsRow` radios as `SettingsDensityRows`. Controlled: SettingsScreen
 * owns the state via `useAnimationPref()`.
 *
 * The strongest accessibility preference stays authoritative: when Still Water
 * or the device's Reduce Motion keeps motion off, the rows still show and save
 * the person's own choice, and a note below says what is holding motion off
 * and when the choice applies. Nothing is disabled or hidden.
 */
export function SettingsMotionRows({
  selectedPref,
  override,
  onSelect,
}: SettingsMotionRowsProps) {
  const { t } = useTranslation(["settings", "common"]);

  const note =
    override === "theme"
      ? t("settings:motion.override.theme", {
          // Only Still Water forces motion off (see useAnimationPref).
          theme: t("common:theme.options.light-autismFriendly.label"),
        })
      : override === "os"
        ? t("settings:motion.override.os")
        : null;

  return (
    <View>
      <SettingsSection
        title={t("settings:motion.title")}
        accessibilityRole="radiogroup"
        accessibilityLabel={t("settings:motion.title")}
      >
        {animationPrefOptions.map((id) => {
          const isSelected = selectedPref === id;
          return (
            <SettingsRow
              key={id}
              label={t(`settings:motion.options.${id}.label`)}
              value={
                isSelected
                  ? "✓"
                  : t(`settings:motion.options.${id}.description`)
              }
              accessibilityLabel={motionA11yLabel(t, id)}
              accessibilityRole="radio"
              checked={isSelected}
              onPress={() => onSelect(id)}
            />
          );
        })}
      </SettingsSection>
      {note && (
        <Text
          variant="caption"
          style={styles.note}
          testID="settings-motion-override-note"
        >
          {note}
        </Text>
      )}
    </View>
  );
}
