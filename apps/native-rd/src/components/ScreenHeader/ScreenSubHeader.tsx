import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "phosphor-react-native";
import { Text } from "../Text";
import { IconButton } from "../IconButton";
import { HeaderBand } from "./HeaderBand";
import { styles } from "./ScreenHeader.styles";

export interface ScreenSubHeaderProps {
  label: string;
  /**
   * Back action. Omit it when there's no back target (e.g. the first step of a
   * wizard) — a leading spacer takes the back button's place so the label stays
   * optically centered.
   */
  onBack?: () => void;
  right?: React.ReactNode;
}

export function ScreenSubHeader({
  label,
  onBack,
  right,
}: ScreenSubHeaderProps) {
  const { t } = useTranslation(["common"]);

  return (
    <HeaderBand>
      {onBack ? (
        <IconButton
          icon={<ArrowLeft size={24} weight="bold" />}
          onPress={onBack}
          tone="chrome"
          accessibilityLabel={t("common:screenHeader.a11y.goBack")}
        />
      ) : (
        // Leading spacer mirrors the trailing one, keeping the label centered
        // when there's no back target.
        <View style={styles.spacer} />
      )}
      <Text variant="title" style={styles.subLabel} accessibilityRole="header">
        {label}
      </Text>
      {/* Empty spacer keeps the label optically centered when no trailing action. */}
      {right ?? <View style={styles.spacer} />}
    </HeaderBand>
  );
}
