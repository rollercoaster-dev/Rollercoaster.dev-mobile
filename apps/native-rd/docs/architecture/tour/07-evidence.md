# Slice 7 — Evidence & capture

**Status:** not-started
**Drafted:** —
**Reviewed:** —

## Scope

Evidence capture flows + evidence display.

**In scope (provisional — may split into 7a capture / 7b display at prep time):**

- Capture screens: `CapturePhoto`, `CaptureVideoScreen`, `CaptureFile`, `CaptureLinkScreen`, `CaptureTextNote`, `CapturePlaceholder`, `VoiceMemoScreen`
- Evidence components: `EvidenceContent`, `EvidenceDrawer`, `EvidenceGrid`, `EvidenceItem`, `EvidenceThumbnail`, `EvidenceTypePicker`, `EvidenceViewerScreen`
- Media playback: `AudioPlayer`, `AudioPlayerModal`, `VideoPlayer*`, `PhotoViewerModal`, `TextNoteViewerModal`, `VideoPreview`, `VideoRecorder`, `ViewerStripThumb`, `ViewerThumbnailStrip`
- `TimelineJourneyScreen`, `TimelineEvidenceCard`, `TimelineStep`, `TimelineNode`, `MiniTimeline`
- `src/hooks/useUserKey.ts` if it gates capture
- Expo permissions surface: camera, microphone, media-library, document-picker

**Deferred:**

- Badge issuance from evidence — slice 9 (capstone)
- Goal/step linkage UI — slice 6
- Evidence-related queries + schema — reviewed alongside the rest of Evolu in slice 3 (data layer)

## File map

_(filled in during prep)_

## Mental model

_(filled in after walkthrough)_

## RN concepts encountered

_(filled in during walkthrough)_

## Lens scan

### type-safety

### RN/Expo idiom

### perf hot paths

### a11y / ND-a11y

### test coverage gaps

## Findings

- _(none yet)_

## Open questions

- _(none yet)_
