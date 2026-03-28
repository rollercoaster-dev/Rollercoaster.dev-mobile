# Development Plan: Issue #81

## Issue Summary

**Title**: Accessibility audit and improvements
**Type**: Enhancement (Accessibility)
**Complexity**: MEDIUM
**Estimated Lines**: ~350 lines

## Dependencies

No blocking dependencies.

**Status**: All dependencies met

## Objective

Perform a comprehensive accessibility audit of the native-rd app and implement fixes to ensure WCAG AA compliance across all 12 theme variants. This work addresses color contrast issues introduced in PR #80, ensures all interactive elements have proper accessibility attributes, and establishes automated accessibility testing infrastructure.

## Affected Areas

### Components to Audit/Fix
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/components/Button/Button.tsx` - Verify all variant contrast ratios
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/components/Button/Button.styles.ts` - Adjust destructive button colors if needed
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/navigation/TabNavigator.tsx` - Fix navigation bar text contrast
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/components/Card/Card.tsx` - Add accessibility props for pressable cards
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/components/StatusBadge/StatusBadge.tsx` - Add accessibility label
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/components/EmptyState/EmptyState.tsx` - Semantic structure
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/screens/ConfirmDeleteModal/ConfirmDeleteModal.tsx` - Focus management
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/screens/CelebrationModal/CelebrationModal.tsx` - Focus management

### New Files to Create
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/utils/accessibility.ts` - Utility functions for color contrast validation
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/docs/accessibility-guidelines.md` - Developer guidelines

## Implementation Plan

### Step 1: Create accessibility utilities and audit infrastructure

**Files**:
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/utils/accessibility.ts` (new)

**Commit**: `feat(a11y): add accessibility utilities and color contrast checker`

**Changes**:
- Create utility function to calculate contrast ratios (WCAG formula)
- Add function to validate WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)
- Add function to get recommended text color for background
- Export TypeScript types for accessibility levels

**Estimated lines**: ~80 lines

---

### Step 2: Audit and fix button color contrast

**Files**:
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/components/Button/Button.styles.ts`
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/themes/adapter.ts` (if color adjustments needed)

**Commit**: `fix(a11y): ensure button variants meet WCAG AA contrast requirements`

**Changes**:
- Analyze destructive button contrast (dark text on orange `warning` color)
- If contrast fails, adjust text color to use white/light color on warning background
- Verify primary button (purple background with light text) meets standards
- Verify secondary button (light background with dark text) meets standards
- Verify ghost button contrast against all backgrounds
- Add inline comments documenting contrast ratios for future reference

**Priority issue from PR #80**: Destructive button uses `theme.colors.text` (black) on `theme.colors.warning` (orange), which likely fails WCAG in some theme variants.

**Estimated lines**: ~30 lines

---

### Step 3: Fix navigation bar text contrast

**Files**:
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/navigation/TabNavigator.tsx`

**Commit**: `fix(a11y): improve tab bar text contrast on purple background`

**Changes**:
- Verify current contrast of black text on `accentPurple` background
- If insufficient, adjust `tabBarActiveTintColor` to use white or a lighter color
- Ensure inactive tab color also meets minimum contrast (3:1 for UI components)
- Consider using `theme.colors.background` (white/light) for active state
- Test across all theme variants to ensure consistency

**Priority issue from PR #80**: Black text on purple background may not meet WCAG standards.

**Estimated lines**: ~10 lines

---

### Step 4: Add missing accessibility labels and hints

