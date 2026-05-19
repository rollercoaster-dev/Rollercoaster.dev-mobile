# Video Evidence — Library Upload

**Status:** Active
**Created:** 2026-05-19
**Branch:** `video-upload-feature-planning`

## Context

The photo evidence flow (`apps/native-rd/src/screens/CapturePhoto/CapturePhoto.tsx`) gives the user two entry points — **Take Photo** and **Choose from Library** — both routed through a single `savePhoto()` path. The video evidence flow (`apps/native-rd/src/screens/CaptureVideoScreen/CaptureVideoScreen.tsx`) only supports **recording live** via `CameraView.recordAsync()`. There is no way to attach a pre-existing video from the device library.

The asymmetry exists because the two screens were built on different primitives:

- Photo uses `expo-image-picker`, which exposes both camera and library UIs with one flag (`mediaTypes`).
- Video uses `expo-camera`'s `CameraView` directly so the screen can enforce a 60-second cap natively (`recordAsync({ maxDuration })`). The library path was never wired in.

This plan adds a library-upload entry point to the video flow, mirroring the photo UX, and uses the occasion to fix a small storage-path inconsistency.

## Goals

1. Users can attach a video from the device library as evidence (in addition to recording live).
2. Video evidence storage follows the same `evidence/<type>/` convention photos use.
3. The change is purely additive for the existing recording flow — no behavior regressions.

## Non-goals (explicitly deferred)

- **Duration / file-size limits on uploads.** v1 accepts any length. Implication: a single uploaded clip could occupy hundreds of MB of device storage. Nothing in the evidence pipeline (DB row, `EvidenceThumbnail`, `VideoPlayerModal`) cares about file size — it just plays whatever URI is on the row. Limits can be added later without schema migration.
- **Compression / transcoding.**
- **In-app trim UI.**
- **Migration of already-saved recorded videos** out of the `evidence/` root. Existing on-device files stay where they are (URIs are absolute in the DB), so nothing breaks; the path convention only applies to newly written files.

## Decisions

| Question | Choice | Rationale |
| --- | --- | --- |
| Duration cap on uploads | None — accept any length | Personal/learning app; deferring storage concerns to a later iteration. |
| UX shape | Chooser-first Card (mirror photo) | Consistency with `CapturePhoto`. One extra tap for recorders is acceptable. |
| Component shape | Extract `<VideoRecorder/>` child component | `CaptureVideoScreen.tsx` is already ~360 lines; adding a third state inline would push it past the comfortable comprehension threshold. |
| Storage path | All videos → `evidence/videos/` via new `videoStorage.ts` util | Matches `evidence/photos/` pattern from `imageStorage.ts`. |
| Source telemetry | Add `source: "camera" \| "library"` to evidence metadata for both flows | Costs nothing; lets future code distinguish entry points. |

---

## Work breakdown

### 1. New util — `src/utils/videoStorage.ts`

Mirror `src/utils/imageStorage.ts` exactly. Subdir is `evidence/videos`, extension is `.mp4`.

```ts
import { File, Directory, Paths } from "expo-file-system";

const VIDEOS_SUBDIR = "evidence/videos";

function getVideosDirectory(): Directory {
  return new Directory(Paths.document, VIDEOS_SUBDIR);
}

export function getVideoStoragePath(): string {
  return getVideosDirectory().uri;
}

function generateFilename(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}.mp4`;
}

/** Moves the source file into the app's videos directory and returns the new URI. */
export function moveVideoToAppStorage(sourceUri: string): string {
  const videosDir = getVideosDirectory();
  if (!videosDir.exists) {
    videosDir.create({ intermediates: true });
  }
  const filename = generateFilename();
  const source = new File(sourceUri);
  const destination = new File(videosDir, filename);
  source.move(destination);
  return destination.uri;
}

/** Copies the source file into the app's videos directory. Used for library uploads
 *  where the source URI lives outside the app sandbox and must be preserved. */
export function copyVideoToAppStorage(sourceUri: string): string {
  const videosDir = getVideosDirectory();
  if (!videosDir.exists) {
    videosDir.create({ intermediates: true });
  }
  const filename = generateFilename();
  const source = new File(sourceUri);
  const destination = new File(videosDir, filename);
  source.copy(destination);
  return destination.uri;
}

