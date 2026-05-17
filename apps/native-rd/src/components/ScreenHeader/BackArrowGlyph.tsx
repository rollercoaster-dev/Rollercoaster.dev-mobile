import React from "react";
import Svg, { Path } from "react-native-svg";
import { useUnistyles } from "react-native-unistyles";

export interface BackArrowGlyphProps {
  /** Override color. Defaults to the header foreground (`accentPurpleFg`). */
  color?: string;
  /** Pixel size of the square SVG canvas. */
  size?: number;
  /** Stroke weight. Default 3 matches the bold visual weight of the
   *  original `←` rendered at `fontWeight.black` on iOS. */
  strokeWidth?: number;
}

// Inline SVG so the back arrow renders identically on iOS and Android.
// The previous `←` text relied on system font fallback for an arrow
// glyph (Anybody/headline font doesn't include it), which gave a thin
// Roboto arrow on Android and a bold SF Pro arrow on iOS.
export function BackArrowGlyph({
  color,
  size = 24,
  strokeWidth = 3,
}: BackArrowGlyphProps) {
  const { theme } = useUnistyles();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 12 H4 M11 5 L4 12 L11 19"
        stroke={color ?? theme.colors.accentPurpleFg}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
