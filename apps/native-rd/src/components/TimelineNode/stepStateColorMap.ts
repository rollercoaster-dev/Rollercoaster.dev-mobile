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

/**
 * Fully-namespaced i18n key for a state-word badge label. Typed as a template
 * literal so the strictly-typed `t()` (i18next typed keys) accepts it directly,
 * matching the `t(\`common:modeIndicator.${mode}\`)` pattern used elsewhere.
 */
export type StepStateBadgeKey = `common:stepCard.status.${StepStateMapKey}`;

interface StepStateBase {
  /** i18n key (with namespace) for the state-word badge label. */
  badgeI18nKey: StepStateBadgeKey;
  /** Unicode glyph for the node interior, overriding the step number. */
  nodeGlyph?: string;
}

export type StepStateEntry = StepStateBase &
  (
    | {
        source: "journey";
        /** `theme.journey` key for the node background. */
        nodeBgKey: keyof Journey;
        /** `theme.journey` key for the node foreground text. */
        nodeFgKey: keyof Journey;
      }
    | {
        source: "colors";
        /** `theme.colors` key used for the background. */
        nodeBgColorsFallback: keyof Colors;
        /** `theme.colors` key used for the foreground. */
        nodeFgColorsFallback: keyof Colors;
      }
  );

export const stepStateColorMap: Record<StepStateMapKey, StepStateEntry> = {
  pending: {
    source: "journey",
    nodeBgKey: "journeyStepBg",
    nodeFgKey: "journeyStepFg",
    badgeI18nKey: "common:stepCard.status.pending",
  },
  "in-progress": {
    source: "journey",
    nodeBgKey: "journeyStepActiveBg",
    nodeFgKey: "journeyStepActiveFg",
    badgeI18nKey: "common:stepCard.status.in-progress",
  },
  completed: {
    source: "journey",
    nodeBgKey: "journeyStepCompleteBg",
    nodeFgKey: "journeyStepCompleteFg",
    badgeI18nKey: "common:stepCard.status.completed",
    nodeGlyph: "✓",
  },
  paused: {
    // TODO(#406-follow-up): paused has no first-class journey-* token. The App
    // Shell prototype paints paused nodes #ede9fe (light) / #352760 (dark) —
    // exactly `accentPurpleLight` in both modes — so we derive from that themed
    // color for now. A design-tokens issue to add `journey-step-paused-bg/fg`
    // (the #375/#376-class fix) is owed; until it lands this is the one
    // non-journey state in the map.
    source: "colors",
    nodeBgColorsFallback: "accentPurpleLight",
    nodeFgColorsFallback: "text",
    badgeI18nKey: "common:stepCard.status.paused",
    nodeGlyph: "⏸",
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
  return entry.source === "journey"
    ? theme.journey[entry.nodeBgKey]
    : theme.colors[entry.nodeBgColorsFallback];
}

/** Resolve a step state's node foreground (text) color for `theme`. */
export function stepStateNodeFg(
  theme: ComposedTheme,
  state: StepStateMapKey,
): string {
  const entry = stepStateColorMap[state];
  return entry.source === "journey"
    ? theme.journey[entry.nodeFgKey]
    : theme.colors[entry.nodeFgColorsFallback];
}
