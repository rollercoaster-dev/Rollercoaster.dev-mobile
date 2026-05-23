# Development Plan: Issue #70

## Issue Summary

**Title**: i18n: migrate evidence capture (photo, video, voice memo)
**Type**: enhancement
**Complexity**: MEDIUM
**Estimated Lines**: ~420 lines (3 screen files ~90 lines each, VideoRecorder ~60 lines, 3 JSON namespaces ~40 lines each, test updates ~90 lines)

## Intent Verification

Observable criteria derived from the issue.

- [ ] When `CapturePhoto` renders with the pseudo locale active, every visible string and every `accessibilityLabel` is bracketed/accented — no plain English remains in the screen (header, card heading, button labels, alert titles/messages, activity indicator label).
- [ ] When `CaptureVideoScreen` renders with the pseudo locale active, the chooser heading, both entry-point buttons, the library-preview caption, the preview action buttons ("Retake", saving/use states), the discard-alert copy, and the `accessibilityNoun` passed to `VideoPreview` all show pseudo output.
- [ ] When `VideoRecorder` renders with the pseudo locale active, the permission card, the recording-toggle button label, the flip-camera label, the duration accessibility label, the countdown warning ("Ns remaining"), the discard-alert copy, and the preview-mode labels all show pseudo output.
- [ ] When `VoiceMemoScreen` renders with the pseudo locale active, every status-row label (idle/requesting-permission/recording/paused/recorded/playing), the timer `accessibilityLabel`, all control button labels, the caption input `accessibilityLabel` and `placeholder`, the save/discard buttons, and the discard-alert copy all show pseudo output.
- [ ] `bun run type-check` reports zero errors after the migration (typed `t()` calls are exhaustive against the JSON shape via `i18next.d.ts`).
- [ ] `bun run test --testPathPatterns "CapturePhoto|CaptureVideoScreen|VoiceMemoScreen"` passes with test assertions updated to `i18n.t()` lookups for UI-copy queries.
- [ ] `bun run lint` passes with no new violations.
- [ ] `resources/pseudo/capturePhoto.json`, `captureVideo.json`, `captureVoice.json` are non-empty after `bun run gen:pseudo` runs and are committed alongside the `en/` counterparts.

## Dependencies

| Issue | Title                           | Status               | Type    |
| ----- | ------------------------------- | -------------------- | ------- |
| #65   | i18n: common shared labels      | Met (PR #113 merged) | Blocker |
| #68   | i18n: migrate Goals screen      | Met (PR #130 merged) | Blocker |
| #69   | i18n: migrate Focus Mode screen | Met (PR #134 merged) | Blocker |

