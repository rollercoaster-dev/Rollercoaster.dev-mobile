# Development Plan: Issue #72

## Issue Summary

**Title**: i18n: migrate evidence capture permission-denied UI
**Type**: enhancement
**Complexity**: SMALL
**Estimated Lines**: ~280 lines

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective.

- [ ] When `CapturePhoto` denies camera permission, `Alert.alert` receives strings from `permissions:camera.{title,message}` (not `capturePhoto:permission.cameraTitle/cameraMessage`).
- [ ] When `CapturePhoto` denies photo library permission, `Alert.alert` receives strings from `permissions:photoLibrary.{title,message}` (not `capturePhoto:permission.libraryTitle/libraryMessage`).
- [ ] When `CaptureVideoScreen` denies photo library permission (video picker), `Alert.alert` receives strings from `permissions:photoLibrary.{title,message}` (not `captureVideo:permission.libraryTitle/libraryMessage`).
- [ ] When `VideoRecorder` renders before camera+mic permissions are granted, it shows `permissions:camera.{title,message}` and a "Grant Access" button labeled `permissions:camera.settingsCta` (not `captureVideo:recorder.permissionTitle/permissionBody/grantAccess`).
- [ ] When `VoiceMemoScreen` is in `permission-denied` status, it shows `permissions:microphone.{title,message}` and the "Open Settings" button uses `permissions:microphone.settingsCta` (not `captureVoice:permission.heading/body`).
- [ ] No `permission.*` keys remain in `capturePhoto.json`, `captureVideo.json`, or `captureVoice.json` after the migration (including `recorder.permissionTitle`, `recorder.permissionBody`, `recorder.grantAccess` in `captureVideo.json`).
- [ ] `permissions.json` (en and pseudo) is non-empty, contains exactly five sources: `camera`, `microphone`, `photoLibrary`, `videoLibrary`, `location`.
- [ ] `locale-parity.test.ts` passes: all five sources present in both `en` and `pseudo` permissions bundles with identical key structure.
- [ ] `option-key-parity.test.ts` passes (unaffected; no union changes).
- [ ] `bun run type-check` passes: TypeScript resolves all `t("permissions:…")` calls against the populated `permissions` namespace type.

## Dependencies

| Issue | Title                                              | Status               | Type    |
| ----- | -------------------------------------------------- | -------------------- | ------- |
| #70   | i18n: migrate evidence capture (photo/video/voice) | Met (PR #140 merged) | Blocker |
| #71   | i18n: migrate evidence capture text/file/link      | Met (PR #141 merged) | Blocker |

**Status**: All dependencies met. The `dep:blocked` label on the issue is stale — strip it in this PR.

## Objective

Populate the previously-empty `permissions` namespace with canonical `<source>.{title, message, settingsCta}` keys for five permission sources. Migrate all four call sites (three screens, one shared component) off their per-namespace `permission.*` keys onto the new namespace. Delete the retired keys from the three capture JSON files. Regenerate pseudo locale. Result: a single consolidated keyspace for all OS permission-denied UI.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                        | Alternatives Considered                                                       | Rationale                                                                                                                                                                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `VideoRecorder` continues using the same `useTranslation("captureVideo")` hook but switches its permission keys to `permissions:camera.*` via the `t` function with explicit namespace prefix (or adding `"permissions"` to its namespace list) | Add `"permissions"` as second namespace in `VideoRecorder`'s `useTranslation` | `VideoRecorder` already calls `useTranslation("captureVideo")` for all its other keys. The cleanest approach is to add `"permissions"` to its namespace array so `t("permissions:camera.title")` resolves — consistent with how `VoiceMemoScreen` already uses `["captureVoice", "common"]`.                                                   |
| D2  | `videoLibrary` source in `permissions.json` gets distinct copy from `photoLibrary` despite using the same iOS system permission                                                                                                                 | Merge both into `photoLibrary`, skip `videoLibrary`                           | The issue spec explicitly lists `videoLibrary` as a distinct source. The `CaptureVideoScreen` library picker shows video-specific context ("select videos"), so the message copy differs meaningfully even if the underlying OS permission is the same. Defining both now is cheap and avoids a follow-up.                                     |
| D3  | `VoiceMemoScreen` "Open Settings" button label migrates to `permissions:microphone.settingsCta` — the current `captureVoice:actions.openSettings` key is retired from the permission-denied branch                                              | Keep `captureVoice:actions.openSettings` and only migrate the heading/body    | The "Open Settings" CTA is functionally a permission UI element. Moving it to the `permissions` namespace completes the consolidation; it is not used outside the permission-denied branch. The key remains in `captureVoice.json` for other potential uses if any exist — grep confirms it is only referenced in the permission-denied block. |
| D4  | `location` source keys are pre-populated in `permissions.json` even though no call site uses them yet                                                                                                                                           | Omit `location` until needed                                                  | The issue spec explicitly lists `location` as one of the five sources to define. Pre-populating it now prevents a future PR from needing to touch this namespace for a trivial addition. Copy can be a reasonable placeholder matching the app.json pattern.                                                                                   |

