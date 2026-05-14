# Android Bug Triage — Video Controls, Audio Timer, Badge Fallback

**Status:** Active
**Created:** 2026-05-14

## Context

A test pass on the Android build of `native-rd` (`apps/native-rd`) surfaced three discrete bugs:

1. **Video capture screen** — the record + flip buttons render under the lifted `FocusPillTabBar`, so users can't reliably tap them on Android.
2. **Voice memo screen** — the duration timer stays at `00:00` while recording; it only updates after `stopRecording()` completes.
3. **Badge on goal completion** — when the user has no saved badge design, `useCreateBadge` silently falls back to a solid-blue 64×64 PNG and ships that as the credential image. We want to _block_ the bake until the user designs a badge instead.

The fixes are independent and can land in one PR.

---

## Bug 1 — Video screen: controls hidden under FocusPillTabBar

### Root cause

`CaptureVideoScreen` is a `<Stack.Screen>` inside `GoalsStack` (`apps/native-rd/src/navigation/GoalsStack.tsx:37`), which is itself inside the bottom-tab navigator. The tab bar is **never hidden** on capture screens, so it overlays the bottom of the screen.

`CaptureVideoScreen.styles.ts:40` sets a hardcoded `paddingBottom: theme.space[16]` on `controls`. On Android the lifted-pill tab bar (`PILL_LIFT = PILL_HEIGHT / 2 + borderWidth.medium = 32 + ~3`) plus the gesture/system inset eats more space than that hardcoded value, so the record/flip buttons end up under the pill.

The codebase already has a dedicated hook for exactly this offset: `useTabScreenContentInset()` (`apps/native-rd/src/navigation/useTabScreenContentInset.ts:10`) returns `paddingBottom: 2 * PILL_LIFT + insets.bottom + space[4]`.

### Fix

In `apps/native-rd/src/screens/CaptureVideoScreen/CaptureVideoScreen.tsx`:

- Import `useTabScreenContentInset` from `../../navigation/useTabScreenContentInset`.
- Call it at the top of `CaptureVideoScreen` and pass the result to the `controls` `View` as an inline style: `style={[styles.controls, tabInset]}`.
- Do the same for `previewControls` (line 273) so the Retake / Use Video buttons clear the tab bar in preview mode.

In `apps/native-rd/src/screens/CaptureVideoScreen/CaptureVideoScreen.styles.ts`:

- Remove the hardcoded `paddingBottom: theme.space[16]` from `controls` (line 40). Keep `paddingTop` and `paddingHorizontal`.
- The `flipButton`'s absolute `top` (line 75) is computed from the row's vertical padding — that still uses `theme.space[4]` for `paddingTop`, so no change needed there.

### Critical files

- `apps/native-rd/src/screens/CaptureVideoScreen/CaptureVideoScreen.tsx` (lines 50, 273, 320)
- `apps/native-rd/src/screens/CaptureVideoScreen/CaptureVideoScreen.styles.ts` (lines 35–42)
- `apps/native-rd/src/navigation/useTabScreenContentInset.ts` (reuse — no change)

---

## Bug 2 — Voice memo: timer doesn't tick during recording

### Root cause

`useAudioRecorder` (`apps/native-rd/src/hooks/useAudioRecorder.ts`) only updates `durationMs` inside the expo-audio recorder callback, which **only fires on `isFinished`** (lines 71–76). There is no live polling, so the consumer (`VoiceMemoScreen.tsx:159`) reads a stale `0` until recording stops.

`CaptureVideoScreen` already has the correct pattern (its own `setInterval` on lines 91–93), but `useAudioRecorder` doesn't replicate it.

### Fix

In `apps/native-rd/src/hooks/useAudioRecorder.ts`:

