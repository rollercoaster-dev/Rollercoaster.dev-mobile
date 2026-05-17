import React from "react";
import { View } from "react-native";
import { ArrowLeft } from "phosphor-react-native";
import { Text } from "../Text";
import { IconButton } from "../IconButton";
import { HeaderBand } from "./HeaderBand";
import { styles } from "./ScreenHeader.styles";

export interface ScreenSubHeaderProps {
  label: string;
  onBack: () => void;
  right?: React.ReactNode;
}

export function ScreenSubHeader({
  label,
  onBack,
  right,
}: ScreenSubHeaderProps) {
  return (
    <HeaderBand>
      <IconButton
        icon={<ArrowLeft size={24} weight="bold" />}
        onPress={onBack}
        tone="chrome"
        accessibilityLabel="Go back"
      />
      <Text variant="title" style={styles.subLabel} accessibilityRole="header">
        {label}
      </Text>
      {/* Empty spacer keeps the label optically centered when no trailing action. */}
      {right ?? <View style={styles.spacer} />}
    </HeaderBand>
  );
}
