# Social share composer — evidence image + badge overlay

Date: 2026-10-08 · Prototype: [`../prototypes/share-composer.html`](../prototypes/share-composer.html)

## Question

What does a "share my evidence photo with the badge on top" feature need: which formats, which editing controls, and how do we build it in RN?

## Key framing

This is a **brag image**, not the credential. Social apps re-encode uploads, so any baked OB 3.0 `iTXt` chunk is lost. The existing `useBadgeExport` byte-preserving path stays the "verifiable" export. The share image carries a **verify link** instead (the "Verify chip" layer in the prototype, plus share-sheet text).

## Formats (v1)

| Preset            | Pixels    | Used by                                                                     |
| ----------------- | --------- | --------------------------------------------------------------------------- |
| Story / Reel 9:16 | 1080×1920 | IG/FB Stories, Reels, TikTok, YT Shorts, Snapchat, WhatsApp Status          |
| Portrait 4:5      | 1080×1350 | Instagram feed (still Meta's official tallest), Facebook, LinkedIn, Threads |
| Tall 3:4          | 1080×1440 | Instagram profile grid has been 3:4 since 2025                              |
| Square 1:1        | 1080×1080 | Universal fallback, Mastodon, Bluesky, WhatsApp                             |
| Landscape 16:9    | 1600×900  | X, Bluesky, LinkedIn, Mastodon, Discord                                     |
| Link card 1.91:1  | 1200×630  | Open Graph image for a future public verify page, not a user pick           |

Safe zones (third-party guides, not Meta docs, so verify in each app before shipping):

- Story: keep clear ~250–270px top (profile/progress bar) and ~340px bottom (reply bar). Reels/TikTok are heavier: bottom third (caption/audio) plus a right-side action rail.
- 4:5 posts get cropped to 3:4 in the IG grid, which trims about 34px from each side.

Sources: [Hootsuite sizes](https://blog.hootsuite.com/social-media-image-sizes/), [SocialBu 2026](https://socialbu.com/blog/social-media-image-sizes), [Sked IG guide](https://skedsocial.com/blog/best-instagram-image-and-video-size-recommendations), [Hopper HQ Reels safe zones](https://www.hopperhq.com/blog/instagram-reel-size/), [Inro story size](https://www.inro.social/blog/instagram-story-size), [Argil story dimensions](https://argil.ai/blog/instagram-story-dimensions), [Bluesky sizes](https://posteverywhere.ai/blog/bluesky-image-sizes).

## Requirements we found

Editing

- Photo: cover-fit, then pan and pinch-zoom to reframe. The photo must always fill the frame (clamp so no gaps show).
- Badge: drag, plus resize by corner handle, pinch, or +/−. Keep it square. Snap to the centre lines.
- Text: multiple layers, editable, with font choice from the design-system set (Anybody, Instrument Sans, Lexend, Atkinson). Styles are box, plain+shadow and outline. **Box should be the default** because it is readable on any photo (contrast).
- Verify chip: optional, **off until a public verify page exists**, small mono text with the verify URL.
- Safe-zone overlay plus an inline warning when a layer sits under app UI or off the edge.

Accessibility (ND + WCAG)

- Every drag needs a non-drag alternative: nudge arrows, +/−, centre button, tap to select from a layer list (WCAG 2.2 SC 2.5.7, good practice even though we target 2.1 AA).
- Touch targets 44pt. The resize handle hit area is 44pt even though it draws smaller.
- Honour reduced motion (no snap animations). In `lowInfo` / `autismFriendly`, consider starting with a one-tap "auto layout" and hiding advanced controls.

Output

- Render at the true preset pixel size, not screen size.
- JPEG q≈0.9 for photos (smaller, and IG recompresses anyway). PNG optional.
- Re-encoding strips EXIF/GPS. **Never share the original evidence file**, because it may leak location.
- Share via the system share sheet (`expo-sharing`). Direct IG-Stories intents need a Meta App ID, so skip that for v1. Many apps drop the share-sheet text when a file is attached, which is one more reason the verify chip lives in the image.

## Prototype findings

- **Switching format breaks the layout.** Positions are stored normalised (0–1) and sizes are relative to the short side, so a story layout piles up when moved to 16:9 (badge, text and chip overlap). Fix options: keep a separate layout per format, or run an auto-layout preset on switch (for example badge left / text right in landscape). **Recommendation:** store a layout per format, seeded from a preset, and keep the user's edits once they make them.
- Safe zones really matter on 9:16. The default "badge centre, text below" passed, but the chip easily lands in the reply bar.
- With box-style text, readability on any photo was never a problem. Plain and outline styles failed on busy areas of the photo.

## RN implementation sketch

- Already in deps: `react-native-gesture-handler` + `reanimated` (gestures), `expo-sharing`. Capture needs a new dep either way (`react-native-view-shot` is **not** installed).
- Gestures: `Gesture.Simultaneous(Pan, Pinch)` per layer, using shared values for x/y/scale. Selection is held in React state.
- Rendering and export choice:
  - **view-shot** (`react-native-view-shot`, new dep, small): capture an offscreen `View` laid out at preset px ÷ PixelRatio. Risks: fonts and exact pixel size vary by device, and capturing a large offscreen view is fiddly.
  - **@shopify/react-native-skia** (new dep): draw the same scene on a Skia canvas and export with `makeImageSnapshot` at exact pixels. That gives deterministic output and the same code for preview and export. **Recommended**: both options add a dependency, so pick the one with deterministic output.
- Model: `ShareComposition { format, photo: {uri, zoom, cx, cy}, layers: [...] , layoutsByFormat }`. It is ephemeral, so no Evolu persistence in v1.
- Entry point: a "Share" button on the badge detail screen (and maybe on the evidence viewer). Pick a photo from the goal's evidence.

## Open questions

1. ~~Does a verify URL exist?~~ **No (2026-10-08).** Ship the chip off and hidden; enable it once a public verify page exists.
2. Skia vs view-shot (both are new deps)?
3. Video evidence (Reels/TikTok are video-first): out of scope for v1?
4. Rotation of layers: skipped in the prototype. Is it wanted?