## Affected Areas

- `apps/native-rd/src/i18n/resources/en/permissions.json` — populate with five sources × three keys
- `apps/native-rd/src/i18n/resources/pseudo/permissions.json` — regenerated via `bun run gen:pseudo`
- `apps/native-rd/src/i18n/resources/en/capturePhoto.json` — delete `permission` subtree
- `apps/native-rd/src/i18n/resources/pseudo/capturePhoto.json` — delete `permission` subtree (or regenerated)
- `apps/native-rd/src/i18n/resources/en/captureVideo.json` — delete `permission` subtree and `recorder.permissionTitle`, `recorder.permissionBody`, `recorder.grantAccess` keys
- `apps/native-rd/src/i18n/resources/pseudo/captureVideo.json` — same deletions (or regenerated)
- `apps/native-rd/src/i18n/resources/en/captureVoice.json` — delete `permission` subtree; optionally delete `actions.openSettings` if fully replaced
- `apps/native-rd/src/i18n/resources/pseudo/captureVoice.json` — same deletions (or regenerated)
- `apps/native-rd/src/screens/CapturePhoto/CapturePhoto.tsx` — change `t("permission.cameraTitle/cameraMessage")` → `t("permissions:camera.title/message")` etc.
- `apps/native-rd/src/screens/CaptureVideoScreen/CaptureVideoScreen.tsx` — change `t("permission.libraryTitle/libraryMessage")` → `t("permissions:photoLibrary.title/message")`
- `apps/native-rd/src/components/VideoRecorder/VideoRecorder.tsx` — add `"permissions"` to namespace array; change three permission key calls
- `apps/native-rd/src/screens/VoiceMemoScreen/VoiceMemoScreen.tsx` — add `"permissions"` to namespace array (already uses array form); change two permission key calls + the `openSettings` CTA
- `apps/native-rd/src/i18n/i18next.d.ts` — `permissions` type is already wired (imports `./resources/en/permissions.json`); the type will auto-update once the JSON is populated — no manual edit needed unless the type inference is stale
- `apps/native-rd/src/screens/CapturePhoto/__tests__/CapturePhoto.test.tsx` — update permission-denied alert assertion to use `permissions:camera.*` keys
- `apps/native-rd/src/screens/CaptureVideoScreen/__tests__/CaptureVideoScreen.test.tsx` — update permission-denied alert assertion
- `apps/native-rd/src/components/VideoRecorder/__tests__/VideoRecorder.test.tsx` — update permission card text assertions
- `apps/native-rd/src/screens/VoiceMemoScreen/__tests__/VoiceMemoScreen.test.tsx` — update `permission.heading` assertion to `permissions:microphone.title`

## Implementation Plan

### Step 1: Populate `permissions.json` (en) with canonical keys

**Files**:

- `apps/native-rd/src/i18n/resources/en/permissions.json`

**Commit**: `feat(i18n): populate permissions namespace with canonical keys`

**Changes**:

