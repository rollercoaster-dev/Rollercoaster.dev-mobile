import React from "react";
import { View } from "react-native";
import type { space } from "../../themes/tokens";
import { styles } from "./Divider.styles";

export interface DividerProps {
  spacing?: keyof typeof space;
}

export function Divider({ spacing = "3" }: DividerProps) {
  return <View style={styles.divider(spacing)} />;
}
