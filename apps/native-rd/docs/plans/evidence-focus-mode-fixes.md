# Native RD Evidence Focus Mode Fixes

## Summary

Fix the current mismatch between step evidence requirements, focus-mode step completion, and evidence capture shortcuts in `apps/native-rd`.

The review identified three existing issues:

- Steps with `plannedEvidenceTypes = null` are intended to complete without evidence in focus mode, but `completeStep` still rejects them.
- Screenshot exists as a partial evidence type even though no screenshot capture route exists.
- Blocked step completion controls are announced as disabled while still being intentionally pressable.

The implementation will also add quick evidence actions on step cards so users can jump directly to the missing planned evidence type, similar to the existing quick-note flow.

## Branch

`fix/evidence-fixes`

## Affected Areas

- `apps/native-rd/src/db/queries.ts`
- `apps/native-rd/src/db/__tests__/queries.step.test.ts`
- `apps/native-rd/src/components/StepCard/StepCard.tsx`
- `apps/native-rd/src/components/StepCard/__tests__/StepCard.test.tsx`
- `apps/native-rd/src/db/schema.ts`
- `apps/native-rd/src/constants/evidenceIcons.ts`
- `apps/native-rd/src/utils/evidenceCleanup.ts`
- `apps/native-rd/src/utils/evidenceViewers.tsx`
- `apps/native-rd/src/components/FABMenu/FABMenu.tsx`
- `apps/native-rd/src/components/FABMenu/__tests__/FABMenu.test.tsx` if present, otherwise add focused coverage where the menu is already exercised
- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`
- `apps/native-rd/src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`
- `apps/native-rd/src/types/evidence.ts`

## Implementation Steps

### Step 1: Align step completion gating

**Commit:** `fix(native-rd): align step evidence completion rules`

- Treat `plannedEvidenceTypes = null` as no step-level evidence requirement.
- Keep planned evidence arrays gated: at least one captured evidence type must match a planned type.
- Update DB tests to cover:
  - null planned types with no evidence can complete
  - planned types with no evidence still cannot complete
  - planned types with wrong evidence still cannot complete
  - planned types with matching evidence can complete

### Step 2: Remove unsupported Screenshot evidence type

**Commit:** `fix(native-rd): remove unsupported screenshot evidence type`

- Remove Screenshot from the supported evidence type enum and runtime helper maps.
- Prefer deriving menu items from the shared supported evidence option list so picker/menu behavior cannot drift again.
- Add or update tests to verify only actionable evidence types are shown.

### Step 3: Add quick evidence actions to step cards

**Commit:** `feat(native-rd): add quick evidence actions in focus mode`

- Keep the existing inline quick-note input for missing planned text evidence.
- For missing planned photo, video, voice memo, link, and file evidence, show compact quick action buttons on the step card.
- Pressing a quick action navigates directly to the matching capture screen with `{ goalId, stepId }`.
- Keep the drawer and full evidence FAB as the broader add/view evidence path.
- Do not add Screenshot quick action unless a supported evidence type and capture route are implemented.

### Step 4: Fix blocked completion accessibility

**Commit:** `fix(native-rd): keep blocked step completion actionable`

- Do not mark the blocked completion control as disabled when pressing it opens the evidence path.
- Preserve clear accessible labels/hints that explain which evidence is required.
- Ensure blocked completion opens the evidence path instead of completing the step.

## Validation

Run focused validation after implementation:

```bash
bun test apps/native-rd/src/db/__tests__/queries.step.test.ts
bun test apps/native-rd/src/components/StepCard/__tests__/StepCard.test.tsx
bun test apps/native-rd/src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx
```

Run package validation before PR:

```bash
bun --filter native-rd type-check
bun --filter native-rd lint
```

## Notes

- `plannedEvidenceTypes = []` serializes to `null`, so it should follow the no-requirement behavior.
- Focus mode should remain local-first: all quick actions must use existing capture screens and local evidence creation.
- Scope is intentionally limited to existing evidence types and focus-mode step workflows.