export function deleteVideo(uri: string): void {
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}
```

**Why two functions?** Recorded videos live in a temp directory and should be moved (no leftover temp file). Library-picked videos may live in a cache the OS owns; copying is safer than moving since the picker's source URI semantics are platform-dependent. `imageStorage.saveImageToAppStorage` uses `copy` for the same reason; this is a deliberate parallel.

### 2. Extract `<VideoRecorder/>` component

New file: `src/components/VideoRecorder/VideoRecorder.tsx` (+ `VideoRecorder.styles.ts`, `index.ts`).

Encapsulates the existing camera + preview + record-button + flip-button UI from `CaptureVideoScreen.tsx:266-353`. Props:

```ts
type VideoRecorderProps = {
  onRecorded: (uri: string, durationSeconds: number, facing: "front" | "back") => void;
  onCancel: () => void;
};
```

State that moves into `VideoRecorder`:

- `cameraRef`, `timerRef`
- `cameraPermission`, `micPermission`
- `isRecording`, `recordedUri`, `elapsed`, `facing`
- `handleStartRecording`, `handleStopRecording`, `handleToggleRecording`, `handleFlipCamera`, `handleRetake`
- The `Preview` sub-component (currently defined inline in `CaptureVideoScreen.tsx:35-49`)
- The permissions Card, camera mode, preview mode branches

When the user confirms ("Use Video"), call `onRecorded(recordedUri, elapsed, facing)` instead of saving inline. Saving stays in the parent so both flows go through one code path.

`onCancel` fires when the user backs out (currently `navigation.goBack()` via `handleGoBack`); parent decides what "cancel" means.

### 3. Restructure `CaptureVideoScreen`

`CaptureVideoScreen` becomes a state machine with three modes:

```ts
type Mode = "chooser" | "recorder" | "library-preview";
```

Render branches:

- **`chooser`** — A `Card` mirroring `CapturePhoto.tsx:118-134`:
  ```
  Add a video
  [ Record Video    ] (primary)
  [ From Library    ] (secondary)
  ```
- **`recorder`** — Renders `<VideoRecorder onRecorded={handleSaveVideo} onCancel={() => setMode("chooser")} />`.
- **`library-preview`** — After the user picks a library video, show the existing `Preview` component plus Retake / Use Video buttons. "Retake" returns to `chooser` (or re-opens the picker — see open question below). "Use Video" calls `handleSaveVideo`.

The `handleGoBack` confirm-discard logic stays, scoped to whichever mode is active.

### 4. New handler — `handleChooseFromLibrary`

Direct mirror of `CapturePhoto.tsx:78-99`:

```ts
async function handleChooseFromLibrary() {
  if (busy) return;
  setBusy(true);
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo library access needed",
        "Please allow photo library access in your device settings to select videos.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      videoQuality: 1, // ImagePicker.UIImagePickerControllerQualityType.High
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      const durationSeconds = Math.round((asset.duration ?? 0) / 1000);
      setUploadedVideo({ uri: asset.uri, durationSeconds });
      setMode("library-preview");
    }
  } finally {
    setBusy(false);
  }
}
```

`asset.duration` is in **milliseconds** per the `expo-image-picker` types — confirm at implementation time and divide accordingly.

### 5. Unified `handleSaveVideo`

Both `VideoRecorder.onRecorded` and the library-preview "Use Video" button route here. The save logic generalizes the existing `CaptureVideoScreen.tsx:184-228`:

```ts
type SaveArgs =
  | { source: "camera"; uri: string; durationSeconds: number; facing: "front" | "back" }
  | { source: "library"; uri: string; durationSeconds: number };

