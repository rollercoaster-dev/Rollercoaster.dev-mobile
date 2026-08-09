/**
 * CelebrationSparkles — the static ✦/◆ decoration layer that sits behind a
 * celebration surface.
 *
 * Extracted from BadgeDetailScreen's CelebrationHeroHeader (#468) so the
 * finishing flow's full-bleed "Earned" reveal carries the same celebratory
 * texture instead of a flat yellow field. Purely decorative: absolutely
 * positioned, non-interactive, hidden from screen readers, and clipped by
 * whichever surface it fills (the parent owns `overflow: "hidden"`).
 *
 * NOT the falling Confetti component — these are motionless glyphs at low
 * opacity, which is why they are safe to render under reduced-motion settings.
 * Callers still gate them on their own "should we celebrate visually" flag.
 *
 * Two layouts, because the surfaces differ in shape:
 * - `band` — the six pixel-positioned glyphs transcribed from the Badge Detail
 *   C prototype's header. Fixed offsets are correct there: the band's height
 *   is driven by its content and barely varies.
 * - `screen` — percentage-positioned for a full-height surface, so the scatter
 *   stays even from an SE to a Max instead of bunching at the top. Kept clear
 *   of the vertical centre band where the badge and title live.
 */
import React from "react";
import { View, type DimensionValue } from "react-native";
import { Diamond, Sparkle } from "phosphor-react-native";
import { styles } from "./CelebrationSparkles.styles";

type SparkleSpec = {
  kind: "sparkle" | "diamond";
  size: number;
  opacity: number;
  position: {
    top?: DimensionValue;
    bottom?: DimensionValue;
    left?: DimensionValue;
    right?: DimensionValue;
  };
};

/**
 * Badge Detail C Prototype: 6 ✦/◆ glyphs at the band edges, opacity 0.4–0.55.
 * Positions are band-relative pixels.
 */
const BAND_SPARKLES: readonly SparkleSpec[] = [
  { kind: "sparkle", size: 16, opacity: 0.5, position: { top: 46, left: 30 } },
  {
    kind: "diamond",
    size: 13,
    opacity: 0.55,
    position: { top: 34, right: 48 },
  },
  { kind: "diamond", size: 13, opacity: 0.5, position: { top: 150, left: 26 } },
  {
    kind: "sparkle",
    size: 16,
    opacity: 0.5,
    position: { top: 168, right: 30 },
  },
  { kind: "sparkle", size: 11, opacity: 0.4, position: { top: 120, left: 54 } },
  {
    kind: "diamond",
    size: 10,
    opacity: 0.45,
    position: { top: 110, right: 60 },
  },
];

/**
 * Full-surface scatter: the same glyph vocabulary and opacity range as the
 * band, spread top-to-bottom and biased toward the edges so the centred badge,
 * title, and CTA stay on clean ground.
 */
const SCREEN_SPARKLES: readonly SparkleSpec[] = [
  {
    kind: "sparkle",
    size: 18,
    opacity: 0.5,
    position: { top: "8%", left: "10%" },
  },
  {
    kind: "diamond",
    size: 14,
    opacity: 0.55,
    position: { top: "6%", right: "14%" },
  },
  {
    kind: "diamond",
    size: 11,
    opacity: 0.4,
    position: { top: "17%", left: "26%" },
  },
  {
    kind: "sparkle",
    size: 13,
    opacity: 0.45,
    position: { top: "22%", right: "8%" },
  },
  {
    kind: "sparkle",
    size: 11,
    opacity: 0.4,
    position: { top: "38%", left: "6%" },
  },
  {
    kind: "diamond",
    size: 12,
    opacity: 0.45,
    position: { top: "44%", right: "9%" },
  },
  {
    kind: "diamond",
    size: 15,
    opacity: 0.5,
    position: { top: "63%", left: "12%" },
  },
  {
    kind: "sparkle",
    size: 16,
    opacity: 0.5,
    position: { top: "68%", right: "13%" },
  },
  {
    kind: "sparkle",
    size: 12,
    opacity: 0.4,
    position: { bottom: "12%", left: "22%" },
  },
  {
    kind: "diamond",
    size: 10,
    opacity: 0.45,
    position: { bottom: "9%", right: "26%" },
  },
];

const LAYOUTS = {
  band: BAND_SPARKLES,
  screen: SCREEN_SPARKLES,
} as const;

export interface CelebrationSparklesProps {
  /** Glyph color — pass the surface's celebration ink (`chrome.celebrationFg`). */
  color: string;
  /** Scatter to use. `band` for a header strip, `screen` for a full-bleed surface. */
  layout?: keyof typeof LAYOUTS;
  testID?: string;
}

export function CelebrationSparkles({
  color,
  layout = "band",
  testID = "celebration-sparkles",
}: CelebrationSparklesProps) {
  return (
    <View
      style={styles.layer}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      {LAYOUTS[layout].map((s, i) => {
        const Glyph = s.kind === "sparkle" ? Sparkle : Diamond;
        return (
          <View
            key={i}
            style={[styles.sparkle, s.position, { opacity: s.opacity }]}
          >
            <Glyph size={s.size} weight="fill" color={color} />
          </View>
        );
      })}
    </View>
  );
}
