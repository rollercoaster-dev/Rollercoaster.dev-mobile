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
 * That layer now lives in the shared CelebrationSparkles component, which the
 * finishing flow's reveal stage renders with its full-surface layout.
 */
import React from "react";
import { View } from "react-native";
import { ArrowLeft, Check, DotsThree } from "phosphor-react-native";
import { useUnistyles } from "react-native-unistyles";
import { Text } from "../../components/Text";
import { IconButton } from "../../components/IconButton";
import { CelebrationSparkles } from "../../components/CelebrationSparkles";
import { BadgeRenderer } from "../../badges/BadgeRenderer";
import { createDefaultBadgeDesign, type BadgeDesign } from "../../badges/types";
import { palette } from "../../themes/adapter";
import { styles } from "./CelebrationHeroHeader.styles";

/** Logical-pixel size of the hero badge. Matches the HTML prototype (D2). */
const BADGE_SIZE = 146;

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
  /** Localised back-button label. Defaults to English; #380 passes t() output. */
  backAccessibilityLabel?: string;
  /** Localised overflow-button label. Defaults to English; #380 passes t() output. */
  overflowAccessibilityLabel?: string;
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
  backAccessibilityLabel = "Back",
  overflowAccessibilityLabel = "More options",
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
      {showConfetti ? (
        <CelebrationSparkles color={theme.chrome.celebrationFg} layout="band" />
      ) : null}

      {/* a11y labels default to English so the component stays i18n-free and
          Storybook-renderable in isolation. Callers pass localised strings via
          backAccessibilityLabel / overflowAccessibilityLabel (#380 routes these
          through t() — a badgeDetail:fallback.goBack key already exists for the
          back button). */}
      <View style={styles.navRow}>
        <IconButton
          icon={<ArrowLeft size={24} weight="bold" />}
          tone="celebration"
          onPress={onBack}
          accessibilityLabel={backAccessibilityLabel}
          testID="celebration-hero-back"
        />
        <IconButton
          icon={<DotsThree size={24} weight="bold" />}
          tone="celebration"
          onPress={onOverflow}
          accessibilityLabel={overflowAccessibilityLabel}
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
