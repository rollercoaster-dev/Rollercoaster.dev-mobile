/**
 * Step-state → theme-token map (#406).
 *
 * The single source of truth for which token backs each timeline step state.
 * `TimelineNode.styles.ts` and the `AllThemesMatrix` story both resolve their
 * colors through this map instead of hardwiring tokens, so the "node == pill"
 * state-color language has exactly one definition. B2/C1 will migrate the
 * StepCard pill onto this same map (see the #406 plan / project memory).
 *
 * Journey-canonical: pending / in-progress / completed read from the
 * `journey-*` group wired into `ComposedTheme` in this PR. `paused` is the one
 * exception — see the TODO on the `paused` entry below.
 */

import type { Colors } from "../../themes/colorModes";
import type { Journey } from "../../themes/adapter";
import type { ComposedTheme } from "../../themes/compose";

/** The four step states this map covers (UI-layer, superset of DB StepStatus). */
export type StepStateMapKey =
  | "pending"
  | "in-progress"
  | "paused"
  | "completed";

export interface StepStateEntry {
  /** `theme.journey` key for the node background, or null to use the fallback. */
  nodeBgKey: keyof Journey | null;
  /** `theme.journey` key for the node foreground text, or null for the fallback. */
  nodeFgKey: keyof Journey | null;
  /** `theme.colors` key used for the background when `nodeBgKey` is null. */
  nodeBgColorsFallback: keyof Colors | null;
  /** `theme.colors` key used for the foreground when `nodeFgKey` is null. */
  nodeFgColorsFallback: keyof Colors | null;
  /** i18n key (with namespace) for the state-word badge label. */
  badgeI18nKey: string;
  /** Unicode glyph for the node interior, overriding the step number. */
  nodeGlyph?: string;
}

export const stepStateColorMap: Record<StepStateMapKey, StepStateEntry> = {
  pending: {
    nodeBgKey: "journeyStepBg",
    nodeFgKey: "journeyStepFg",
    nodeBgColorsFallback: null,
    nodeFgColorsFallback: null,
    badgeI18nKey: "common:stepCard.status.pending",
  },
  "in-progress": {
    nodeBgKey: "journeyStepActiveBg",
    nodeFgKey: "journeyStepActiveFg",
    nodeBgColorsFallback: null,
    nodeFgColorsFallback: null,
    badgeI18nKey: "common:stepCard.status.in-progress",
  },
  completed: {
    nodeBgKey: "journeyStepCompleteBg",
    nodeFgKey: "journeyStepCompleteFg",
    nodeBgColorsFallback: null,
    nodeFgColorsFallback: null,
    badgeI18nKey: "common:stepCard.status.completed",
    nodeGlyph: "✓", // ✓
  },
  paused: {
    // TODO(#406-follow-up): paused has no first-class journey-* token. The App
    // Shell prototype paints paused nodes #ede9fe (light) / #352760 (dark) —
    // exactly `accentPurpleLight` in both modes — so we derive from that themed
    // color for now. A design-tokens issue to add `journey-step-paused-bg/fg`
    // (the #375/#376-class fix) is owed; until it lands this is the one
    // non-journey state in the map.
    nodeBgKey: null,
    nodeFgKey: null,
    nodeBgColorsFallback: "accentPurpleLight",
    nodeFgColorsFallback: "text",
    badgeI18nKey: "common:stepCard.status.paused",
    nodeGlyph: "⏸", // ⏸
  },
};

/**
 * Resolve a step state's node background to a concrete color for `theme`.
 * Mirrors the `shadowStyle(theme, key)` helper pattern so it is safe to call
 * inside `StyleSheet.create((theme) => ...)`, and also works against a static
 * `themes[name]` read (the AllThemesMatrix story).
 */
export function stepStateNodeBg(
  theme: ComposedTheme,
  state: StepStateMapKey,
): string {
  const entry = stepStateColorMap[state];
  return entry.nodeBgKey
    ? theme.journey[entry.nodeBgKey]
    : theme.colors[entry.nodeBgColorsFallback!];
}

/** Resolve a step state's node foreground (text) color for `theme`. */
export function stepStateNodeFg(
  theme: ComposedTheme,
  state: StepStateMapKey,
): string {
  const entry = stepStateColorMap[state];
  return entry.nodeFgKey
    ? theme.journey[entry.nodeFgKey]
    : theme.colors[entry.nodeFgColorsFallback!];
}
