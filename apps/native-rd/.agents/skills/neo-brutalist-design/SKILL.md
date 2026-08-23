---
name: neo-brutalist-design
description: Apply the rollercoaster.dev neo-brutalist design language to React Native components. Use when creating/reviewing components, fixing styles, choosing an icon, or auditing visual consistency. Also load before adding any glyph or emoji to the UI — action and state indicators must be Phosphor icons, never emoji (Rule 8). Invoke with "review my component", "check my styles", "apply design system", "audit design", or "which icon".
metadata:
  author: rollercoaster.dev
  version: "1.1.0"
  argument-hint: <file-or-pattern>
---

# Neo-Brutalist Design Language — rollercoaster.dev

This skill defines how to build and review React Native components using the rollercoaster.dev neo-brutalist design system. The `shadowStyle()` helper lives at `src/styles/shadows.ts`.

## Philosophy: "Character Without Chaos"

Bold, confident, accessible. Drama comes from **structure** (thick borders, hard shadows, tight type) — not from color saturation or visual noise. The base is calm; accents are highlights, never backgrounds.

---

## The 8 Rules

### 1. 2px Borders Everywhere

```ts
borderWidth: theme.borderWidth.medium; // 2px — the neo-brutalist standard
```

Every card, input, button, badge chip, and container uses `medium` (2px). Use `thin` (1px) only for subtle internal dividers. Never use `default` (1px) for containers.

### 2. Hard Offset Shadows (Zero Blur)

```ts
// Import from shared.tsx:
import { shadowStyle } from '../stories/design-system/shared';

// Usage in StyleSheet.create:
...shadowStyle(theme, 'hardSm')  // 2px offset — chips, badges, small elements
...shadowStyle(theme, 'hardMd')  // 3px offset — cards, buttons
...shadowStyle(theme, 'hardLg')  // 4px offset — modals, hero blocks

// What it expands to (for reference — always use the helper):
{
  shadowColor: '#000000',
  shadowOffset: { width: 3, height: 3 },  // hardMd example
  shadowOpacity: 0.15,
  shadowRadius: 0,  // ZERO — this is the key
}
```

**NEVER use blurred shadows** (`shadowRadius > 0`). Hard offset = neo-brutalist. The offset creates a crisp printed-poster feel.

Shadow size guide:

- `hardSm` (2px) — small interactive: badge chips, status pills, icon buttons
- `hardMd` (3px) — standard interactive: cards, buttons, inputs
- `hardLg` (4px) — large containers: modals, hero sections, narrative blocks

### 3. Sharp Corners (Small Radius)

```ts
borderRadius: theme.radius.sm; // 2px — cards, containers, chips
borderRadius: theme.radius.md; // 4px — buttons, inputs
borderRadius: theme.radius.pill; // 9999 — status pills, avatars
```

Radii are deliberately SMALL. This is neo-brutalism — not rounded modern UI. **Never use `radius.lg` (8px) or `radius.xl` (12px) for component containers.** Those are reserved for decorative story previews only.

| Element                        | Radius               |
| ------------------------------ | -------------------- |
| Cards, containers, chips       | `radius.sm` (2px)    |
| Buttons, inputs                | `radius.md` (4px)    |
| Status pills, circular buttons | `radius.pill` (9999) |

### 4. Bold, Tight Typography

```ts
// Headlines — Anybody font, tight letter-spacing
fontFamily: theme.fontFamily.headline; // 'Anybody'
letterSpacing: theme.letterSpacing.tight; // -0.48 (creates density and drama)
fontWeight: theme.fontWeight.black; // '900' — display only
fontWeight: theme.fontWeight.bold; // '700' — headings

// Body — Instrument Sans
fontFamily: theme.fontFamily.body; // 'Instrument Sans'
fontWeight: theme.fontWeight.normal; // '400'

// Labels (uppercase, tracked)
textTransform: "uppercase";
letterSpacing: theme.letterSpacing.wide; // 1.6
fontWeight: theme.fontWeight.bold;
fontSize: theme.size.xs; // 12px
```

Use the `textStyles` presets from the theme (`theme.textStyles.display`, `.headline`, `.title`, `.body`, `.caption`, `.label`, `.mono`) — or the `<Text variant="...">` component — rather than assembling typography manually.

