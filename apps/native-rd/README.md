# rollercoaster.dev — native

A neurodiversity-first goal tracker and Open Badges portfolio app for iOS and Android. Track what you've learned, break it into steps, collect evidence, and earn self-signed badges you actually own.

**Local-first. No account. No cloud. Your data stays on your device.**

---

## Quick Start

```bash
bun install
npx expo start
```

### Device/Simulator

```bash
npx expo start --ios       # iOS Simulator
npx expo start --android   # Android Emulator
```

---

## Commands

| Command | What it does |
|---------|-------------|
| `npx expo start` | Start the dev server |
| `npx jest --no-coverage` | Run tests (use this, not `bun test` — it hangs) |
| `npx tsc --noEmit` | Type-check |
| `bun run lint` | Lint |
| `bun run build` | Production build via EAS |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo 54 (React Native 0.81) |
| Language | TypeScript |
| Database | [Evolu](https://www.evolu.dev/) — local-first SQLite with CRDT sync |
| Styling | [react-native-unistyles](https://www.unistyles.io/) — zero re-render theme switching |
| Navigation | React Navigation (bottom tabs + native stacks) |
| Design Tokens | `@rollercoaster-dev/design-tokens` (shared with web) |
| Testing | Jest + React Native Testing Library |
| Storybook | Storybook for React Native |

---

## Project Structure

```
src/
├── components/      # Shared UI components (Button, Card, Input, etc.)
├── db/              # Evolu schema, queries, mutations
│   ├── schema.ts    # Database schema (Goal, Step, Evidence, Badge, UserSettings)
│   ├── queries.ts   # Kysely read queries
│   ├── evolu.ts     # Evolu instance setup
│   └── index.ts     # Public API
├── hooks/           # Custom React hooks (theme, fonts, audio, etc.)
├── navigation/      # React Navigation configuration
│   ├── TabNavigator.tsx
│   ├── GoalsStack.tsx
│   ├── BadgesStack.tsx
│   ├── SettingsStack.tsx
│   └── types.ts     # Screen param types
├── screens/         # Screen components
├── stories/         # Storybook stories
├── styles/          # Global styles, shadows helper
├── themes/          # Design token adapter, theme composition (14 themes)
└── utils/           # Accessibility, evidence cleanup, formatting, etc.
```

---

## Navigation

Three bottom tabs. The Goals stack is where most of the action is.

```
Tab: Goals
  └─ GoalsScreen          — active goals list
      └─ FocusMode        — swipe through steps, add evidence
          ├─ EditMode     — edit goal title/description, manage steps
          ├─ TimelineJourney — visual journey view of a goal
          └─ CompletionFlow — badge earned moment
              └─ Capture screens (Photo, Video, VoiceMemo, TextNote, Link, File)

Tab: Badges
  └─ BadgesScreen         — earned badges grid
      └─ BadgeDetail      — OB3 credential view + export

Tab: Settings
  └─ SettingsScreen       — theme picker, accessibility, data export
```

---

## Design System

14 themes: 2 color modes × 7 variants — all shipped from day one, not as an afterthought.

| Variant | Purpose |
|---------|---------|
| `default` | Standard |
| `highContrast` | WCAG AAA (7:1), no shadows |
| `largeText` | 1.25× font scale |
| `dyslexia` | Lexend font, cream background, relaxed line height |
| `lowVision` | Max contrast + large text |
| `autismFriendly` | Muted colors, no shadows, reduced visual noise |
| `lowInfo` | Minimal visual complexity |

Theme names follow `{colorMode}-{variant}` (e.g. `light-default`, `dark-highContrast`).

See `src/themes/` for composition and `@rollercoaster-dev/design-tokens` for the token source.

---

## Architecture Docs

| Doc | What it covers |
|-----|----------------|
| [Product Vision](docs/vision/product-vision.md) | What the app is, who it's for, what it's not |
| [User Stories](docs/vision/user-stories.md) | Lina, Malik, Tomás and the scenarios that drive design |
| [ADR-0001: Iteration Strategy](docs/decisions/ADR-0001-iteration-strategy.md) | A→B→C→D, each a complete product |
| [ADR-0002: UI Styling Library](docs/decisions/ADR-0002-ui-styling-library.md) | Why Unistyles |
| [ADR-0003: Sync Layer](docs/decisions/ADR-0003-sync-layer-decision.md) | Why Evolu |
| [ADR-0004: Data Model](docs/decisions/ADR-0004-data-model-storage.md) | Schema decisions, ULID strategy |
| [Data Model](docs/architecture/data-model.md) | All entities across iterations A–D |
| [Design Language](docs/design/design-language.md) | Typography, color, spacing reference |
| [ND Themes](docs/design/nd-themes.md) | All 14 theme definitions |
| [User Flows](docs/design/user-flows.md) | Screen-by-screen flows for Iteration A |
| [Accessibility Guidelines](docs/accessibility-guidelines.md) | WCAG AA target, 44pt touch targets, testing |

---

## Open Badges

Badges are self-signed [Open Badges 3.0](https://www.imsglobal.org/spec/ob/v3p0) Verifiable Credentials. When you complete a goal:

1. An Ed25519 keypair is generated and stored in Expo SecureStore on first launch
2. An OB3 credential is created with all evidence references
3. The credential is signed with your local key
4. The badge image is baked (credential embedded in PNG)

No issuer server. No account. The badge is yours.

See [openbadges-core architecture](docs/architecture/openbadges-core.md) for the planned extraction from the monorepo.
