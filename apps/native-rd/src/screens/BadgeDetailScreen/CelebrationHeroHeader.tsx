/**
 * CelebrationHeroHeader — the themed celebration band at the top of the Badge
 * Detail screen.
 *
 * Pure, prop-driven presentational component: it owns no data, navigation, or
 * overflow-menu state. The container ([Integrate] Badge Detail, #380) feeds it
 * the badge design + earned metadata and supplies the real `onBack` / `onOverflow`
 * actions. Shipping it Storybook-first lets every theme be verified in isolation
 * before the screen is wired.
 *
 * Layout (top → bottom): nav row (back arrow · ⋯ overflow) → centered
 * BadgeRenderer → goal title heading → VerifiedCredentialChip. A subtle static
 * sparkle layer sits behind the content, scattered and clipped to the band —
 * this is the prototype's `showConfetti` decoration (small ✦/◆ glyphs at low
 * opacity), NOT the full-screen falling Confetti component used on completion.
 */
import React from "react";
import { View } from "react-native";
import {
  ArrowLeft,
  Check,
  Diamond,
  DotsThree,
  Sparkle,
} from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../../components/Text";
import { IconButton } from "../../components/IconButton";
import { BadgeRenderer } from "../../badges/BadgeRenderer";
import { createDefaultBadgeDesign, type BadgeDesign } from "../../badges/types";
import { palette } from "../../themes/adapter";
import { styles } from "./CelebrationHeroHeader.styles";

/** Logical-pixel size of the hero badge. Matches the HTML prototype (D2). */
const BADGE_SIZE = 146;

/**
 * Scattered decorative sparkles, transcribed from the prototype's celebration
 * header (Badge Detail C Prototype: 6 ✦/◆ glyphs at the band edges, opacity
 * 0.4–0.55). Positions are band-relative pixels; the band's overflow:hidden
 * clips any that fall outside.
 */
const SPARKLES = [
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
] as const;

/**
 * Static decorative sparkle layer. Painted behind the badge/chip, non-
 * interactive, and hidden from screen readers — purely celebratory chrome.
 */
function Sparkles({ color }: { color: string }) {
  return (
    <View
      style={styles.sparkleLayer}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="celebration-sparkles"
    >
      {SPARKLES.map((s, i) => {
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

export interface CelebrationHeroHeaderProps {
  /** Stored badge design, or null to fall back to the monogram default (D4). */
  badgeDesign: BadgeDesign | null;
  /** Display title; the prominent heading below the badge + the monogram seed. */
  badgeTitle: string;
  /**
   * Pre-composed verifiable-credential label, e.g. "Verifiable · earned Jun 18,
   * 2026". Null hides the chip. The caller localises this (#380 via t(),
   * stories via a fixture) so the component stays i18n-free.
   */
  credentialLabel: string | null;
  /** Whether to show the verifiable-credential chip. */
  isVerified: boolean;
  /** Whether the celebratory sparkle decoration is shown in the band. */
  showConfetti: boolean;
  onBack: () => void;
  onOverflow: () => void;
}

/**
 * Verifiable-credential pill: green check + the caller-supplied credential
 * label (single line, matching the prototype's "✓ Verifiable · earned {date}").
 */
function VerifiedCredentialChip({
  label,
  checkColor,
}: {
  label: string;
  checkColor: string;
}) {
  return (
    <View style={styles.chip} testID="verified-credential-chip">
      <Check size={16} weight="bold" color={checkColor} />
      <Text variant="caption" style={styles.chipLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function CelebrationHeroHeader({
  badgeDesign,
  badgeTitle,
  credentialLabel,
  isVerified,
  showConfetti,
  onBack,
  onOverflow,
}: CelebrationHeroHeaderProps) {
  const { theme } = useUnistyles();

  // Null design → the same monogram default the badge designer produces before
  // the user customises anything, so the pre-designed state renders identically
  // here and in the designer (D4).
  const design =
    badgeDesign ?? createDefaultBadgeDesign(badgeTitle, palette.purple400);

  return (
    <View style={styles.band}>
      {/* Behind the content (painted first), clipped by the band. */}
      {showConfetti ? <Sparkles color={theme.chrome.celebrationFg} /> : null}

      {/* a11y labels are English literals until #380 wires the screen and
          routes them through t() (a badgeDetail:fallback.goBack key already
          exists for the back button). Kept literal here so the component stays
          i18n-free and Storybook-renderable in isolation. */}
      <View style={styles.navRow}>
        <IconButton
          icon={<ArrowLeft size={24} weight="bold" />}
          tone="celebration"
          onPress={onBack}
          accessibilityLabel="Back"
          testID="celebration-hero-back"
        />
        <IconButton
          icon={<DotsThree size={24} weight="bold" />}
          tone="celebration"
          onPress={onOverflow}
          accessibilityLabel="More options"
          testID="celebration-hero-overflow"
        />
      </View>

      <BadgeRenderer
        design={design}
        size={BADGE_SIZE}
        testID="badge-renderer"
      />

      <Text
        variant="display"
        style={styles.title}
        numberOfLines={2}
        accessibilityRole="header"
      >
        {badgeTitle}
      </Text>

      {isVerified && credentialLabel ? (
        <VerifiedCredentialChip
          label={credentialLabel}
          checkColor={theme.colors.success}
        />
      ) : null}
    </View>
  );
}
