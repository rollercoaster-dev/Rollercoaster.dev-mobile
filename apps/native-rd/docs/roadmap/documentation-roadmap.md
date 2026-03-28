# Documentation Roadmap

**Date:** 2026-02-02
**Purpose:** Track documentation progress for the native rollercoaster.dev app. Write these docs in order — later phases depend on earlier ones.

---

## Phase 1 — Foundation (write first, no dependencies)

- [x] `vision/product-vision.md` — What the native app is, how it relates to the monorepo, who it's for, what it's not
- [x] `vision/user-stories.md` — Adapt Lina, Eva, Malik, Marcus, Sofia stories for the native app context + write new ones specific to goal tracking and skill trees
- [x] `vision/design-principles.md` — Codify the principles: ND-first, local-first, game-like progression, data ownership, baby steps
- [x] `decisions/ADR-0001-iteration-strategy.md` — Document the A → B → C → D iteration plan with scope for each

### Open questions to answer in Phase 1

| Doc | Key Questions |
|-----|---------------|
| Product vision | How does the native app relate to the monorepo long-term? Does the web app eventually use the same features? |
| User stories | What does Lina's "quiet victory" look like on a phone? What new stories does mobile enable? |
| Design principles | Which monorepo principles carry over directly? Which need adapting for mobile? |
| Iteration strategy | What's the exact scope boundary for each iteration? What's the definition of done for A before starting B? |

---

## Phase 2 — Architecture (depends on Phase 1)

- [x] `architecture/data-model.md` — Define Goals, Plans, Steps, Badges, SkillTree entities and their relationships. Maps learning graph + planning graph concepts to a mobile data model
- [x] `architecture/openbadges-core.md` — Plan the extraction from `openbadges-modular-server`. What goes in core vs stays in server. API surface. Migration path.
- [x] `architecture/local-first-sync.md` — Decide PowerSync vs Evolu (may need prototyping first). Document sync architecture, encryption strategy, self-hosted relay/server setup.

### Open questions to answer in Phase 2

| Doc | Key Questions |
|-----|---------------|
| Data model | How does the planning graph Phase 2 model (Plan/PlanStep) map to mobile? Is the skill tree a view on the same data or its own entity? How do self-signed badges link to completed goals? |
| openbadges-core | What are the exact modules to extract? What's the minimum for iteration A? Can extraction happen incrementally? What's the API surface? |
| Local-first sync | At what point does sync become necessary? Can iteration A ship without sync and add it in B? What's the encryption key management story on mobile? |

---

## Phase 3 — Design (depends on Phase 1 + 2)

- [x] `design/user-flows.md` — Screen-by-screen flows for iteration A (create goal → break into steps → complete → earn badge)
- [x] `design/design-language.md` — Adapt the monorepo's design language for React Native (Anybody font, color system, spacing, character moments)
- [x] `design/nd-themes.md` — How each of the 7 themes translates to React Native's StyleSheet system
- [x] `architecture/design-token-system.md` — Shared token source of truth, Style Dictionary transforms, how tokens flow to both Vue and RN

### Open questions to answer in Phase 3

| Doc | Key Questions |
|-----|---------------|
| User flows | What's the minimum number of screens for iteration A? What navigation pattern (tabs, stack, drawer)? |
| Design language | How do "character moments" from the landing page feel on mobile? Which fonts need bundling vs system fallback? |
| ND themes | How does runtime theme switching work in React Native? How do we handle system accessibility settings (Dynamic Type, bold text, reduced motion)? |
| Design tokens | Can we extract existing `openbadges-ui` CSS tokens into JSON as a starting point? What tooling (Style Dictionary?) transforms tokens for both platforms? |

---

## Phase 4 — Decisions (completed)

- [x] `decisions/ADR-0002-ui-styling-library.md` — Unistyles chosen over Tamagui/NativeWind, validated by Vercel v0 research
- [x] `decisions/ADR-0003-sync-layer-decision.md` — Evolu chosen over PowerSync/RxDB, validated by prototype
- [x] `decisions/ADR-0004-data-model-storage.md` — Iterative data model adopted, ULID strategy, soft-delete, OB3 badge

### Prototypes Completed

- [x] Build prototype: badge card + theme switching in Tamagui / Unistyles (Unistyles selected)
- [x] Build prototype: goal + badge CRUD with sync in Evolu (Evolu selected, see `research/evolu-prototype-findings.md`)

---

## Research (complete)

- [x] `research/ui-library-comparison.md` — Tamagui vs Gluestack + NativeWind vs others
- [x] `research/local-first-sync-comparison.md` — PowerSync vs Evolu vs RxDB vs others

---

## Summary

| Phase | Docs | Status |
|-------|------|--------|
| Research | 2 docs | Done |
| Phase 1 — Foundation | 4 docs | Complete |
| Phase 2 — Architecture | 3 docs | Complete |
| Phase 3 — Design | 4 docs | Complete |
| Phase 4 — Decisions | 3 docs + 2 prototypes | Complete |
| **Total** | **16 docs + 2 prototypes** | **All complete** |

---

_Created 2026-02-02. Check items off as they're completed. Each phase unlocks the next._