- [ ] Replace `{}` with five source objects: `camera`, `microphone`, `photoLibrary`, `videoLibrary`, `location`
- [ ] Each source has exactly three leaf keys: `title`, `message`, `settingsCta`
- [ ] Copy strings derived from existing per-namespace keys, aligned to `app.json` terminology:
  - `camera.title`: "Camera Access Needed" (matches `recorder.permissionTitle` casing from `captureVideo.json`)
  - `camera.message`: "To record video or take photos, this app needs access to your camera and microphone." (covers both photo and video; aligns with `app.json` expo-camera `cameraPermission`)
  - `camera.settingsCta`: "Grant Access" (matches `recorder.grantAccess`)
  - `microphone.title`: "Microphone Access Needed" (matches `captureVoice:permission.heading`)
  - `microphone.message`: "Voice memos need microphone access. You can enable it in your device settings." (matches `captureVoice:permission.body` verbatim)
  - `microphone.settingsCta`: "Open Settings" (matches `captureVoice:actions.openSettings`)
  - `photoLibrary.title`: "Photo Library Access Needed" (matches `capturePhoto:permission.libraryTitle` casing)
  - `photoLibrary.message`: "Please allow photo library access in your device settings to select photos." (matches `capturePhoto:permission.libraryMessage`)
  - `photoLibrary.settingsCta`: "Open Settings"
  - `videoLibrary.title`: "Photo Library Access Needed"
  - `videoLibrary.message`: "Please allow photo library access in your device settings to select videos." (matches `captureVideo:permission.libraryMessage` — same permission, video-specific context)
  - `videoLibrary.settingsCta`: "Open Settings"
  - `location.title`: "Location Access Needed"
  - `location.message`: "This feature needs location access. You can enable it in your device settings."
  - `location.settingsCta`: "Open Settings"

**Terminology note**: `camera.title` uses "Camera Access Needed" (Title Case) to match the existing `captureVideo:recorder.permissionTitle` and iOS/Android native dialog convention. `app.json` uses "Allow $(PRODUCT_NAME) to…" phrasing for system dialogs — our in-app strings are the fallback UI shown after denial, so different phrasing is correct.

### Step 2: Migrate `CapturePhoto` call sites

**Files**:

- `apps/native-rd/src/screens/CapturePhoto/CapturePhoto.tsx`

**Commit**: `feat(i18n): migrate CapturePhoto permission alerts to permissions namespace`

**Changes**:

- [ ] Change `t("permission.cameraTitle")` → `t("permissions:camera.title")`
- [ ] Change `t("permission.cameraMessage")` → `t("permissions:camera.message")`
- [ ] Change `t("permission.libraryTitle")` → `t("permissions:photoLibrary.title")`
- [ ] Change `t("permission.libraryMessage")` → `t("permissions:photoLibrary.message")`
- [ ] No namespace array change needed — `CapturePhoto` uses `useTranslation("capturePhoto")` and the explicit `permissions:` namespace prefix in the key string is sufficient for i18next to resolve cross-namespace keys

### Step 3: Migrate `CaptureVideoScreen` call sites

**Files**:

- `apps/native-rd/src/screens/CaptureVideoScreen/CaptureVideoScreen.tsx`

**Commit**: `feat(i18n): migrate CaptureVideoScreen library permission alert to permissions namespace`

**Changes**:

- [ ] Change `t("permission.libraryTitle")` → `t("permissions:videoLibrary.title")`
- [ ] Change `t("permission.libraryMessage")` → `t("permissions:videoLibrary.message")`
- [ ] No namespace array change needed (same cross-namespace key approach)

### Step 4: Migrate `VideoRecorder` call sites

**Files**:

- `apps/native-rd/src/components/VideoRecorder/VideoRecorder.tsx`

**Commit**: `feat(i18n): migrate VideoRecorder permission card to permissions namespace`

**Changes**:

- [ ] Change `useTranslation("captureVideo")` → `useTranslation(["captureVideo", "permissions"])` so TypeScript resolves `permissions:…` keys through the typed namespace
- [ ] Change `t("recorder.permissionTitle")` → `t("permissions:camera.title")`
- [ ] Change `t("recorder.permissionBody")` → `t("permissions:camera.message")`
- [ ] Change `t("recorder.grantAccess")` → `t("permissions:camera.settingsCta")`

### Step 5: Migrate `VoiceMemoScreen` call sites

**Files**:

- `apps/native-rd/src/screens/VoiceMemoScreen/VoiceMemoScreen.tsx`

