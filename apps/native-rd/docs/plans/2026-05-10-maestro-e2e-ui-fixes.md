# Plan: Realign Maestro E2E flows with post-#1006 UI changes

## Context

The Maestro E2E flows in `apps/native-rd/e2e/flows/` were last synced with
`apps/native-rd/src/` at PR #1006 (2026-05). Since then, four UI PRs landed on
main that broke selectors and assertions the flows depend on. The
`maestro-e2e-ui-fixes` branch was opened to realign the flows with current UI
without regressing production a11y.

This plan does **not** change the UI. It updates flow YAML to match the
contract that `src/` now exposes, plus one possible source-side gate if a
wrapper trap is observed at runtime.

**Intended outcome:**

1. All seven flows in `apps/native-rd/e2e/flows/` pass on an
   `EXPO_PUBLIC_E2E_MODE=true` iOS Simulator build.
2. No production a11y regressions (no removal of `accessibilityLabel` or
   `accessibilityRole`; any new gate is `EXPO_PUBLIC_E2E_MODE`-scoped only).
3. The Maestro skill stays current — any new gate or trap encountered gets
   appended to `.claude/skills/maestro-e2e/SKILL.md`.

---

## Diagnosis — what changed and what broke

| #   | UI change                                                                                                  | PR          | Affected flows                                                                                          | Symptom                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `WelcomeScreen` redesigned. Uses `ThemeChipGrid` instead of `ThemeSwitcher`; "Pick what feels right" gone. | #949        | `goal-create.yaml`, `goal-create-complete.yaml`, `goal-lifecycle-complete.yaml`, `evidence-viewer.yaml` | `assertVisible: "Pick what feels right"` after `clearState` fails.                                                                            |
| 2   | Header `+` removed from `GoalsScreen`. Canonical create entry is the FAB with `testID="tab-fab-new-goal"`. | #1014       | All four goal-creating flows                                                                            | `tapOn id: "create-new-goal"` no longer resolves.                                                                                             |
| 3   | StepCard quick-note input + add button removed (consolidated to single primary action).                    | #987 + #946 | `goal-create-complete.yaml`, `goal-lifecycle-complete.yaml`, `evidence-viewer.yaml`                     | `step-card-quick-note-input` / `step-card-quick-note-add-button` gone.                                                                        |
| 4   | FocusMode auto-advances after step completion + snaps to first pending on mount.                           | #1014       | All FocusMode flows (benign — single-step flows still all-done → CompletionFlow auto-nav)               | None today; flagged for future multi-step flows.                                                                                              |
| 5   | New eye/eye-slash IconButton in FocusMode header (`Show/Hide timeline`); state persists via Evolu.         | #1015       | None today (default visible; `clearState` resets)                                                       | None.                                                                                                                                         |
| 6   | Capture screens migrated to shared `ScreenSubHeader` (with optional `right` slot).                         | #1008       | New flow path (item 3 replacement) — `CaptureTextNote` route uses ScreenSubHeader header.               | Header text is now `Write a Note`; new assertion target.                                                                                      |
| 7   | `ThemeChipGrid` wraps the radio group with `accessible={true}` + role=`radiogroup`.                        | #949        | All flows that tap a theme via `"The Full Ride. Standard theme"`.                                       | Children have explicit `accessible={true}` so should remain reachable. **First-run risk** — if Maestro can't find the chip, gate the wrapper. |

WelcomeScreen "Pick what feels right" remains in `ThemeSwitcher`, which Settings
still uses. So `settings-theme-switch.yaml` is unchanged. `badge-view.yaml` is
read-only without a clearState entry and is unchanged. `badge-redesign.yaml`
chains `goal-lifecycle-complete.yaml` via `runFlow` — it inherits upstream
fixes and needs no direct edits.

---

## Quick-note replacement recipe

The old path (StepCard inline quick-note input + add button) no longer exists.
The new evidence-add path goes through the EvidenceDrawer FAB:

```yaml
- tapOn: "Add evidence" # FAB (accessibilityLabel)
- tapOn: "Note" # FABMenu menuitem (item.label)
- assertVisible: "Write a Note" # ScreenSubHeader on CaptureTextNote
- inputText: "Outlined the key sections..."
- tapOn: "Save Note" # footer Button
- assertVisible: "Focus Mode" # back on FocusMode after navigation.goBack()
```

### Risks to surface on first run

