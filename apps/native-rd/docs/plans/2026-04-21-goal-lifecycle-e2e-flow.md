# Plan: Land the goal-lifecycle E2E flow green, then codify lessons

## Context

The `goal-lifecycle-complete` Maestro flow was failing because React Native `accessible={true}` wrappers in the component tree collapse the iOS a11y tree, hiding nested testIDs from Maestro's element lookup. The earlier branch's "fix" was to rip the a11y out — an unacceptable WCAG regression. The right fix keeps the a11y in production and gates only the _grouping_ wrappers behind an `EXPO_PUBLIC_E2E_MODE` build-time flag.

We also need to codify the non-obvious Maestro/iOS/Expo lessons discovered in this session into a project-local skill so the next agent or engineer hitting Maestro issues doesn't retrace the same debugging arc.

**Intended outcome:**

1. `goal-lifecycle-complete.yaml` runs green against an E2E-flagged build
2. Production builds preserve the full a11y surface (adjustable carousel role + summary card roles + labels)
3. `.claude/skills/maestro-e2e/SKILL.md` captures lessons so future Maestro work starts from current-state knowledge

---

## Status snapshot (2026-04-21)

### ✅ Done

- **`26bface9` feat(native-rd): gate CardCarousel a11y grouping behind EXPO_PUBLIC_E2E_MODE**
  - `AnimatedCard`: `accessible={!isE2E && isCenter}`
  - Outer carousel View: drops `accessible + accessibilityRole="adjustable" + accessibilityValue + accessibilityActions` when `isE2E`
  - `ios:e2e` (native-rd) and `native:ios:e2e` (root) scripts added, reusing `scripts/run-ios.sh`
  - Jest test for the E2E branch (currently blocked by Bun/Jest env — now unblocked after `424a5213`)

- **`46bbe76c` feat(native-rd): gate CompletionFlow summary cards behind EXPO_PUBLIC_E2E_MODE**
  - `CompletionContent` both `accessible + accessibilityRole="summary" + accessibilityLabel` card Views gated via a shared `summaryA11yProps` helper
  - Moved `completion-note-input` testID back onto the TextInput itself (was on a wrapper View with no onPress, so Maestro tap+inputText silently failed to focus the input)
  - Extended final `assertVisible: "You did it!"` wait to 15s

- **`424a5213` fix(native-rd): run jest with node wrapper** (landed by user)
  - Routes Jest test scripts through `scripts/jest-node.sh` to bypass the Bun/isolated-node_modules × jest-runtime incompatibility

### ✅ Current state

- **Flow green end-to-end as of 2026-04-21 16:29** on an `EXPO_PUBLIC_E2E_MODE=true` build. See Item A below for the keyboard-intercept fix that closed the last 5%, and the remaining-items list above for two additional changes (final-assertion occlusion and a stacked badge-rendering bug) that were uncovered during verification and fixed on the same branch.

### ⏳ Remaining

1. ~~Resolve the keyboard-intercept on the save-note tap~~ — **landed** as flow-side fix (Item A, approach A3 only): `tapOn: "One last thing!"` after the completion-note `inputText` dismisses the keyboard before the save tap. A1 (submit-on-return on a multiline input) was rejected — it only works with `blurOnSubmit={true}`, which suppresses newlines and regresses UX on a reflection field.
2. ~~Write the Maestro skill~~ — **landed** at `.claude/skills/maestro-e2e/SKILL.md`. Updated mid-run with a new section on final-assertion occlusion (by modals/overlays) after the run exposed it.
3. ~~Verify the fixed flow runs green end-to-end~~ — **green as of 2026-04-21 16:29**. Required two additional changes the plan didn't anticipate:
   - `assertVisible: "You did it!"` → failed because the `BadgeEarnedModal` auto-appears once badge creation completes and occludes the celebration headline. Hit-test visibility, not DOM presence.
   - Changed to `assertVisible: "View Badge"` → also failed. The modal's outer card wraps `accessible + accessibilityLabel="Badge earned"` around all children, collapsing the nested button text into one composed a11y node. Classic accessible-wrapper trap applied to an assertion, not a tap.
   - Final assertion is `extendedWaitUntil: "Badge earned" timeout: 15000` — the composed label, which matches. Stronger end-state than the headline too: its presence proves save → evidence persisted → phase transitioned → badge created and signed.
