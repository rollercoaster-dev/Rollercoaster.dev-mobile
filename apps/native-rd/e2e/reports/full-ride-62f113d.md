# Recorded green E2E run — `62f113d`

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

`bun run test:e2e:required` → **6/6 flows passed in 4m 37s**, exit 0.

| Flow                              | Tag        | Time   | Status |
| --------------------------------- | ---------- | ------ | ------ |
| `settings-theme-persists-restart` | `required` | 27s    | ✅     |
| `badge-view`                      | `required` | 14s    | ✅     |
| `bake-recovery`                   | `required` | 49s    | ✅     |
| `full-ride`                       | `required` | 1m 59s | ✅     |
| `step-timing-editor`              | `required` | 53s    | ✅     |
| `settings-theme-switch`           | `required` | 15s    | ✅     |

`evidence-viewer.yaml` (`tags: [optional]`, needs `EXPO_PUBLIC_E2E_MODE=true`)
was run separately and also passes, so **all seven flows on disk are green**.

## Environment

|           |                                                                                               |
| --------- | --------------------------------------------------------------------------------------------- |
| Commit    | `62f113d`                                                                                     |
| Maestro   | 2.8.0 (`/opt/homebrew/bin/maestro`)                                                           |
| Simulator | iPhone 17 · iOS 26.5 · `75D0CBC4-A428-407D-BF2E-E5EE452737C7`                                 |
| App       | `dev.rollercoaster.app` (iOS keeps the base bundle id; `app.config.js` only suffixes Android) |
| Metro     | this worktree, port 8081, launched via `bun run ios:e2e`                                      |
| Locale    | `en`, pinned by `scripts/run-e2e.sh`                                                          |
| Timestamp | 2026-09-01T09:24:30                                                                           |
| JUnit     | `e2e/reports/junit.xml` (`tests="6" failures="0" time="276.839"`)                             |

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

Unchanged from the `7e6149e` run — both risks the #502 plan could not close
statically stay closed (the Autism-Friendly determinism lever reaches
`EditGoalStepList`'s discrete ↑/↓/nest controls, and the nest-under picker's
`Modal` rows reach the a11y tree). `step-timing-editor` adds the timing editor's
day grid and dependency picker to what one run covers.

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
   never reached the button: with Bravo nested, its un-nest control sits at the
   bottom of the list underneath the pinned Done footer, and iOS reports a frame
   there anyway, so Maestro tapped the footer and reported COMPLETED. Bravo
   stayed Charlie's child, and once Alpha completed the resolver drilled into
   Charlie's only child — Focus showed "Bravo step", failing an assertion twenty
   commands downstream of the command that actually broke. Added a
   `scrollUntilVisible` plus an `assertNotVisible` on the un-nest control right
   after the tap, so a future no-op fails on the promote itself.
   No production change: reorder, reparent and resolver ordinal math were all
   correct — verified by dumping the hierarchy at the failure point and
   replaying the promote with the scroll, which yields `[Alpha, Charlie, Bravo]`.

## Gate on #383

#383 (Full Ride visual/theme audit) must not close without a green run recorded
this way. Its blocking checklist item cites this file — update the reference
from `full-ride-7e6149e.md`.
