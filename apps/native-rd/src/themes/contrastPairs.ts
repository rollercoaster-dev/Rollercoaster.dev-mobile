/**
 * Canonical foreground/background contrast pairs — the React Native port of the
 * "Contrast audit" in `prototypes/screen-redesign/Theme Eval.dc.html`.
 *
 * This is the single source of truth shared by:
 *   - `src/themes/__tests__/contrast.test.ts` (the CI gate)
 *   - `src/stories/design-system/ContrastAudit.stories.tsx` (the visual audit)
 *
 * Each pair is an accessor over a `ComposedTheme` so the list is decoupled from
 * the theme's nested JSON shape — add/rename a token in one place and both the
 * test and the story follow.
 *
 * NOTE ON COVERAGE — these audit pairs from Theme Eval are NOT yet expressible
 * against the RN `ComposedTheme` and are intentionally absent:
 *   - `journey goal`: the package emits a `journey*` token group, but it is not
 *     wired into `compose.ts`, so it cannot be read off a `ComposedTheme` here.
 *
 * The `success` / `warning` / `info` feedback foregrounds were surfaced in the
 * issue-375 root-cause fix: `build-unistyles.js` now themes the on-colors
 * per variant and the adapter flows them onto `colors.*Foreground`.
 */

import type { ComposedTheme } from "./compose";

export interface ContrastPair {
  /** Stable identifier, used as the KNOWN_FAILURES key prefix. */
  key: string;
  /** Human label shown in the audit story / test name. */
  label: string;
  /** Resolve the fg/bg hex pair for a given composed theme. */
  getColors: (t: ComposedTheme) => { fg: string; bg: string };
}

export const contrastPairs: ContrastPair[] = [
  {
    key: "body",
    label: "body",
    getColors: (t) => ({ fg: t.colors.text, bg: t.colors.background }),
  },
  {
    key: "card",
    label: "card",
    getColors: (t) => ({
      fg: t.surfaceBorder.surfaceCardFg,
      bg: t.surfaceBorder.surfaceCardBg,
    }),
  },
  {
    key: "muted",
    label: "muted",
    getColors: (t) => ({ fg: t.colors.textMuted, bg: t.colors.background }),
  },
  {
    key: "primary",
    label: "primary btn",
    getColors: (t) => ({
      fg: t.action.actionPrimaryFg,
      bg: t.action.actionPrimaryBg,
    }),
  },
  {
    key: "secondary",
    label: "secondary btn",
    getColors: (t) => ({
      fg: t.action.actionSecondaryFg,
      bg: t.action.actionSecondaryBg,
    }),
  },
  {
    key: "destructive",
    label: "destructive",
    getColors: (t) => ({
      fg: t.action.actionDestructiveFg,
      bg: t.action.actionDestructiveBg,
    }),
  },
  {
    key: "topbar",
    label: "top bar",
    getColors: (t) => ({
      fg: t.chrome.chromeTopBarFg,
      bg: t.chrome.chromeTopBarBg,
    }),
  },
  {
    key: "tabActive",
    label: "tab active",
    getColors: (t) => ({
      fg: t.chrome.chromeTabBarActiveFg,
      bg: t.chrome.chromeTabBarBg,
    }),
  },
  {
    key: "tabIdle",
    label: "tab idle",
    getColors: (t) => ({
      fg: t.chrome.chromeTabBarFg,
      bg: t.chrome.chromeTabBarBg,
    }),
  },
  {
    key: "highlight",
    label: "highlight",
    getColors: (t) => ({
      fg: t.colors.highlightForeground,
      bg: t.colors.highlight,
    }),
  },
  {
    key: "success",
    label: "success",
    getColors: (t) => ({
      fg: t.colors.successForeground,
      bg: t.colors.success,
    }),
  },
  {
    key: "warning",
    label: "warning",
    getColors: (t) => ({
      fg: t.colors.warningForeground,
      bg: t.colors.warning,
    }),
  },
  {
    key: "info",
    label: "info",
    getColors: (t) => ({
      fg: t.colors.infoForeground,
      bg: t.colors.info,
    }),
  },
];

/** WCAG AA normal-text threshold — the gate target for every pair × theme. */
export const AA_NORMAL = 4.5;
