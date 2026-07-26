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

/**
 * Fully-namespaced i18n key for the Timeline's own state word — the prototype
 * vocabulary "Done / Set aside / Working / Up next" (#453). Same
 * template-literal shape as {@link StepStateBadgeKey}, different namespace.
 */
export type StepStateWordKey =
  `timelineJourney:step.stateWord.${StepStateMapKey}`;

interface StepStateBase {
  /**
   * i18n key (with namespace) for the state-word badge label, in the older
   * `common:stepCard.status.*` vocabulary ("Completed / In Progress / Pending /
   * Paused"). Read by `StepCard` and the Focus surfaces. Timeline surfaces read
   * {@link StepStateBase.stateWordI18nKey} instead — see the note there.
   */
  badgeI18nKey: StepStateBadgeKey;
  /**
   * i18n key (with namespace) for the Timeline's state word (#453). Deliberately
   * a second field rather than a repointed `badgeI18nKey`: the Timeline speaks
   * the prototype's vocabulary while `StepCard` / `FocusCurrentTaskCard` /
   * `FocusParkedState` keep theirs (the last of which is a recorded decision,
   * #450 D4). One map, two labelled uses — so the two vocabularies cannot drift
   * apart in separate per-component resolvers.
   */
  stateWordI18nKey: StepStateWordKey;
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
    stateWordI18nKey: "timelineJourney:step.stateWord.pending",
  },
  "in-progress": {
    source: "journey",
    nodeBgKey: "journeyStepActiveBg",
    nodeFgKey: "journeyStepActiveFg",
    badgeI18nKey: "common:stepCard.status.in-progress",
    stateWordI18nKey: "timelineJourney:step.stateWord.in-progress",
  },
  completed: {
    source: "journey",
    nodeBgKey: "journeyStepCompleteBg",
    nodeFgKey: "journeyStepCompleteFg",
    badgeI18nKey: "common:stepCard.status.completed",
    stateWordI18nKey: "timelineJourney:step.stateWord.completed",
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
    stateWordI18nKey: "timelineJourney:step.stateWord.paused",
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

/**
 * Goal-node (finish-line star) background — a separate axis from step states.
 * Neutral until every step is complete; celebration yellow once they all are
 * (`chrome.celebrationBg/Fg`, the audited pair CelebrationHeroHeader uses).
 * If #420 lands a dedicated token for the non-celebrating goal node, this is
 * the one place to swap it in.
 */
export function goalNodeBg(theme: ComposedTheme, celebrate: boolean): string {
  return celebrate ? theme.chrome.celebrationBg : theme.colors.background;
}

/** Goal-node foreground (star glyph) color — see `goalNodeBg`. */
export function goalNodeFg(theme: ComposedTheme, celebrate: boolean): string {
  return celebrate ? theme.chrome.celebrationFg : theme.colors.text;
}
