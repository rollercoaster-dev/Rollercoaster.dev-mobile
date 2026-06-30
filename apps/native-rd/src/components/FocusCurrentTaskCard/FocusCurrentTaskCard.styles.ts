import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import {
  stepStateNodeBg,
  stepStateNodeFg,
  type StepStateMapKey,
} from "../TimelineNode/stepStateColorMap";

// Focus Mode hero card. Tuned to the `Focus Mode A` prototype (Joe, 2026-06-30):
// blue primary action via the contrast-validated `action` group, glyph-led C·B
// truth-lines, a bordered planned-evidence box, green captured chips, and the
// state-word pill above the title. Color still resolves through the #406
// `stepStateColorMap` so the pill stays one language with TimelineNode/TimelineStep.
// No hardcoded hex: every color is a theme token.
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
    borderWidth: theme.borderWidth.thick,
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
    title: {
      fontSize: theme.size.xl,
      fontWeight: theme.fontWeight.black,
      fontFamily: theme.fontFamily.headline,
      color: theme.colors.text,
      lineHeight: theme.size.xl * 1.05,
    },
    heading: {
      fontSize: theme.size["2xl"],
      fontWeight: theme.fontWeight.black,
      fontFamily: theme.fontFamily.headline,
      color: theme.colors.text,
    },
    // E (state) pill — above the title, left-aligned, MONO + UPPERCASE. bg/ink
    // resolve through the #406 stepStateColorMap (one color language); the border
    // stays neutral so the light paused / green completed fills read clearly,
    // matching the prototype's bordered pills.
    stateWordPill: (status: StepStateMapKey) => ({
      alignSelf: "flex-start" as const,
      paddingHorizontal: theme.space[2],
      paddingVertical: theme.space[1],
      borderRadius: theme.radius.pill,
      borderWidth: theme.borderWidth.thin,
      backgroundColor: stepStateNodeBg(theme, status),
      borderColor: theme.colors.border,
    }),
    stateWordText: (status: StepStateMapKey) => ({
      fontSize: theme.size.xs,
      fontFamily: theme.fontFamily.mono,
      textTransform: "uppercase" as const,
      letterSpacing: theme.letterSpacing.wide,
      color: stepStateNodeFg(theme, status),
    }),
    // C·B truth-lines: glyph + plain text + mono meta suffix (prototype F1–F3).
    // The date line itself is plain (mono lives only on the trailing meta); this
    // is the card's documented exception to ADR-0012's mono date line.
    metadataBand: {
      gap: theme.space[2],
    },
    metadataLine: {
      flexDirection: "row",
      alignItems: "baseline",
      flexWrap: "wrap",
      gap: theme.space[1],
    },
    // Glyph hues mirror the prototype: amber wait (`warning` == #d97706), green
    // dependency (`success`), neutral date (`textSecondary`).
    metadataGlyphWaiting: {
      fontSize: theme.size.sm,
      color: theme.colors.warning,
    },
    metadataGlyphAfter: {
      fontSize: theme.size.sm,
      color: theme.colors.success,
    },
    metadataGlyphDue: {
      fontSize: theme.size.sm,
      color: theme.colors.textSecondary,
    },
    metadataText: {
      fontSize: theme.size.sm,
      color: theme.colors.text,
    },
    metadataMeta: {
      fontSize: theme.size.xs,
      color: theme.colors.textSecondary,
      fontFamily: theme.fontFamily.mono,
    },
    // Always-present "EVIDENCE · REQUIRED" attribute — mono, uppercase, muted
    // (L5). Never frames evidence as missing/needed.
    evidenceRequired: {
      fontSize: theme.size.xs,
      color: theme.colors.textMuted,
      fontFamily: theme.fontFamily.mono,
      textTransform: "uppercase",
      letterSpacing: theme.letterSpacing.wide,
    },
    // Planned-evidence box — bordered, hard-shadowed; the whole box is the tap
    // target that opens the type picker (#409). icon + bold label + blue "change".
    plannedBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[2],
      minHeight: 44,
      backgroundColor: theme.colors.background,
      borderWidth: theme.borderWidth.thick,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[3],
      ...shadowStyle(theme, "cardElevationSmall"),
    },
    plannedIcon: {
      fontSize: 18,
    },
    plannedLabel: {
      flex: 1,
      fontSize: theme.size.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
    },
    changeText: {
      fontSize: theme.size.sm,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.accentPrimary,
    },
    // Captured rail — read-only green chips (`accentMint`, the prototype's
    // #d4f4e7), label leans green. Mirrors the StepCard rail contract (#360).
    evidenceRail: {
      gap: theme.space[1],
    },
    evidenceRailLabel: {
      fontSize: theme.size.xs,
      fontFamily: theme.fontFamily.mono,
      color: theme.colors.success,
      textTransform: "uppercase",
      letterSpacing: theme.letterSpacing.wide,
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
      backgroundColor: theme.colors.accentMint,
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
      color: theme.colors.accentMintFg,
      maxWidth: 180,
    },
    // Quiet "set this step aside" — inline text, not a button (L3). Keeps a 44pt
    // hit area for the touch-target contract while reading as a calm control.
    setAside: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[1],
      minHeight: 44,
    },
    setAsideText: {
      fontSize: theme.size.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    // Reassurance line — centered, under the Add button, blocked-state only (L6).
    helperLine: {
      fontSize: theme.size.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    bodyText: {
      fontSize: theme.size.md,
      color: theme.colors.text,
    },
    // All-steps-done trophy callout box (L7).
    calloutBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.space[2],
      backgroundColor: theme.colors.accentPurpleLight,
      borderWidth: theme.borderWidth.medium,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      padding: theme.space[3],
      ...shadowStyle(theme, "cardElevationSmall"),
    },
    calloutIcon: {
      fontSize: 18,
    },
    calloutText: {
      flex: 1,
      fontSize: theme.size.sm,
      color: theme.colors.text,
      lineHeight: theme.size.sm * 1.45,
    },
    footRow: {
      gap: theme.space[2],
    },
    // Primary action (Add / Mark complete / Pick back up / Design badge): filled
    // blue (#2563eb light) via the contrast-validated `action` group — flips
    // correctly across all 7 ND variants where a raw accent token would not.
    primaryCta: {
      ...ctaBase,
      backgroundColor: theme.action.actionPrimaryBg,
    },
    primaryCtaText: {
      fontSize: theme.size.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.action.actionPrimaryFg,
    },
    // Secondary action (Reopen; Add once evidence exists): outline button so a
    // single filled-blue primary leads at a time (F5 synthesis).
    secondaryCta: {
      ...ctaBase,
      backgroundColor: theme.action.actionSecondaryBg,
    },
    secondaryCtaText: {
      fontSize: theme.size.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.action.actionSecondaryFg,
    },
  };
});
