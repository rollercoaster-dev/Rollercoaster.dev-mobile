import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./ScreenHeader.styles";

// Normally the safe-area inset is painted by App.tsx (it offsets the
// navigator by insets.top), so the band uses plain symmetric padding.
// Detached presentations that escape that offset (a fullScreen RN Modal
// with its own SafeAreaProvider) pass `safeAreaTop` to pay the inset here.
export interface HeaderBandProps {
  children: React.ReactNode;
  safeAreaTop?: boolean;
}

export function HeaderBand({ children, safeAreaTop = false }: HeaderBandProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.band, safeAreaTop && styles.bandSafeTop(insets.top)]}>
      {children}
    </View>
  );
}