4. **Production a11y regression check** in VoiceOver (Item C) — still pending; manual step.

---

## Item A: Fix the keyboard-intercept at save-completion-note

### Approach (pick one)

- **A1. App-side, submit-on-return** — make the completion TextInput submit the note when user hits `Return`/`Done`, similar to Focus Mode's quick-note pattern. Add `onSubmitEditing={handleSaveInlineNote}` and `blurOnSubmit` so the keyboard dismisses naturally. Then the Maestro flow can end the input phase with `pressKey: enter` (which already works earlier in the flow) instead of hunting for the button through the keyboard.
  - Pros: matches Focus Mode's working pattern; improves real-user UX too.
  - Cons: multi-line text input needs care — `onSubmitEditing` fires on hardware Enter; for iOS soft keyboard with multiline, need the Return key to also submit rather than insert newline.

- **A2. App-side, dismiss keyboard before save** — update `handleSaveInlineNote` to call `Keyboard.dismiss()` first, then let the state-update + re-layout settle before tapping again. Doesn't actually help the _tap_ itself since the keyboard blocks the tap from reaching the button in the first place.
  - Verdict: doesn't fix the root cause. Skip.

- **A3. Flow-side, tap a safe area to dismiss keyboard** — add a `tapOn: "One last thing!"` (the static header) before `tapOn: id: "save-completion-note"`. Header tap dismisses keyboard → layout shifts → Save button fully exposed.
  - Pros: zero app change; contained to the flow.
  - Cons: fragile (depends on header staying that label); the earlier `- hideKeyboard` step already failed here so Maestro's dismiss affordance isn't finding a hook — static tap is the advised fallback per Maestro's own error message.

**Landed: A3 only (tap static header to dismiss keyboard).** A1 was rejected for this input because it's `multiline` — `onSubmitEditing` only fires with `blurOnSubmit={true}`, which forces Return to submit instead of inserting a newline. That's a real UX regression on a reflection field where users often want paragraphs. If a real-user dismiss affordance is ever needed, an `InputAccessoryView` "Done" button is the clean iOS pattern — out of scope for this plan.

### Files modified

- `apps/native-rd/e2e/flows/goal-lifecycle-complete.yaml`: inserted `- tapOn: "One last thing!"` between the `inputText` and the `scrollUntilVisible: save-completion-note` steps.

### Verification

- Rebuild with `bun run native:ios:e2e`
- `bun --filter native-rd test:e2e:single e2e/flows/goal-lifecycle-complete.yaml` completes with "Flow Passed"

---

## Item B: Maestro skill

### Approach

Create `.claude/skills/maestro-e2e/SKILL.md` at the monorepo root, matching the existing project-skill format (`.claude/skills/neo-brutalist-design/`, `.claude/skills/publish/`). User-global is wrong — this is project-specific tacit knowledge.

### SKILL.md contents

**Frontmatter:**

```yaml
---
name: maestro-e2e
description: Maestro E2E testing conventions for native-rd. Use when writing/debugging Maestro flows, hitting element-not-found errors, adding clearState, or asked about E2E in native-rd.
metadata:
  author: rollercoaster.dev
  version: "1.0.0"
---
```

**Body sections** (concrete recipes with code):

1. **Determinism baseline** — state-mutating flows start with `launchApp: clearState: true, clearKeychain: true`. Read-only flows (`badge-view`, `settings-theme-switch`) don't need it.

2. **clearState iOS semantics** — uninstall+reinstall. Requires app pre-installed on sim. Doesn't touch Keychain — need `clearKeychain: true` for any SecureStore-using app (native-rd is one).