### 5. Accent Colors Are Highlights, Not Backgrounds

```ts
// CORRECT — accent as a small highlight
backgroundColor: theme.narrative.climb.bg; // narrative section bg
color: theme.narrative.climb.text; // narrative section text

// CORRECT — accent on a chip/badge
backgroundColor: theme.colors.accentPurple; // small pill or badge

// WRONG — large area with accent color
backgroundColor: theme.colors.accentPurple; // card background ← NO
```

The base is always `background` / `backgroundSecondary`. Accents appear as:

- Status badge fills (small pills)
- Narrative section backgrounds (special containers only)
- Focus rings and borders
- Small decorative elements

### 6. High Contrast Without Harshness

```ts
// Near-black, not pure black
theme.colors.text; // #262626 light / #fafafa dark
theme.colors.accentPrimary; // #0a0a0a light / #fafafa dark

// Off-white, not stark white
theme.colors.background; // #fafafa light / #1a1033 dark
```

Dark mode uses deep indigo (`#1a1033`) not pure black. Light mode uses off-white (`#fafafa`) not pure white.

### 7. 48dp Minimum Touch Targets

```ts
minHeight: 48; // Every pressable element
```

No exceptions. Small visual elements (like icon buttons) can appear smaller visually but must have 48dp hit area.

### 8. Icons Are Phosphor, Never Emoji

**An emoji must never be the thing that encodes an action or a state.** When the
glyph is the only carrier of meaning — a transport control, a bare status node, a
button's affordance — it is a Phosphor icon from `phosphor-react-native`:

```tsx
import { Pause, Play } from "phosphor-react-native";

const { theme } = useUnistyles();

// CORRECT — themed, weighted, scales with the variant
<Pause size={24} weight="bold" color={theme.colors.text} />

// WRONG — the glyph IS the action; nothing else says play/pause
<Text>{isPlaying ? "⏸" : "▶"}</Text>

// WRONG — the glyph IS the state; a bare node interior with no label
const nodeGlyph = { paused: "⏸" };
```

#### Deciding: icon or emoji

Work through these in order. The first one that fires decides — stop there.

1. **Would the user lose information if the glyph vanished?**
   If yes → **icon**. This is the load-bearing test. A bare status node, a
   transport toggle, a button whose glyph is the affordance: the glyph is the UI,
   so it has to be themed and it has to survive the a11y variants.
2. **Can it be `accessibilityElementsHidden` without harming the screen reader?**
   If no → **icon**. If a glyph needs its own `accessibilityLabel`, it is content.
   Decoration can always be hidden, because a visible label is already saying it.
3. **Do several of them appear on screen at once, to be compared?**
   If yes → **icon**. Sets seen together need one visual language: consistent
   weight, optical size, stroke. Six emoji from six Unicode blocks (`📷 🎬 📝 🎤
🔗 📎`) never line up — different bounding boxes, different visual weight,
   different color families the theme cannot reconcile. A glyph that is only ever
   shown one-at-a-time (the current mode, one per screen) has nothing to line up
   against, so this question does not catch it.
4. **Is it a one-off human moment — celebration, greeting, a warm aside?**
   If yes → **emoji is fine.** A `🏅` on the badge-earned modal is warmth, and
   Phosphor's `Medal` would read colder. This is the whole reason the rule is not
   "no emoji anywhere".
5. **Still unsure?** → **icon.** Icons are never _wrong_, only sometimes colder.
   Emoji are wrong whenever they turn out to be load-bearing.

| UI role                                                         | Use                                |
| --------------------------------------------------------------- | ---------------------------------- |
| Action / control (play, pause, delete, edit, add)               | **Icon**                           |
| Status or state on its own (paused node, sync state)            | **Icon**                           |
| Repeating type marker in a set (evidence types, file kinds)     | **Icon**                           |
| Navigation and tab bars                                         | **Icon**                           |
| Anything needing an `accessibilityLabel`                        | **Icon**                           |
| Anything that must respond to `highContrast` / `autismFriendly` | **Icon**                           |
| Accent beside a visible label that already says it              | Either — emoji OK                  |
| Celebration / milestone moment                                  | Either — emoji OK                  |
| Inside translated body copy                                     | **Emoji** (it is copy, not chrome) |

