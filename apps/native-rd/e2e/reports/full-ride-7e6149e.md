# Recorded green E2E run — `7e6149e`

The artifact acceptance criterion 5 of #502 requires, and the one **#383 cannot
close without**. It records a real simulator run of the required gate, not a
type-check and not a cached turbo replay.

Regenerate with `bun run test:e2e:required` from `apps/native-rd/`; the raw
JUnit lands at `e2e/reports/junit.xml` (gitignored — this file is the tracked
summary of it).

## Result

`bun run test:e2e:required` → **5/5 flows passed in 3m 2s**, exit 0.

| Flow                              | Tag        | Time   | Status |
| --------------------------------- | ---------- | ------ | ------ |
| `settings-theme-persists-restart` | `required` | 21.44s | ✅     |
| `badge-view`                      | `required` | 12.83s | ✅     |
| `bake-recovery`                   | `required` | 39.22s | ✅     |
| `full-ride`                       | `required` | 94.51s | ✅     |
| `settings-theme-switch`           | `required` | 14.00s | ✅     |

`evidence-viewer.yaml` (`tags: [optional]`, needs `EXPO_PUBLIC_E2E_MODE=true`)
was run separately and also passes, so **all six flows on disk are green**.

## Environment

|           |                                                                                               |
| --------- | --------------------------------------------------------------------------------------------- |
| Commit    | `7e6149e`                                                                                     |
| Maestro   | 2.8.0 (`/opt/homebrew/bin/maestro`)                                                           |
| Simulator | iPhone 17 · iOS 26.5 · `75D0CBC4-A428-407D-BF2E-E5EE452737C7`                                 |
| App       | `dev.rollercoaster.app` (iOS keeps the base bundle id; `app.config.js` only suffixes Android) |
| Metro     | this worktree, port 8081, launched via `bun run ios:e2e`                                      |
| Locale    | `en`, pinned by `scripts/run-e2e.sh`                                                          |
| Timestamp | 2026-08-09T21:19:01                                                                           |
| JUnit     | `e2e/reports/junit.xml` (`tests="5" failures="0" time="182.039"`)                             |

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

## What the ride proved on device

Both risks the plan could not close statically are now closed:

- **Risk 1 — the determinism lever reaches `EditGoalStepList`.** Ride step 12's
  `edit-goal-step-hierarchy-actions-.*` assertion passes, so selecting the
  Autism-Friendly theme in the prologue does render the discrete ↑/↓/nest
  controls. The whole reorder/reparent leg depends on it.
- **Risk 2 — the nest-under picker's rows reach the a11y tree.** Both target
  rows render inside an RN `Modal` and appear in `maestro hierarchy` with their
  `accessibilityText` intact. No fallback to `edit-goal-break-into-*` was needed.

Risk 3 (`runFlow` resolving out of `flows/`) was already closed by the first
partial run.

## Four production defects the run surfaced

Each fixed where it lives, not worked around in yaml:

1. **`retryBake()` never retried.** It cleared the re-entry guard and set status
   to `"idle"`, but nothing it touched was in the bake effect's dependency
   array, so the effect never re-fired — and `mapBakeStatus` folds `"idle"` into
   the busy phase, leaving an unbounded "Baking your badge…" spinner with no
   alert, no retry and no exit. Fixed with a `retryNonce` dep
   (`src/hooks/useCreateBadge.ts`). The unit test that claimed to cover recovery
   passed only because its mock minted a fresh goal object every render; Evolu
   returns a stable row between reactive ticks, so production took the broken
   path.
2. **The New Goal wizard was a keyboard dead end.** Its name and first-step
   inputs set no `returnKeyType`, and their Next CTA sits in a footer the soft
   keyboard covers with nothing to dismiss it. Same for `EditGoalView`'s goal
   title. All three now carry `returnKeyType="done"`.
3. **LogBox intercepts taps.** It is a native overlay in its own window:
   invisible to `maestro hierarchy`, but it swallows every tap, so a flow fails
   "element not found" while the element is on screen behind it. Suppressed
   under the existing `EXPO_PUBLIC_E2E_MODE` gate — the same treatment
   `run-e2e.sh` already gives the dev menu.
4. **The Edit Goal title debounce alerts on a transient empty value.** Clearing
   the field to retype it pops "Title cannot be empty" mid-edit and steals
   focus. Not fixed here (it is a product-behaviour call); filed as a follow-up
   and worked around in-flow by appending rather than erasing.

## Gate on #383

#383 (Full Ride visual/theme audit) must not close without a green run recorded
this way. Its blocking checklist item cites this file.
