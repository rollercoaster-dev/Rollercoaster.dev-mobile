import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import {
  stepStateNodeBg,
  stepStateNodeFg,
  type StepStateMapKey,
} from "../TimelineNode/stepStateColorMap";

// Focus Mode hero card. Shares the #406 state-color language with TimelineNode /
// TimelineStep (the pill resolves through stepStateNodeBg/Fg), and mirrors the
// StepCard evidence-rail chip and the TimelineStep state-word pill so the three
// surfaces read as one vocabulary. No hardcoded hex: every color is a theme token.
export const styles = StyleSheet.create((theme) => {
  // Shared CTA shape — neo-brutalist: bold border, hard small shadow, 44pt floor.
  const ctaBase = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: theme.space[2],
    minHeight: 44,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    ...shadowStyle(theme, "cardElevationSmall"),
  };

  return {
    card: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: theme.borderWidth.medium,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.space[4],
      gap: theme.space[3],
      ...shadowStyle(theme, "cardElevation"),
    },
    // Title + state pill on one row (paused / completed); in-progress and
    // all-complete render the title without a pill so it sits alone.
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.space[2],
    },
    title: {
      flex: 1,
      fontSize: theme.size.lg,
      fontWeight: theme.fontWeight.bold,
      fontFamily: theme.fontFamily.headline,
      color: theme.colors.text,
    },
    heading: {
      fontSize: theme.size.xl,
      fontWeight: theme.fontWeight.bold,
      fontFamily: theme.fontFamily.headline,
      color: theme.colors.text,
    },
    // E (state) pill — the one #406 color language, identical bg/fg pairing to
    // the node and the TimelineStep header word. Solid states get a seamless
    // border == bg; paused keeps a neutral border so its light fill stays visible
    // (mirrors TimelineStep.styles.ts / TimelineNode.styles.ts).
    stateWordPill: (status: StepStateMapKey) => ({
      paddingHorizontal: theme.space[2],
      paddingVertical: theme.space[1],
      borderRadius: theme.radius.sm,
      borderWidth: theme.borderWidth.thin,
      backgroundColor: stepStateNodeBg(theme, status),
      borderColor:
        status === "in-progress" || status === "completed"
          ? stepStateNodeBg(theme, status)
          : theme.colors.border,
    }),
    stateWordText: (status: StepStateMapKey) => ({
      fontSize: theme.size.xs,
      fontWeight: theme.fontWeight.semibold,
      color: stepStateNodeFg(theme, status),
    }),
    // C·B truth-lines. No hue (textSecondary only); the date line is mono and
    // carries no red / "overdue" framing (ADR-0012), matching TimelineStep.
    metadataBand: {
      gap: theme.space[1],
    },
    metadataText: {
      fontSize: theme.size.xs,
      color: theme.colors.textSecondary,
    },
    metadataDate: {
      fontSize: theme.size.xs,
      color: theme.colors.textSecondary,
      fontFamily: theme.fontFamily.mono,
    },
    // Quiet always-present "Evidence · required" attribute — calm band copy, not
    // a loud badge (Direction A). Never frames evidence as missing/needed.
    evidenceRequired: {
      fontSize: theme.size.sm,
      color: theme.colors.textSecondary,
    },
    plannedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[2],
    },
    plannedType: {
      fontSize: theme.size.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.text,
    },
    changeAffordance: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: theme.space[2],
    },
    changeText: {
      fontSize: theme.size.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.accentPrimary,
      textDecorationLine: "underline",
    },
    // Captured-evidence rail — read-only status chips, mirrors StepCard.styles.ts.
    evidenceRail: {
      gap: theme.space[1],
    },
    evidenceRailLabel: {
      fontSize: theme.size.xs,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: theme.letterSpacing.wide,
      fontFamily: theme.fontFamily.body,
    },
    evidenceRailRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: theme.space[2],
    },
    evidenceChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[1],
      backgroundColor: theme.colors.accentPurpleLight,
      borderWidth: theme.borderWidth.medium,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.space[2],
      paddingVertical: theme.space[1],
      ...shadowStyle(theme, "cardElevationSmall"),
    },
    evidenceChipIcon: {
      fontSize: 14,
    },
    evidenceChipText: {
      fontSize: theme.size.xs,
      fontFamily: theme.fontFamily.mono,
      color: theme.colors.text,
      maxWidth: 180,
    },
    helperLine: {
      fontSize: theme.size.sm,
      color: theme.colors.textSecondary,
    },
    bodyText: {
      fontSize: theme.size.md,
      color: theme.colors.text,
    },
    footRow: {
      gap: theme.space[2],
    },
    // Primary action (add evidence / pick back up / design badge): filled mint.
    primaryCta: {
      ...ctaBase,
      backgroundColor: theme.colors.accentMint,
    },
    primaryCtaText: {
      fontSize: theme.size.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.accentMintFg,
    },
    // Mark-complete: success-tinted, revealed only once evidence is captured.
    completeCta: {
      ...ctaBase,
      backgroundColor: theme.colors.success,
    },
    completeCtaText: {
      fontSize: theme.size.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.successForeground,
    },
    // Secondary action (set aside / reopen): outline on card surface.
    secondaryCta: {
      ...ctaBase,
      backgroundColor: theme.colors.background,
    },
    secondaryCtaText: {
      fontSize: theme.size.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.text,
    },
  };
});
