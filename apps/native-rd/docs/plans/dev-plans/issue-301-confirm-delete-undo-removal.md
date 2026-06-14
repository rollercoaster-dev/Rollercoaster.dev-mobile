# Development Plan: Issue #301

## Issue Summary

**Title**: Prefer explicit confirm-delete over transient undo for destructive actions
**Type**: enhancement / bug-fix
**Complexity**: SMALL
**Estimated Lines**: ~120 lines (net deletion; gross change is larger)

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective.

- [x] After confirming evidence deletion in FocusModeScreen, no undo toast appears; the DB soft-delete and file cleanup fire immediately on confirm.
- [x] `restoreEvidence` is no longer exported from `src/db/queries.ts` (deleted); `pendingFileDeletionRef` and `handleUndoDelete` are gone from `FocusModeScreen`.
- [x] BadgeDetailScreen's delete path uses `ConfirmDeleteModal` instead of the system `Alert.alert` sheet; the UX matches GoalsScreen and EditModeScreen.
- [x] Step deletion in EditModeScreen calls `handleDeleteStep` directly (unchanged — no confirm required for single-step removal since the button is already gated by `canDelete`). No regression introduced.
- [x] The `confirmDelete.message` string in `en/focusMode.json` and `de/focusMode.json` no longer references undo.
- [x] The test "restores evidence when undo is pressed in toast" is replaced by a test that asserts `deleteEvidenceFile` was called immediately after confirm (no timer).
- [x] The test "shows undo toast after confirming evidence deletion" is replaced by a test asserting a confirmation toast appears with no undo action.

## Dependencies

No linked blockers in the issue body.

| Issue | Title                     | Status | Type                  |
| ----- | ------------------------- | ------ | --------------------- |
| #264  | Toast a11y                | —      | Context only          |
| #299  | Toast a11y bug-fix bundle | —      | Context only (merged) |

**Status**: All dependencies met.

## Objective

Remove the broken delete-then-undo-toast pattern from `FocusModeScreen` and migrate `BadgeDetailScreen` from `Alert.alert` to `ConfirmDeleteModal`, making all destructive actions in the app go through the same explicit confirm-before-delete dialog.

## Decisions