1. **FABMenu wrapper trap.** `<View accessible accessibilityRole="menu" accessibilityLabel="Add evidence menu">` wraps the menu items. Each `Pressable` is also `accessible={true}` so children should stay reachable on iOS, but if `tapOn: "Note"` fails, gate the outer `accessible` behind `EXPO_PUBLIC_E2E_MODE` per the established pattern in CardCarousel / CompletionFlowScreen. **Do not delete the role/label** — that's the WCAG regression we explicitly avoid.
2. **Keyboard interception on `Save Note`.** `CaptureTextNote`'s `TextInput` has `autoFocus={true}` and the `Save Note` Button is in a SafeAreaView footer. If the soft keyboard intercepts the Save tap, mitigate by tapping the static `"Write a Note"` header before tapping Save (the standard fallback documented in the skill).
3. **`Save Note` literal collision.** `CompletionFlowScreen` also has a `Save Note` button. Within `CaptureTextNote` the screen is the only context, so the literal-text match is fine; flagging it for awareness when reading the lifecycle flow.

---

## Per-flow correction list

### `goal-create.yaml` (state-mutating)

- L9 `assertVisible: "Goals"` is reached without onboarding — but a `clearState` flow lands on WelcomeScreen first. Add the canonical onboarding prefix updated for new copy:
  ```yaml
  - assertVisible: "Welcome to your ride."
  - tapOn: "The Full Ride. Standard theme"
  - tapOn: "Get Started"
  - assertVisible: "Goals"
  ```
- L11 `id: "create-new-goal"` → `id: "tab-fab-new-goal"`.

### `goal-create-complete.yaml`

- L8 `"Pick what feels right"` → `"Welcome to your ride."`.
- Add `tapOn: "The Full Ride. Standard theme"` before `Get Started` for determinism (matches canonical prefix).
- L14 `id: "create-new-goal"` → `id: "tab-fab-new-goal"`.
- L50–54 quick-note block → quick-note replacement recipe.
- L57 `tapOn: "Mark complete"` — unchanged (Checkbox label intact).

### `goal-lifecycle-complete.yaml`

- L9 `"Pick what feels right"` → `"Welcome to your ride."`.
- L14 `id: "create-new-goal"` → `id: "tab-fab-new-goal"`.
- L46–49 quick-note block (input + `pressKey: enter`) → quick-note replacement recipe.
- L51 `tapOn text: "Mark complete.*"` — unchanged.

### `evidence-viewer.yaml`

- L8 `"Pick what feels right"` → `"Welcome to your ride."`.
- Add `tapOn: "The Full Ride. Standard theme"` for determinism.
- L14 `id: "create-new-goal"` → `id: "tab-fab-new-goal"`.
- L46–63 two iterations of quick-note → two iterations of quick-note replacement recipe.
- L66 `tapOn: "Tap to expand timeline"` — the inner Text is wrapped by an `accessible={true}` Pressable with composed label `"Step progress timeline — tap to expand"`. The Pressable's `accessible={true}` makes it reachable but the label override may make `tapOn: "Tap to expand timeline"` fail. **First-run risk** — if it fails, switch to `tapOn: "Step progress timeline, tap to expand"` (composed label).

### `badge-redesign.yaml`

- No edits. Inherits fixes from `goal-lifecycle-complete.yaml` via `runFlow`.

### `badge-view.yaml`

- No edits. Read-only flow without onboarding; tab nav unchanged.

### `settings-theme-switch.yaml`

- No edits. Settings still uses `ThemeSwitcher` which retains "Pick what feels right".

---

## Execution order

Atomic commits (one per concern, type-checks pass per commit):

1. **`test(native-rd): replace removed create-new-goal testID with tab-fab-new-goal`**
   Four flows. Mechanical search-replace. No source change.

2. **`test(native-rd): update Welcome onboarding prefix for redesigned WelcomeScreen`**
   Four flows. Replaces `"Pick what feels right"` with `"Welcome to your ride."`; adds the canonical theme tap where it was missing.

3. **`test(native-rd): replace removed step-card quick-note path with FAB → CaptureTextNote`**
   Three flows. Largest semantic change. Each iteration of quick-note becomes 5 lines.

4. **(Conditional, if first run reveals reachability failure)** Source-side gate of FABMenu's grouping wrapper behind `EXPO_PUBLIC_E2E_MODE`, mirroring the CardCarousel pattern. Add a Jest test that flips `process.env.EXPO_PUBLIC_E2E_MODE` and asserts the grouping is dropped (so future refactors don't silently re-grow the trap).

