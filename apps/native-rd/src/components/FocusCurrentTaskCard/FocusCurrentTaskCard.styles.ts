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
  // Shared CTA shape — neo-brutalist: bold border, hard shadow, prototype's 54pt
  // height (well above the 44pt a11y floor). Primary actions in the prototype carry
  // a 4×4 hard shadow (`modalElevation`) and a 4px corner (`radius.md`). (R4)
  const ctaBase = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: theme.space[2],
    minHeight: 54,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    ...shadowStyle(theme, "modalElevation"),
  };

  return {
    // Frameless: no fill, border, radius, padding, or card-level shadow — only the
    // inner box/chips/CTA are shadowed, and screen padding is the host's. Fills its
    // host so `footRow` can pin to the bottom edge, so the host must bound its height.
    card: {
      flex: 1,
    },
    body: {
      flex: 1,
    },
    bodyContent: {
      gap: theme.space[4],
      paddingBottom: theme.space[2],
    },
    // Short states center against the footer; `flexGrow` still lets tall content scroll.
    bodyContentCentered: {
      flexGrow: 1,
      justifyContent: "center" as const,
      gap: theme.space[4],
      paddingBottom: theme.space[2],
    },
    // Task titles can wrap, so use the semantic task role's reading font and
    // relaxed line height instead of the prototype's single-line spacing.
    title: {
      ...theme.textStyles.taskTitle,
      color: theme.colors.text,
    },
    heading: {
      ...theme.textStyles.taskTitle,
      color: theme.colors.text,
    },
    // E (state) pill — above the title, left-aligned, readable uppercase. bg/ink
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
      ...theme.textStyles.label,
      textTransform: "uppercase" as const,
      color: stepStateNodeFg(theme, status),
    }),
    // C·B truth-lines: glyph + plain text + mono meta suffix (prototype F1–F3).
    // The date line itself is plain (mono lives only on the trailing meta) —
    // pure prototype fidelity; no ADR governs date typography.
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
    metadataText: {
      ...theme.textStyles.metadata,
      color: theme.colors.text,
    },
    metadataMeta: {
      ...theme.textStyles.metadata,
      color: theme.colors.textSecondary,
      fontFamily: theme.fontFamily.mono,
    },
    // The "EVIDENCE · REQUIRED" label captions the planned box, so they sit as one
    // tight group (8px apart, prototype) inside the card's wider block rhythm. (R1)
    plannedGroup: {
      gap: theme.space[2],
    },
    // Always-present "EVIDENCE · REQUIRED" attribute — uppercase, muted
    // (L5). Never frames evidence as missing/needed.
    evidenceRequired: {
      ...theme.textStyles.label,
      color: theme.colors.textMuted,
      textTransform: "uppercase",
    },
    // Planned-evidence box — bordered, hard-shadowed; the whole box is the tap
    // target that opens the type picker (#409). icon + bold label + blue "change".
    // Prototype: 3×3 shadow (`cardElevation`) + 6px corner (`radius.lg`, nearest). (R5)
    plannedBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[2],
      minHeight: 44,
      backgroundColor: theme.colors.background,
      borderWidth: theme.borderWidth.thick,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[3],
      ...shadowStyle(theme, "cardElevation"),
    },
    // The planned types flow left, wrapping if a 3-type plan runs long; the
    // trailing "change" text is pushed to the right by this list's flex.
    plannedTypeList: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: theme.space[2],
    },
    // One icon + label pair per planned type inside the box.
    plannedType: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[1],
    },
    plannedIcon: {
      fontSize: 18,
    },
    // Planned type and change labels share the semantic label size.
    plannedLabel: {
      ...theme.textStyles.label,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
    },
    changeText: {
      ...theme.textStyles.label,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.accentPrimary,
    },
    // Captured rail — read-only green chips (`accentMint`, the prototype's
    // #d4f4e7), label leans green. Mirrors the StepCard rail contract (#360).
    evidenceRail: {
      gap: theme.space[1],
    },
    evidenceRailLabel: {
      ...theme.textStyles.label,
      color: theme.colors.success,
      textTransform: "uppercase",
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
      ...theme.textStyles.label,
      color: theme.colors.accentMintFg,
      maxWidth: 200,
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
      ...theme.textStyles.label,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    // Reassurance line — centered, under the Add button; shown only before any
    // evidence is captured (the no-evidence in-progress branch, L6).
    helperLine: {
      ...theme.textStyles.body,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    bodyText: {
      ...theme.textStyles.body,
      color: theme.colors.text,
    },
    // All-steps-done trophy callout box (L7). Prototype: 3×3 shadow (`cardElevation`)
    // + 6px corner (`radius.lg`, nearest) — same box treatment as the planned box. (R6)
    calloutBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.space[2],
      backgroundColor: theme.colors.accentPurpleLight,
      borderWidth: theme.borderWidth.medium,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      padding: theme.space[3],
      ...shadowStyle(theme, "cardElevation"),
    },
    calloutIcon: {
      fontSize: 18,
    },
    calloutText: {
      flex: 1,
      ...theme.textStyles.body,
      color: theme.colors.text,
    },
    // Pinned to the card's bottom edge: the CTA lands in the same spot every time.
    footRow: {
      gap: theme.space[2],
      paddingTop: theme.space[3],
    },
    // Primary action (Add / Mark complete / Pick back up / Design badge): filled
    // blue (#2563eb light) via the contrast-validated `action` group — flips
    // correctly across all 7 ND variants where a raw accent token would not.
    primaryCta: {
      ...ctaBase,
      backgroundColor: theme.action.actionPrimaryBg,
    },
    // Prototype CTA text is 17–18px; `lg` (18) is the nearest token. (R4)
    primaryCtaText: {
      ...theme.textStyles.title,
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
      ...theme.textStyles.title,
      fontWeight: theme.fontWeight.semibold,
      color: theme.action.actionSecondaryFg,
    },
  };
});
