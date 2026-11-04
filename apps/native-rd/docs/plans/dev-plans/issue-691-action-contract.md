# Issue #691 — shared action contract

> For agentic workers: use `superpowers:executing-plans` inline in one local execution lane. Do not dispatch parallel workers on this machine.

**Goal:** Give equivalent actions consistent hierarchy and feedback across Goals, Focus, capture, completion, and Badges.

**Architecture:** Extend the existing shared Button with token-based semantic variants and narrow surface/inline presentations, then migrate the bespoke action Pressables. Preserve navigation cards and screen-specific layout outside the Button contract.

**Tech stack:** React Native, react-native-unistyles v3, Jest/React Native Testing Library, Maestro, Bun.

**Spec:** This file's “Approved decision and design” section, grounded in issue #691 and Joe's Telegram decision `860537619`.

**Global constraints:** One local execution lane; seven runtime themes; English/German; no accepted ADR body edits; no merge.

**Review focus:** Long translated labels with icons, pressed/disabled/loading interaction, high-contrast Badges surface, Focus evidence gating, and overlap with #684's reader and #694's footer clearance.

- Issue: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/691
- Parent: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/683
- Reserved branch/worktree: `codex/issue-691`, `/Users/hailmary/.codex/worktrees/issue-691/Rollercoaster.dev-mobile`
- Research base: `a6061736f106095133547703a59348e3128037ca` (fresh main at 2026-09-27)

## Intent Verification

- [x] Equivalent primary, secondary, quiet, and destructive actions use one shared Button contract for typography, wrapping, border, elevation, pressed, disabled, and loading states.
- [x] Goals, Focus, capture, and completion each have one visually leading action; alternate actions remain secondary or quiet.
- [x] The German Badges action wraps at increased OS text size and can scroll fully above the floating tab bar. Other German screen combinations are named as unchecked in the native report.
- [x] Focus's formerly custom footer actions retain their IDs, accessible labels, callbacks, evidence gates, and one-primary hierarchy across in-progress, paused, completed, and all-complete states.
- [x] The empty Badges wall uses theme-token celebration colors through shared Button; the seven-theme contrast audit passes and native captures cover three named themes.
- [x] All seven runtime themes and English/German remain supported; the native verdict names the exact checked states rather than inferring a full native matrix.

## Approved decision and design

Joe approved the primary/secondary/ghost/destructive hierarchy in Telegram update `860537619` on 2026-09-24, including consistent pressed, disabled, and loading states and surface-specific theme-token colors. The issue explicitly says to coordinate with #429, #435, and #684 and not edit accepted ADR bodies. The autonomous PM instruction authorizes executing that approved issue without a routine design gate.

The shared `Button` owns action semantics and all interactive states. Its existing `variant` names remain the public hierarchy: primary is the one leading action, secondary is an alternative, ghost is quiet, and destructive is deletion. Default primary/secondary/destructive fills and foregrounds use the contrast-validated `theme.action` pairs already used by Focus and tested in `src/themes/contrastPairs.ts`; the default ghost uses theme text and no fill. `size="lg"` keeps a 54pt touch target for Focus and completion; other sizes retain their accessible minimum. The label uses the selected body font, may wrap, and shrinks alongside an optional decorative icon. Loading spinner color matches the variant foreground. Pressed feedback applies identically to every variant; disabled and loading cannot call `onPress`.

`surface="celebration"` is a narrow Button presentation for the dark Badges wall: primary uses `theme.chrome.celebrationBg/Fg`, with the same border, shape, touch target, press and disabled/loading contract. `inline` is a narrow ghost presentation for a calm body-level link such as Focus's “set this step aside”: it preserves a 44pt minimum hit area and leading alignment without looking like a second filled CTA. An optional `accessibilityLabel` lets Focus retain richer spoken copy while the visible label stays short. These are presentation parameters on Button, not feature-owned interaction implementations.

### Alternatives considered

1. Keep bespoke Focus and Badges Pressables and only standardize tokens: smallest diff, but preserves divergent pressed/loading/a11y behavior and fails the approved shared contract.
2. Replace all feature actions with one global default style: fewer props, but would make the dark Badges CTA low-contrast and the quiet Focus link visually loud.
3. **Selected:** shared semantics plus explicit celebration/inline presentations. It changes the existing Button once and migrates the two bespoke action families while preserving screen hierarchy.

## File map