5. **(Conditional)** Same treatment for `MiniTimeline` "Tap to expand" Pressable if `evidence-viewer` fails on L66.

6. **`docs(native-rd/skill): note FABMenu wrapper trap and CaptureTextNote header`**
   Append to `.claude/skills/maestro-e2e/SKILL.md` so the next debugger lands on current state.

---

## Verification

Per commit:

- `bun run type-check` (no source changes in commits 1–3, so this is a no-op tripwire).
- `bun run lint` for changed files.

End-of-branch:

- `bun run native:ios:e2e` (kill stale Metro first: `lsof -iTCP:8081`).
- `bun --filter native-rd test:e2e:single e2e/flows/<flow>.yaml` for each flow that changed (six flows: the four updated + the two that chain or share infra).
- All seven flows green in a single `bun run test:e2e` run.

If a flow breaks at the FABMenu or MiniTimeline label, add the gate per items 4 / 5, then re-run. Don't iterate on the YAML to work around an a11y wrapper — the project pattern is to gate the wrapper.

---

## Out of scope

- Adding testIDs to `CaptureTextNote`'s TextInput / Save button. The
  accessibilityLabel + literal "Save Note" is sufficient and adding testIDs is
  surface beyond what the failure surfaces.
- Multi-step flow coverage of the new auto-advance behavior. Worth a follow-up
  flow once the lifecycle flow is green again, but not required to unbreak.
- Refactoring `goal-create-complete.yaml` and `goal-lifecycle-complete.yaml`
  into a shared `_onboarding.yaml` prefix. The skill explicitly says inline is
  fine while there are only two — staying consistent with that until a third
  flow needs the prefix.

---

## Status checkpoint — 2026-05-10 ~18:46

Branch state at this checkpoint:

```
ea510a1a test(native-rd): dismiss soft keyboard before Save Note in CaptureTextNote recipe
a7cd03e2 fix(native-rd): gate EvidenceDrawer and FABMenu wrappers behind EXPO_PUBLIC_E2E_MODE
df2bf1fd fix(native-rd): gate ThemeChipGrid radiogroup wrapper behind EXPO_PUBLIC_E2E_MODE
4a9cedac fix(native-rd): bypass Expo SDK 55 dev-launcher picker for Maestro E2E
5323d68a test(native-rd): replace removed step-card quick-note path with FAB → CaptureTextNote
a26caf32 test(native-rd): update Welcome onboarding prefix for redesigned WelcomeScreen
bae7f60a test(native-rd): replace removed create-new-goal testID with tab-fab-new-goal
ace2706c docs(native-rd): plan Maestro flow realignment after post-#1006 UI changes
```

### What landed beyond the original plan

The original plan's three commits (1–3) plus the docs commit are intact.
Running flows on `bun run native:ios:e2e` exposed a separate environment
regression: the SDK 55 `expo-dev-client` 55.0.32 no longer auto-loads the
last bundle URL on cold launch, so Maestro's `clearState` reinstall lands
on the dev-client server picker instead of WelcomeScreen. SDK 55 PR
`9ce26bfe` listed Maestro E2E as TODO before merge but merged before that
ran. This branch absorbs the env fix because the same PR will be the first
post-SDK-55 E2E run.

Four additional commits beyond the original plan (with rationale):

- `4a9cedac` — dev-launcher bypass: `openLink` to `exp+rollercoasterdev://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081` after `launchApp`, plus a one-shot `EXDevMenuIsOnboardingFinished=YES` UserDefault write in `scripts/run-e2e.sh`. Maestro bug #1601 (UserDefaults survive `clearState` on iOS) makes the write sticky. Skill `.claude/skills/maestro-e2e/SKILL.md` updated with the SDK-55 section.
- `df2bf1fd` — ThemeChipGrid `accessible+role=radiogroup+label="Theme"` wrapper gated behind `EXPO_PUBLIC_E2E_MODE`. Anticipated by plan risk #7 / step 4.
- `a7cd03e2` — EvidenceDrawer `accessible+role=summary+label="Evidence drawer"` AND FABMenu `accessible+role=menu+label="Add evidence menu"` wrappers gated. Plan step 4 anticipated FABMenu; EvidenceDrawer was new but structurally identical (same FAB → CaptureTextNote unblock surface).
- `ea510a1a` — keyboard interception fix per plan risk #2: replace recipe's static-tap fallback with `hideKeyboard` before `tapOn: "Save Note"` in three flows (current state — see Open Questions below; this commit's tactic was intermediate, may need follow-up).

