# Recorded green E2E run — `a550bcd`

The artifact acceptance criterion 5 of #502 requires, and the one **#383 cannot
close without**. It records a real simulator run of the required gate, not a
type-check and not a cached turbo replay.

Replaces `full-ride-7e6149e.md`, which recorded a 5-flow gate and went stale
when `step-timing-editor.yaml` joined it (#619) and three flows went red on
`main` (#636).

Regenerate with `bun run test:e2e:required` from `apps/native-rd/`; the raw
JUnit lands at `e2e/reports/junit.xml` (gitignored — this file is the tracked
summary of it).

## Result

`bun run test:e2e:required` → **6/6 flows passed in 3m 43s**, exit 0.

Per-flow times are the JUnit `testcase time` values, not the rounded CLI summary.

| Flow                              | Tag        | Time    | Status |
| --------------------------------- | ---------- | ------- | ------ |
| `settings-theme-persists-restart` | `required` | 20.815s | ✅     |
| `badge-view`                      | `required` | 10.943s | ✅     |
| `bake-recovery`                   | `required` | 38.526s | ✅     |
| `full-ride`                       | `required` | 97.503s | ✅     |
| `step-timing-editor`              | `required` | 42.900s | ✅     |
| `settings-theme-switch`           | `required` | 11.875s | ✅     |

`evidence-viewer.yaml` (`tags: [optional]`, needs `EXPO_PUBLIC_E2E_MODE=true`)
was run separately and also passes, so **all seven flows on disk are green**.

## Environment

|                        |                                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commit                 | `a550bcd`                                                                                                                                                                          |
| Maestro                | 2.8.0 (`/opt/homebrew/bin/maestro`)                                                                                                                                                |
| Simulator              | iPhone 17 · iOS 26.5 · `75D0CBC4-A428-407D-BF2E-E5EE452737C7`                                                                                                                      |
| App                    | `dev.rollercoaster.app` (iOS keeps the base bundle id; `app.config.js` only suffixes Android)                                                                                      |
| Metro                  | this worktree, port 8081, launched via `bun run ios:e2e`                                                                                                                           |
| Locale                 | `en`, pinned by `scripts/run-e2e.sh`                                                                                                                                               |
| `EXPO_PUBLIC_E2E_MODE` | `true` for the whole run (`bun run ios:e2e` sets it on the Metro that built the bundle). Only `evidence-viewer.yaml` requires it, but the required six ran against the same bundle |
| Timestamp              | 2026-09-01T09:51:39                                                                                                                                                                |
| JUnit                  | `e2e/reports/junit.xml` (`tests="6" failures="0" time="222.581"`)                                                                                                                  |

### Simulator UserDefaults the runner writes

`scripts/run-e2e.sh` seeds all four, so a fresh machine needs no manual setup.
Listed here only so the state is not mistaken for app behaviour:
`EXDevMenuIsOnboardingFinished=YES`, `EXDevMenuShowsAtLaunch=NO`,
`EXDevMenuShowFloatingActionButton=NO`, `AppleLanguages=(en)`.

## Hard prerequisite: exactly one Metro, serving this worktree

After a `clearState` reinstall the dev client auto-discovers **any** packager on
the default port and ignores the `?url=` deep link. A second Metro serving a
different checkout therefore produces a bundle without the flows' testIDs while
every step still reports COMPLETED. `stopApp` before `openLink` fixes the
warm-app case but not a competing packager. Treat "only one Metro, and it serves
the tree under test" as part of the environment, not as advice.

This run needed that enforced: a Metro from a sibling worktree held port 8081
and had to be stopped before `bun run ios:e2e` could serve this tree.

## What the ride proved on device

Both risks the #502 plan could not close statically stay closed. Restated in
full here rather than cross-referenced, so this file survives on its own:

- **Risk 1 — the determinism lever reaches `EditGoalStepList`.** Ride step 12's
  `edit-goal-step-hierarchy-actions-.*` assertion passes, so selecting the
  Autism-Friendly theme in the prologue does render the discrete ↑/↓/nest
  controls. The whole reorder/reparent leg depends on it.
- **Risk 2 — the nest-under picker's rows reach the a11y tree.** Both target
  rows render inside an RN `Modal` and appear in `maestro hierarchy` with their
  `accessibilityText` intact. No fallback to `edit-goal-break-into-*` was needed.

Risk 3 (`runFlow` resolving out of `flows/`) was closed by #502's first partial
run and has not regressed.

New since `7e6149e`: `step-timing-editor` adds the timing editor's day grid and
dependency picker to what one run covers.

## What #636 fixed to get here

Three flows were red on `main`. Two were flow-authoring gaps of the same shape —
a control that iOS reports a frame for while something else owns those pixels —
and one was a logging-severity bug:

1. **`bake-recovery` — LogBox ate the `finish-celebrate-cta` tap.** The
   deliberate no-evidence gate rejection in `useCreateBadge` threw a plain
   `Error`, so the outer catch logged it with `logger.error` → `console.error`,
   which LogBox patches. LogBox is a native overlay in its own window: invisible
   to `maestro hierarchy`, but it swallows the next tap.
   `App.tsx`'s `LogBox.ignoreAllLogs(true)` guard (added in #502, byte-identical
   since) did not hold. Fixed at the source: that one expected,
   user-recoverable rejection now has its own `BadgeGateError` and logs at
   `info`. Every other bake failure keeps `logger.error` + Sentry.
2. **`step-timing-editor` — the depends-on toggle was below the fold.** The flow
   centred the _collapsed_ timing row before tapping it open, but the expanded
   editor renders `StepDayGrid`'s month calendar between its root and the
   `DependencyPicker`. The `-editor` assertion one line above passed because the
   root mounts where the centred row was. Added a `scrollUntilVisible`.
   No production change — the toggle renders unconditionally.
3. **`full-ride` — the promote-back was a silent no-op.** Step 18's un-nest tap
   never reached the button. Measured from `maestro hierarchy` at the failure
   point: with Bravo nested, `edit-goal-substep-un-nest-*` sat at y 788-824 while
   the `edit-goal-content` scroll viewport ended at y 808, so most of the row was
   clipped. iOS reports a frame for it anyway, Maestro aimed at its centre
   (~y 806), nothing received the tap, and the step reported COMPLETED. Bravo
   stayed Charlie's child, and once Alpha completed the resolver drilled into
   Charlie's only child — Focus showed "Bravo step", failing an assertion twenty
   commands downstream of the command that actually broke. Added a
   `scrollUntilVisible` plus an `assertNotVisible` on the un-nest control right
   after the tap, so a future no-op fails on the promote itself.

   Two things this was **not**. It was not the pinned `edit-goal-done-button`
   footer (y 710-758) absorbing the tap: that would have closed edit mode and
   failed step 18's very next command instead of step 23. And it is not a
   production reachability defect — the list scrolls, the control is reachable
   once scrolled (the fixed flow reaches and taps it), and a human scrolls before
   tapping. Reorder, reparent and resolver ordinal math were all correct:
   replaying only the promote against the failed run's own state yielded
   `[Alpha, Charlie, Bravo]`. Hence no production change.

## Gate on #383

#383 (Full Ride visual/theme audit) must not close without a green run recorded
this way. Its blocking checklist item cites this file — update the reference
from `full-ride-7e6149e.md`.