Why the "icon" rows are not negotiable: emoji-presentation codepoints render in
the platform's **color emoji font**. They ignore `color`, ignore the theme, and
ignore all 7 accessibility variants — so `highContrast`, `autismFriendly`, and
`lowVision` cannot touch them. A paused timeline node painted with `⏸` shows an
iOS blue-grey pill sitting inside a themed node.

The ND angle, since this app is built for it: `autismFriendly` and `lowInfo` exist
to _reduce_ visual noise, and a saturated multi-color emoji is the loudest thing
on the screen in a variant whose whole job is calm. `highContrast` promises 7:1
and silently cannot deliver it on an emoji. An emoji is an opt-out from the
accessibility system — fine for one deliberate warm moment, never for chrome.

**Emoji that are currently fine:** decorative accents in celebration and info
banners (`🏅` badge earned, `🏆` completion hero), accents paired with a visible
label (the `ModeIndicator` mode glyphs), and emoji inside translated copy
(`"Hey there 👋"`).

The waiting marker `⏳` used to be on that list. It came off with the C·B band
(audit A4): it passed question 1 — a label always sits beside it — but the band
renders three marks stacked to be compared, so question 3 decides, and `⏳` was
never themeable anyway.

**Text-presentation glyphs are fine** — `✓ ✕ ★ → ↳ ⋯ ● ■` honor `color` and
theme, so they are legitimate design-system marks. **Not `↩`**: its default
presentation is text, which is why it sat in that list, but iOS gives it the
emoji font in practice (audit A4). Verify on device before trusting a
codepoint's default presentation.

**The trap:** `⏸` (U+23F8), `▶` (U+25B6), `⏳` (U+23F3), `⚙` (U+2699), `↩`
(U+21A9) look typographic but are `Extended_Pictographic` — they get the emoji font. When
auditing, decode `\u{...}` escapes before matching, or the escaped emoji
(`"\u{1F4F7}"`) slip past `grep`.

Icon sizing and weight, matching `src/navigation/FocusPillTabBar.tsx`:

| Context                     | Size | Weight    |
| --------------------------- | ---- | --------- |
| Tab bar, nav, standard rows | 24   | `bold`    |
| Inline with body text       | 16   | `bold`    |
| Transport / media controls  | 24   | `fill`    |
| Hero / empty-state          | 48+  | `duotone` |

Curated badge-relevant icons already live in `src/badges/iconRegistry.ts` — add
there rather than importing the whole library. A component that renders an icon
should take it as `ReactNode`, never as a `string` icon name.

Current violations are catalogued per-site in
[`references/emoji-audit.md`](references/emoji-audit.md) — read it before
touching any glyph so you don't migrate a Tier C decoration by mistake.

---

## Component Recipes

### Card (Standard Container)

```ts
const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium, // 2px
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm, // 2px
    padding: theme.space[4], // 16px
    ...shadowStyle(theme, "hardMd"), // 3px hard offset
  },
}));
```

### Button (Primary)

```ts
button: {
  backgroundColor: theme.colors.accentPrimary,      // near-black
  borderWidth: theme.borderWidth.medium,             // 2px
  borderColor: theme.colors.accentPrimary,
  borderRadius: theme.radius.md,                     // 4px
  paddingHorizontal: theme.space[4],
  paddingVertical: theme.space[3],
  minHeight: 48,
  ...shadowStyle(theme, 'hardMd'),
},
buttonLabel: {
  color: theme.colors.background,                    // inverted text
  fontWeight: theme.fontWeight.semibold,
  fontSize: theme.size.md,
  fontFamily: theme.fontFamily.body,
},
```

### Button (Secondary / Outline)

```ts
buttonSecondary: {
  backgroundColor: theme.colors.backgroundSecondary,
  borderWidth: theme.borderWidth.medium,
  borderColor: theme.colors.border,
  borderRadius: theme.radius.md,
  ...shadowStyle(theme, 'hardMd'),
},
```

### Button (Ghost)

```ts
buttonGhost: {
  backgroundColor: 'transparent',
  borderWidth: theme.borderWidth.medium,
  borderColor: 'transparent',                        // no visible border
  borderRadius: theme.radius.md,
  // NO shadow for ghost
},
```

