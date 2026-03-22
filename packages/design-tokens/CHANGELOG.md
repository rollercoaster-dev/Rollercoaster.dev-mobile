# @rollercoaster-dev/design-tokens

## Unreleased

### Minor Changes

- Full semantic token sweep for release-ready product design taxonomy:
  - **Chrome tokens** (`chrome.json`): header, tab bar, modal, top bar roles
  - **Action tokens** (`action.json`): primary, secondary, destructive, disabled, selection states
  - **Surface & border tokens** (`surface-border.json`): card, sheet, input, sunken, elevated surfaces; default, strong, subtle, input, focus, destructive, success borders
  - **Journey tokens** (`journey.json`): goal, step, progress, timeline, completion roles
  - **Badge & reward tokens** (`badge-reward.json`): badge chrome, accent palette, celebration, level tiers
  - **Typography role tokens** (`typography-roles.json`): display, heading 1-3, body, label, caption, mono roles
  - Theme overrides added to all 7 non-default themes (dark, high-contrast, autism-friendly, dyslexia-friendly, low-vision, low-info, large-text)
  - New Unistyles interfaces: `ChromeColors`, `ActionColors`, `SurfaceBorderColors`, `JourneyColors`, `BadgeRewardColors` with light/dark constants and variant overrides
  - `semanticColorModes` export for unified light/dark mode switching
  - All existing CSS variables and TypeScript exports preserved (fully additive)

## 0.1.3

### Patch Changes

- 140fe1d: Add `accentPurpleLight` semantic color for evidence pill backgrounds. Light: #ede9fe, Dark: #352760. Also adds the color to the unistyles build pipeline and palette.

## 0.1.2

### Patch Changes

- ff8c022: Rebrand to landing page design language, add Unistyles build target for React Native, and add missing unistyles token categories

## 0.1.1

### Patch Changes

- 61dd976: chore: test OIDC trusted publishing