| File                                                                          | Responsibility                                                                                                   |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/components/Button/Button.tsx`, `Button.styles.ts`                        | Shared variants, surface/inline presentation, semantic a11y labels, loading/pressed/disabled/long-label behavior |
| `src/components/Button/__tests__/Button.test.tsx`                             | Contract tests for styles, wrapping, theme tokens, interaction and a11y                                          |
| `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.tsx`, `.styles.ts`  | Use Button for primary, secondary, and quiet actions; remove duplicate CTA styles                                |
| `src/components/FocusCurrentTaskCard/__tests__/FocusCurrentTaskCard.test.tsx` | Preserve state gates, IDs, labels and callbacks; assert one leading action                                       |
| `src/screens/BadgesScreen/BadgesWall.tsx`, `.styles.ts`, tests                | Move empty-wall CTA to Button celebration surface and preserve on-dark contrast                                  |
| `src/screens/GoalsScreen/GoalsCockpit.tsx` and affected tests                 | Keep one primary Start/Resume; update decorative Play icon color to shared primary foreground                    |
| Native evidence report and this plan                                          | Exact-head Goals/Focus/Capture/Completion/Badges observations, German long label and seven-theme limits          |

## Implementation tasks

### 1. Pin the shared contract with failing tests

- [x] Extend Button tests to resolve each variant against `theme.action`/`theme.chrome` contrast pairs across all seven variants and assert a German multiword label has no line cap and can shrink. Check disabled/loading a11y state, spinner foreground, and callback suppression, including celebration surface. Native pressed-frame appearance remains an explicit evidence limit below.
- [x] Run only Button tests to observe the missing `surface`, `inline`, and `accessibilityLabel` behavior fail before implementation.
- [x] Add `surface?: "default" | "celebration"`, `inline?: boolean` (ghost only), and optional `accessibilityLabel`; map variant colors to action tokens, spinner to foreground, `lg` minHeight to 54, and wrap text. Keep the current icon behavior and test IDs.
- [x] Run focused Button tests and commit a self-contained shared-contract change with DCO.

### 2. Migrate Focus actions

- [x] Add/extend Focus card tests for each status: evidence invites, Mark complete, Add more, Pick back up, Reopen, Design/View badge, and Set aside. Assert variant hierarchy, IDs, spoken labels, and callbacks. Long German label wrapping is covered in shared Button tests and native Badges evidence; pressed-frame style is not independently captured.
- [x] Replace footer and quiet bespoke Pressables with shared Button. Remove `ctaBase`, `primaryCta*`, `secondaryCta*`, and duplicate set-aside action styling. Keep `CardShell` and the evidence completion predicate unchanged.
- [x] Run focused Focus tests; fix any theme/geometry regressions and commit with DCO.

### 3. Migrate Badges surface and align existing consumers

- [x] Add Badges empty-state test for one on-dark celebration primary with original ID/navigation/a11y label and all-theme foreground/background; verify populated spotlight card remains a navigation card, not an action CTA.
- [x] Replace the custom empty-wall CTA with `Button surface="celebration" size="lg"`; remove the local CTA styles and lint exception. Update Goals Play icon to use `theme.action.actionPrimaryFg` so it remains visible with the new shared fill. Check existing capture and completion Button call sites keep one primary and appropriate secondary/ghost alternatives.
- [x] Run focused Badges, Goals, capture, completion, and Button suites; commit with DCO.

### 4. Validate and review the integrated result

- [x] Confirm a fresh `origin/main`; #684 has not merged, so the required integration rebase remains a before-merge follow-up. Run root `bun run type-check`, `bun run lint`, and `bun run test --concurrency=1` sequentially; run applicable package build.
- [x] On a dedicated disposable simulator from this worktree via `IOS_DEVICE_ID=<UDID> bun run ios:e2e --device <UDID>`, verify the English Goals/Focus/Capture/Completion/Badges journey and German Badges action at increased OS text in default/Warm Studio/Loud & Clear. Record exact SHA and screenshots, then stop Metro and shut down the simulator. Other German screens were not checked natively.
- [x] Run sequential code-quality, test-coverage, and failure-path reviews. Record and fix findings, rerun relevant reviewers, and update this plan's Discovery Log and Follow-ups.
- [ ] Run PM `check-pr 691`, push the reviewed branch, create/bind one PR, attach it to the task, and set board In Review. Never merge.

## Discovery Log

- [2026-09-27] Native verification found the empty Badges CTA partly hidden by the floating tab bar at `accessibility-large` in German. A focused red test established that the empty wall could not scroll; `ea26878` replaced the fixed empty container with a ScrollView using the already supplied tab inset. The final-head (`1728bcb`) English full journey and German default/Warm Studio/Loud & Clear flows passed on a dedicated iPhone 17e simulator. The evidence report is `e2e/reports/issue-691/index.md`.
- [2026-09-27] Independent sequential quality, coverage, and failure-path reviews found no current blocker. Quality/failure reviews flagged a future on-dark contrast risk because `surface="celebration"` originally accepted non-primary variants; `1728bcb` constrains that public TypeScript combination, and the relevant reviewers rechecked the fix. Coverage review found that mocked Pressable tests cannot prove a pressed frame; shared pressed styling is source-checked, and native taps proved action routing. CodeRabbit CLI returned `Invalid organization` (403) without running a review.
- [2026-09-27] Shared Button contract, Focus migration, and Badges/Goals alignment committed as `cebc070`, `69dcc95`, and `4cae04c`. Focused red/green tests and Capture/Finish consumer suites passed before the integrated native review.

- [2026-09-27] PM reservation exists and `check-pr 691` passed. Board was reconciled from Next to In Progress. Isolated worktree is clean at current main. Goals/Capture/Completion already consume Button; Focus footer and empty Badges wall recreate the treatment. Current Button uses `theme.colors.accentPrimary` while Focus uses `theme.action`; Badges requires `theme.chrome.celebrationBg/Fg` on its dark surface. Existing `contrastPairs.ts` already validates the intended action and celebration colors.

## Follow-ups and boundaries

- #429 owns shadow-token system changes; this issue consumes the current token and does not redefine it.
- #435 owns Timeline/step visual fidelity; keep its navigation cards outside Button unless they are actual actions.
- #684 is in review; its Focus full-title reader is not merged into this worktree. After #684 merges, rebase #691 before merge and preserve that reader. Do not treat this PR's native capture as evidence for the combined #684/#691 state.
- #694 owns extreme-type header/footer/tab clearance. The empty Badges action needed its own scroll clearance for #691, but the screen header and tab labels still clip at extreme type in the native captures.
- Pressed-frame appearance was not separately captured on native; shared `Button` applies one pressed branch to all variants and Maestro verified tap routing. A pressed-frame capture is the next action if visual feedback itself needs independent native proof.
- Do not change accepted ADR bodies or unrelated card/navigation Pressables.
