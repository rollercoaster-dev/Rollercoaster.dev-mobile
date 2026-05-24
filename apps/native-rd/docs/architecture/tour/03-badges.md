# Slice 3 — Badges + signing/baking

**Status:** not-started
**Drafted:** —
**Reviewed:** —

## Scope

Badge creation, design, display, and the OpenBadges signing/baking pipeline.

**In scope:**

- `BadgeDesignerScreen`, `BadgeDetailScreen`, `BadgeEarnedModal`, `BadgesScreen`
- `src/components/BadgeCard`
- `src/navigation/BadgesStack`
- `CompletionFlowScreen` (badge issuance entry point — co-reviewed with slice 1's goal-completion flow)
- `src/badges/**` and the workspace package `@rollercoaster-dev/openbadges-core`
- `src/crypto/**` (Ed25519 keys, PNG baking, hashing)
- `KeyProvider` interface + `SecureStoreKeyProvider` implementation (`src/crypto/`)
- `src/stores/pendingDesignStore.ts`

**Deferred:**

- Verification flow if it lives elsewhere (TBD at prep)

## File map

_(filled in during prep)_

## Mental model

_(filled in after walkthrough)_

## RN concepts encountered

_(filled in during walkthrough — expect: native modules for crypto, async storage vs SecureStore, Buffer/jose interop, RN polyfills)_

## Lens scan

### type-safety

### RN/Expo idiom

### perf hot paths

### a11y / ND-a11y

### test coverage gaps

## Findings

- _(none yet)_

## Open questions

- _(none yet)_