All wrapper-gate commits include a Jest test that flips `process.env.EXPO_PUBLIC_E2E_MODE = "true"` for one describe block and asserts the wrapper is dropped — mirroring the existing `CardCarousel` / `BadgeEarnedModal` test pattern. The test guards future refactors from silently re-growing the trap.

### Verification status

| Flow                           | Result on resume baseline                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `goal-create.yaml`             | ✅ Passes end-to-end (12/12 steps).                                                                                                                                                                                                                                                                                                                                                                                                                |
| `goal-create-complete.yaml`    | 🟡 Reached "Save Note" tap but keyboard interception failed the next assertion. Switched to `hideKeyboard` in `ea510a1a` but the verification re-run flaked at an earlier step ("Edit Goal" not visible after "Use This Design") before reaching the new keyboard-dismiss path. Likely Evolu/SecureStore state contamination from rapid `clearState` cycles. **Re-run after a sim reset to see if `hideKeyboard` actually works for this screen.** |
| `goal-lifecycle-complete.yaml` | ❓ Not yet run on this branch.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `evidence-viewer.yaml`         | ❓ Not yet run on this branch.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `badge-redesign.yaml`          | ❓ Not yet run. Chains lifecycle, will inherit upstream fixes.                                                                                                                                                                                                                                                                                                                                                                                     |
| `badge-view.yaml`              | ❓ Not yet run. Read-only, no clearState.                                                                                                                                                                                                                                                                                                                                                                                                          |
| `settings-theme-switch.yaml`   | ❓ Not yet run. Read-only, no clearState. Note: ThemeChipGrid gate may affect this flow's Settings screen (Settings still uses `ThemeSwitcher`, which has its own "Pick what feels right" — but the gate change drops the `radiogroup` wrapper from any ThemeChipGrid usage, potentially elsewhere). Verify on resume.                                                                                                                             |

### Open questions on resume

1. ~~**Does `hideKeyboard` actually dismiss the keyboard on `CaptureTextNote`?**~~ Confirmed: **no.** Re-run produced the explicit Maestro error _"Couldn't hide the keyboard. This can happen if the app uses a custom input or doesn't expose a standard dismiss action."_ Both flow-level fallbacks have now failed:
   - `tapOn: "Write a Note"` (static header) — completes but doesn't dismiss (iOS only auto-dismisses on taps to interactive elements; `ScreenSubHeader`'s centered Text is non-interactive).
   - `hideKeyboard` — errors out as above.

   **Recommended source-side fix:** in `apps/native-rd/src/screens/CaptureTextNote/CaptureTextNote.tsx`, move the `SafeAreaView edges={["bottom"]}` footer (which contains the `Save Note` Button) **inside** the `KeyboardAvoidingView` so the footer rises with the keyboard. This is also a real-user UX bug — on small iPhones the Save Note button is hidden behind the keyboard for any user with the soft keyboard up. Adding `keyboardShouldPersistTaps="handled"` to the wrapping ScrollView (if added) lets a tap on the visible Save button register without first dismissing the keyboard.

   Alternative if the source change is undesirable for some reason: `swipe: { direction: DOWN }` over the input area in the flow, or a coordinate tap (`tapOn: { point: "50%,15%" }`) on the empty space at the very top of the screen above the header.

2. **Test flakiness pattern.** The `goal-create-complete` retry failed at "Edit Goal" — a step that previously passed. Consider whether back-to-back `clearState` runs leave Evolu sqlite or SecureStore in a half-cleared state. May be worth `xcrun simctl shutdown booted && xcrun simctl boot <UDID>` between flow runs in CI.
3. **Multi-step lifecycle flows: auto-advance.** Plan diagnosis row #4 noted FocusMode now auto-advances after step completion. Today the lifecycle flow's only step exits via auto-nav to CompletionFlow. If a future flow has 2+ steps, the assertion after the first `tapOn: "Mark complete"` needs to expect the next step's content, not a transition screen.

### How to resume