The issue body notes `dep:blocked` referencing "foundation, testIDs, shared labels." Foundation (#65) and the `common` namespace are merged. `dep:blocked` label is stale per the 2026-05-18 milestone pivot — strip it in this PR's housekeeping.

**Status**: All dependencies met.

## Objective

Populate `resources/en/capturePhoto.json`, `resources/en/captureVideo.json`, and `resources/en/captureVoice.json` with every user-visible string from their three screens (plus the shared `VideoRecorder` component), wire `useTranslation()` calls in each file, regenerate the pseudo JSON, and update the existing test assertions to use `i18n.t()` lookups so the test suite remains green regardless of copy tweaks.

Permission-denied UI strings in `VoiceMemoScreen` (`status === "permission-denied"` branch) are included here because they are inline in the screen component and not the cross-cutting banner tracked under #72. See Out of Scope for clarification.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                  | Alternatives Considered                                                 | Rationale                                                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Migrate `VideoRecorder`'s strings into `captureVideo` namespace                                                                                                                                                                           | Separate `videoRecorder` namespace                                      | `VideoRecorder` is only consumed by `CaptureVideoScreen`; its strings are semantically part of the same capture flow. A separate namespace would increase namespace count with no benefit.                                                                                                                                                |
| D2  | Include `VoiceMemoScreen`'s inline permission-denied branch in `captureVoice`                                                                                                                                                             | Defer to #72                                                            | The `permission-denied` branch in `VoiceMemoScreen` is not a shared `PermissionBanner` component — it is inline JSX. #72 tracks the shared cross-cutting banner component (CapturePhoto/CaptureVideo also have inline Alert calls for permissions). The inline strings belong here; the shared component rewrite (if any) is #72's scope. |
| D3  | `VoiceMemoScreen` already imports `useTranslation` (partial — only `t("actions.dismiss")`). Do not remove the import; extend the hook call to `useTranslation(["captureVoice", "common"])`.                                               | Re-add import                                                           | Extends existing work, keeps diff minimal.                                                                                                                                                                                                                                                                                                |
| D4  | Status strings for the voice memo recorder (`idle`, `recording`, `paused`, etc.) are keyed directly under `captureVoice:status.*` rather than reusing `common:status.*`.                                                                  | Reuse `common:status.*`                                                 | `common:status.*` encodes goal/badge lifecycle states ("Active", "Done", "Locked"). Voice memo states ("Recording", "Paused", "Playing") are recorder-specific and semantically distinct. Same decision as used in #69 for focus-mode-specific states.                                                                                    |
| D5  | Inline `accessibilityLabel` on `VoiceMemoScreen`'s timer uses an interpolated key `captureVoice:a11y.timerLabel` with a `{{time}}` param.                                                                                                 | Concatenation                                                           | Matches the `docs/i18n.md` "no fragment concatenation" rule.                                                                                                                                                                                                                                                                              |
| D6  | `VideoRecorder`'s dynamic flip-camera label (`Switch to ${facing === "back" ? "front" : "back"} camera`) becomes two explicit keys: `captureVideo:recorder.a11y.switchToFrontCamera` and `captureVideo:recorder.a11y.switchToBackCamera`. | Single interpolated key `switchToCamera: "Switch to {{facing}} camera"` | The word "front"/"back" is not a variable for translators — German would not say "Wechsle zur back Kamera." Two keys let the translator phrase each direction naturally. Pattern follows `focusMode`'s two a11y keys for show/hide timeline.                                                                                              |
| D7  | `VideoRecorder`'s countdown warning (`${MAX_DURATION_SECONDS - elapsed}s remaining`) uses an interpolated key with `{{seconds}}`.                                                                                                         | Two variants for plural                                                 | No plurals before #66 (milestone policy). Single key with `{{seconds}}` for now.                                                                                                                                                                                                                                                          |

## Affected Areas

- `apps/native-rd/src/screens/CapturePhoto/CapturePhoto.tsx`: add `useTranslation("capturePhoto")`, replace 8 raw strings (screen header, card heading, button labels, alert title/message x2, ActivityIndicator accessibilityLabel).
- `apps/native-rd/src/screens/CaptureVideoScreen/CaptureVideoScreen.tsx`: add `useTranslation(["captureVideo", "common"])`, replace 10 raw strings (screen header, chooser heading, chooser buttons, preview caption prefix, Retake/Use Video/Saving..., discard-alert title/message/buttons).
- `apps/native-rd/src/components/VideoRecorder/VideoRecorder.tsx`: add `useTranslation("captureVideo")`, replace 15 raw strings (permission-card heading/body/button, loading text, recording toggle labels, flip-camera labels, timer a11y label, countdown warning, discard-alert variants, preview Retake/Use Video/Saving.../Duration prefix, camera viewfinder a11y label with dynamic `facing`, recorded video accessibilityNoun).
- `apps/native-rd/src/screens/VoiceMemoScreen/VoiceMemoScreen.tsx`: extend existing `useTranslation` to `useTranslation(["captureVoice", "common"])`, replace 22 raw strings (screen header in both branches, permission-denied card copy, status row texts x6, timer a11y label, pause/resume/start/stop recording labels, playback Stop/Play/Re-record buttons, caption input placeholder and accessibilityLabel, Attach/Discard buttons, discard-alert x2 titles/messages/button labels, save-error alert).
- `apps/native-rd/src/i18n/resources/en/capturePhoto.json`: populate from `{}`.
- `apps/native-rd/src/i18n/resources/en/captureVideo.json`: populate from `{}` (includes VideoRecorder strings).
- `apps/native-rd/src/i18n/resources/en/captureVoice.json`: populate from `{}`.
- `apps/native-rd/src/i18n/resources/pseudo/capturePhoto.json`: regenerated by `bun run gen:pseudo`.
- `apps/native-rd/src/i18n/resources/pseudo/captureVideo.json`: regenerated by `bun run gen:pseudo`.
- `apps/native-rd/src/i18n/resources/pseudo/captureVoice.json`: regenerated by `bun run gen:pseudo`.
- `apps/native-rd/src/screens/CapturePhoto/__tests__/CapturePhoto.test.tsx`: swap literal-string queries to `i18n.t()` lookups; add pseudo-locale smoke block.
- `apps/native-rd/src/screens/CaptureVideoScreen/__tests__/CaptureVideoScreen.test.tsx`: same.
- `apps/native-rd/src/screens/VoiceMemoScreen/__tests__/VoiceMemoScreen.test.tsx`: same.

**`i18next.d.ts` does not require edits** — it already imports the types from `resources/en/capturePhoto.json`, `captureVideo.json`, and `captureVoice.json`. Once those files are populated the typed `t()` inferences activate automatically.

## Proposed JSON Shape

### `resources/en/capturePhoto.json`

```json
{
  "title": "Capture Photo",
  "heading": "Add a photo",
  "actions": {
    "takePhoto": "Take Photo",
    "chooseFromLibrary": "Choose from Library"
  },
  "a11y": {
    "savingPhoto": "Saving photo"
  },
  "errors": {
    "saveFailedTitle": "Save failed",
    "saveFailedMessage": "Could not save the photo. Please try again."
  },
  "permission": {
    "cameraTitle": "Camera access needed",
    "cameraMessage": "Please allow camera access in your device settings to take photos.",
    "libraryTitle": "Photo library access needed",
    "libraryMessage": "Please allow photo library access in your device settings to select photos."
  }
}
```

### `resources/en/captureVideo.json`

```json
{
  "title": "Capture Video",
  "heading": "Add a video",
  "actions": {
    "recordVideo": "Record Video",
    "chooseFromLibrary": "Choose from Library",
    "retake": "Retake",
    "useVideo": "Use Video",
    "saving": "Saving..."
  },
  "preview": {
    "durationPrefix": "Duration:"
  },
  "discard": {
    "title": "Discard video?",
    "message": "You have an unsaved video. Going back will discard it.",
    "keep": "Keep",
    "discard": "Discard"
  },
  "permission": {
    "libraryTitle": "Photo library access needed",
    "libraryMessage": "Please allow photo library access in your device settings to select videos."
  },
  "recorder": {
    "loading": "Loading...",
    "permissionTitle": "Camera Access Needed",
    "permissionBody": "To record video evidence, this app needs access to your camera and microphone.",
    "grantAccess": "Grant Access",
    "recordedVideoNoun": "Recorded video",
    "selectedVideoNoun": "Selected video",
    "countdown": "{{seconds}}s remaining",
    "a11y": {
      "startRecording": "Start recording",
      "stopRecording": "Stop recording",
      "switchToFrontCamera": "Switch to front camera",
      "switchToBackCamera": "Switch to back camera",
      "cameraViewfinder": "Camera viewfinder, {{facing}} camera",
      "recordingTime": "Recording time: {{time}}"
    },
    "discardWhileRecording": {
      "title": "Discard recording?",
      "message": "You're still recording. Going back will stop and discard the video.",
      "keep": "Keep Recording",
      "discard": "Discard"
    },
    "discardRecorded": {
      "title": "Discard recording?",
      "message": "You have an unsaved video. Going back will discard it.",
      "keep": "Keep",
      "discard": "Discard"
    },
    "errors": {
      "recordingFailedTitle": "Recording Failed",
      "recordingFailedMessage": "Could not record video. Please try again."
    }
  }
}
```

### `resources/en/captureVoice.json`

```json
{
  "title": "Voice Memo",
  "status": {
    "idle": "Tap to start recording",
    "requestingPermission": "Requesting permission...",
    "recording": "Recording",
    "paused": "Paused",
    "recorded": "Recording complete",
    "playing": "Playing"
  },
  "actions": {
    "attach": "Attach",
    "discard": "Discard",
    "play": "Play",
    "stop": "Stop",
    "reRecord": "Re-record",
    "openSettings": "Open Settings",
    "tryAgain": "Try Again"
  },
  "caption": {
    "placeholder": "Add a caption (optional)",
    "a11yLabel": "Caption for voice memo"
  },
  "a11y": {
    "timerLabel": "Recording duration: {{time}}",
    "startRecording": "Start recording",
    "stopRecording": "Stop recording",
    "pauseRecording": "Pause recording",
    "resumeRecording": "Resume recording"
  },
  "discard": {
    "title": "Discard recording?",
    "message": "You have an unsaved recording. Going back will discard it.",
    "keep": "Keep Recording",
    "discardAction": "Discard",
    "confirmTitle": "Discard recording?",
    "confirmMessage": "This recording will be lost.",
    "confirmKeep": "Keep",
    "confirmDiscard": "Discard"
  },
  "permission": {
    "heading": "Microphone Access Needed",
    "body": "Voice memos need microphone access. You can enable it in your device settings."
  },
  "errors": {
    "saveFailedTitle": "Could not save",
    "saveFailedMessage": "Something went wrong saving the voice memo. Please try again."
  }
}
```

**Keys already in `common`** that these screens reuse (no duplication):

- `common:actions.dismiss` — already used in `VoiceMemoScreen` for the error card dismiss button. Keep using this key.
- `common:actions.cancel`, `common:actions.back` — available if needed for future hardening, but current Alert button text is specific enough to warrant screen-scoped keys.

## Implementation Plan

### Step 1: Populate `capturePhoto.json` and migrate `CapturePhoto.tsx`

**Files**:

- `apps/native-rd/src/i18n/resources/en/capturePhoto.json`
- `apps/native-rd/src/i18n/resources/pseudo/capturePhoto.json` (regenerated)
- `apps/native-rd/src/screens/CapturePhoto/CapturePhoto.tsx`
- `apps/native-rd/src/screens/CapturePhoto/__tests__/CapturePhoto.test.tsx`

**Commit**: `feat(native-rd): i18n migrate CapturePhoto screen (#70)`

**Changes**:

- [ ] Populate `capturePhoto.json` with the JSON shape above (8 keys across `title`, `heading`, `actions`, `a11y`, `errors`, `permission`).
- [ ] Run `bun run gen:pseudo` to populate `pseudo/capturePhoto.json`.
- [ ] In `CapturePhoto.tsx`: add `import { useTranslation } from "react-i18next"` and `const { t } = useTranslation("capturePhoto")` at the top of the component body.
- [ ] Replace `label="Capture Photo"` on `ScreenSubHeader` with `label={t("title")}`.
- [ ] Replace `"Add a photo"` inside `<Text>` with `{t("heading")}`.
- [ ] Replace `label="Take Photo"` on `<Button>` with `label={t("actions.takePhoto")}`.
- [ ] Replace `label="Choose from Library"` on `<Button>` with `label={t("actions.chooseFromLibrary")}`.
- [ ] Replace `accessibilityLabel="Saving photo"` on `<ActivityIndicator>` with `accessibilityLabel={t("a11y.savingPhoto")}`.
- [ ] Replace `Alert.alert("Camera access needed", "Please allow camera access ...")` with `Alert.alert(t("permission.cameraTitle"), t("permission.cameraMessage"))`.
- [ ] Replace `Alert.alert("Photo library access needed", "Please allow photo library ...")` with `Alert.alert(t("permission.libraryTitle"), t("permission.libraryMessage"))`.
- [ ] Replace `Alert.alert("Save failed", "Could not save the photo. ...")` with `Alert.alert(t("errors.saveFailedTitle"), t("errors.saveFailedMessage"))`.
- [ ] In `CapturePhoto.test.tsx`: import `i18n` from `"../../../i18n"`. Replace every `getByText("Capture Photo")`, `getByText("Take Photo")`, `getByText("Choose from Library")` with `getByText(i18n.t("capturePhoto:title"))` etc. Replace Alert assertion strings with `i18n.t("capturePhoto:errors.saveFailedTitle")` and `i18n.t("capturePhoto:errors.saveFailedMessage")`. Add a `describe("pseudo locale")` block that switches to pseudo, renders, asserts key strings are not plain English, then resets.

### Step 2: Populate `captureVideo.json` and migrate `CaptureVideoScreen.tsx` + `VideoRecorder.tsx`

**Files**:

- `apps/native-rd/src/i18n/resources/en/captureVideo.json`
- `apps/native-rd/src/i18n/resources/pseudo/captureVideo.json` (regenerated)
- `apps/native-rd/src/screens/CaptureVideoScreen/CaptureVideoScreen.tsx`
- `apps/native-rd/src/components/VideoRecorder/VideoRecorder.tsx`
- `apps/native-rd/src/screens/CaptureVideoScreen/__tests__/CaptureVideoScreen.test.tsx`

**Commit**: `feat(native-rd): i18n migrate CaptureVideoScreen + VideoRecorder (#70)`

**Changes**:

`CaptureVideoScreen.tsx`:

- [ ] Add `import { useTranslation } from "react-i18next"` and `const { t } = useTranslation(["captureVideo", "common"])`.
- [ ] Replace `label="Capture Video"` on `ScreenSubHeader` with `label={t("captureVideo:title")}`.
- [ ] Replace `"Add a video"` in `<Text>` with `{t("captureVideo:heading")}`.
- [ ] Replace `label="Record Video"` with `label={t("captureVideo:actions.recordVideo")}`.
- [ ] Replace `label="Choose from Library"` with `label={t("captureVideo:actions.chooseFromLibrary")}`.
- [ ] Replace `label="Retake"` (library preview) with `label={t("captureVideo:actions.retake")}`.
- [ ] Replace `label={isSaving ? "Saving..." : "Use Video"}` with `label={isSaving ? t("captureVideo:actions.saving") : t("captureVideo:actions.useVideo")}`.
- [ ] Replace `<Text variant="caption" ...>Duration: {formatDuration(...)}</Text>` — split to `{t("captureVideo:preview.durationPrefix")} {formatDuration(...)}`. NOTE: this is a display-only caption, not an a11y label, so a space-joined template is acceptable here (no fragment concatenation rule violation since the duration value is data, not translatable copy). If lint or docs/i18n.md disagrees, move the whole string to an interpolated key `durationLabel: "Duration: {{duration}}"`.
- [ ] Replace Alert strings in `handleGoBack` discard dialog with `t("captureVideo:discard.*")` keys.
- [ ] Replace `Alert.alert("Photo library access needed", ...)` with `t("captureVideo:permission.libraryTitle")` and `t("captureVideo:permission.libraryMessage")`.
- [ ] Replace `Alert.alert("Save Failed", ...)` with — wait, `CaptureVideoScreen` does not have a separate save-failed Alert visible in the screen body; the save failure alert message `"Could not save video. Please try again."` is inside `handleSaveVideo`. Add a key `errors.saveFailedTitle: "Save Failed"` and `errors.saveFailedMessage: "Could not save video. Please try again."` to `captureVideo.json` and wire it.
- [ ] Replace `accessibilityNoun="Selected video"` on `VideoPreview` with `accessibilityNoun={t("captureVideo:recorder.selectedVideoNoun")}`.

`VideoRecorder.tsx`:

- [ ] Add `import { useTranslation } from "react-i18next"` and `const { t } = useTranslation("captureVideo")`.
- [ ] Replace `"Loading..."` with `{t("recorder.loading")}`.
- [ ] Replace `"Camera Access Needed"` (headline) with `{t("recorder.permissionTitle")}`.
- [ ] Replace the permission body text with `{t("recorder.permissionBody")}`.
- [ ] Replace `label="Grant Access"` with `label={t("recorder.grantAccess")}`.
- [ ] Replace `accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}` with `accessibilityLabel={isRecording ? t("recorder.a11y.stopRecording") : t("recorder.a11y.startRecording")}`.
- [ ] Replace ``accessibilityLabel={`Switch to ${facing === "back" ? "front" : "back"} camera`}`` with `accessibilityLabel={facing === "back" ? t("recorder.a11y.switchToFrontCamera") : t("recorder.a11y.switchToBackCamera")}`.
- [ ] Replace ``accessibilityLabel={`Recording time: ${formatDuration(elapsed * 1000)}`}`` with `accessibilityLabel={t("recorder.a11y.recordingTime", { time: formatDuration(elapsed * 1000) })}`.
- [ ] Replace ``accessibilityLabel={`Camera viewfinder, ${facing} camera`}`` with `accessibilityLabel={t("recorder.a11y.cameraViewfinder", { facing })}`. (Open question: see below on dynamic `facing` value.)
- [ ] Replace `{MAX_DURATION_SECONDS - elapsed}s remaining` with `{t("recorder.countdown", { seconds: MAX_DURATION_SECONDS - elapsed })}`.
- [ ] Replace Alert strings in `requestExit` (both discard variants) with `t("recorder.discardWhileRecording.*")` and `t("recorder.discardRecorded.*")`.
- [ ] Replace `Alert.alert("Recording Failed", ...)` with `t("recorder.errors.recordingFailedTitle")`, `t("recorder.errors.recordingFailedMessage")`.
- [ ] Replace `label="Retake"`, `label={isSaving ? "Saving..." : "Use Video"}` in preview with `t("actions.retake")`, `t("actions.saving")`, `t("actions.useVideo")`.
- [ ] Replace `Duration: {formatDuration(elapsed * 1000)}` with `{t("preview.durationPrefix")} {formatDuration(elapsed * 1000)}` (same decision as above in CaptureVideoScreen).
- [ ] Replace `accessibilityNoun="Recorded video"` on `VideoPreview` with `accessibilityNoun={t("recorder.recordedVideoNoun")}`.

`CaptureVideoScreen.test.tsx`:

- [ ] Import `i18n` from `"../../../i18n"`. Replace `getByText("Add a video")`, `getByText("Record Video")`, `getByText("Choose from Library")`, `getByText("Retake")`, `getByText("Use Video")` with `i18n.t("captureVideo:…")` lookups.
- [ ] Replace `getByText("Camera Access Needed")`, `getByText("Grant Access")` with `i18n.t("captureVideo:recorder.permissionTitle")` etc.
- [ ] Replace Alert title assertions (`"Photo library access needed"`) with `i18n.t("captureVideo:permission.libraryTitle")`.
- [ ] Add a `describe("pseudo locale")` smoke block.

### Step 3: Populate `captureVoice.json` and migrate `VoiceMemoScreen.tsx`

**Files**:

- `apps/native-rd/src/i18n/resources/en/captureVoice.json`
- `apps/native-rd/src/i18n/resources/pseudo/captureVoice.json` (regenerated)
- `apps/native-rd/src/screens/VoiceMemoScreen/VoiceMemoScreen.tsx`
- `apps/native-rd/src/screens/VoiceMemoScreen/__tests__/VoiceMemoScreen.test.tsx`

**Commit**: `feat(native-rd): i18n migrate VoiceMemoScreen (#70)`

**Changes**:

`VoiceMemoScreen.tsx`:

- [ ] Extend existing `const { t } = useTranslation()` to `const { t } = useTranslation(["captureVoice", "common"])`.
- [ ] Replace `label="Voice Memo"` on both `ScreenSubHeader` usages (permission-denied branch and main render) with `label={t("captureVoice:title")}`.
- [ ] Replace `"Microphone Access Needed"` (`<Text variant="headline">`) with `{t("captureVoice:permission.heading")}`.
- [ ] Replace permission body text with `{t("captureVoice:permission.body")}`.
- [ ] Replace `label="Open Settings"` with `label={t("captureVoice:actions.openSettings")}`.
- [ ] Replace `label="Try Again"` with `label={t("captureVoice:actions.tryAgain")}`.
- [ ] Replace the six status-row conditional strings:
  - `"Tap to start recording"` → `{t("captureVoice:status.idle")}`
  - `"Requesting permission..."` → `{t("captureVoice:status.requestingPermission")}`
  - `"Recording"` → `{t("captureVoice:status.recording")}`
  - `"Paused"` → `{t("captureVoice:status.paused")}`
  - `"Recording complete"` → `{t("captureVoice:status.recorded")}`
  - `"Playing"` → `{t("captureVoice:status.playing")}`
- [ ] Replace ``accessibilityLabel={`Recording duration: ${formatDuration(...)}`}`` on timer `<Text>` with `accessibilityLabel={t("captureVoice:a11y.timerLabel", { time: formatDuration(...) })}`.
- [ ] Replace `accessibilityLabel="Pause recording"` with `accessibilityLabel={t("captureVoice:a11y.pauseRecording")}`.
- [ ] Replace `accessibilityLabel="Resume recording"` with `accessibilityLabel={t("captureVoice:a11y.resumeRecording")}`.
- [ ] Replace `accessibilityLabel={status === "idle" ? "Start recording" : "Stop recording"}` with `accessibilityLabel={status === "idle" ? t("captureVoice:a11y.startRecording") : t("captureVoice:a11y.stopRecording")}`.
- [ ] Replace `label="Stop"` / `label="Play"` with `t("captureVoice:actions.stop")` / `t("captureVoice:actions.play")`.
- [ ] Replace `label="Re-record"` with `label={t("captureVoice:actions.reRecord")}`.
- [ ] Replace `placeholder="Add a caption (optional)"` with `placeholder={t("captureVoice:caption.placeholder")}`.
- [ ] Replace `accessibilityLabel="Caption for voice memo"` with `accessibilityLabel={t("captureVoice:caption.a11yLabel")}`.
- [ ] Replace `label="Attach"` with `label={t("captureVoice:actions.attach")}`.
- [ ] Replace `label="Discard"` (destructive button) with `label={t("captureVoice:actions.discard")}`.
- [ ] Replace Alert strings in `handleGoBack` (`"Discard recording?"`, `"You have an unsaved recording..."`, `"Keep Recording"`, `"Discard"`) with `t("captureVoice:discard.*")` keys.
- [ ] Replace inner Discard button Alert (`"Discard recording?"`, `"This recording will be lost."`, `"Keep"`, `"Discard"`) with `t("captureVoice:discard.confirmTitle")` etc.
- [ ] Replace `Alert.alert("Could not save", ...)` with `t("captureVoice:errors.saveFailedTitle")`, `t("captureVoice:errors.saveFailedMessage")`.
- [ ] The existing `t("actions.dismiss")` call (error dismiss button) becomes `t("common:actions.dismiss")` since we're now explicitly naming namespaces.

`VoiceMemoScreen.test.tsx`:

- [ ] Import `i18n` from `"../../../i18n"`. Replace every `getByText(...)` and `getByLabelText(...)` assertion that targets UI copy with an `i18n.t("captureVoice:…")` lookup:
  - `"Voice Memo"` → `i18n.t("captureVoice:title")`
  - `"Tap to start recording"` → `i18n.t("captureVoice:status.idle")`
  - `"Start recording"` / `"Stop recording"` etc. → `i18n.t("captureVoice:a11y.*")`
  - `"Recording"`, `"Paused"`, `"Recording complete"`, `"Playing"` → `i18n.t("captureVoice:status.*")`
  - `"Play"`, `"Stop"`, `"Re-record"`, `"Attach"`, `"Discard"` → `i18n.t("captureVoice:actions.*")`
  - `"Caption for voice memo"` → `i18n.t("captureVoice:caption.a11yLabel")`
  - `"Microphone Access Needed"`, `"Open Settings"`, `"Try Again"` → `i18n.t("captureVoice:permission.*")`, `t("captureVoice:actions.*")`
  - `"Dismiss"` → `i18n.t("common:actions.dismiss")`
- [ ] Add a `describe("pseudo locale")` smoke block covering the idle state and the recording state.

## Testing Strategy

- [ ] Unit tests: `bun run test --testPathPatterns "CapturePhoto|CaptureVideoScreen|VoiceMemoScreen"` — existing behavioral coverage preserved; only assertion strings change to `i18n.t()` lookups.
- [ ] Test files mirror `src/` under `src/__tests__/` — already the case for all three screens (confirmed above).
- [ ] Each test file gets a `describe("pseudo locale")` block; pattern from `docs/i18n.md`:
  ```ts
  describe("pseudo locale", () => {
    beforeAll(() => i18n.changeLanguage("pseudo"));
    afterAll(() => i18n.changeLanguage("en"));
    it("renders screen title in pseudo", () => {
      renderScreen();
      expect(screen.getByText(i18n.t("capturePhoto:title"))).toBeTruthy();
    });
  });
  ```
- [ ] After each `en/*.json` edit: `bun run gen:pseudo` from `apps/native-rd/` — commit `en/` and `pseudo/` together.
- [ ] Type-check: `bun run type-check` — typed `t()` calls will fail at compile time if any key is misspelled (because `i18next.d.ts` infers from the JSON shape).
- [ ] Lint: `bun run lint` — no new violations expected.
- [ ] Pseudo locale manual smoke (user-run, not agent-run): `EXPO_PUBLIC_I18N_PSEUDO=true` + Metro restart — walk the three screens, verify every string is bracketed/accented, no plain English visible.

## Not in Scope

| Item                                                                                    | Reason                                                                                                                                                                                                                                                                                                | Follow-up |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Permission-denied shared banner component (if one is introduced in future)              | #72 tracks the cross-cutting permission UI rewrite. The inline `Alert.alert` calls for camera/library permission in `CapturePhoto` and `CaptureVideoScreen` are included here because they are plain Alert calls, not a shared component. #72 decides whether to extract a shared `PermissionBanner`. | #72       |
| German `resources/de/capturePhoto.json`, `de/captureVideo.json`, `de/captureVoice.json` | Generated translations are #76's first-batch concern. This PR ships English + pseudo only.                                                                                                                                                                                                            | #76       |
| `CaptureTextNote`, `CaptureFile`, `CaptureLink` screens                                 | Tracked in #71.                                                                                                                                                                                                                                                                                       | #71       |
| Adding `testID` attributes to capture screen elements                                   | #64's scope (deferred post-ship per milestone plan).                                                                                                                                                                                                                                                  | #64       |
| Plurals in any key (e.g. countdown "1 second remaining" vs "N seconds")                 | Gated on #66 Hermes Intl spike. `{{seconds}}s remaining` as a single key is the correct interim shape.                                                                                                                                                                                                | #66       |
| Raw-string ESLint rule                                                                  | #63's scope.                                                                                                                                                                                                                                                                                          | #63       |
| `VideoPreview` component's internal strings                                             | `VideoPreview` has no display strings of its own — it accepts `accessibilityNoun` as a prop which the calling screen passes. No migration needed inside `VideoPreview`.                                                                                                                               | none      |

## Open Questions

1. **`VideoRecorder` `cameraViewfinder` a11y label uses the raw `facing` string** (`"front"` / `"back"`): `"Camera viewfinder, front camera"` or `"Camera viewfinder, back camera"`. The current approach (`captureVideo:recorder.a11y.cameraViewfinder` with `{{facing}}` interpolation) embeds an English word as a variable. For German, this would render as "Kamerasucherfeld, back Kamera" unless the caller translates the `facing` value before interpolation. Decision: either (a) add two explicit keys `cameraViewfinderFront` / `cameraViewfinderBack` (consistent with D6 for the flip button), or (b) keep interpolation and accept that `facing` is a technical value that the accessibility label inherits. Recommend option (a) for consistency. Flag for implementor to decide; either is valid.

2. **`preview.durationPrefix`** used in both `CaptureVideoScreen` and `VideoRecorder`: the string `"Duration:"` appears as a label before the formatted duration. Two options: (a) keep as a prefix key and space-join with the formatted value in JSX, (b) use a single interpolated key `durationLabel: "Duration: {{duration}}"` that accepts the already-formatted duration string. Option (b) is cleaner for translators (they see the full sentence), consistent with `docs/i18n.md` "no fragment concatenation." Recommend option (b) unless the implementor wants to keep option (a) for simplicity. Flag, don't block.

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
