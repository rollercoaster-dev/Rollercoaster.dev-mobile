import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import {
  stepStateNodeBg,
  stepStateNodeFg,
} from "../TimelineNode/stepStateColorMap";

// Focus Mode parked / all-paused screen state — tuned to the canonical
// `App Shell.dc.html` markup: a quiet "Nothing in progress." heading, a
// reassurance line, and a list of bordered resumable rows. Each row's state pill
// draws its color + label through the #406 `stepStateColorMap` (one language with
// TimelineNode / FocusCurrentTaskCard), styled to match the sibling card's
// `StateWordPill` — minus its uppercase transform, so the shared Title-Case
// "Paused" label reads as-is (the intent's requirement). No hardcoded hex.
export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.space[4],
  },
  // Prototype heading is 27px Anybody-900; `2xl` (24) is the nearest token —
  // opposite of FocusCurrentTaskCard's 29/34px headings that resolved to `3xl`
  // (D5). Same nearest-token method, different nearest answer.
  heading: {
    fontSize: theme.size["2xl"],
    fontWeight: theme.fontWeight.black,
    fontFamily: theme.fontFamily.headline,
    color: theme.colors.text,
    lineHeight: theme.size["2xl"] * 1.08,
  },
  // Reassurance line — prototype 13.5px (`sm`, nearest), quiet secondary ink.
  // Never frames the paused steps as missing/needed: "all still here, none
  // hidden, nothing counted."
  body: {
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.size.sm * 1.5,
  },
  rows: {
    gap: theme.space[2],
  },
  // Resumable row — bordered, hard-shadowed; the whole row is one tap target
  // (prototype 3px border / 6px corner / 2×2 shadow → thick / lg / cardElevationSmall).
  row: {
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
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  // "Paused" state pill — bg/ink resolve through the #406 map (one color language
  // with the sibling card); border stays neutral so the light paused fill reads
  // clearly. Matches StateWordPill's shape; no uppercase transform (Title-Case).
  pill: {
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[1],
    borderRadius: theme.radius.pill,
    borderWidth: theme.borderWidth.thin,
    backgroundColor: stepStateNodeBg(theme, "paused"),
    borderColor: theme.colors.border,
  },
  pillText: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    letterSpacing: theme.letterSpacing.wide,
    color: stepStateNodeFg(theme, "paused"),
  },
  // Row title — bold, fills the space between pill and resume. Wraps rather than
  // clips so no title is truncated across the ND themes' larger fonts.
  rowTitle: {
    flex: 1,
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  // Blue "resume ›" affordance — prototype 12px (`xs`), bold, accent.
  resume: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accentPrimary,
  },
}));
