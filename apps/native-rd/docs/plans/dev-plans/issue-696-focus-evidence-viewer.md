# Development Plan: Issue #696

## Issue Summary

**Title**: [UI-13] Let users inspect captured evidence where it appears
**Type**: enhancement
**Complexity**: SMALL
**Base**: `origin/main` 9f40061

Focus Mode's captured-evidence rail (`CapturedEvidenceRail`) drew bordered, shadowed chips that did
nothing on tap, while Timeline evidence cards and badge proof entries open the shared
`EvidenceViewer`. Someone who had just saved a note had to leave Focus to reread it (seen again in the
2026-11-12 newcomer tutorial walkthrough).

## Scope

- Each captured chip in Focus (in-progress and completed cards) opens `EvidenceViewer` on that piece.
- Chip is a `button` with the existing caption/type label plus a translated hint, a 44pt target and
  the shared pressed state.
- Back from the viewer lands on the same Focus card and step.

Not in scope: Timeline/badge evidence cards themselves (their hardcoded English a11y hint is a separate
i18n gap), StepCard's own read-only rail.

## Implementation steps

1. [x] `FocusCapturedEvidenceItem.id` becomes required (every caller passes the evidence row id; the
       viewer needs it). `CapturedEvidenceRail` takes a required `onOpenEvidence(id)` and renders each
       chip as a `Pressable` (`role=button`, label unchanged, hint `focusMode:evidenceRail.openHint`).
2. [x] Styles: `minHeight: 44` on the chip, `evidenceChipPressed` mirroring `Card`'s pressed state.
3. [x] Card props: `onOpenEvidence` required on the in-progress and completed variants (the
       discriminated-union "every rendered handler is required" contract, #497).
4. [x] `FocusModeScreen`: `handleOpenEvidence` navigates to `EvidenceViewer` with `goalId` and
       `initialEvidenceId` — the same route and params Timeline uses.
5. [x] Copy: en + de `openHint`, pseudo regenerated.
6. [x] Stories and the parity test pass the new handler.
7. [x] Tests: card (tap opens that id in both states; button role, label, hint), screen (navigates to
       the viewer; after returning, a Timeline-pinned completed step is still the card shown).

## Intent Verification

- [x] Captured evidence can be opened from Focus (in-progress and completed cards).
- [x] Returning keeps the current step: the viewer is pushed over Focus, and opening it runs no step
      mutation, so neither the derived step nor the Timeline pin changes.
- [x] Interaction matches Timeline/badge proof: same `EvidenceViewer` route, `button` role, label and
      hint.
- [x] 44pt target; theme tokens only, so all seven themes keep their existing chip colors.

## Validation

- `bun run test --testPathPatterns "FocusCurrentTaskCard|FocusModeScreen|timingBandReadOutParity|i18n" --runInBand`
- `bun run type-check`, `bun run lint`, `bun run test` from the repo root.
- Not checked on a device or simulator (no display on the build machine).

## Decisions

- Made `id` required rather than keeping an id-less, non-interactive chip path: every real caller has
  the row id, and a chip that looks the same but cannot open would be the inconsistency the issue is
  about. The id-less "photo-0" token test went with it.
- Hint copy: "Opens this evidence to view it" — states what happens, no urgency.

## Discovery Log

- `EvidenceViewer` shows all evidence for the goal, starting at `initialEvidenceId`, so the user can
  also swipe to other steps' evidence from there — same as from Timeline.
- `bun run lint` on `origin/main` already fails on one error in
  `EditGoalView/EditGoalRowDescription.tsx` (`local/no-native-text-import`, from #815). Not touched
  here.

## Follow-ups

- Pre-existing lint error in `EditGoalRowDescription.tsx` (from #815) needs its own fix.
- `TimelineEvidenceCard` and `EvidenceThumbnail` build their a11y label and hint from hardcoded English;
  they should go through `t()`.
