# Issue #53: Evidence Capture - Link

## Summary
Implement the CaptureLink screen to replace the CapturePlaceholder for the "Add Link" evidence type. Users can enter a URL, optionally add a caption, validate the URL, save it as evidence (type: link), and tap to open links in the system browser.

## Complexity: Medium
Estimated commits: 4

## Analysis

### Current State
- `CaptureLink` route exists in navigation (GoalsStack.tsx) but maps to `CapturePlaceholder`
- Evidence CRUD already supports `type: 'link'` with `uri` field for the URL
- `EvidenceActionSheet` has "Add Link" option routing to `CaptureLink`
- `GoalDetailScreen` passes `{ goalId }` params via `CaptureParams`
- Navigation types already define `CaptureLinkScreenProps`

### What Needs to Be Built
1. **CaptureLinkScreen** - New screen component with URL input, validation, optional caption, save button
2. **URL validation utility** - Validate URLs before saving
3. **Link preview card** - Display saved link evidence with URL preview
4. **Open in browser** - Tap link evidence to open in system browser
5. **Tests** - Unit tests for URL validation, component tests for the screen
6. **Wire up navigation** - Replace CapturePlaceholder with CaptureLinkScreen in GoalsStack

## Implementation Plan

### Step 1: URL validation utility + tests
- Create `src/utils/url.ts` with `isValidUrl()` function
- Create `src/utils/__tests__/url.test.ts` with test cases
- Handle http/https URLs, edge cases

### Step 2: CaptureLinkScreen component
- Create `src/screens/CaptureLinkScreen/` directory
- `CaptureLinkScreen.tsx` - URL input, optional caption, Save/Cancel buttons
- `CaptureLinkScreen.styles.ts` - Styled with unistyles
- `index.ts` - barrel export
- Uses `createEvidence` from db layer with type: 'link'
- Navigates back on success

### Step 3: Wire up navigation + link opening
- Update `GoalsStack.tsx` to use `CaptureLinkScreen` instead of `CapturePlaceholder`
- Update `EvidenceThumbnail` to support opening links in system browser via `Linking.openURL`

### Step 4: Tests for CaptureLinkScreen
- Create `src/screens/CaptureLinkScreen/__tests__/CaptureLinkScreen.test.tsx`
- Test URL validation display, save flow, navigation

## Dependencies
- No new packages needed (react-native `Linking` API is built-in)
- Issue #46 (evidence action sheet) is already closed
