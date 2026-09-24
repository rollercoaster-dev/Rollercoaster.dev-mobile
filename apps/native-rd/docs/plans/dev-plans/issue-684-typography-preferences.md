# Development Plan: Issue #684 — typography preferences

## Workspace and scope

- Issue: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/684
- Worker worktree: `/Users/hailmary/.codex/worktrees/issue-684/Rollercoaster.dev-mobile`
- Reserved branch: `codex/issue-684` (PM guard claim exists; do not claim again)
- Initial base: `b70382290001bf31f14690ccfe48be2b352be3aa` (`origin/main`, 2026-09-24)
- Current base: `a7628ddff68851863355133d726e51bba3031d8a` (merged iOS 27 scene-lifecycle fix, #705)
- Scope: composed typography and the cited Focus card, Goals cockpit, Badges wall, and evidence viewer strip. Preserve all seven runtime themes and existing localized strings.

## Intent Verification

- [ ] Body, task title, and action copy on the affected screens use the selected reading font: Lexend in Warm Studio and Atkinson Hyperlegible in Loud & Clear.
- [ ] Dyslexia preference increases line spacing on multiline text compared with the default theme, including focus titles/body and badge empty/body copy.
- [ ] Essential labels and metadata use semantic minimum 14pt sizing and follow `sizeL` in Loud & Clear; body copy uses at least the 16pt body token.
- [ ] Long goal/evidence titles remain readable at increased OS type size without a 9–10pt fallback or dependence on a tiny uppercase goal identifier.
- [ ] The app remains functional in all seven runtime themes and English/German; native checks are tied to the implementation commit and state their exact coverage.

## Research findings

- `composeTheme` resolves variant fonts and scales, but its `textStyles` line heights are hard-coded multipliers and ignore `variantDef.lineHeight`.
- FocusCurrentTaskCard renders native `Text` with several local styles that omit `fontFamily`; title/heading force roughly 1.0 line height.
- GoalsCockpit already uses shared `Text` but overrides key labels with 10pt literals; the overline includes essential goal identity and truncates to one line.
- BadgesWall uses fixed 9–10pt metadata, 13pt empty body, and fixed heights/sizes on its dark surface.
- ViewerStripThumb renders an essential evidence title at 10pt/12pt inside a 76pt square; its parent uses exported width for list geometry.
- The `sizeL` variant is exposed as Loud & Clear; `lineHeightL` is selected by the dyslexia variant. `Text` variants are composed once per theme.
- PR #705 repairs iOS 27 scene lifecycle and is open at planning time. Native verification cannot be attributed to this branch until it is merged and this work is rebased/tested at the new head.

## Decisions

| ID  | Decision                                                                                                                                                 | Rationale                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| D1  | Make the shared typography presets use the resolved line-height preference, while retaining each role's relative hierarchy.                              | All seven themes then receive one consistent behavior without per-screen dyslexia branches.                   |
| D2  | Apply theme semantic presets (with local color/weight only where needed) to the cited UI text, and eliminate literal sizes below 14pt for required copy. | Native `Text` does not inherit a sibling font; semantic presets carry family, size, and line height together. |
| D3  | Let the cockpit goal context wrap as readable text and enlarge evidence strip tiles with its exported width kept in sync.                                | Essential identities cannot fit in one tiny/truncated line under OS scaling.                                  |
| D4  | Keep badges' fixed dark-surface color treatment.                                                                                                         | This issue concerns typography; theme colors/contrast are handled elsewhere.                                  |

## Implementation Plan

1. [x] Add failing tests for composed theme typography: reading fonts, increased dyslexia line spacing, sizeL label/body sizing, and role minimums.
2. [x] Fix shared `textStyles` composition to use the selected line-height scale and add/adjust semantic roles only where the current variants do not express screen title/task title/metadata.
3. [x] Add failing component/style assertions for essential Focus, cockpit, badge, and viewer text; update their styles and wrapping/layout. Keep translations and seven-theme behavior intact.
4. [x] Run focused tests, type-check, lint, full Jest suite, and applicable package build. Inspect complete diff and perform review. Record noncritical findings in this plan.
5. [ ] Run `verify-native` in bug mode using a disposable iOS simulator: baseline and fix on the same long-text fixture, default/Warm Studio/Loud & Clear, increased OS text, Goals/Focus/Badges/evidence strip where reachable. Capture literal observations and screenshots in `tmp/native-verify/issue-684/`. If iOS scene lifecycle prevents launch, mark precise states Not checked and await #705.
6. [ ] Rebase onto fresh main if #705 lands, rerun exact-head checks/native proof, then pass PM `check-pr 684` and publish/bind one PR without merge.

## Native state matrix

| Route/state             | Fixture                            | Theme/type                                              | Expected proof                                                       |
| ----------------------- | ---------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| Goals cockpit populated | Long goal and next-step titles     | Default, dyslexia, lowVision; default/increased OS type | Readable goal identity, wrapping, selected font, no clipping         |
| Focus current task      | Long task, helper/callout, actions | Same                                                    | Title/body/actions retain reading font and dyslexia spacing          |
| Badges wall             | Empty and one earned badge         | Same                                                    | Empty body and spotlight metadata readable, no sub-14 essential text |
| Evidence viewer strip   | Long evidence title                | Same                                                    | Label readable, selected font, strip scroll/layout works             |

## Not in Scope

| Item                                                        | Reason / follow-up                                                                                       |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| App-wide typography conversion beyond the cited affected UI | This issue's evidence points to these routes/components; any further audit should be tracked separately. |
| Android and physical-device assistive-tech claims           | Run only when those devices are actually available; report gaps rather than infer from iOS simulator.    |

## Discovery Log

- [2026-09-24] Prepared isolated issue worktree from fresh `origin/main`; parent checkout has unrelated dirty documents and is untouched.
- [2026-09-24] Red tests exposed all cited size/font/spacing gaps. The first implementation passed 136 focused tests, 10,466 full tests, root type-check, lint, and package build. Existing unrelated lint/Jest warnings remain.
- [2026-09-24] Independent review found default-only style assertions, untested enlarged-type layout, and long badge/evidence titles still truncated. Added direct theme-isolated stylesheet checks, enlarged-type layout test, wrapping badge title, and a full selected evidence title above the viewer body. The existing Focus mono date suffix remains intentionally mono at a 14pt semantic metadata size.
- [2026-09-24] CodeRabbit CLI review could not connect: service returned HTTP 403 `Invalid organization`. Two local read-only reviewers completed, and their in-scope findings were addressed.
- [2026-09-24] After review fixes, root type-check, lint, and all 222 Jest suites (10,471 tests) passed. Package build had passed before the review fixes; no package source changed. Lint/Jest retain existing unrelated warnings.
- [2026-09-24] PR #705 merged as `a7628dd`; rebased this branch cleanly onto fresh `origin/main` before starting native verification. The exact candidate HEAD will be recorded in the ignored native report.

## Review findings and follow-ups

- **Resolved:** theme-specific UI style tests for Warm Studio/Loud & Clear and `fontScale >= 1.3` cockpit layout.
- **Resolved:** long spotlight badge title wraps; selected evidence title is visible in full outside the truncated thumbnail.
- **Pending:** native before/after observations and any layout issues found there. PR #705 is now included in the branch base.