**Files**:
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/components/Card/Card.tsx`
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/components/StatusBadge/StatusBadge.tsx`
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/components/EmptyState/EmptyState.tsx`
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/screens/GoalDetailScreen/GoalDetailScreen.tsx`
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/screens/BadgeDetailScreen/BadgeDetailScreen.tsx`

**Commit**: `feat(a11y): add accessibility labels and semantic roles to components`

**Changes**:
- Card: When pressable, ensure `accessibilityLabel` is set (accept as prop with sensible default)
- StatusBadge: Add `accessibilityLabel` prop to announce badge status
- EmptyState: Add `accessibilityRole="header"` to title text
- GoalCard: Already has good accessibility, verify it inherits from Card properly
- Screen headers: Ensure top-level headings use `accessibilityRole="header"`
- Add `accessibilityHint` to cards that navigate ("Double-tap to view details")

**Estimated lines**: ~60 lines

---

### Step 5: Improve modal focus management

**Files**:
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/screens/ConfirmDeleteModal/ConfirmDeleteModal.tsx`
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/screens/CelebrationModal/CelebrationModal.tsx`

**Commit**: `feat(a11y): improve modal focus management and announcements`

**Changes**:
- ConfirmDeleteModal: Add `accessibilityViewIsModal={true}` to Modal component
- Add `accessibilityLiveRegion="polite"` to modal content for screen reader announcements
- CelebrationModal: Same modal accessibility improvements
- Ensure modal titles have `accessibilityRole="header"`
- Verify buttons have clear labels ("Cancel", "Delete", etc.)

**Estimated lines**: ~20 lines

---

### Step 6: Verify minimum touch target sizes

**Files**:
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/components/Button/Button.styles.ts`
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/components/IconButton/IconButton.styles.ts`

**Commit**: `feat(a11y): ensure all touch targets meet 44x44 minimum size`

**Changes**:
- Button: Verify `minHeight` is at least 44 for 'sm' size (currently 36, needs adjustment)
- Change small button minHeight from 36 to 44
- IconButton: Verify sizes meet minimum (check sm, md, lg variants)
- Document touch target requirements in component styles

**Note**: Button.styles.ts already has `Math.max(sizeMap[size].minHeight, 48)` which ensures 48px minimum, exceeding the 44px requirement. IconButton may need verification.

**Estimated lines**: ~20 lines

---

### Step 7: Add Switch accessibility for SettingsRow

**Files**:
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/components/SettingsRow/SettingsRow.tsx`

**Commit**: `feat(a11y): add accessibility labels to Switch components in SettingsRow`

**Changes**:
- When rendering Switch, add `accessibilityLabel` prop that describes what the switch controls
- Pass label text to Switch component
- Ensure Switch inherits proper accessibility state (on/off)
- Test with VoiceOver to verify proper announcement

**Estimated lines**: ~10 lines

---

### Step 8: Create accessibility documentation