3. **First-run onboarding** — after clearState, traverse `WelcomeScreen`: `tapOn: "The Full Ride. Standard theme"` then `tapOn: "Get Started"`. Note the composed-label form (next section).

4. **The accessible-wrapper trap** — React Native `accessible={true}` with `accessibilityLabel` on a parent collapses children into one iOS a11y node. Fixes:
   - To tap a labeled wrapper: match the _full composed_ `accessibilityLabel`, not child text ("The Full Ride. Standard theme" not "The Full Ride").
   - For testIDs inside carousels/summary cards: gate the `accessible=true` grouping behind `EXPO_PUBLIC_E2E_MODE`. Reference implementations: `CardCarousel.tsx` and `CompletionFlowScreen.tsx`.
   - **Don't put testIDs on non-interactive wrapper Views.** If the wrapper has no `onPress`, `tapOn: id:` taps a dead element and subsequent `inputText` has nothing focused to type into. Put the testID on the actual TextInput/Pressable.

5. **Known Maestro iOS bugs** — [#1601](https://github.com/mobile-dev-inc/maestro/issues/1601) (UserDefaults not cleared, open); [#1306](https://github.com/mobile-dev-inc/maestro/issues/1306) (notification permissions not cleared, open).

6. **Root commands cheat-sheet:**

   ```bash
   bun run native:ios              # dev build
   bun run native:ios:e2e          # E2E-flagged build (gates a11y grouping)
   bun --filter native-rd test:e2e:single e2e/flows/<flow>.yaml
   bun run test:e2e                # all flows via turbo
   ```

7. **Selector preferences** — testID > composed accessibilityLabel > visible text. Assertions use `assertVisible` on visible text (resilient to labelling changes); taps use testID so refactors don't cascade.

8. **Keyboard interception** — if a tap on a scrollable-into-view button silently fails to trigger onPress, the keyboard is probably intercepting. Either (a) dismiss via a `tapOn:` on a static header, or (b) wire `onSubmitEditing` on the preceding TextInput and use `pressKey: enter`. `hideKeyboard` can fail when no standard dismiss affordance is exposed.

9. **Env-var flow for build-time gates** — `EXPO_PUBLIC_*` vars are Babel-inlined by Expo. They must be set in Metro's environment, not just at `expo run:ios` invocation — set via `export` or inline on the `bash scripts/run-ios.sh` command. Kill stale Metro (`lsof -iTCP:8081`) before rebuilds to avoid serving a bundle without the flag.

10. **Subflow pattern for DRY** — when 3+ flows need the same onboarding prefix, extract to `e2e/flows/_onboarding.yaml` and call via `runFlow`. Not urgent yet (two lifecycle flows share it; inline until a third appears).

### Files to modify

- `.claude/skills/maestro-e2e/SKILL.md` (new)

### Reuse

- Frontmatter shape from `.claude/skills/neo-brutalist-design/SKILL.md`
- Recipes drawn from the actual landed flow (`goal-lifecycle-complete.yaml`) and commits `26bface9` + `46bbe76c`

---

## Item C: Production a11y regression check

After Items A and B land, do one manual VoiceOver pass on a **non-E2E** build:

1. `bun run native:ios` (plain, no flag)
2. Enable VoiceOver on the simulator: `Settings → Accessibility → VoiceOver → On`
3. Navigate: Goals → create goal → reach Focus Mode on a multi-step goal
4. Swipe through: the CardCarousel should announce "Card 1 of N" with adjustable gestures (swipe up/down) moving between steps
5. On CompletionFlow: the "One last thing!" card should announce as a summary with its full label

Confirms we didn't accidentally ship the gated code path to production.

---

## Execution order (from here)

1. Item A (fix keyboard intercept → flow green)
2. Item B (write skill with fresh, battle-tested recipes)
3. Item C (manual a11y regression check)
