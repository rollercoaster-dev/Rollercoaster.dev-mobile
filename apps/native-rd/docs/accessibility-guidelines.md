# Accessibility Guidelines

This document outlines accessibility requirements and best practices for the native-rd React Native application. We target **WCAG 2.1 Level AA** compliance across all features and theme variants.

## Table of Contents

- [WCAG AA Requirements](#wcag-aa-requirements)
- [Color Contrast](#color-contrast)
- [Touch Targets](#touch-targets)
- [Screen Reader Support](#screen-reader-support)
- [Focus Management](#focus-management)
- [Component Checklist](#component-checklist)
- [Testing](#testing)
- [Theme Considerations](#theme-considerations)
- [Resources](#resources)

## WCAG AA Requirements

### Color Contrast Ratios

- **Normal text** (< 18pt regular, < 14pt bold): **4.5:1** minimum contrast ratio
- **Large text** (≥ 18pt regular, ≥ 14pt bold): **3:1** minimum contrast ratio
- **UI components** (icons, borders, focus indicators): **3:1** minimum contrast ratio

### Touch Target Sizes

- **Minimum**: 44×44 points (iOS HIG)
- **Recommended**: 48×48 points for better usability

### Screen Reader Support

- All content must be accessible via VoiceOver (iOS) and TalkBack (Android)
- Proper semantic roles and labels required
- Logical reading order enforced

## Color Contrast

### Using the Contrast Checker

We provide a utility function to verify color contrast ratios:

```typescript
import { getContrastRatio, meetsWCAG } from "../utils/accessibility";

// Check contrast ratio
const ratio = getContrastRatio("#262626", "#d97706"); // Returns 4.75

// Verify WCAG compliance
const result = meetsWCAG("#262626", "#d97706", "AA", "normal");
// Returns: { passes: true, ratio: 4.75, required: 4.5 }
```

### Hardcoded Colors

When using hardcoded colors (e.g., for consistent appearance across themes), always verify contrast:

```typescript
// ✓ GOOD - Documented contrast ratios
const styles = {
  destructive: {
    backgroundColor: theme.colors.warning, // #d97706
    color: "#262626", // 4.75:1 contrast ✓
  },
};

// ✗ BAD - No contrast verification
const styles = {
  destructive: {
    backgroundColor: "#ff6b35",
    color: "#fafafa", // May fail WCAG!
  },
};
```

**Note**: When hardcoding colors, add a comment documenting the contrast ratio across all relevant theme variants.

### Theme Color Changes

All changes to design tokens (in `@rollercoaster-dev/design-tokens`) must be verified for WCAG compliance:

1. Test the color change across all 12 theme variants
2. Verify contrast ratios for all affected UI elements
3. Document the contrast ratios in the PR description
4. Update automated tests if needed

## Touch Targets

### Minimum Sizes

All interactive elements must meet minimum touch target sizes:

```typescript
// Button already enforces 48px minimum
<Button size="sm" /> {/* Minimum 48px height */}

// IconButton already enforces 48x48
<IconButton size="sm" /> {/* Minimum 48x48 */}

// Custom pressables
<Pressable
  style={{
    minWidth: 44,
    minHeight: 44, // WCAG minimum
    padding: 12,   // Additional padding for better UX
  }}
>
```

### Spacing

Ensure adequate spacing between touch targets to prevent accidental taps:

```typescript
// ✓ GOOD - Adequate spacing
<View style={{ gap: theme.space[3] }}>
  <Button />
  <Button />
</View>

// ✗ BAD - Insufficient spacing
<View style={{ gap: 2 }}>
  <Button />
  <Button />
</View>
```

## Screen Reader Support

### Accessibility Labels

All interactive elements require descriptive labels:

```typescript
// ✓ GOOD - Descriptive label
<IconButton
  icon="trash"
  accessibilityLabel="Delete goal"
  onPress={handleDelete}
/>

// ✗ BAD - Missing label
<IconButton icon="trash" onPress={handleDelete} />
```

### Accessibility Hints

Provide hints for complex interactions:

```typescript
<Card
  onPress={() => navigate('Details')}
  accessibilityLabel="JavaScript Tutorial, 5 of 10 steps completed"
  accessibilityHint="Double-tap to view details"
/>
```

### Accessibility Roles

Use semantic roles to convey element type:

```typescript
<Text accessibilityRole="header">Screen Title</Text>
<Pressable accessibilityRole="button">Click me</Pressable>
<Switch accessibilityRole="switch" />
<View accessibilityRole="progressbar" accessibilityValue={{ now: 50, min: 0, max: 100 }} />
```

### Available Roles

- `header` - Headings and titles
- `button` - Pressable buttons
- `link` - Navigation links
- `text` - Static text
- `switch` - Toggle switches
- `checkbox` - Checkboxes
- `radio` - Radio buttons
- `progressbar` - Progress indicators
- `image` - Images (use `accessibilityLabel` or mark as decorative)

## Focus Management

### Modal Dialogs

Modals must trap focus and announce their presence:

```typescript
<Modal
  visible={visible}
  accessibilityViewIsModal // Traps focus
>
  <View
    accessible
    accessibilityLiveRegion="polite" // Announces content
  >
    <Text accessibilityRole="header">Modal Title</Text>
    <Text>Modal content...</Text>
  </View>
</Modal>
```

### Focus Traps

Ensure users can navigate out of all interactive elements:

- Test with VoiceOver/TalkBack
- Verify escape mechanisms (close buttons, swipe gestures)
- Test with Switch Control (iOS) if keyboard navigation is supported

### Live Regions

Use live regions to announce dynamic content:

```typescript
// Polite - Wait for user to finish current action
<View accessibilityLiveRegion="polite">
  <Text>{statusMessage}</Text>
</View>

// Assertive - Interrupt immediately (use sparingly)
<View accessibilityLiveRegion="assertive">
  <Text>{errorMessage}</Text>
</View>
```

## Component Checklist

Use this checklist when creating or modifying components:

### Interactive Components

- [ ] Has proper `accessibilityRole`
- [ ] Has descriptive `accessibilityLabel` (if not self-explanatory)
- [ ] Has `accessibilityHint` for complex interactions
- [ ] Touch target meets 44×44 minimum
- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for UI)
- [ ] Tested with VoiceOver (iOS) and/or TalkBack (Android)

### Images

- [ ] Has `accessibilityLabel` describing the image content
- [ ] Or marked as decorative with `accessible={false}` if purely decorative

### Forms

- [ ] All inputs have labels (via `accessibilityLabel` or `accessibilityLabelledBy`)
- [ ] Error states are announced
- [ ] Required fields are indicated
- [ ] Help text is associated with inputs

### Modal Dialogs

- [ ] Has `accessibilityViewIsModal={true}`
- [ ] Content has `accessibilityLiveRegion="polite"`
- [ ] Title has `accessibilityRole="header"`
- [ ] Can be dismissed via standard gestures
- [ ] Focus returns to trigger element on close

## Testing

### Manual Testing with VoiceOver (iOS)

1. Enable VoiceOver: Settings → Accessibility → VoiceOver
2. Navigate through each screen:
   - Swipe right to move forward
   - Swipe left to move backward
   - Double-tap to activate
   - Three-finger swipe to scroll
3. Verify:
   - All interactive elements are reachable
   - Labels are clear and descriptive
   - Reading order is logical
   - No focus traps exist
   - Modals trap focus appropriately

### Manual Testing with TalkBack (Android)

1. Enable TalkBack: Settings → Accessibility → TalkBack
2. Navigate through each screen:
   - Swipe right to move forward
   - Swipe left to move backward
   - Double-tap to activate
   - Two-finger swipe to scroll
3. Verify same criteria as VoiceOver testing

### Automated Testing

We provide contrast ratio verification via the accessibility utility:

```typescript
import { meetsWCAG } from "../utils/accessibility";

// In your test file
describe("Button contrast", () => {
  it("meets WCAG AA in all themes", () => {
    const result = meetsWCAG(
      "#262626", // text color
      "#d97706", // background color
      "AA",
      "normal",
    );

    expect(result.passes).toBe(true);
    expect(result.ratio).toBeGreaterThanOrEqual(4.5);
  });
});
```

Future work: Integrate `@testing-library/react-native` with `jest-native` for automated accessibility assertions.

## Theme Considerations

The app supports 14 theme variants (2 color modes × 7 accessibility variants):

### Theme Variants

1. **Default** - Standard light/dark modes
2. **High Contrast** - WCAG AAA compliance (7:1 for normal text, 4.5:1 for large text)
3. **Large Text** - Increased font sizes for better readability
4. **Dyslexia Friendly** - Optimized font and spacing
5. **Low Vision** - Maximum contrast and clarity
6. **Autism Friendly** - Muted/desaturated colors, no shadows, calming palette
7. **Low Info** - Stripped-back UI, minimal decorative elements, text-first

### Testing Across Themes

When making UI changes, verify across all variants:

```typescript
// Switch theme in app
import { useTheme } from "../hooks/useTheme";

const { setTheme } = useTheme();

// Test each variant
setTheme("default-light");
setTheme("default-dark");
setTheme("highContrast-light");
setTheme("highContrast-dark");
// ... test remaining variants
```

### Color Token Changes

When modifying design tokens:

1. Update `@rollercoaster-dev/design-tokens` package
2. Rebuild tokens: `cd monorepo/packages/design-tokens && bun run build`
3. Test all 12 theme variants
4. Verify contrast ratios using the accessibility utility
5. Document changes in CHANGELOG and PR description

## Resources

### WCAG Guidelines

- [WCAG 2.1 Level AA Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_customize&levels=aaa)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)

### React Native

- [React Native Accessibility Docs](https://reactnative.dev/docs/accessibility)
- [Testing React Native Apps for Accessibility](https://reactnative.dev/docs/accessibility#testing)

### Platform Guidelines

- [iOS Human Interface Guidelines - Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Android Accessibility Guidelines](https://developer.android.com/guide/topics/ui/accessibility)

### Testing Tools

- [Accessibility Scanner (Android)](https://play.google.com/store/apps/details?id=com.google.android.apps.accessibility.auditor)
- [Accessibility Inspector (Xcode)](https://developer.apple.com/library/archive/documentation/Accessibility/Conceptual/AccessibilityMacOSX/OSXAXTestingApps.html)

---

## Need Help?

If you have questions about implementing accessibility features:

1. Check this document first
2. Review existing components (`Button`, `IconButton`, `Card`, `StatusBadge`)
3. Use the accessibility utility functions in `src/utils/accessibility.ts`
4. Test with VoiceOver/TalkBack early and often
5. Ask for review from the team before merging

Remember: Accessibility is not optional—it's a fundamental requirement for all features.