1. **Sim reset** to clear state contamination: `xcrun simctl shutdown booted && bun run native:ios:e2e` (rebuilds + relaunches; ~10 min for clean build, faster if Pod cache hot).
2. **Re-run goal-create-complete** to validate `hideKeyboard` on `CaptureTextNote`. If it errors or doesn't dismiss, fall back per question #1 above.
3. **If green: run remaining flows** in order — `goal-lifecycle-complete`, `evidence-viewer`, `badge-redesign`, `badge-view`, `settings-theme-switch`. Each surfaces different things; expect at most one of: MiniTimeline `"Tap to expand timeline"` wrapper trap (plan step 5, conditional), Settings/`ThemeSwitcher` divergence from gated ThemeChipGrid.
4. **End-of-branch sweep**: `bun run test:e2e` (full suite) once all flows pass individually. Then update this plan's status, optionally trim the Open Questions, and move to PR.

### Key references for the next session

- Skill: `.claude/skills/maestro-e2e/SKILL.md` — has the new "Dev-launcher bypass after clearState" section that documents the SDK-55 mechanism end to end.
- Source-side gate pattern: `apps/native-rd/src/screens/BadgeEarnedModal/BadgeEarnedModal.tsx` (`cardA11yProps`), `apps/native-rd/src/components/CardCarousel/CardCarousel.tsx`. Three more components now follow this pattern: `ThemeChipGrid`, `EvidenceDrawer`, `FABMenu`.
- UserDefault key: `EXDevMenuIsOnboardingFinished` (bool, set in `scripts/run-e2e.sh`).
- Deep-link scheme: `exp+rollercoasterdev` (`Info.plist` `CFBundleURLTypes`), NOT bundle ID, NOT bare slug.
- Bundle URL: `http://localhost:8081` works on iOS sim because sim shares host's network stack — the LAN IP shown in the dev-client picker is unnecessary for sim runs.

---

## Status checkpoint — 2026-05-10 ~19:35

Branch state at this checkpoint:

```
a5037003 test(native-rd): close EvidenceDrawer before tapping past it in CaptureTextNote flows
bfaf6cde fix(native-rd): gate MiniTimeline expand-hint a11y wrapper behind EXPO_PUBLIC_E2E_MODE
c25435f4 test(native-rd): drop CaptureTextNote keyboard-dismiss workaround now footer rises with the keyboard
37f459d7 fix(native-rd): keep CaptureTextNote Save Note above the soft keyboard
8b9aad80 docs(native-rd): checkpoint Maestro E2E plan with branch status + resume guide
ea510a1a test(native-rd): dismiss soft keyboard before Save Note in CaptureTextNote recipe
a7cd03e2 fix(native-rd): gate EvidenceDrawer and FABMenu wrappers behind EXPO_PUBLIC_E2E_MODE
df2bf1fd fix(native-rd): gate ThemeChipGrid radiogroup wrapper behind EXPO_PUBLIC_E2E_MODE
4a9cedac fix(native-rd): bypass Expo SDK 55 dev-launcher picker for Maestro E2E
5323d68a test(native-rd): replace removed step-card quick-note path with FAB → CaptureTextNote
a26caf32 test(native-rd): update Welcome onboarding prefix for redesigned WelcomeScreen
bae7f60a test(native-rd): replace removed create-new-goal testID with tab-fab-new-goal
ace2706c docs(native-rd): plan Maestro flow realignment after post-#1006 UI changes
```

### What landed in this session

Four new commits beyond the previous checkpoint:

- `37f459d7` — Source: in `CaptureTextNote.tsx`, move the `SafeAreaView` footer (Save Note button) **inside** the `KeyboardAvoidingView` and add a `keyboardAvoiding: { flex: 1 }` style. Resolves Open Question #1 from the prior checkpoint. Also fixes a real-user UX bug: on small iPhones the Save Note button was hidden behind the keyboard. All 15 existing `CaptureTextNote` Jest tests still pass.
- `c25435f4` — Tests: drop the no-longer-needed `tapOn: "Write a Note"` / `hideKeyboard` keyboard-dismiss workaround in three flows. Updated comments to describe the new contract: footer inside KAV, no pre-dismiss needed.
- `bfaf6cde` — Source: gate the MiniTimeline expand-hint Pressable's `accessible+role+label+hint` props behind `EXPO_PUBLIC_E2E_MODE`. Predicted plan-step-5 trap. Includes the standard "drop-the-wrapper-under-E2E" Jest test mirroring `ThemeChipGrid` / `CardCarousel`.
- `a5037003` — Tests: add `tapOn: "Toggle evidence drawer"` to three flows before tapping any element behind the EvidenceDrawer's dim overlay (StepCard checkbox in goal-create-complete + goal-lifecycle-complete; MiniTimeline hint in evidence-viewer). The drawer remains expanded after returning from CaptureTextNote and its overlay captures coordinate taps even when Maestro can match the underlying element by accessibility hierarchy.