- Add a `useEffect` keyed on `status` that, when `status === "recording"`, starts a `setInterval` (~200ms cadence is plenty for an MM:SS display) calling `setDurationMs(recorder.getStatus().durationMillis)`.
- The effect's cleanup must `clearInterval` — also runs on unmount and on transitions out of `"recording"` (including to `"paused"`).
- When `status === "paused"`, stop ticking (cleanup runs) but keep the last `durationMs` value — do _not_ reset to 0. On resume, the effect restarts and continues counting from `recorder.getStatus().durationMillis`, which expo-audio resumes from the paused total.
- Keep the existing `isFinished` callback path — it still provides the authoritative final duration when recording stops.

### Edge cases to cover in the implementation

- The `setDurationMs(0)` at line 122 in `startRecording` runs _before_ the effect schedules the first tick, so the UI shows `00:00` then begins ticking — correct behavior, no change needed.
- Don't list `recorder` in the effect deps if it's a stable hook handle; if it isn't, store the recorder in a ref. Verify by reading the `useExpoRecorder` signature — `recorder` is returned each render, so use a ref (`recorderRef.current = recorder`) and read inside the interval to avoid stale closures or constant restart.

### Critical files

- `apps/native-rd/src/hooks/useAudioRecorder.ts` (add effect near lines 87–99, after the playback-position effect)

### Tests

The hook has a Jest test directory at `apps/native-rd/src/__tests__/`. Search for `useAudioRecorder` test files; add a test that fakes timers, calls `startRecording`, advances time, and asserts `durationMs > 0` while still recording.

---

## Bug 3 — Badge: blue solid-color fallback on goal completion

**Status note (2026-05-14, post-implementation):** the approach below was pivoted during implementation. The user opted to align the design-system default with the first-letter rendering already used by `BadgeCard` tiles (`components/BadgeCard/BadgeCard.tsx:36-42`) instead of blocking with a `needs-design` status. The implemented design:

- `createDefaultBadgeDesign` (`badges/types.ts:146`) now returns `shape: roundedRect`, `centerMode: monogram`, `monogram: <first letter of title uppercased>`. `BadgeShape.square` does not exist in the enum, so `roundedRect` is the closest fit.
- `useCreateBadge` (`hooks/useCreateBadge.ts`) deletes the `generateBadgeImagePNG` solid-color branch entirely. `capturedPng` is required; missing PNG throws (the outer catch surfaces `status === "error"` with a clear message). Unused imports `generateBadgeImagePNG` / `DEFAULT_BADGE_COLOR` are dropped.
- `CompletionFlowScreen` (`screens/CompletionFlowScreen/CompletionFlowScreen.tsx`) auto-captures the default-design PNG when `pendingDesignStore.consume()` returns undefined: an offscreen `<View>` hosts a `<BadgeRenderer design={createDefaultBadgeDesign(goal.title, goal.color)} />`, and a `useEffect` calls `captureBadge(fallbackRef, getCaptureDimensions(...))` once. The captured PNG plus the serialized default design are then fed to `useCreateBadge`. The `enabled` gate becomes `phase === "celebration" && capturedPngForBake !== undefined` so badge creation waits for the capture to land.
- No `needs-design` status, no `returnTo` BadgeDesigner param, no `useFocusEffect` re-consume. The two architectural gaps identified during plan review (post-save nav, re-consume) disappear because the user is never re-routed to BadgeDesigner.

Original `needs-design` plan retained below for posterity but not implemented.

---

### Root cause

`useCreateBadge` (`apps/native-rd/src/hooks/useCreateBadge.ts:243–249`) has three branches for the PNG source:

1. `capturedPng` provided → use it.
2. `design` provided without `capturedPng` → throw (programmer error).
3. **Neither provided → fall back to `generateBadgeImagePNG(hexColor)`** ← this is the blue PNG.

The third branch fires on every goal completion where the user has not designed a badge, baking a `DEFAULT_BADGE_COLOR = "#4B7BE5"` solid-blue square into the OB3 credential.

The user's chosen behavior: **block badge creation until the user designs a badge.** No solid-color fallback should ever ship.

### Fix — block until designed

The existing flow already has the right machinery: `CompletionFlowScreen` passes `enabled: phase === "celebration"` to gate badge creation, and the modal already has a `Customize` button that routes to `BadgeDesigner`. We extend this with a "needs-design" status that fires _before_ `useCreateBadge` runs.