**Commit**: `feat(i18n): migrate VoiceMemoScreen permission-denied UI to permissions namespace`

**Changes**:

- [ ] `useTranslation` already uses array form `["captureVoice", "common"]` — change to `["captureVoice", "common", "permissions"]`
- [ ] Change `t("captureVoice:permission.heading")` → `t("permissions:microphone.title")`
- [ ] Change `t("captureVoice:permission.body")` → `t("permissions:microphone.message")`
- [ ] Change `t("captureVoice:actions.openSettings")` → `t("permissions:microphone.settingsCta")` (only the call in the `permission-denied` branch; confirm no other call site for `captureVoice:actions.openSettings` via grep before deleting the key)

### Step 6: Retire old keys from capture JSON files

**Files**:

- `apps/native-rd/src/i18n/resources/en/capturePhoto.json`
- `apps/native-rd/src/i18n/resources/en/captureVideo.json`
- `apps/native-rd/src/i18n/resources/en/captureVoice.json`

**Commit**: `feat(i18n): retire per-namespace permission keys from capture namespaces`

**Changes**:

- [ ] `capturePhoto.json`: delete the `"permission"` object (all four keys: `cameraTitle`, `cameraMessage`, `libraryTitle`, `libraryMessage`)
- [ ] `captureVideo.json`: delete the top-level `"permission"` object (`libraryTitle`, `libraryMessage`) and delete `recorder.permissionTitle`, `recorder.permissionBody`, `recorder.grantAccess` from within the `"recorder"` object — leave all other `recorder.*` keys untouched
- [ ] `captureVoice.json`: delete the `"permission"` object (`heading`, `body`); also delete `actions.openSettings` if grep in Step 5 confirmed it has no other callers — if another call site exists (e.g., a future try-again flow), leave `actions.openSettings` in place and only add `openSettings` to the `permissions.microphone` namespace

### Step 7: Regenerate pseudo locale

**Files**:

- `apps/native-rd/src/i18n/resources/pseudo/permissions.json`
- `apps/native-rd/src/i18n/resources/pseudo/capturePhoto.json`
- `apps/native-rd/src/i18n/resources/pseudo/captureVideo.json`
- `apps/native-rd/src/i18n/resources/pseudo/captureVoice.json`

**Commit**: `chore(i18n): regenerate pseudo locale for permissions namespace migration`

**Changes**:

- [ ] Run `bun run gen:pseudo` from `apps/native-rd/`
- [ ] Verify `pseudo/permissions.json` is now non-empty (15 leaf keys, all bracketed/accented)
- [ ] Verify `pseudo/capturePhoto.json`, `captureVideo.json`, `captureVoice.json` no longer contain `permission.*` keys (or `recorder.permissionTitle/Body/grantAccess`)
- [ ] Commit the four regenerated files

### Step 8: Update tests

**Files**:

- `apps/native-rd/src/screens/CapturePhoto/__tests__/CapturePhoto.test.tsx`
- `apps/native-rd/src/screens/CaptureVideoScreen/__tests__/CaptureVideoScreen.test.tsx`
- `apps/native-rd/src/components/VideoRecorder/__tests__/VideoRecorder.test.tsx`
- `apps/native-rd/src/screens/VoiceMemoScreen/__tests__/VoiceMemoScreen.test.tsx`

**Commit**: `test(i18n): update capture screen tests for permissions namespace migration`

**Changes**:

- [ ] `CapturePhoto.test.tsx`: the "does not launch camera when permission denied" and "does not launch library when permission denied" tests assert no Alert, which remains valid; if any test asserts Alert copy, update to `i18n.t("permissions:camera.title")` / `i18n.t("permissions:photoLibrary.title")` etc.
- [ ] `CaptureVideoScreen.test.tsx`: update any assertion on `captureVideo:permission.libraryTitle` → `permissions:videoLibrary.title`
- [ ] `VideoRecorder.test.tsx` line 79: update `i18n.t("captureVideo:recorder.permissionTitle")` → `i18n.t("permissions:camera.title")`; similarly update any other permission card assertions
- [ ] `VoiceMemoScreen.test.tsx` line 272: update `i18n.t("captureVoice:permission.heading")` → `i18n.t("permissions:microphone.title")`; update `permission.body` and `actions.openSettings` assertions in the permission-denied describe block