async function handleSaveVideo(args: SaveArgs) {
  setIsSaving(true);
  try {
    const destUri =
      args.source === "camera"
        ? moveVideoToAppStorage(args.uri)
        : copyVideoToAppStorage(args.uri);

    const metadata = JSON.stringify({
      duration: args.durationSeconds,
      capturedAt: new Date().toISOString(),
      source: args.source,
      ...(args.source === "camera" ? { facing: args.facing } : {}),
    });

    createEvidence({
      ...(stepId ? { stepId: stepId as StepId } : { goalId: goalId as GoalId }),
      type: EvidenceType.video,
      uri: destUri,
      metadata,
    });

    navigation.goBack();
  } catch (error) {
    console.error("[CaptureVideoScreen] Save failed:", error);
    reportError(error, { area: "evidence.capture", kind: "video" });
    Alert.alert("Save Failed", "Could not save video. Please try again.");
  } finally {
    setIsSaving(false);
  }
}
```

**Notes:**

- The existing `capturedAt` semantics shift slightly for library uploads — it now means "imported at" rather than "filmed at". This is unavoidable without OS-level file-creation-time access, which `expo-image-picker` does not expose portably.
- The new `source` field is additive; downstream readers (`EvidenceThumbnail`, `VideoPlayerModal`) ignore unknown metadata keys today, so no consumer changes are required.

### 6. Breadcrumb telemetry

`useEvidenceStartBreadcrumb("video")` (`CaptureVideoScreen.tsx:68`) fires once on mount. With two entry points it is more useful to fire **after** the user picks, with the source:

- After "Record Video" tap → `useEvidenceStartBreadcrumb("video-camera")`
- After "From Library" tap → `useEvidenceStartBreadcrumb("video-library")`

This is a small change to a Sentry breadcrumb key. Verify nothing in `src/services/sentry-report.ts` or Sentry alerts is keyed on the literal `"video"` value before changing. (Low risk — breadcrumbs are descriptive, not gated on enum values.)

### 7. Tests

Mirror the photo test mocks. Add cases to `CaptureVideoScreen/__tests__/CaptureVideoScreen.test.tsx`:

| Case | Expectation |
| --- | --- |
| Chooser renders both buttons | "Record Video" and "From Library" are present |
| Tap "Record Video" → recorder mounts | Existing camera UI renders |
| Tap "From Library" → permission granted → save | `createEvidence` called with `type: video`, metadata includes `source: "library"`, no `facing` |
| Tap "From Library" → permission denied | `Alert.alert` called; `createEvidence` not called |
| Tap "From Library" → user cancels picker | Returns to chooser; `createEvidence` not called |
| Existing record → save flow | Still creates evidence with `source: "camera"` and `facing` set |

Plus a new `src/utils/__tests__/videoStorage.test.ts` mirroring whatever `imageStorage` tests exist (check before writing — if there's no `imageStorage.test.ts`, this util doesn't need one either; consistency with the codebase wins over an arbitrary test target).

### 8. ND accessibility checklist

Per `apps/native-rd/CLAUDE.md` ND rules:

- Chooser buttons get `accessibilityRole="button"` and descriptive `accessibilityLabel`s (matches existing `Button` component contract — likely already handled).
- Min 44×44pt touch targets (the `Button` component enforces this).
- Library-preview mode reuses the existing `Preview` component which already has `accessibilityLabel` set with duration.
- No new color tokens, fonts, or contrast surfaces introduced.

---

## Critical files

| File | Change |
| --- | --- |
| `apps/native-rd/src/utils/videoStorage.ts` | **NEW** — `moveVideoToAppStorage`, `copyVideoToAppStorage`, `deleteVideo` |
| `apps/native-rd/src/components/VideoRecorder/VideoRecorder.tsx` | **NEW** — extracted camera + preview UI |
| `apps/native-rd/src/components/VideoRecorder/VideoRecorder.styles.ts` | **NEW** — moved from `CaptureVideoScreen.styles.ts` |
| `apps/native-rd/src/components/VideoRecorder/index.ts` | **NEW** — barrel export |
| `apps/native-rd/src/screens/CaptureVideoScreen/CaptureVideoScreen.tsx` | Restructure into chooser/recorder/library-preview state machine; add `handleChooseFromLibrary`, unified `handleSaveVideo` |
| `apps/native-rd/src/screens/CaptureVideoScreen/CaptureVideoScreen.styles.ts` | Remove recorder-specific styles (moved to `VideoRecorder.styles.ts`); add chooser styles |
| `apps/native-rd/src/screens/CaptureVideoScreen/__tests__/CaptureVideoScreen.test.tsx` | Add upload tests; update existing tests for new state machine |
| `apps/native-rd/src/hooks/useEvidenceStartBreadcrumb.ts` | (Read-only) — confirm it accepts arbitrary strings, then pass `"video-camera"` / `"video-library"` |

## Open questions to resolve at implementation time

1. **`asset.duration` units.** `expo-image-picker` types say milliseconds. Confirm in the actual response before wiring `durationSeconds = Math.round(duration / 1000)`. If the value is already in seconds on some platform, the saved metadata will be wrong by 1000×.
2. **Library-preview "Retake" semantics.** Two reasonable options:
   - Return to chooser (consistent with camera-mode discard).
   - Re-open the picker immediately (faster to swap a wrong pick).
   Defer to feel during implementation; default to "return to chooser" if no strong signal.
3. **Tab bar inset on chooser mode.** The existing recorder uses `useTabScreenContentInset()` for bottom padding. The chooser Card should center vertically and probably doesn't need it, but verify on Android (where the pill tab bar overlap caused the 2026-05-14 fix).

## Risks

- **State-machine refactor on a working screen.** The current recording flow is in production. The refactor moves recorder code into `<VideoRecorder/>` and adds a chooser around it. Mitigation: keep the recorder's external behavior identical (same `recordAsync` call, same metadata format for camera-sourced videos), and exercise the existing test cases against the refactored screen before adding upload cases.
- **`expo-image-picker` video permission UX on Android 13+.** Newer Android versions split photo and video into separate granular permissions. `expo-image-picker` handles this internally but worth a manual test on an Android device once the build is up.
- **No size limit means evidence can balloon.** Acknowledged and accepted for v1. If this becomes a real problem we can add a `MAX_UPLOAD_BYTES` check before the copy, using `File.size` from `expo-file-system` — additive, no migration.