### Input

```ts
input: {
  borderWidth: theme.borderWidth.medium,             // 2px
  borderColor: theme.colors.border,
  borderRadius: theme.radius.md,                     // 4px
  paddingHorizontal: theme.space[3],
  paddingVertical: theme.space[3],
  fontSize: theme.size.md,                           // 16px (prevents iOS zoom)
  fontFamily: theme.fontFamily.body,
  color: theme.colors.text,
  backgroundColor: theme.colors.backgroundSecondary,
  minHeight: 48,
},
inputFocused: {
  borderColor: theme.colors.focusRing,
},
```

### Badge Chip / Status Pill

```ts
badgeChip: {
  borderWidth: theme.borderWidth.medium,
  borderColor: theme.colors.border,
  borderRadius: theme.radius.sm,                     // 2px for chips
  paddingVertical: theme.space[1],
  paddingHorizontal: theme.space[3],
  ...shadowStyle(theme, 'hardSm'),                   // small hard offset
},
// Or pill shape for status:
statusPill: {
  borderRadius: theme.radius.pill,
  paddingVertical: 2,
  paddingHorizontal: theme.space[2],
  // narrative colors for bg/text
},
```

### Checkbox

```ts
box: {
  width: 24,
  height: 24,
  borderRadius: theme.radius.sm,                     // 2px — sharp
  borderWidth: theme.borderWidth.medium,             // 2px
  borderColor: theme.colors.border,
},
boxChecked: {
  backgroundColor: theme.colors.accentPrimary,
  borderColor: theme.colors.accentPrimary,
},
```

### IconButton

```ts
iconButton: {
  width: 48,
  height: 48,
  borderRadius: theme.radius.pill,                   // circular
  borderWidth: theme.borderWidth.medium,
  borderColor: theme.colors.border,
  backgroundColor: theme.colors.backgroundSecondary,
  ...shadowStyle(theme, 'hardSm'),
},
```

### Divider

```ts
divider: {
  height: theme.borderWidth.medium,                  // 2px — not 1px
  backgroundColor: theme.colors.border,
},
```

### Progress Bar

```ts
track: {
  height: 8,
  borderRadius: theme.radius.pill,
  backgroundColor: theme.colors.backgroundTertiary,
  borderWidth: theme.borderWidth.medium,
  borderColor: theme.colors.border,
  overflow: 'hidden',
},
fill: {
  height: '100%',
  backgroundColor: theme.colors.accentPrimary,
},
```

---

## Applying Shadows via the Helper

Always use the `shadowStyle()` helper from `src/styles/shadows.ts`:

```ts
import { shadowStyle } from "../../styles/shadows";

// In StyleSheet.create:
const styles = StyleSheet.create((theme) => ({
  card: {
    ...shadowStyle(theme, "hardMd"),
    // other styles...
  },
}));
```

If you need to expand manually (rare):

```ts
shadowColor: '#000000',
shadowOffset: { width: theme.shadow.hardMd.offsetX, height: theme.shadow.hardMd.offsetY },
shadowOpacity: theme.shadow.hardMd.opacity,
shadowRadius: theme.shadow.hardMd.radius,  // Always 0 for hard shadows
```

---

## Audit Checklist

When reviewing a component for design compliance:

- [ ] **Borders**: Uses `borderWidth.medium` (2px), not `default`/`thin` for containers
- [ ] **Radius**: Cards use `radius.sm` (2px), buttons/inputs use `radius.md` (4px)
- [ ] **Shadows**: Uses hard offset shadows (`hardSm`/`hardMd`/`hardLg`), never blurred
- [ ] **Touch targets**: All pressables have `minHeight: 48`
- [ ] **Typography**: Uses theme `textStyles` or `<Text variant>`, not manual assembly
- [ ] **Colors**: Accents used as highlights, not large backgrounds
- [ ] **Icons**: No emoji encoding an action or state — Phosphor icons with `theme` color (Rule 8). Decode `\u{...}` escapes when checking
- [ ] **Accessibility**: `accessibilityRole`, `accessibilityLabel`, `accessibilityState`
- [ ] **Tokens only**: No hardcoded colors, sizes, or spacing — all from `theme.*`