## Testing Strategy

- [ ] Unit tests: update four existing test files (listed above) — no new test files needed
- [ ] Test file paths mirror `src/` under `src/__tests__/` per project convention (already the case for all four)
- [ ] Run `bun test --testPathPatterns "CapturePhoto|CaptureVideoScreen|VideoRecorder|VoiceMemoScreen|locale-parity|option-key-parity"` to confirm green
- [ ] Run `bun run type-check` — typed `t()` calls must resolve against populated `permissions` namespace
- [ ] Manual check: confirm `pseudo/permissions.json` has 15 bracketed leaf keys after `gen:pseudo`

## Not in Scope

| Item                                                                                | Reason                                                                                                   | Follow-up                                                              |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Lint rule asserting capture screens cannot import `permission.*` from own namespace | Explicitly deferred in issue body as separate ticket                                                     | Issue body mentions follow-up ticket                                   |
| `#76` closeout (canonical permission keyspace verification)                         | Depends on this PR landing first                                                                         | #76                                                                    |
| `#144` cleanup                                                                      | Should land after this; issue body notes this PR must land first to avoid churning same call sites twice | #144                                                                   |
| `location` call sites                                                               | No screen currently requests location permission                                                         | Pre-populated in Step 1 for completeness; call sites added when needed |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

### Implementation discoveries (2026-05-23)

- [2026-05-23 21:30] TypeScript typed `t()` does NOT resolve cross-namespace prefix keys (e.g. `t("permissions:camera.title")`) when the namespace is not in the `useTranslation` array. Step 2 and Step 3 of the plan said no namespace array change was needed — this was incorrect. `CapturePhoto.tsx` and `CaptureVideoScreen.tsx` both required `useTranslation(["<existing>", "permissions"])` to type-check. The runtime resolution works either way; only the typed `t()` overload is namespace-array-sensitive. Matches Decision D1 spirit (apply to all four call sites).

### Pre-plan discoveries (researcher, 2026-05-23)

- `VoiceMemoScreen` already imports `useTranslation` with an array `["captureVoice", "common"]` — extending to `["captureVoice", "common", "permissions"]` is a one-token change.
- `captureVoice:actions.openSettings` is only called inside the `permission-denied` branch (line 139 of `VoiceMemoScreen.tsx`) — no other callers. Safe to retire after migration.
- `VideoRecorder` is a shared component (`src/components/VideoRecorder/`) not a screen — its tests live at `src/components/VideoRecorder/__tests__/VideoRecorder.test.tsx`.
- `CapturePhoto` and `CaptureVideoScreen` use single-string `useTranslation("capturePhoto")` / `useTranslation("captureVideo")` — cross-namespace `t("permissions:…")` calls work without listing `"permissions"` in the namespace array because i18next resolves the explicit namespace prefix from the key string. However, TypeScript typed `t()` will only validate keys in the declared namespaces. To keep full type safety, add `"permissions"` to the namespace array in all four components (consistent with Decision D1).
- `i18next.d.ts` already declares `permissions: typeof permissions` — once `permissions.json` is populated, all `t("permissions:…")` calls will type-check automatically.
- `app.json` distinguishes three distinct system permissions: `expo-image-picker.cameraPermission` (photo taking), `expo-image-picker.photosPermission` (library access for both photos and videos), `expo-camera.cameraPermission` (video recording), `expo-camera.microphonePermission` (audio during video), `expo-audio.microphonePermission` (voice memo). The `photoLibrary` and `videoLibrary` sources both map to `photosPermission` at the iOS level — the in-app strings differ only in their contextual message ("select photos" vs "select videos").
- `useAudioRecorder.ts` (line 126) hardcodes an English error string `"Microphone permission is required to record voice memos."` into `setError(...)` — this is surfaced in the `{error && <Card>…</Card>}` block of `VoiceMemoScreen`. This is a separate concern from the permission-denied heading/body (which are static rendered copy), and is out of scope for this issue but worth noting for a future cleanup.
