# Issue #99: Add Accessibility Test Suite

## Summary

Add focused a11y tests covering: interactive elements have labels/roles, modals have accessibilityViewIsModal, status changes trigger announcements, buttons focusable with correct roles, form inputs have labels.

## Components to Test

### Interactive Elements (buttons, pressables)

- **Button** - accessibilityRole="button", accessibilityLabel, accessibilityState (disabled, busy)
- **IconButton** - accessibilityRole="button", required accessibilityLabel
- **Card** (pressable variant) - accessibilityRole="button" when onPress provided
- **CollapsibleSection** - accessibilityRole="button", accessibilityState.expanded
- **SettingsRow** (pressable variant) - accessibilityRole="button"
- **Checkbox** - accessibilityRole="checkbox", accessibilityState.checked

### Form Inputs

- **Input** - accessibilityLabel from label or placeholder, accessibilityState.disabled
- **Switch in SettingsRow** - accessibilityLabel, accessibilityRole="switch"

### Status/Progress

- **StatusBadge** - accessibilityRole="text", accessibilityLabel with status
- **ProgressBar** - accessibilityRole="progressbar", accessibilityValue (min/max/now)

### Modals

- **CelebrationModal** - accessibilityViewIsModal, accessibilityLiveRegion="polite", header role
- **ConfirmDeleteModal** - accessibilityViewIsModal, accessibilityLiveRegion="polite", header role

### Composite Components

- **GoalCard** - accessibilityLabel with step count, accessibilityHint
- **EmptyState** - header role on title

## Implementation Plan

### Commit 1: Add accessibility test helpers

Create `src/__tests__/a11y-helpers.ts` with reusable accessibility assertion helpers.

### Commit 2: Add interactive element accessibility tests

Create `src/__tests__/accessibility/interactive-elements.test.tsx` covering Button, IconButton, Card, CollapsibleSection, SettingsRow, Checkbox.

### Commit 3: Add form input accessibility tests

Create `src/__tests__/accessibility/form-inputs.test.tsx` covering Input, SettingsRow toggle.

### Commit 4: Add status/progress accessibility tests

Create `src/__tests__/accessibility/status-progress.test.tsx` covering StatusBadge, ProgressBar.

### Commit 5: Add modal accessibility tests

Create `src/__tests__/accessibility/modals.test.tsx` covering CelebrationModal, ConfirmDeleteModal.

### Commit 6: Add composite component accessibility tests

Create `src/__tests__/accessibility/composite-components.test.tsx` covering GoalCard, EmptyState.
