import React from "react";
import { Text } from "../Text";
import { HeaderBand } from "./HeaderBand";
import { styles } from "./ScreenHeader.styles";

export interface ScreenHeaderProps {
  title: string;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, right }: ScreenHeaderProps) {
  return (
    <HeaderBand>
      <Text variant="display" style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </HeaderBand>
  );
}
