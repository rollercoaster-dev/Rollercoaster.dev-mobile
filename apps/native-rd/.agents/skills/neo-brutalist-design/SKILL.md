---
name: neo-brutalist-design
description: Apply the rollercoaster.dev neo-brutalist design language to React Native components. Use when creating/reviewing components, fixing styles, choosing an icon, or auditing visual consistency. Also load before adding any glyph or emoji to the UI — action and state indicators must be Phosphor icons, never emoji (Rule 8). Invoke with "review my component", "check my styles", "apply design system", "audit design", or "which icon".
metadata:
  author: rollercoaster.dev
  version: "1.2.0"
  argument-hint: <file-or-pattern>
---

# Neo-Brutalist Design Language — rollercoaster.dev

This skill defines how to build and review React Native components using the rollercoaster.dev neo-brutalist design system. The `shadowStyle()` helper lives at `src/styles/shadows.ts`. The authoritative contract is `docs/design/design-language.md` (component contract) and `docs/design/nd-themes.md` (the seven themes); this skill applies them.

## Philosophy: "Character Without Chaos"

Bold, confident, accessible. Drama comes from **structure** (thick borders, hard shadows, tight type) — not from color saturation or visual noise. The base is calm; accents are highlights, never backgrounds.

---

## The 8 Rules

### 1. Bold Borders Everywhere

```ts
borderWidth: theme.borderWidth.medium; // 2 — inputs, chips, pills, rows, icon buttons, checkboxes, dividers
borderWidth: theme.borderWidth.thick; // 3 — the shared Card and Button surfaces
```

Every bordered element uses `medium` (2) unless it is a `Card` or `Button` surface, which use `thick` (3). Use `thin` (1) only for subtle internal dividers and sheet side edges. Three themes (Bold Ink, Still Water, Loud & Clear) render no shadows, so the border alone must define the edge.

### 2. Elevation Through Semantic Shadow Roles

```ts
import { shadowStyle } from "../../styles/shadows";

// Usage in StyleSheet.create:
...shadowStyle(theme, "cardElevationSmall") // chips, pills, icon buttons
...shadowStyle(theme, "cardElevation")      // cards, buttons
...shadowStyle(theme, "modalElevation")     // sheets, modals, the focus card
```

Each role resolves per theme: a hard 2 / 3 / 4pt down-right offset with zero blur in The Full Ride and Clean Signal, a 6pt straight-down cutout in Night Ride, a soft low shadow in Warm Studio, and nothing in Bold Ink, Still Water and Loud & Clear. The table is in `docs/design/design-language.md` → Elevation.

**Never author a shadow by hand** — no raw `shadow*` props, no blur you chose yourself. The roles carry the per-theme behavior; a hand-written shadow ignores it. (`hardSm`/`hardMd`/`hardLg` are the raw tokens behind the roles; prefer the role names in new code.)

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
theme.colors.text; // primary text
theme.colors.textSecondary; // body, descriptions
theme.colors.background; // page surface
theme.colors.backgroundSecondary; // cards, inputs
theme.action.actionPrimaryBg; // action fills (see the contract for the Button mapping)
```

Read roles, never hex — the values differ per theme and live in the token sources and the _Design System / Colors_ story. Night Ride is a deep indigo, not pure black; the light themes use near-black text, not pure black, except Bold Ink, which is AAA by design.

### 7. Generous Touch Targets

```ts
minHeight: 48; // Buttons, rows, inputs, pressable cards
```

Every pressable reaches at least 44pt; buttons, rows, inputs and pressable cards use 48. Icon buttons may be smaller visually (`IconButton` `sm` is 36) but must reach 44 with `hitSlop`.

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

**Use the shared component first.** `Button`, `IconButton`, `Input`, `Card`, `Checkbox`, `Divider`, `ProgressBar` and `StatusBadge` already implement the contract, including pressed, disabled and loading states. `docs/design/design-language.md` documents their contract; read it rather than re-creating a button from a recipe — hand-rolled action treatments are exactly the drift tracked in #691.

The recipes below are for bespoke containers that have no shared component.

### Card-like container

```ts
const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thick, // 3 — matches the shared Card
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm, // 2
    padding: theme.space[4],
    ...shadowStyle(theme, "cardElevation"),
  },
}));
```

Pressable: add `minHeight: 48` and the shared pressed treatment — `transform: [{ translateX: 2 }, { translateY: 2 }]` with `shadowOffset: { width: 1, height: 1 }`.

### Chip / status pill

```ts
chip: {
  borderWidth: theme.borderWidth.medium,
  borderColor: theme.colors.border,
  borderRadius: theme.radius.sm,                     // 2 for chips; radius.pill for status pills
  paddingVertical: theme.space[1],
  paddingHorizontal: theme.space[3],
  ...shadowStyle(theme, "cardElevationSmall"),
},
```

---

## Audit Checklist

When reviewing a component for design compliance:

- [ ] **Borders**: `borderWidth.medium` (2) for bordered elements; `thick` (3) for Card/Button surfaces; never `thin`/`default` for containers
- [ ] **Radius**: Cards, chips and icon buttons use `radius.sm` (2), buttons/inputs use `radius.md` (4)
- [ ] **Shadows**: Uses `shadowStyle(theme, role)` with a semantic role; no hand-written `shadow*` props; edge still visible with shadows off
- [ ] **Touch targets**: Pressables reach 44pt (48 for buttons, rows, inputs, pressable cards)
- [ ] **Actions**: Uses the shared `Button`/`IconButton` rather than a bespoke Pressable treatment
- [ ] **Typography**: Uses theme `textStyles` or `<Text variant>`, not manual assembly
- [ ] **Colors**: Accents used as highlights, not large backgrounds
- [ ] **Icons**: No emoji encoding an action or state — Phosphor icons with `theme` color (Rule 8). Decode `\u{...}` escapes when checking
- [ ] **Accessibility**: `accessibilityRole`, `accessibilityLabel`, `accessibilityState`
- [ ] **Tokens only**: No hardcoded colors, sizes, or spacing — all from `theme.*`
