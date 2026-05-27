# Dev plan — Issue #202: finish i18n migration (reachable surfaces still leaking)

**Branch:** `auto-issue-202`
**Status:** scope re-verified against code 2026-05-27 (issue premise partly stale)

## Scope correction (code-grepped, not tracker-claimed)

The issue was filed claiming `en/badges.json` was `{}` (3 bytes) and the badge
surfaces were unmigrated. **That is no longer true** — PR #199
(`feat(native-rd/i18n): migrate badge list + earned modal to t() (#73)`) already:

- Populated `en/badges.json` (565 B), `de/badges.json` (fully translated, not a
  placeholder), `pseudo/badges.json`, `_register/badges.yml`.
- Registered `badges` in `i18n/index.ts` + `i18next.d.ts`.
- Routed `BadgesScreen`, `BadgeEarnedModal` entirely through `t()`.
- The visible **tab label** is already `t("navigation.tabs.badges")` in
  `FocusPillTabBar.tsx:104`.

So acceptance criteria #1 and #2 are **already met**. `BadgesStack.tsx:13`
`<Stack.Screen name="Badges">` is a route identifier, not a rendered label
(the header is `ScreenHeader`, the tab label is `FocusPillTabBar`) — **not a
user-visible leak**, left as-is.

## Remaining real work (ACs #3, #4, #5)

All strings below confirmed still raw English literals in code.

### A. Shared dialogs → `common` namespace (defaultNS)

| File                                      | Line | String                          | Key                                         |
| ----------------------------------------- | ---- | ------------------------------- | ------------------------------------------- |
| `EvidenceGrid/EvidenceGrid.tsx`           | 24   | "Delete evidence?"              | `common:evidenceGrid.deleteTitle`           |
|                                           | 24   | "This cannot be undone."        | `common:evidenceGrid.deleteMessage`         |
|                                           | 25   | "Cancel"                        | reuse `common:actions.cancel`               |
|                                           | 27   | "Delete"                        | reuse `common:actions.delete`               |
| `ErrorBoundary/ErrorBoundary.tsx` (class) | 54   | "Something went wrong"          | `common:errorBoundary.title` via `i18n.t()` |
|                                           | 57   | "An unexpected error occurred." | `common:errorBoundary.message`              |
|                                           | 61   | "Try Again"                     | `common:errorBoundary.retry`                |

`ErrorBoundary` is a class component → use the `i18n` singleton (`i18n.t(...)`),
not the `useTranslation` hook.

### B. EvidenceViewerScreen → `evidenceViewer` namespace

| Line | String                                                  | Key                              |
| ---- | ------------------------------------------------------- | -------------------------------- |
| 60   | "No evidence to view."                                  | `evidenceViewer:empty`           |
| 51   | `announceForAccessibility("All evidence was removed.")` | `evidenceViewer:a11y.allRemoved` |

(Already uses `useTranslation("evidenceViewer")`.)

### C. a11y-only labels → `common` namespace

| File                                            | Line | String                    | Key                                                                |
| ----------------------------------------------- | ---- | ------------------------- | ------------------------------------------------------------------ |
| `ScreenHeader/ScreenSubHeader.tsx`              | 26   | "Go back"                 | `common:screenHeader.a11y.goBack` (add `useTranslation`)           |
| `EvidenceContent/LinkContent.tsx`               | 43   | "Open in browser"         | `common:evidenceContent.a11y.openInBrowser` (add `useTranslation`) |
| `EvidenceContent/VideoContent.tsx`              | 50   | "Video evidence playback" | `common:evidenceContent.a11y.videoPlayback`                        |
|                                                 | 82   | "Retry loading video"     | `common:evidenceContent.a11y.retryVideo`                           |
| `EvidenceContent/PhotoContent.tsx`              | 56   | "Retry loading image"     | `common:evidenceContent.a11y.retryImage`                           |
| `CardCarousel/CardCarousel.tsx`                 | 222  | "Previous card"           | `common:cardCarousel.a11y.previous`                                |
|                                                 | 237  | "Next card"               | `common:cardCarousel.a11y.next`                                    |
| `ViewerThumbnailStrip/ViewerThumbnailStrip.tsx` | 90   | "Evidence items"          | `common:viewerThumbnailStrip.a11y.items`                           |
| `TextNoteViewerModal/TextNoteViewerModal.tsx`   | 45   | "Close text note viewer"  | `common:viewerModals.a11y.closeTextNote`                           |
| `AudioPlayerModal/AudioPlayerModal.tsx`         | 45   | "Close audio player"      | `common:viewerModals.a11y.closeAudio`                              |
| `VideoPlayerModal/VideoPlayerModal.tsx`         | 43   | "Close video player"      | `common:viewerModals.a11y.closeVideo`                              |
| `PhotoViewerModal/PhotoViewerModal.tsx`         | 45   | "Close photo viewer"      | `common:viewerModals.a11y.closePhoto`                              |

VideoContent/PhotoContent already call `useTranslation()`; others need the hook
added (all are function components except ErrorBoundary).

## Locale mechanics

- **en:** add keys above to `en/common.json` + `en/evidenceViewer.json`.
- **pseudo:** regenerate via `bun run gen:pseudo` (auto-discovers namespaces).
- **de:** hand-translate following `_register/common.yml` + `evidenceViewer.yml`
  voice rules (ND-adult, informal, banned phrasings). The LLM `i18n:sync`
  pipeline is **not** run here (needs API keys); de entries flagged for review
  in PR body.
- `_register/common.yml` / `evidenceViewer.yml` already exist — no new register
  files needed (no new namespace introduced).

