# Issue #565 — CaptureLinkScreen: scroll container, return-key label, e2e comments

**Branch:** `fix/issue-565-capture-link-keyboard`

## State on main when this started

- Suggested fix (1) — keyboard avoidance — already landed in #649 (`f4e50b44`):
  `CaptureLinkScreen` wraps its body in the shared `KeyboardAvoidingFrame`
  (the successor to `KEYBOARD_AVOIDING_PROPS`, which no longer exists in
  `src/utils/keyboard.ts`). `FocusModeScreen` uses the same frame. Nothing to
  redo there.
- Still open: no `ScrollView` (actions unreachable at large text), no
  `useTabScreenContentInset`, URL input labelled `returnKeyType="next"` with
  nothing wired to advance focus, and e2e comments/README still describing the
  `"next"` label.

## Commits

1. `fix(native-rd): make CaptureLinkScreen scroll and label its URL return key honestly (#565)`
   - `CaptureLinkScreen.tsx`: body becomes `ScrollView`
     (`keyboardShouldPersistTaps="handled"`, `testID="capture-link-scroll"`,
     `contentContainerStyle=[styles.content, tabInset]`) inside the existing
     `KeyboardAvoidingFrame`; URL input `returnKeyType="done"`.
   - `CaptureLinkScreen.styles.ts`: `content` drops `flex: 1` (a
     contentContainer with `flex: 1` cannot scroll); add `scroll: { flex: 1 }`.
   - Test: scroll container carries `keyboardShouldPersistTaps="handled"` and a
     positive bottom inset; Save and Cancel render inside it; URL input's
     `returnKeyType` is `"done"`.
2. `docs(e2e): stop describing the Capture Link URL key as "next" (#565)`
   - `e2e/README.md`, `e2e/flows/full-ride.yaml`, `e2e/flows/evidence-viewer.yaml`.
   - `pressKey: Enter` steps stay (they still work).

## Out of scope

- `forwardRef` on `Input` / real focus advancement.
- The historical #502 plan doc (`issue-502-e2e-canonical-full-ride.md`) is a
  record of that work, not live guidance; left as is.
