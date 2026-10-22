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

1. Test the color change across all seven product themes ([ND Themes](./design/nd-themes.md#testing-matrix))
2. Verify contrast ratios for all affected UI elements
3. Document the contrast ratios in the PR description
4. Update automated tests if needed

## Touch Targets

### Minimum Sizes

All interactive elements must meet minimum touch target sizes:

```typescript
// Button already enforces 48px minimum
<Button size="sm" /> {/* Minimum 48px height */}

// IconButton: 36 / 44 / 52pt; sm adds hitSlop so the target reaches 44pt
<IconButton size="sm" /> {/* 36pt visual, 44pt touch target */}

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

### In-Tree Bottom Sheets (AnimatedSheet)

The `Modal` guidance above covers OS-level modals. The app's shared bottom sheet
`AnimatedSheet` (used by the capture sheet, the New Goal / Edit Goal evidence
sheets, and `BadgeShareSheet`) is **in-tree** — an absolute scrim + panel inside
the current screen, not a portalled `Modal` — so it can't rely on the modal
layer for focus behaviour. It implements the contract itself (#501):

- **Focus enters on open.** When the sheet becomes visible, focus moves onto its
  header title so assistive tech steps into the sheet instead of staying on the
  trigger behind it.
- **Focus returns to the trigger on close.** Every dismissal path — the × close,
  a backdrop tap, and Android hardware back — restores focus to the control
  that opened the sheet, via `restoreFocusRef`. Use `useSheetTrigger()`: call
  `rememberTrigger(event)` from the opening press handler and pass its
  `restoreFocusRef` to the sheet. It stores the pressed element's native tag,
  so the trigger can sit several layers down (a card footer, a list row). A
  selection that moves on to another screen calls `rememberTrigger()` with no
  event first, so focus isn't pulled back to the screen being left.
- **Everything behind the sheet is hidden, on both platforms (#686).**
  `accessibilityViewIsModal` is iOS-only and hides only the overlay's own
  siblings, so it can't reach the screen's sub-header or the navigator's tab
  bar, and does nothing on Android. Instead, each `AnimatedSheet` registers
  itself as open, and background regions opt in to hiding while any sheet is
  open (`accessibilityElementsHidden` + `importantForAccessibility=
"no-hide-descendants"`):
  - `ScreenSubHeader` and `FocusPillTabBar` opt in centrally, for every screen.
  - A screen wraps its own body in `<SheetBackground>` and mounts the sheet as
    a sibling **outside** it. Never wrap a sheet in `SheetBackground` (or spread
    `useSheetBackgroundA11yProps()` onto its ancestor) — it would hide the
    sheet too. A lone control beside the sheet (the Share CTA) spreads
    `useSheetBackgroundA11yProps()` itself.

The shared helper `focusAccessibilityRef` (`src/utils/accessibilityFocus.ts`)
resolves the tag and calls `AccessibilityInfo.setAccessibilityFocus` after a
short delay (the native view must register with the a11y tree first), and
returns a cancel function so an interrupted open→close→open cycle can't fire a
stale focus restore.

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

The app ships seven product themes. [ND Themes](./design/nd-themes.md) is the inventory (ids, names, fonts, scales, elevation); [Design Language](./design/design-language.md) is the component contract.

### Theme Variants

1. **The Full Ride** (`light-default`) - Standard theme
2. **Night Ride** (`dark-default`) - Dark mode; a peer theme, not a mode applied to the others
3. **Bold Ink** (`light-highContrast`) - WCAG AAA compliance (7:1 for normal text, 4.5:1 for large text), no shadows
4. **Warm Studio** (`light-dyslexia`) - Lexend font, cream background, relaxed line height
5. **Still Water** (`light-autismFriendly`) - Muted/desaturated colors, no shadows, calming palette
6. **Loud & Clear** (`light-lowVision`) - Maximum contrast, Atkinson Hyperlegible, 1.25× text, no shadows
7. **Clean Signal** (`light-lowInfo`) - Stripped-back UI, minimal decorative elements, text-first

Three themes render no shadows, so borders — never shadows alone — must define every edge.

### Testing Across Themes

When making UI changes, verify across all seven themes. In Storybook web, pick each from the toolbar. In the app, switch in Settings, or in code:

```typescript
import { useThemeContext } from "../hooks/useTheme";

const { setTheme } = useThemeContext();

setTheme("light-default");
setTheme("dark-default");
setTheme("light-highContrast");
setTheme("light-dyslexia");
setTheme("light-autismFriendly");
setTheme("light-lowVision");
setTheme("light-lowInfo");
```

### Color Token Changes

When modifying design tokens:

1. Update `@rollercoaster-dev/design-tokens` package
2. Rebuild tokens: `bun run build` in `packages/design-tokens/`
3. Test all seven product themes
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