**Files**:
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/docs/accessibility-guidelines.md` (new)

**Commit**: `docs(a11y): add accessibility guidelines for developers`

**Changes**:
- Document WCAG AA requirements (contrast ratios, touch targets)
- Provide checklist for new components:
  - All interactive elements need `accessibilityLabel`
  - All buttons/pressables need `accessibilityRole`
  - Images need `accessibilityLabel` or marked as decorative
  - Form inputs need labels and error states
  - Modal dialogs need `accessibilityViewIsModal`
  - Touch targets must be at least 44x44
- Document color contrast requirements for custom colors
- Link to React Native accessibility documentation
- Explain how to use the contrast checker utility
- Include VoiceOver testing instructions

**Estimated lines**: ~120 lines

---

### Step 9: Add contrast ratio verification for all themes

**Files**:
- `/Users/hailmary/Code/rollercoaster.dev/native-rd/src/themes/__tests__/contrast.test.ts` (new)

**Commit**: `test(a11y): add automated contrast ratio tests for all theme variants`

**Changes**:
- Create test file using the accessibility utility
- Test all 12 theme variants (2 color modes × 6 variants)
- Verify button variants meet WCAG AA:
  - Primary: text on accentPrimary background
  - Secondary: text on backgroundSecondary background
  - Ghost: text on transparent (assume background color)
  - Destructive: text on warning background
- Verify navigation bar: active/inactive text on accentPurple
- Test will fail if any combination doesn't meet standards
- Requires adding jest or vitest testing infrastructure (out of scope for this issue, document as follow-up)

**Note**: This step requires test infrastructure setup which may be a separate task. Can be implemented as a manual verification script first.

**Estimated lines**: ~50 lines (or defer to follow-up issue)

---

## Testing Strategy

### Manual Testing
- [ ] Test Button variants in Storybook across all theme variants
- [ ] Verify TabNavigator text is readable in all themes
- [ ] Use iOS VoiceOver to navigate through:
  - [ ] Goals list screen
  - [ ] Goal detail screen
  - [ ] Badges list screen
  - [ ] Settings screen
  - [ ] New Goal modal
  - [ ] Confirm Delete modal
- [ ] Verify proper reading order on each screen
- [ ] Test focus management in modals (focus trap, dismiss behavior)
- [ ] Verify all interactive elements are reachable with VoiceOver
- [ ] Check touch target sizes are adequate on physical device

### Automated Testing
- [ ] Run contrast ratio verification script for all themes
- [ ] Document any failures and required color adjustments
- [ ] (Future) Add accessibility test suite with jest/vitest

### Color Contrast Verification
Test these combinations across all 12 theme variants:
1. Primary button: `background` text on `accentPrimary` background
2. Secondary button: `text` on `backgroundSecondary`
3. Destructive button: text color on `warning` background (currently fails)
4. Tab bar active: text on `accentPurple`
5. Tab bar inactive: `backgroundSecondary` on `accentPurple`

Tools to use:
- Contrast checker utility (step 1)
- WebAIM Contrast Checker (https://webaim.org/resources/contrastchecker/)
- Manual testing with Color Contrast Analyzer

## Definition of Done

- [ ] All button variants meet WCAG AA contrast requirements (4.5:1 normal, 3:1 large)
- [ ] Navigation bar text is readable in all theme variants
- [ ] All interactive components have proper `accessibilityLabel`
- [ ] All interactive components have correct `accessibilityRole`
- [ ] Modal dialogs have proper focus management
- [ ] All touch targets meet 44x44 minimum size
- [ ] VoiceOver navigation works correctly on all screens
- [ ] No focus traps exist
- [ ] Accessibility guidelines documentation created
- [ ] Contrast ratio utility function created
- [ ] Type-check passing
- [ ] Lint passing
- [ ] Ready for PR

## Notes

### Priority Issues (from PR #80)
1. **Destructive button contrast**: Currently uses `theme.colors.text` (black) on `theme.colors.warning` (orange). This likely fails WCAG AA in most themes. Solution: Use white/light text color.

2. **Navigation text on purple**: TabNavigator uses black text (`theme.colors.text`) on purple background (`theme.colors.accentPurple`). Needs verification and potential adjustment.

### Current Accessibility Strengths
The codebase already has good accessibility practices:
- Button component has proper `accessibilityRole`, `accessibilityLabel`, and `accessibilityState`
- IconButton requires `accessibilityLabel` prop (good pattern)
- Input component has labels and accessibility attributes
- Checkbox uses proper `accessibilityRole="checkbox"` and `accessibilityState`
- ProgressBar uses `accessibilityRole="progressbar"` with value
- CollapsibleSection properly announces expanded state

### Areas Needing Improvement
- Card component when pressable needs better accessibility labels
- StatusBadge should announce its variant to screen readers
- Modal focus management could be enhanced
- Navigation bar contrast needs verification
- Some components could benefit from `accessibilityHint` for complex interactions

### Theme Considerations
The app has 12 theme variants:
- Light/Dark color modes (2)
- 6 accessibility-focused variants: default, highContrast, largeText, dyslexia, lowVision, autismFriendly, lowInfo

The highContrast and lowVision variants are specifically designed for WCAG AAA compliance with maximum contrast and no shadows. The fixes in this issue should ensure ALL variants meet at least WCAG AA standards.

### Follow-up Work
- Consider implementing automated accessibility tests with @testing-library/react-native and jest-native
- Add ESLint plugin for accessibility (eslint-plugin-react-native-a11y)
- Consider adding focus indicators for keyboard navigation (if needed for future iPad support)
- Create a11y test suite in CI/CD pipeline

### WCAG Guidelines Reference
- **WCAG AA Normal Text**: 4.5:1 contrast ratio (< 18pt regular, < 14pt bold)
- **WCAG AA Large Text**: 3:1 contrast ratio (≥ 18pt regular, ≥ 14pt bold)
- **Touch Targets**: Minimum 44×44 points (iOS HIG)
- **Focus Management**: No focus traps, logical focus order
- **Screen Reader**: All content accessible, proper semantic roles

### Complexity Justification
**MEDIUM complexity** because:
- Requires auditing ~17 component files across the codebase
- Needs color contrast analysis across 12 theme variants
- Involves creating new utility functions and documentation
- Manual VoiceOver testing is time-consuming but necessary
- Estimated ~350 lines of code changes across 9 commits
- Single cohesive PR focused on accessibility improvements
- No architectural changes, mostly additive improvements