#### 3a. Add a `needs-design` status to `useCreateBadge`

In `apps/native-rd/src/hooks/useCreateBadge.ts`:

- Extend `BadgeCreationStatus` (lines 58–67) with `"needs-design"`.
- In the effect's bake branch (lines 243–249), **delete the `generateBadgeImagePNG` fallback path**. Replace it with:
  ```
  if (!capturedPngRef.current) {
    setStatus("needs-design");
    hasTriggered.current = false; // allow re-entry once design arrives
    return;
  }
  ```
  Resetting `hasTriggered` here is the one exception — we _want_ the effect to re-run when the design eventually arrives via prop change. To avoid a re-entry race, also gate on a separate `hasCompletedRef` for the success path.
- Keep the `design` provided without `capturedPng` throw — that's still a programmer error.
- The unused imports `generateBadgeImagePNG` and `DEFAULT_BADGE_COLOR` from `../badges` can be dropped (lines 43, 47) once the fallback is gone. Verify no other consumer in `apps/native-rd/src` imports them; if so, leave the badges module exports intact and just remove the import here.

#### 3b. Update `CompletionFlowScreen` to handle `needs-design`

In `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx`:

- After `useCreateBadge` returns (line 120), add a check: if `badgeStatus === "needs-design"`, render a **"Design your badge to continue"** card in the celebration phase (around lines 363–381 where the action buttons live).
- The card shows a primary button "Design your badge" → `navigation.navigate("BadgeDesigner", { mode: "new-goal", goalId, returnTo: "completion-flow" })`.
- Suppress `BadgeEarnedModal` while `badgeStatus === "needs-design"` (already implicit — `badgeRow` will be null since `createBadge` hasn't fired).

**Gap 1 fix — post-save navigation (`returnTo` param):**

`BadgeDesignerContentNewGoal.saveAndNavigate` currently always `navigation.replace("EditMode", { goalId })` (`BadgeDesignerScreen.tsx:581`). That's wrong when launched from the completion flow — the user would end up in EditMode instead of back at the celebration screen.

- Extend `GoalsStackParamList`'s `BadgeDesigner` `new-goal` params with `returnTo?: "edit-mode" | "completion-flow"` (defaults to `"edit-mode"` for back-compat with the existing "New Goal → design" flow). Update `apps/native-rd/src/navigation/types.ts` accordingly.
- In `saveAndNavigate`, branch on `returnTo`:
  - `"edit-mode"` (default) → existing `navigation.replace("EditMode", { goalId })`.
  - `"completion-flow"` → `navigation.goBack()`.
- The `pendingDesignStore.set(goalId, ...)` call at line 577 stays unchanged for both paths — that's already correct.
- Pass `returnTo: "completion-flow"` from `CompletionFlowScreen`'s "Design your badge" CTA.

**Gap 2 fix — re-consume `pendingDesignStore` on return:**

`CompletionFlowScreen.tsx:478` consumes the pending design inside `useRef`'s initializer — runs once at mount. The outer wrapper stays mounted while the user navigates to BadgeDesigner, so the existing ref captured `undefined` and won't re-consume after `goBack`.

- Replace the `useRef(pendingDesignStore.consume(goalId))` pattern with a `useState` holding the design + a `useFocusEffect` (from `@react-navigation/native`) that re-consumes _only when state is still empty_:
  ```ts
  const [pendingDesign, setPendingDesign] = useState(() =>
    pendingDesignStore.consume(goalId),
  );
  useFocusEffect(
    useCallback(() => {
      if (pendingDesign) return; // already have it — preserve existing Suspense protection
      const next = pendingDesignStore.consume(goalId);
      if (next) setPendingDesign(next);
    }, [goalId, pendingDesign]),
  );
  ```
- The Suspense-remount protection that motivated the original `useRef` pattern still holds: once we have a non-null value, we don't re-consume.
- `pendingCapturedPngRef` becomes derived state (also moves into the same flow), or just compute the Buffer on render from `pendingDesign.pngBase64` — refs aren't load-bearing here.
- Verify by reading `apps/native-rd/src/stores/pendingDesignStore.ts` to confirm `consume()` is safely idempotent after the entry is gone (returns `undefined`).

#### 3c. Update `BadgeEarnedModal` (defensive)

In `apps/native-rd/src/screens/BadgeEarnedModal/BadgeEarnedModal.tsx`:

- The existing `PLACEHOLDER_IMAGE_URI` branch (lines 91–99) stays — it covers the legitimate `saveBadgePNG` filesystem failure case (lines 254–265 in `useCreateBadge`), which is unrelated to the blue-fallback bug.
- No structural changes needed here.

### Critical files

- `apps/native-rd/src/hooks/useCreateBadge.ts` (lines 58–67, 243–249 — extend status, drop solid-color fallback)
- `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx` (lines 120, 363–381, 455–463, 478–482 — new CTA + `useFocusEffect` re-consume)
- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx` (lines 564–595 — branch `saveAndNavigate` on `returnTo`)
- `apps/native-rd/src/navigation/types.ts` (extend `BadgeDesigner` `new-goal` params with `returnTo?: "edit-mode" | "completion-flow"`)
- `apps/native-rd/src/stores/pendingDesignStore.ts` (reuse — verify `consume()` is idempotent)

### Tests

- The badge create flow has tests under `apps/native-rd/src/__tests__/`. Add a case for `useCreateBadge` that asserts `status === "needs-design"` when neither `design` nor `capturedPng` is supplied. Remove or update any existing test that asserts the solid-color fallback path (it's now an error path).
- For `CompletionFlowScreen`, add a test that the "Design your badge" CTA renders when `badgeStatus === "needs-design"`.

---

## Verification

Per `apps/native-rd/CLAUDE.md`, run native builds (not `expo start`):

1. **Static checks** (run from `apps/native-rd`):

   ```
   bun run type-check
   bun run lint
   bun test --testPathPatterns "useAudioRecorder|useCreateBadge|CaptureVideo|CompletionFlow"
   ```

2. **Native Android build & manual checks** — load the `native-rd-build` skill for Android-specific build commands. Then on a connected Android device or emulator:
   - **Video**: Goals → focus a goal → complete → add evidence → tap a video chip → `CaptureVideo`. Confirm the red record button and the flip button are both fully visible above the tab bar pill, and both are tappable. Rotate / try gesture and 3-button nav modes if available.
   - **Audio**: Same path, voice-memo chip → `VoiceMemo`. Tap record. Confirm the `00:00` timer ticks every second through recording. Pause → confirm freeze. Resume → confirm continue. Stop → confirm final duration matches.
   - **Badge**: Create a fresh goal with no prior badges. Complete it. Add evidence. Confirm: no blue badge modal appears; the celebration card instead shows the "Design your badge" CTA. Tap it → `BadgeDesigner` opens in `new-goal` mode → design + save → returns to completion screen → `BadgeEarnedModal` now opens with the _designed_ badge image, not blue.

3. **Regression check**: Complete a _second_ goal where a badge design already exists in `pendingDesignStore` (via the New Goal → design flow). Confirm the modal still appears immediately with the designed image — the `needs-design` branch should not fire when `capturedPng` is provided.

---

## Follow-ups from `/simplify` review (commit dfb0aeb)

Items flagged by review but intentionally out of scope for this fix:

- **#21** — Centralize `GoalsStackNav` / `BadgesStackNav` type aliases. Five+ screens repeat `useNavigation<NativeStackNavigationProp<GoalsStackParamList>>()` inline; `EditModeScreen.tsx:57` still uses the older `NavigationProp<…>` form.
- **#22** — Clarify FocusMode auto-nav behavior when steps re-complete in the same mount post-Reopen. May be intended; needs product input. Related to #15 (badge rebake on reopen).
- **#23** — Stabilize `goal` reference in `FocusModeScreen.tsx:103` to avoid effect re-runs on every Evolu emission. Pre-existing, not a regression.