## Tests

- `locale-parity.test.ts` (en↔pseudo) must stay green — regen pseudo before running.
- Add render tests for the migrated user-visible surfaces: EvidenceGrid delete
  dialog copy, ErrorBoundary fallback copy, EvidenceViewerScreen empty state.
  a11y labels verified via `accessibilityLabel` queries where a test harness
  already exists for the component.

## Commit slicing (atomic)

1. `feat(i18n)`: add en+de+pseudo keys (common + evidenceViewer) — data only.
2. `feat(i18n)`: route EvidenceGrid + ErrorBoundary dialogs through t()/i18n.t().
3. `feat(i18n)`: route EvidenceViewerScreen empty + removal announcement.
4. `feat(i18n)`: route a11y labels (ScreenSubHeader, EvidenceContent, CardCarousel, ViewerThumbnailStrip, viewer modals).
5. `test(i18n)`: render/a11y tests for migrated surfaces.

Each well under 500 LOC; generated pseudo JSON called out as generated.
Closing commit references #73 (per issue guidance, not reopening it).

## Additional leaks found by code sweep — fixing in THIS PR (not deferring)

A grep sweep of the full evidence-viewing chain (EvidenceContent family +
AudioPlayer + the four viewer/player modals) turned up more reachable English
literals beyond the original audit. Decision (per Joe, 2026-05-27): **fix them
all here** rather than file follow-up tickets — they're the same domain and the
issue's intent (AC#7: "no reachable surface renders English") covers them.

| File                                          | Leak(s)                                                                                                           | Proposed key                                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `EvidenceContent/VideoContent.tsx`            | "Failed to load video" (L76, L79)                                                                                 | `common:evidenceContent.errors.videoLoadFailed`                                                     |
| `EvidenceContent/PhotoContent.tsx`            | "Failed to load image" (L49, L52)                                                                                 | `common:evidenceContent.errors.imageLoadFailed`                                                     |
| `EvidenceContent/FileContent.tsx`             | `label="Open"` (L60) — needs `useTranslation`                                                                     | `common:evidenceContent.openFile`                                                                   |
| `AudioPlayer/AudioPlayer.tsx`                 | "Audio player" (L38), "Play audio"/"Pause audio" (L43), `` `${cur} of ${total}` `` (L74) — needs `useTranslation` | `common:audioPlayer.a11y.{container,play,pause,progress}` (progress = `"{{current}} of {{total}}"`) |
| `TextNoteViewerModal/TextNoteViewerModal.tsx` | "Text Note" heading (L42)                                                                                         | `common:viewerModals.heading.textNote`                                                              |
| `AudioPlayerModal/AudioPlayerModal.tsx`       | "Voice Memo" heading (L42)                                                                                        | `common:viewerModals.heading.audio`                                                                 |

Verified **clean** (no leaks): `AudioContent`, `TextContent`, `LinkContent`
(migrated), `VideoPlayerModal`, `PhotoViewerModal` (no headings, close labels
already migrated).

de heading translations to match existing `de/common.json` evidenceTypes:
text → "Notiz", voice_memo → "Sprachmemo".

## Scope corrections vs. the issue (verified against code)

- `en/badges.json` is **populated** (565 B), not `{}` — PR #199 already did it;
  badge screens + tab label already routed through `t()`.
- `EvidenceGrid` was **not** "reachable from many screens" — zero production
  imports, orphaned since the original monorepo import. **Deleted** in this PR
  rather than i18n-migrated (dead code); its `common:evidenceGrid.*` keys dropped.
- `BadgesStack.tsx` `name="Badges"` is a route id, not a rendered label.
- **Correction to an earlier claim:** the capture-migration tickets #70
  (photo/video/voice), #71 (text/file/link), #72 (permissions) are **CLOSED**
  and covered the capture **screens** — NOT the `EvidenceContent` _viewer_
  components. The viewer-side leaks above had **no dedicated open ticket**
  (#144 is the only catch-all), which is why they're folded into this PR.

## App-wide sweep result — what "all leaks" actually means (2026-05-27)

A multi-pattern sweep across **all** `src/screens` + `src/components`
(literal props, multi-line JSX text, `Alert.alert` / `announceForAccessibility`)
confirmed the evidence-viewer chain above was **not** the whole picture, but the
rest is small and already decided:

- **All `Alert.alert` / `announceForAccessibility` call-sites** outside the
  evidence chain already route through `t()` / `i18n.t()` — verified by reading
  the arguments, not just the call name (the call name over-reports).
- **`SettingsScreen.tsx:36` is NOT a leak.** It carries an explicit
  `// i18n-skip: dev-only, double-gated by __DEV__ && Platform.OS === "android"`
  annotation; the alert is unreachable in production. **Left as-is** — migrating
  it would override a deliberate, reviewed skip.
- **`IconPickerModal` (`src/badges/*`) deferred to #74**, not migrated here.
  It's a badge-designer surface (~16 strings + composed-label refactors +
  `iconIndex.ts` `CATEGORY_LABELS`/`WEIGHTS` constants), and #74
  ("migrate badge designer surfaces") is open and explicitly scopes the
  icon picker. #74's body was updated 2026-05-27 with the verified remaining
  inventory (BadgeDesignerScreen itself is already clean).
- **Dead/unreachable, out of scope (unchanged):** `TestScreen` (not registered
  in any navigator), `CapturePlaceholder` (imported, never registered),
  Storybook `stories/*`.

Net: **#202's final scope = the evidence-viewer chain only.** The app has no
other reachable, un-skipped English leaks outside the badge-designer surfaces
owned by #74.
