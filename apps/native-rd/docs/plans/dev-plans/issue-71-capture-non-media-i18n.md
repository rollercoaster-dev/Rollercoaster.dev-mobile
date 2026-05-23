# Development Plan: Issue #71

## Issue Summary

**Title**: i18n: migrate evidence capture (text note, file, link)
**Type**: enhancement
**Complexity**: MEDIUM
**Estimated Lines**: ~380 lines

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective.

- [ ] When the app renders `CaptureTextNote`, all visible strings (header, placeholder, labels, buttons, character counter a11y label, success announcement, error alert) come from `t()` calls; no raw string literals remain in JSX or imperative calls.
- [ ] When the app renders `CaptureFile`, all visible strings (header, heading, description, button, loading a11y label, error alerts) come from `t()` calls.
- [ ] When the app renders `CaptureLinkScreen`, all remaining raw strings (header, field labels, placeholders, validation errors, link preview a11y label, save button, error alert) come from `t()` calls. The already-migrated `t("actions.cancel")` is untouched.
- [ ] Running `EXPO_PUBLIC_I18N_PSEUDO=true` with Metro restart causes all three screens to display visibly accented/bracketed pseudo text with no English fallback strings visible.
- [ ] `bun run test:ci` passes — locale-parity test detects no key drift between `en` and `pseudo` for `captureText`, `captureFile`, and `captureLink` namespaces.
- [ ] All screen-level tests that previously matched raw strings are updated to match the same string via `t()` (keeping `getByText` where appropriate per milestone policy), or via accessible label queries.

## Dependencies

| Issue | Title                                                              | Status | Type                             |
| ----- | ------------------------------------------------------------------ | ------ | -------------------------------- |
| #65   | i18n: migrate shared labels (common actions, evidence types, etc.) | Met    | Foundation (closed)              |
| #64   | i18n: add stable testIDs                                           | Open   | Soft / deferred post-ship        |
| #70   | i18n: migrate evidence capture (photo, video, voice memo)          | Open   | Parallel / not a blocker for #71 |

