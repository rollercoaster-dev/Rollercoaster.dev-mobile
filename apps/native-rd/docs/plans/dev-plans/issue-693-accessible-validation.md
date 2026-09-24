# #693 — Consistent accessible validation

Base: `origin/main` a7628ddff68851863355133d726e51bba3031d8a. Branch: `codex/issue-693`.

## Scope and intent

Give link URL and text note length failures a consistent visible inline message, semantic error border, readable text, and an explanation a screen reader can reach. Keep this change separate from #685 draft-discard navigation, even though both touch the capture screens.

## Implementation

- [x] Add a shared inline validation message used by `Input` and the note body. Associate each field with its message through the input hint and announce new errors on the platform where a live region alone is insufficient.
- [x] On link Save with an empty/invalid URL, retain specific localized copy, show its error, focus the URL field, and announce the explanation. Clear on correction.
- [x] For an overlong note, show localized explanatory text next to the body, disable Save with a visible reason, and announce the threshold crossing. Clear when length returns within the limit. Keep ordinary empty initial state calm.
- [x] Add behavior and accessibility tests plus English/German/pseudo resources. Use theme tokens for all colors and audit contrast for both modes and seven variants.

## Intent Verification

- [x] Invalid/empty link: readable inline explanation, input association, announcement, and focus on failed Save; correction clears the error in component tests.
- [x] Note over 1000 characters: readable inline explanation and disabled Save reason, announced once on crossing; correction clears it and re-enables Save in component tests.
- [x] Color is supplemental. Error text and semantic rail meet contrast floors across the seven runtime themes. English, German, and generated pseudo locale remain complete.
- [x] Link and note successful saves still work in component tests; #685's exit-path handling is untouched.

## Validation

Targeted Jest for `Input`, `CaptureLinkScreen`, and `CaptureTextNote`; theme contrast test; root `bun run type-check`, `bun run lint`, `bun run test`, and applicable package build. Native screen-reader/device interaction is reported separately from automated checks.

## Decisions

- Use the shared error message component with `colors.error` as a semantic border and high-contrast `colors.text` for message text. The message and border meet 4.5:1 and 3:1 respectively on all seven runtime themes; the URL input border also meets 3:1 against its input surface.
- Keep note Save disabled for invalid input, with a short visible helper for empty content and an error only when the note exceeds the limit. The disabled button's accessibility hint repeats the current reason.
- Android uses a live region for new errors. iOS uses `announceForAccessibility`; tests verify the wiring, while spoken timing on a device remains unverified.

## Discovery Log

- Source at a7628ddf: `Input` paints errors with `accentPrimary`, while note count uses the same accent without explanatory text. URL Save already validates but has no focus control.
- #685 is In Progress and covers navigation-discard protection on both capture screens. This branch will not change Back/Cancel behavior.
- GitHub project field query hit an API rate limit during setup; board update needs retry.
- Workspace packages need a build after a fresh install before Jest can resolve design tokens.
- `xcrun simctl list devices booted` found no booted iOS device; native VoiceOver and TalkBack behavior was not tested on device.

## Follow-ups

- None yet.
