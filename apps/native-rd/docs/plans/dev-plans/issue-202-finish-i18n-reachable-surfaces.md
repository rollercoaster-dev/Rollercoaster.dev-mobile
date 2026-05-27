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

## Follow-ups discovered during implementation (NOT in the original audit)

These are real leaks found while editing the audit files, but outside this
issue's verified audit scope. Deferred to a follow-up issue rather than
expanding this PR (several belong to capture-\* namespaces with their own
Milestone 3 tickets):

- **Visible error text** — `VideoContent.tsx` "Failed to load video" (×2),
  `PhotoContent.tsx` "Failed to load image" (×2). These sit next to the a11y
  labels migrated here but are display strings; likely belong to
  `captureVideo` / `capturePhoto` namespaces.
- **Viewer-modal headings** — `TextNoteViewerModal` "Text Note",
  `AudioPlayerModal` "Voice Memo" (and any sibling headings). Visible titles,
  not a11y.
- **EvidenceGrid display strings** — header "Evidence", "No evidence yet" empty
  text, "Add Evidence" button. **Component is dead code** (no production
  import) — lowest priority; migrate only if/when it's wired up, or delete the
  component.

## Scope contradictions vs. the issue (verified, surfaced in PR)

- `en/badges.json` is **populated** (565 B), not `{}` — PR #199 already did it.
- `EvidenceGrid` is **not** "reachable from many screens" — zero production
  imports.
- `BadgesStack.tsx` `name="Badges"` is a route id, not a rendered label.