| ID  | Decision                                                                                    | Alternatives Considered             | Rationale                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Delete `restoreEvidence` from `queries.ts`                                                  | Leave dead code, mark `@deprecated` | The function is broken by design (Evolu can't write SQL NULL back to `isDeleted`); dead exports invite future misuse                                                                                                                                                                         |
| D2  | Run `deleteEvidenceFile` synchronously inside `handleConfirmDeleteEvidence`, not in a timer | Keep deferred but shorter timeout   | Without undo there is no reason to defer; synchronous cleanup is simpler and eliminates the `pendingFileDeletionRef` complexity                                                                                                                                                              |
| D3  | Migrate `BadgeDetailScreen` from `Alert.alert` to `ConfirmDeleteModal`                      | Leave `Alert.alert`                 | Design consistency; `Alert.alert` is an OS sheet that varies visually by platform and cannot be themed; `ConfirmDeleteModal` carries the neo-brutalist design system                                                                                                                         |
| D4  | Keep `action` prop on `Toast` / `ToastContext` intact                                       | Remove `action` from the API        | Only one caller ever passed `action` (the undo toast), but the prop is tested independently in `Toast.test.tsx` and is part of the public component API. Removing it would be a separate refactor with no benefit from this issue's scope.                                                   |
| D5  | No confirm required for step deletion in `EditModeScreen` (via `StepList`)                  | Add per-step confirm                | Step deletion is already gated: the delete button is hidden when `stepRows.length <= 1`, so deletion never removes the last step. The button is a small ✕ inline in edit mode — adding a modal for each keypress would disrupt the edit flow more than it helps. Documented as not-in-scope. |

> **All five decisions confirmed by Joe on 2026-06-14** via start-issue open-questions pass: D1 delete `restoreEvidence`, D4 keep `action` prop, D5 leave step delete as-is, and evidence copy = "This cannot be undone." / "Dies kann nicht rückgängig gemacht werden."

## Affected Areas

- `src/screens/FocusModeScreen/FocusModeScreen.tsx`: Remove `restoreEvidence` import, `hideToast` import, `pendingFileDeletionRef` ref, `handleUndoDelete` callback, deferred timer inside `handleConfirmDeleteEvidence`; replace with immediate `deleteEvidenceFile`; remove undo toast `showToast` call.
- `src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`: Replace two broken/false-confidence tests (undo toast appearance, undo press calls `restoreEvidence`) with tests that assert immediate file cleanup and absence of undo toast.
- `src/screens/BadgeDetailScreen/BadgeDetailScreen.tsx`: Replace `Alert.alert` delete confirm with `ConfirmDeleteModal` (add `useState` for `showDeleteModal`, add import).
- `src/db/queries.ts`: Delete `restoreEvidence` function (~8 lines).
- `src/db/index.ts`: Remove `restoreEvidence` from barrel exports (if present).
- `src/i18n/resources/en/focusMode.json`: Update `confirmDelete.message` to remove undo reference.
- `src/i18n/resources/de/focusMode.json`: Update `confirmDelete.message` to remove undo reference.
- `src/i18n/resources/pseudo/focusMode.json`: Update `confirmDelete.message` to match (pseudo-locale mirrors en).

## Implementation Plan

### Step 1: Remove undo-toast from FocusModeScreen; make file cleanup immediate

**Files**: `src/screens/FocusModeScreen/FocusModeScreen.tsx`
**Commit**: `fix(focus-mode): remove broken undo-toast, fire file cleanup immediately on confirm`
**Changes**:

- [ ] Remove `restoreEvidence` from the `../../db` import list.
- [ ] Remove `hideToast` from the `useToast()` destructure (keep `showToast` for error and evidence-required toasts).
- [ ] Delete `pendingFileDeletionRef` ref declaration and its cleanup in the `useEffect` exit function.
- [ ] Delete `handleUndoDelete` callback.
- [ ] In `handleConfirmDeleteEvidence`: replace the `setTimeout` + `pendingFileDeletionRef` block with a direct call to `deleteEvidenceFile(row?.uri, row?.type ?? "")` immediately after `deleteEvidence(id as EvidenceId)` succeeds; remove the `showToast` call that showed the undo action.

### Step 2: Remove `restoreEvidence` from queries and barrel export

**Files**: `src/db/queries.ts`, `src/db/index.ts`
**Commit**: `refactor(db): remove restoreEvidence — Evolu cannot write NULL back to isDeleted`
**Changes**:

- [ ] Delete the `restoreEvidence` function from `queries.ts` (lines 816–829).
- [ ] Remove `restoreEvidence` from `src/db/index.ts` barrel if exported there.

### Step 3: Migrate BadgeDetailScreen delete to ConfirmDeleteModal

**Files**: `src/screens/BadgeDetailScreen/BadgeDetailScreen.tsx`
**Commit**: `feat(badge-detail): replace Alert.alert delete sheet with ConfirmDeleteModal`
**Changes**:

- [ ] Add `import { ConfirmDeleteModal } from "../ConfirmDeleteModal";`
- [ ] Add `const [showDeleteModal, setShowDeleteModal] = useState(false);`
- [ ] Replace the `Alert.alert(...)` body of `handleDelete` with `setShowDeleteModal(true)`.
- [ ] Render `<ConfirmDeleteModal>` in the JSX (alongside the existing `ScrollView`), wired to `showDeleteModal` / `onCancel={() => setShowDeleteModal(false)}` / `onConfirm={() => { deleteBadge(badgeId as BadgeId); setShowDeleteModal(false); navigation.goBack(); }}` with i18n keys from the existing `badgeDetail:deleteConfirm.*` namespace.

### Step 4: Update confirmDelete.message i18n strings

**Files**: `src/i18n/resources/en/focusMode.json`, `src/i18n/resources/de/focusMode.json`, `src/i18n/resources/pseudo/focusMode.json`
**Commit**: `fix(i18n): remove undo reference from evidence confirmDelete message`
**Changes**:

- [ ] `en`: Change `"message": "You can undo this briefly after deleting."` → `"message": "This cannot be undone."` (CONFIRMED by Joe 2026-06-14).
- [ ] `de`: Change `"Du kannst das kurz nach dem Löschen rückgängig machen."` → `"message": "Dies kann nicht rückgängig gemacht werden."`
- [ ] `pseudo`: Mirror en update.

### Step 5: Fix tests in FocusModeScreen

**Files**: `src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`
**Commit**: `test(focus-mode): replace false-confidence undo tests with immediate-delete assertions`
**Changes**:

- [ ] Remove `mockRestoreEvidence` declaration and mock wiring (lines 56, 91).
- [ ] Remove `restoreEvidence` from the `../../db` mock object.
- [ ] Replace test "shows undo toast after confirming evidence deletion" with a test asserting: no undo toast appears; `mockDeleteEvidenceFile` was called immediately after confirm.
- [ ] Replace test "restores evidence when undo is pressed in toast" with a test asserting: pressing confirm calls `deleteEvidenceFile` (immediate file cleanup path).
- [ ] Import `deleteEvidenceFile` from `../../../utils/evidenceCleanup` in the test and expose its mock via `jest.mocked`.

## Testing Strategy

- [ ] Unit tests for `FocusModeScreen` (Jest 30, `@testing-library/react-native` v13) — covered in Step 5.
- [ ] Test file mirrors `src/` under `src/__tests__/` — already the case (`src/screens/FocusModeScreen/__tests__/`).
- [ ] Existing confirm-dialog tests ("cancels evidence deletion when cancel is pressed", "deletes evidence when confirmed via modal") must continue to pass unchanged.
- [ ] No new test file needed; all changes are within the existing test file.
- [ ] Manual: tap-delete evidence in FocusModeScreen → confirm → verify no toast; verify evidence disappears immediately; verify file is cleaned up (check device storage for photo/video evidence).
- [ ] Manual: tap delete badge in BadgeDetailScreen → confirm modal appears (not OS Alert sheet) → confirm → badge disappears.

## Not in Scope

| Item                                                                   | Reason                                                                                                                                                                                                                                                                                                                                            | Follow-up                                                                                                                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Step deletion confirm dialog in EditModeScreen (via StepList)          | Deletion is already gated (`canDelete` guard hides the button at 1 step); per-step modal would disrupt edit flow                                                                                                                                                                                                                                  | None planned                                                                                                                                                                |
| Removing `action` prop from `Toast` / `ToastContext`                   | Other toasts may adopt actions in future; it is a tested API; removing it is a separate refactor                                                                                                                                                                                                                                                  | None planned                                                                                                                                                                |
| Adding confirm for GoalsScreen long-press delete                       | Already uses `ConfirmDeleteModal` — no change needed                                                                                                                                                                                                                                                                                              | —                                                                                                                                                                           |
| Adding confirm for EditModeScreen goal delete                          | Already uses `ConfirmDeleteModal` — no change needed                                                                                                                                                                                                                                                                                              | —                                                                                                                                                                           |
| `common:actions.undo` i18n key removal                                 | The key may be reused elsewhere; removing it is out of scope                                                                                                                                                                                                                                                                                      | None planned                                                                                                                                                                |
| Sentry observability for orphaned evidence files (MEDIUM, self-review) | `deleteEvidenceFile` (`utils/evidenceCleanup.ts`, not in this diff) swallows disk errors by design (logs only, never throws so the soft-delete stays committed). A failed file delete is invisible to Sentry, so accumulating orphans would be undebuggable from prod telemetry. Pre-existing best-effort behavior in a file #301 does not touch. | [#308](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/308) — route `evidenceCleanup`'s internal catch through `reportError` (area `evidence.cleanup`) |

## Discovery Log

- [2026-06-14] Kept a non-actionable confirmation toast (`focusMode:toast.evidenceDeleted`, no `action`) on confirm rather than removing `showToast` entirely. It gives ND users feedback that the delete happened; the issue's concern was the _undo action_ (time-boxed reaction), which is gone. Tests assert the toast appears but `queryByLabelText("Undo")` is null.
- [2026-06-14] Removed now-unused `useCallback` import from `FocusModeScreen` (its only use was the deleted `handleUndoDelete`).
- [2026-06-14] Added a `delete badge` describe block to `BadgeDetailScreen.test.tsx` (3 tests: opens modal / confirms+navigates / cancel is a no-op). The migrated delete path had zero test coverage; adding it avoids the false-confidence gap this issue is itself about. Required adding `deleteBadge` to the screen's `../../../db` jest mock.
- [2026-06-14] `gen:pseudo` also rewrote padding dots in `pseudo/completion.json` (pre-existing generator drift unrelated to #301); reverted that file and committed only `pseudo/focusMode.json`.
- [2026-06-14] **Self-review fix (HIGH, silent-failure-hunter):** the migrated `handleConfirmDelete` in `BadgeDetailScreen` called `deleteBadge` (which throws on Evolu failure) with no try/catch — the modal would dismiss onto an unchanged screen with no feedback. Wrapped it to match the FocusMode pattern: `reportError({ area: "badge.storage", kind: "delete" })` + error Alert (new `badgeDetail:deleteError.{title,message}` keys in en/de/pseudo), navigate back only on success. Added a 4th badge test for the failure path.
- [2026-06-14] **Self-review fix (LOW, silent-failure-hunter):** the evidence-delete catch reported `{ area: "focus.mode" }` with no `kind`. Added `kind: "evidence-delete"`, replacing the now-dead `"evidence-restore"` kind (orphaned by the deleted `handleUndoDelete`) in the `sentry-report.ts` closed union.