### Verification status

| Flow                           | Result on this checkpoint                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `goal-create.yaml`             | ✅ Was passing on prior checkpoint; not re-run this session but no flow-affecting changes.                                                                                                                                                                                                                  |
| `goal-create-complete.yaml`    | ✅ Passes end-to-end on `EXPO_PUBLIC_E2E_MODE=true npx expo start` Metro + iPhone 17 Pro / iOS 26.1 sim with the source keyboard fix + drawer-close addition.                                                                                                                                               |
| `goal-lifecycle-complete.yaml` | ✅ Passes end-to-end (incl. `badge-earned-image` final assertion) — but only after a sim shutdown/boot/install/seed cycle between flows. Without a sim reset, hits the documented "Edit Goal not visible after Use This Design" flake (open question #2 from prior checkpoint).                             |
| `evidence-viewer.yaml`         | 🟡 Progresses through Save Note (×2) + drawer close + MiniTimeline expansion (the gate works) and lands on Timeline. Blocked at `tapOn: text: "First piece of evidence"` — see new open question #4 below. Test design needs rework, not just a flow tweak.                                                 |
| `badge-redesign.yaml`          | ❓ Not yet run.                                                                                                                                                                                                                                                                                             |
| `badge-view.yaml`              | ❓ Not yet run. **State-dependency concern**: the flow does `launchApp` (no clearState) and asserts "No badges yet". Running it after any flow that earns a badge (goal-create-complete, goal-lifecycle-complete, badge-redesign) without an intervening sim/app reset will fail. See new open question #5. |
| `settings-theme-switch.yaml`   | ❓ Not yet run. Settings still uses `ThemeSwitcher`, separate from the gated `ThemeChipGrid` — should be unaffected by E2E gating, but verify.                                                                                                                                                              |

### Environment notes for resume

The build artifact at `~/Library/Developer/Xcode/DerivedData/Rollercoasterdev-…/Build/Products/Debug-iphonesimulator/Rollercoasterdev.app` is ready to install. **Metro must be started with `EXPO_PUBLIC_E2E_MODE=true`** to inline the gating constants — without it, the ThemeChipGrid / EvidenceDrawer / FABMenu / MiniTimeline wrappers stay in place and flows fail at "The Full Ride. Standard theme" or earlier.

Recipe per flow run:

```bash
# In apps/native-rd:
xcrun simctl shutdown booted; sleep 2
xcrun simctl boot 8A8E593D-8FCB-4C96-8E24-29BB697E9769; sleep 5
xcrun simctl install booted "$APP_PATH"
xcrun simctl spawn booted defaults write dev.rollercoaster.app EXDevMenuIsOnboardingFinished -bool YES
bun --filter native-rd test:e2e:single e2e/flows/<flow>.yaml
```

If Metro isn't running:

```bash
EXPO_PUBLIC_E2E_MODE=true npx expo start  # background; wait for "Waiting on http://localhost:8081"
```

### New open questions

4. **`evidence-viewer.yaml` test design.** The flow adds **two text-type evidence items** then calls `tapOn: text: "First piece of evidence"` to enter the EvidenceViewer. Two issues:
   - The flow's `inputText: "First piece of evidence"` goes into the auto-focused content `TextInput` (saved into `uri`, never displayed as a card label). Caption is left empty.
   - With caption empty, both TimelineEvidenceCard labels fall back to `description ?? type ?? "Evidence"` → both render the literal string "text". Maestro can't differentiate.

   This is a **test design weakness** — an "evidence VIEWER" flow that uses two of the same type doesn't actually exercise type-switching in the viewer; it only paginates. Better design: one text + one link (or photo, or file). That gives natural unique labels on the Timeline AND verifies the viewer's per-type render branches.

   Available capture screens to mix-and-match: `CaptureFile`, `CaptureLinkScreen`, `CapturePhoto`, `CaptureTextNote`, `CaptureVideoScreen`. `CaptureLinkScreen` is the obvious second type — link evidence has a URL that displays differently from text content, doesn't need the photo library / camera permissions, and exercises a different branch of `EvidenceContent.tsx`.

   Resume-with: rewrite the flow's two evidence-add blocks as one text + one link (FAB → "Link" → enter URL → save). Update the assertions to match the new card labels.

5. **`badge-view.yaml` state dependency.** Flow does `launchApp` (no clearState) and asserts `"No badges yet"`. Running this flow after any badge-earning flow without an intervening reset will fail.

   Two viable fixes:
   - Reorder so badge-view runs first in `bun run test:e2e` (Maestro runs flows alphabetically — currently `badge-redesign` runs before `badge-view`, so the bare-state assertion is doomed once badge-redesign earns a badge).
   - Add `clearState` to badge-view (one-line YAML change). Slightly changes the contract — was an explicit no-clearState navigation smoke test — but more reliable for full-suite runs.

### Source-side change summary (for PR description)

- `apps/native-rd/src/screens/CaptureTextNote/CaptureTextNote.tsx` — restructure layout: `KeyboardAvoidingView` now wraps both the input/caption region AND the SafeAreaView footer. Save button rises with the keyboard.
- `apps/native-rd/src/screens/CaptureTextNote/CaptureTextNote.styles.ts` — add `keyboardAvoiding: { flex: 1 }`.
- `apps/native-rd/src/components/MiniTimeline/MiniTimeline.tsx` — gate the expand-hint Pressable's `accessible+role=button+label+hint` props behind `EXPO_PUBLIC_E2E_MODE`. Production a11y unchanged.
- `apps/native-rd/src/components/MiniTimeline/__tests__/MiniTimeline.test.tsx` — new "E2E mode gating" describe block.

No changes to `EvidenceDrawer`, `ThemeChipGrid`, `FABMenu` source — those gates are from the prior checkpoint.

### How to resume

1. **Decide on the evidence-viewer redesign** (open question #4). Two sub-tasks:
   - Pick the second type. `CaptureLinkScreen` is recommended (no permissions, distinct render path).
   - Update `e2e/flows/evidence-viewer.yaml` to: text first piece → link second piece, with assertions matching the new card labels and the viewer's pagination.
2. **Decide on the badge-view fix** (open question #5). Recommended: `launchApp: { clearState: true }` so it's robust regardless of run order.
3. **Run remaining flows** with sim reset between each: `evidence-viewer` (after redesign), `badge-redesign`, `badge-view` (after fix), `settings-theme-switch`.
4. **End-of-branch sweep**: `bun run test:e2e` once individual flows pass. The full-suite alphabetical order is `badge-redesign → badge-view → evidence-viewer → goal-create → goal-create-complete → goal-lifecycle-complete → settings-theme-switch` — but this run also exercises Maestro's flow-to-flow state handling (no automatic sim reset between).
5. **Update the SKILL** (`.claude/skills/maestro-e2e/SKILL.md`) with two new entries:
   - "EvidenceDrawer overlay captures taps after CaptureTextNote return" → close drawer first.
   - "MiniTimeline expand-hint Pressable wraps a Text" → gated under E2E.

### Open follow-ups (not blocking this PR)

- **EvidenceDrawer auto-collapse on focus return.** When CaptureTextNote does `navigation.goBack()`, FocusModeScreen's `isDrawerOpen` state persists. The drawer's expanded overlay covers the StepCard / MiniTimeline. The current flow fix (explicit `tapOn: "Toggle evidence drawer"`) is a workaround; a real fix would be a `useFocusEffect` to collapse the drawer on focus return after evidence save, OR resize the drawer so it doesn't visually occlude the StepCard.
- **Text-evidence card labels**. `description ?? type ?? "Evidence"` falls back to "text" for un-captioned text notes — true everywhere (Timeline, FocusMode drawer, CompletionFlow, useAllEvidenceForGoal ×2). Hard to distinguish notes without captions. Consider a helper `evidenceLabel(row)` that for `type === "text"` extracts an excerpt from `uri.slice(TEXT_EVIDENCE_PREFIX.length)`. 7 callsites today.
- **`captureBadge` race in BadgeDesignerScreen.** When flows run back-to-back without sim reset, `Use This Design` sometimes taps successfully but `navigation.replace("EditMode", …)` doesn't fire — the screen stays on the designer. Sim shutdown/boot fixes it deterministically. Likely react-native-view-shot getting an unstable view ref under hot-reload state. Worth investigating but out of scope.
