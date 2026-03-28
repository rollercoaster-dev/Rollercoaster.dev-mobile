# Design Principles: rollercoaster.dev (native)

**Date:** 2026-02-02
**Status:** Draft
**Owner:** Joe

---

## Where the Principles Come From

The native app inherits from three sources:

- **The monorepo's design language** — typography (Anybody, system-ui, DM Mono, OpenDyslexic), color system (landing page accents as highlights, not backgrounds), the "character without chaos" philosophy
- **The monorepo's accessibility system** — 7 ND themes, content density, reduced motion, focus management, WCAG AA minimum
- **New constraints from mobile** — touch targets, one-handed use, interruption-friendly (you'll use this app in 30-second bursts on a bus, not hour-long sessions at a desk)

Where the monorepo's principles apply directly, we follow them. Where mobile introduces new constraints, we extend them. We never contradict them.

---

## Design Decision Framework

When making design decisions for the native app, ask these questions in order:

1. **Does it work offline?** If a feature requires connectivity, it's an enhancement, not core.
2. **Does it reduce cognitive load?** If it adds complexity without clear value, cut it.
3. **Does it respect the user's state?** Show facts, not judgments. Present information without guilt, shame, or time pressure.
4. **Does it work in 30 seconds?** The most common interaction is a quick check-in on the bus, not a deep planning session. Deep use should be possible but never required.
5. **Does it follow the spec?** Open Badges 3.0, W3C Verifiable Credentials. Standards over shortcuts.
6. **Does it support self-issuance?** The user is always their own authority. External verification adds value but is never required.

---

## Neurodivergent-First Design Rules

These aren't guidelines — they're rules. Breaking them requires explicit justification.

### For ADHD

- The app greets you where you left off, regardless of how long you've been away
- Every screen has one clear primary action
- Evidence capture is as fast as taking a photo
- Progress is shown as what's done, not what's overdue
- Notifications celebrate completions, never guilt absences

### For Autism

- Predictable layouts — the same action is always in the same place
- Confirm destructive actions, preview changes before applying
- Consistent patterns — if swiping left archives in one place, it archives everywhere
- Sharing and verification are always opt-in, never prompted

### For Dyslexia

- OpenDyslexic font available as a prominent toggle, not buried in settings
- Minimum 16px body text, 14px only for non-essential metadata
- Spacing is adjustable (letter-spacing, line-height, word-spacing)
- Voice memo is a first-class evidence type — communicate however works best for you

### For Bipolar / Mental Health Cycles

- Goals and badges persist forever, on your terms
- Paused goals are a normal state, shown without judgment
- Scope adjustment is a feature — move steps between goals, shrink or reshape anytime
- The app preserves everything through long absences and welcomes you back the same way it left

### For Sensory Sensitivities

- Respect OS-level `prefers-reduced-motion` automatically
- Animation level is user-controlled: none / minimal / full
- Media plays only when you ask it to
- Muted theme available (lower saturation, no shadows, calm palette)

---

## Visual Identity on Mobile

The monorepo's [design language](https://github.com/rollercoaster-dev/monorepo/blob/main/docs/design/DESIGN_LANGUAGE.md) defines the visual DNA. On mobile, it adapts:

### Typography

| Use | Font | Why |
|-----|------|-----|
| **Headlines** | Anybody | Character, from landing page DNA. Bundled with the app. |
| **Body** | System font stack | Familiar, fast, respects OS accessibility settings |
| **Mono** | DM Mono | Personality in technical contexts (badge metadata, details) |
| **Dyslexia option** | OpenDyslexic | User-selectable accessibility |
| **Low vision option** | Atkinson Hyperlegible | Designed for legibility at any size |

### Color

- Landing page colors (purple `#a78bfa`, mint `#d4f4e7`, yellow `#ffe50c`) are accents, not backgrounds
- Default is clean and calm — white/near-white backgrounds, dark text
- Character lives in small moments: a purple highlight on a completed badge, a mint background on a success message

### Spacing & Touch

- Minimum touch target: 44x44pt (Apple HIG) / 48x48dp (Material)
- Comfortable thumb zones for primary actions
- Content density preference: compact / normal / spacious

### Character Moments

Borrowed from the landing page's voice:

- Empty states: "No badges yet. What have you been up to?"
- First badge earned: "First one. (noted.)"
- Returning after a long absence: just your goals, right where you left them. No comment.

### Where Character Stays Quiet

- Buttons and labels (clarity over cleverness)
- Error states (be helpful, not cute)
- Anything involving evidence or verification (be direct)

---

## The Seven Themes

Every theme ships from day one. These aren't progressive enhancements — they're core.

| Theme | Who it serves | Key characteristics |
|-------|--------------|-------------------|
| **Light** (default) | General use | Clean, calm, landing page accents as highlights |
| **Dark** | Low light, preference, reduced eye strain | Dark backgrounds, maintained contrast ratios |
| **High Contrast** | Low vision | WCAG AAA contrast, 2px borders, strong focus indicators |
| **Large Text** | Reading difficulty, low vision | Larger base font, relaxed line heights, increased spacing |
| **Dyslexia-Friendly** | Dyslexia | OpenDyslexic font, cream background (#f8f5e4), extra letter/word spacing |
| **Low Vision** | Severe visual impairment | Atkinson Hyperlegible font, high contrast, large touch targets |
| **Autism-Friendly** | Sensory sensitivities | Muted colors, no shadows, no animations, predictable borders |

### Rules for Themes

- Theme preference persists on device and syncs across devices
- Switching themes is instant — no loading, no app restart
- Every component must be tested in all seven themes before shipping
- Themes compose with content density (compact / normal / spacious) — that's 21 combinations
- OS accessibility settings (Dynamic Type, Bold Text, Reduce Motion) are respected and integrated, not overridden

---

## Related Documents

- [Product Vision](./product-vision.md) — what the app is and who it's for
- [User Stories](./user-stories.md) — real scenarios driving design decisions
- [Monorepo Design Language](https://github.com/rollercoaster-dev/monorepo/blob/main/docs/design/DESIGN_LANGUAGE.md) — the visual DNA we inherit from
- [Monorepo Neurodiversity Docs](https://github.com/rollercoaster-dev/monorepo/blob/main/packages/openbadges-ui/docs/neurodiversity.md) — accessibility system in openbadges-ui
- [UI Library Comparison](../research/ui-library-comparison.md) — how UI libraries support these principles

---

_Draft created 2026-02-02. Inherit, extend, never contradict the monorepo's design language._
