import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./ScreenHeader.styles";

// Paints the inset directly via useSafeAreaInsets — using SafeAreaView
// here would two-tone on theme switch (Unistyles v3 plugin doesn't
// rewrite style props on third-party components).
export interface HeaderBandProps {
  children: React.ReactNode;
}

export function HeaderBand({ children }: HeaderBandProps) {
  const insets = useSafeAreaInsets();
  return <View style={styles.band(insets.top)}>{children}</View>;
}
