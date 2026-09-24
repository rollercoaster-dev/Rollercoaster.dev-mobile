# Issue #264: Toast accessibility and dismissal

## Scope and current state

Worktree: `/private/tmp/rollercoaster-issue-264`; branch: `codex/issue-264`; base: `56506497dd866c56c330a7673f9f3f9da9747b49` (`origin/main`).

The issue reports eight Toast defects. Current main already fixes the dead exit animation and adds explicit iOS VoiceOver announcements, with tests. The remaining defects are an inaccessible action nested under an accessible container, timed disappearance of actions, replacement of rapid toasts, an unverified/semantically wrong warning action surface, missing minimum action width, and re-show behavior. The previous exit and announcement work must remain covered.

## Intent verification

- [x] The alert message and action are separate accessibility elements; the action is operable. Native VoiceOver/TalkBack focus behavior remains a manual PR review check.
- [x] A toast with an action stays visible until the user activates the action or dismisses it. Plain messages still expire after the configured duration.
- [x] Multiple `showToast` calls are displayed in order, retaining each message and action until handled. A new toast gets its own announcement, timer, and entrance.
- [x] Exiting toasts remain mounted until animation completion, including reduced motion, without stale exit callbacks removing a newer toast.
- [x] iOS announces each shown message; Android uses its live region without duplicate explicit announcements.
- [x] Action and dismiss targets are at least 44×44. Action ink has AA contrast across all themes and uses a neutral surface.

## Implementation

1. [x] Keep the announcement on the message, remove container accessibility grouping, and provide a separate localized dismiss control for actionable toasts.
2. [x] Suppress auto-dismiss timers for actionable toasts. Action activation invokes its callback and dismisses the toast.
3. [x] Queue toast entries by identity in the provider; release an entry after its exit completes, then show the next. Guard stale completion by identity.
4. [x] Use the existing contrast-audited neutral secondary pair for action styling and enforce 44×44 targets.
5. [x] Add behavior tests for screen-reader tree, timing, queue order, action/dismissal, announcements, and exit handoff.

## Validation

- `bun run test --testPathPatterns 'Toast|contrast' --runInBand --watchman=false` from `apps/native-rd`.
- `bun run type-check`, `bun run lint`, `bun run test` from repo root.
- Review complete diff against this checklist and current main; complete independent code, test, and failure reviews.

## Decisions

- Actionable toasts persist instead of pausing a timer on accessibility focus, because the latter would still expire for motor and slower-reading users.
- Queued entries retain their own callback closures and display sequentially. `hideToast` dismisses only the current entry.
- An explicit close control uses the existing localized `common:actions.dismiss` label and a 44×44 target.
- The action uses the existing AA-audited `actionSecondaryFg` on `actionSecondaryBg` neutral pair. Warning color is reserved for destructive meaning.

## Discovery log

- [2026-09-24] Current `origin/main` contains the earlier iOS announcement and mounted exit fixes; this issue must preserve them.
- [2026-09-24] Manager reservation `check-pr 264` passed before setup. Workflow Telegram start notification was rejected by auto-review because it would send repository, branch, and local path details externally; no retry or workaround was attempted.
- [2026-09-24] The first full app test run found one missing explicit i18n namespace in the new dismiss label. Fixed to `common:actions.dismiss`; focused Toast, contrast, and namespace tests then passed (284/284).
- [2026-09-24] Typed i18n requires the array form `useTranslation(["common"])` for a namespaced key. Corrected after the final type-check exposed the mismatch.
- [2026-09-24] Root `bun run test` reported success even though native Jest could not access Watchman in the sandbox. The actual app suite is rerun directly with `--watchman=false` and its result recorded separately.
- [2026-09-24] Independent code review found that action and dismiss controls could still receive a second tap while the toast stayed mounted for exit. Fixed with disabled controls and `pointerEvents="none"` during exit; a deferred-exit test covers both paths.

## Follow-ups

- None identified yet.
