import React from "react";
import { Image, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useUnistyles } from "react-native-unistyles";
import { shieldPath } from "../../badges/shapes/paths";
import { styles } from "./BrandMark.styles";

export interface BrandMarkProps {
  size?: number;
}

export function BrandMark({ size = 56 }: BrandMarkProps) {
  const { theme } = useUnistyles();
  const stroke = 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Path
          d={shieldPath(size, stroke / 2)}
          fill={theme.colors.backgroundSecondary}
          stroke={theme.colors.border}
          strokeWidth={stroke}
        />
      </Svg>
      <Image
        source={require("../../../assets/adaptive-icon.png")}
        style={[styles.icon, { width: size, height: size }]}
        resizeMode="contain"
      />
    </View>
  );
}