**Status**: Proceed. The hard blocker (#65 foundation + common namespace) is closed. `dep:blocked` label on the issue reflects the older wave plan; per the 2026-05-18 milestone pivot, testIDs (#64) is explicitly deferred post-ship and does not block screen migrations. #70 runs in parallel and touches disjoint namespace files (`capturePhoto`, `captureVideo`, `captureVoice`).

## Objective

Replace every raw display string in `CaptureTextNote`, `CaptureFile`, and `CaptureLinkScreen` with `t()` calls backed by the `captureText`, `captureFile`, and `captureLink` namespaces. Populate the `en` and `pseudo` JSON files for all three namespaces, update their tests, and run `gen:pseudo` so both locales are committed together.

## Decisions

| ID  | Decision                                                                                  | Alternatives Considered                                           | Rationale                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | One commit per screen (3 screen commits + 1 test commit = 4 commits total)                | All three in one commit; two commits (all JSON + all screen code) | Mirrors the established per-screen commit shape used in PRs #134 and #130. Keeps diffs reviewable and bisect-friendly.                                                                                                                           |
| D2  | Tests commit is a single fourth commit covering all three screens                         | One test commit per screen (6 commits total)                      | Test changes are small and mechanical — one coherent test commit is easier to review than three tiny ones.                                                                                                                                       |
| D3  | Namespace key structure is flat within semantic groups (no nested `screens.*`)            | Wrap under `screens.capture.text.*` per issue scope description   | Issue body uses `screens.capture.{text,file,link}.*` as a logical namespace description, not a JSON key path. All prior migrations (focusMode, goals) use flat top-level keys within their namespace JSON. Flat is consistent with the codebase. |
| D4  | `CaptureLinkScreen` keeps `t("actions.cancel")` from `common`; only net-new strings added | Pull all strings into `captureLink` namespace                     | `actions.cancel` is already correctly using the common namespace. Adding it to `captureLink` would be a duplicate. Leave it; add only the strings that are not yet translated.                                                                   |
| D5  | Validation error strings go under `captureLink.validation.*` not `captureLink.errors.*`   | Use `errors.*` for all error-type strings                         | Validation errors are user-input feedback (inline), not system errors (alerts). Separate grouping aligns with how FocusMode separates `toast.*` from `errors.*`. Keeps the tree semantically clear.                                              |
| D6  | `AccessibilityInfo.announceForAccessibility("Text note saved")` migrated to `t()`         | Leave imperative a11y announcements as raw strings                | It is a display string announced to assistive technology users. Excluding it would leave a visible (audible) untranslated string violating acceptance criterion 1.                                                                               |

## Affected Areas

- `apps/native-rd/src/i18n/resources/en/captureText.json`: populate with ~12 keys (currently `{}`)
- `apps/native-rd/src/i18n/resources/pseudo/captureText.json`: populate via `gen:pseudo` (currently `{}`)
- `apps/native-rd/src/screens/CaptureTextNote/CaptureTextNote.tsx`: add `useTranslation`, replace 8 raw strings
- `apps/native-rd/src/screens/CaptureTextNote/__tests__/CaptureTextNote.test.tsx`: update 6 assertions that match raw strings
- `apps/native-rd/src/i18n/resources/en/captureFile.json`: populate with ~8 keys (currently `{}`)
- `apps/native-rd/src/i18n/resources/pseudo/captureFile.json`: populate via `gen:pseudo`
- `apps/native-rd/src/screens/CaptureFile/CaptureFile.tsx`: add `useTranslation`, replace 5 raw strings
- `apps/native-rd/src/screens/CaptureFile/__tests__/CaptureFile.test.tsx`: update 3 assertions
- `apps/native-rd/src/i18n/resources/en/captureLink.json`: populate with ~9 keys (currently `{}`)
- `apps/native-rd/src/i18n/resources/pseudo/captureLink.json`: populate via `gen:pseudo`
- `apps/native-rd/src/screens/CaptureLinkScreen/CaptureLinkScreen.tsx`: replace 7 remaining raw strings (hook already imported, `actions.cancel` already migrated)
- `apps/native-rd/src/screens/CaptureLinkScreen/__tests__/CaptureLinkScreen.test.tsx`: update 6 assertions

## Translation Key Tree

### `captureText` namespace (`resources/en/captureText.json`)

```json
{
  "header": "Write a Note",
  "input": {
    "label": "Note content",
    "placeholder": "What happened? What did you learn?",
    "hint": "Write your text note here"
  },
  "caption": {
    "label": "Caption (optional)",
    "placeholder": "Add a short caption"
  },
  "charCount": {
    "a11y": "{{count}} of {{max}} characters used"
  },
  "actions": {
    "save": "Save Note"
  },
  "a11y": {
    "noteSaved": "Text note saved"
  },
  "errors": {
    "couldNotSaveTitle": "Could not save note",
    "couldNotSaveMessage": "Something went wrong. Please try again."
  }
}
```

### `captureFile` namespace (`resources/en/captureFile.json`)

```json
{
  "header": "Attach File",
  "heading": "Attach a file",
  "description": "Select a PDF, image, or document (max {{maxSize}}).",
  "actions": {
    "choose": "Choose File"
  },
  "a11y": {
    "saving": "Saving file"
  },
  "errors": {
    "invalidFileTitle": "Invalid file",
    "saveFailedTitle": "Save failed",
    "saveFailedMessage": "Could not save the file. Please try again."
  }
}
```

Note: `description` uses `{{maxSize}}` interpolation so German translation can place the size token naturally in the sentence.

### `captureLink` namespace (`resources/en/captureLink.json`)

Note: `t("actions.cancel")` from `common` is already in place and is not duplicated here.

```json
{
  "header": "Add Link",
  "urlInput": {
    "label": "URL",
    "placeholder": "https://example.com"
  },
  "captionInput": {
    "label": "Caption (optional)",
    "placeholder": "What is this link about?"
  },
  "preview": {
    "a11y": "Link preview: {{url}}"
  },
  "actions": {
    "save": "Save Link"
  },
  "validation": {
    "urlRequired": "Please enter a URL",
    "urlInvalid": "Please enter a valid URL (e.g. https://example.com)"
  },
  "errors": {
    "couldNotSaveTitle": "Could not save link",
    "couldNotSaveMessage": "Something went wrong. Please try again."
  }
}
```

## Implementation Plan

### Step 1: Migrate CaptureTextNote

**Files**:

- `apps/native-rd/src/i18n/resources/en/captureText.json`
- `apps/native-rd/src/i18n/resources/pseudo/captureText.json`
- `apps/native-rd/src/screens/CaptureTextNote/CaptureTextNote.tsx`

**Commit**: `feat(native-rd): i18n migrate CaptureTextNote screen`

**Changes**:

- [ ] Populate `resources/en/captureText.json` with the 12-key tree defined above
- [ ] Run `bun run gen:pseudo` (from `apps/native-rd/`) to populate `resources/pseudo/captureText.json`
- [ ] In `CaptureTextNote.tsx`, add `import { useTranslation } from "react-i18next"` (it is not yet present)
- [ ] Add `const { t } = useTranslation("captureText")` inside the component
- [ ] Replace `label="Write a Note"` on `ScreenSubHeader` with `label={t("header")}`
- [ ] Replace `placeholder="What happened? What did you learn?"` with `placeholder={t("input.placeholder")}`
- [ ] Replace `accessibilityLabel="Note content"` with `accessibilityLabel={t("input.label")}`
- [ ] Replace `accessibilityHint="Write your text note here"` with `accessibilityHint={t("input.hint")}`
- [ ] Replace `label="Caption (optional)"` on `Input` with `label={t("caption.label")}`
- [ ] Replace `placeholder="Add a short caption"` on `Input` with `placeholder={t("caption.placeholder")}`
- [ ] Replace template literal `` `${charCount} of ${MAX_CONTENT_LENGTH} characters used` `` in `accessibilityLabel` with `t("charCount.a11y", { count: charCount, max: MAX_CONTENT_LENGTH })`
- [ ] Replace `label="Save Note"` on `Button` with `label={t("actions.save")}`
- [ ] Replace `AccessibilityInfo.announceForAccessibility("Text note saved")` with `AccessibilityInfo.announceForAccessibility(t("a11y.noteSaved"))`
- [ ] Replace `Alert.alert("Could not save note", "Something went wrong. Please try again.")` with `Alert.alert(t("errors.couldNotSaveTitle"), t("errors.couldNotSaveMessage"))`

### Step 2: Migrate CaptureFile

**Files**:

- `apps/native-rd/src/i18n/resources/en/captureFile.json`
- `apps/native-rd/src/i18n/resources/pseudo/captureFile.json`
- `apps/native-rd/src/screens/CaptureFile/CaptureFile.tsx`

**Commit**: `feat(native-rd): i18n migrate CaptureFile screen`

**Changes**:

- [ ] Populate `resources/en/captureFile.json` with the 8-key tree defined above
- [ ] Run `bun run gen:pseudo` to populate `resources/pseudo/captureFile.json`
- [ ] In `CaptureFile.tsx`, add `import { useTranslation } from "react-i18next"` and add `const { t } = useTranslation("captureFile")` inside the component function
- [ ] Replace `label="Attach File"` on `ScreenSubHeader` with `label={t("header")}`
- [ ] Replace `<Text variant="headline">Attach a file</Text>` with `<Text variant="headline">{t("heading")}</Text>`
- [ ] Replace the description text `Select a PDF, image, or document (max {MAX_FILE_SIZE_LABEL}).` with `{t("description", { maxSize: MAX_FILE_SIZE_LABEL })}` — this requires changing from JSX text interpolation to a single `Text` child using `t()` with the `maxSize` interpolation variable
- [ ] Replace `label="Choose File"` on `Button` with `label={t("actions.choose")}`
- [ ] Replace `accessibilityLabel="Saving file"` on `ActivityIndicator` with `accessibilityLabel={t("a11y.saving")}`
- [ ] Replace `Alert.alert("Invalid file", validationError)` — the title `"Invalid file"` with `t("errors.invalidFileTitle")`; `validationError` comes from `validateFile()` (a utility that returns English strings) — use `t("errors.invalidFileTitle")` for the title only; the `validationError` body is out of scope (it comes from `fileStorage` utility, not this screen)
- [ ] Replace `Alert.alert("Save failed", "Could not save the file. Please try again.")` with `Alert.alert(t("errors.saveFailedTitle"), t("errors.saveFailedMessage"))`

### Step 3: Migrate CaptureLinkScreen

**Files**:

- `apps/native-rd/src/i18n/resources/en/captureLink.json`
- `apps/native-rd/src/i18n/resources/pseudo/captureLink.json`
- `apps/native-rd/src/screens/CaptureLinkScreen/CaptureLinkScreen.tsx`

**Commit**: `feat(native-rd): i18n migrate CaptureLinkScreen`

**Changes**:

- [ ] Populate `resources/en/captureLink.json` with the 9-key tree defined above
- [ ] Run `bun run gen:pseudo` to populate `resources/pseudo/captureLink.json`
- [ ] `useTranslation` is already imported in `CaptureLinkScreen.tsx`; add `"captureLink"` namespace: `const { t } = useTranslation(["captureLink", "common"])`
- [ ] Replace `label="Add Link"` on `ScreenSubHeader` with `label={t("captureLink:header")}`
- [ ] Replace `label="URL"` on the URL `Input` with `label={t("captureLink:urlInput.label")}`
- [ ] Replace `placeholder="https://example.com"` with `placeholder={t("captureLink:urlInput.placeholder")}`
- [ ] Replace `label="Caption (optional)"` on the caption `Input` with `label={t("captureLink:captionInput.label")}`
- [ ] Replace `placeholder="What is this link about?"` with `placeholder={t("captureLink:captionInput.placeholder")}`
- [ ] Replace `accessibilityLabel={\`Link preview: ${trimmedUrl}\`}`with`accessibilityLabel={t("captureLink:preview.a11y", { url: trimmedUrl })}`
- [ ] Replace `label="Save Link"` on `Button` with `label={t("captureLink:actions.save")}`
- [ ] Replace `setUrlError("Please enter a URL")` with `setUrlError(t("captureLink:validation.urlRequired"))`
- [ ] Replace `setUrlError("Please enter a valid URL (e.g. https://example.com)")` with `setUrlError(t("captureLink:validation.urlInvalid"))`
- [ ] Replace `Alert.alert("Could not save link", "Something went wrong. Please try again.")` with `Alert.alert(t("captureLink:errors.couldNotSaveTitle"), t("captureLink:errors.couldNotSaveMessage"))`
- [ ] Keep `label={t("actions.cancel")}` on the Cancel `Button` — it already uses `common` namespace correctly

### Step 4: Update tests for all three screens

**Files**:

- `apps/native-rd/src/screens/CaptureTextNote/__tests__/CaptureTextNote.test.tsx`
- `apps/native-rd/src/screens/CaptureFile/__tests__/CaptureFile.test.tsx`
- `apps/native-rd/src/screens/CaptureLinkScreen/__tests__/CaptureLinkScreen.test.tsx`

**Commit**: `test(native-rd): update capture screen tests for i18n`

**Changes**:

CaptureTextNote test updates:

- [ ] Add `import { i18n } from "../../../i18n"` and switch to using `i18n.t()` for string lookup in test assertions (same pattern as `FocusModeScreen.test.tsx`)
- [ ] Update `expect(screen.getByText("Write a Note"))` → `expect(screen.getByText(i18n.t("captureText:header")))`
- [ ] Update `expect(screen.getByText("Caption (optional)"))` → `expect(screen.getByText(i18n.t("captureText:caption.label")))`
- [ ] Update `expect(screen.getByLabelText("Note content"))` → `expect(screen.getByLabelText(i18n.t("captureText:input.label")))`
- [ ] Update `expect(screen.getByLabelText("Save Note"))` → `expect(screen.getByLabelText(i18n.t("captureText:actions.save")))`
- [ ] Update `expect(screen.getByLabelText("Caption (optional)"))` → `expect(screen.getByLabelText(i18n.t("captureText:caption.label")))`
- [ ] Update `screen.getByLabelText("5 of 1000 characters used")` → `screen.getByLabelText(i18n.t("captureText:charCount.a11y", { count: 5, max: 1000 }))`
- [ ] Update `fireEvent.press(screen.getByText("Save Note"))` (2 occurrences) → `fireEvent.press(screen.getByText(i18n.t("captureText:actions.save")))`

CaptureFile test updates:

- [ ] Update `expect(screen.getByText("Attach File"))` → `expect(screen.getByText(i18n.t("captureFile:header")))`
- [ ] Update `expect(screen.getByText("Choose File"))` (2 occurrences) → `expect(screen.getByText(i18n.t("captureFile:actions.choose")))`
- [ ] Update `expect(screen.getByText(/Select a PDF, image, or document/))` → `expect(screen.getByText(i18n.t("captureFile:description", { maxSize: "50 MB" })))`

CaptureLinkScreen test updates:

- [ ] Update `expect(screen.getByText("Add Link"))` → `expect(screen.getByText(i18n.t("captureLink:header")))`
- [ ] Update `expect(screen.getByLabelText("URL"))` → `expect(screen.getByLabelText(i18n.t("captureLink:urlInput.label")))`
- [ ] Update `expect(screen.getByLabelText("Caption (optional)"))` → `expect(screen.getByLabelText(i18n.t("captureLink:captionInput.label")))`
- [ ] Update `expect(screen.getByText("Save Link"))` (2 occurrences) → `expect(screen.getByText(i18n.t("captureLink:actions.save")))`
- [ ] Update `expect(screen.getByText("Please enter a URL"))` → `expect(screen.getByText(i18n.t("captureLink:validation.urlRequired")))`
- [ ] Update `expect(screen.getByText("Please enter a valid URL (e.g. https://example.com)"))` → `expect(screen.getByText(i18n.t("captureLink:validation.urlInvalid")))`
- [ ] Update `screen.getByLabelText("Link preview: https://example.com/path")` → `screen.getByLabelText(i18n.t("captureLink:preview.a11y", { url: "https://example.com/path" }))`

## Testing Strategy

- [ ] Unit tests: `bun test --testPathPatterns CaptureTextNote` — all existing behaviour tests pass with updated string assertions
- [ ] Unit tests: `bun test --testPathPatterns CaptureFile` — same
- [ ] Unit tests: `bun test --testPathPatterns CaptureLinkScreen` — same
- [ ] Locale parity: `bun test --testPathPatterns locale-parity` — must pass for `captureText`, `captureFile`, `captureLink` namespaces (was failing before this PR when namespaces were `{}`)
- [ ] Test file path convention: all test files mirror `src/` under `src/__tests__/` — already correct, no moves needed
- [ ] Use `test.each` for any new repetitive cases (none anticipated — existing tests are already properly varied)
- [ ] Manual pseudo-locale verification: `EXPO_PUBLIC_I18N_PSEUDO=true` + Metro restart — open each capture screen and confirm all strings are accented/bracketed with no English fallback visible

## Not in Scope

| Item                                                 | Reason                                                             | Follow-up                                |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| Permission-denied copy in capture screens            | Explicitly split out per issue scope description                   | #72                                      |
| `validateFile()` utility error messages              | Lives in `utils/fileStorage`, not the screen                       | Separate utility ticket or #71 follow-up |
| German (`de`) translation of these namespaces        | Translation batch is a pre-#76 step per milestone plan             | Pre-#76 translation commit               |
| Adding new `testID` props to capture screen elements | #64 scope; deferred post-ship per milestone plan                   | #64                                      |
| Snapshot tests for pseudo locale on these screens    | #75 scope; requires migrated screens first (this PR is the prereq) | #75                                      |
| `getFileIcon()` emoji strings in `CaptureFile.tsx`   | Emoji codepoints are not user-facing text / not locale-sensitive   | None                                     |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
