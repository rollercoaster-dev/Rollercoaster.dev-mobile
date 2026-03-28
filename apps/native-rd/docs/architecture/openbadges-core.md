# Architecture: openbadges-core Extraction

**Date:** 2026-02-02
**Status:** Draft
**Owner:** Joe

---

## Purpose

Extract the pure badge logic from `openbadges-modular-server` into a shared package (`@rollercoaster-dev/openbadges-core`) that can be used by:

- The existing server (refactored to use core as a dependency)
- The native React Native app (for local badge creation, signing, baking)
- Third-party integrations (CLI tools, browser extensions, other frameworks)

This is a prerequisite for Iteration A of the native app.

---

## What the Server Has Today

The server (`apps/openbadges-modular-server`) has clean separation:

```
src/
├── api/              # HTTP layer (Hono routes, controllers) — STAYS IN SERVER
├── core/             # Business services — PARTIALLY EXTRACTABLE
├── domains/          # Domain entities & repository interfaces — PARTIALLY EXTRACTABLE
├── services/         # Baking, verification — EXTRACTABLE
├── infrastructure/   # Database, storage, cache — STAYS IN SERVER
├── utils/            # Crypto, bitstring, types — EXTRACTABLE
└── auth/             # Authentication — STAYS IN SERVER
```

---

## What Gets Extracted

### Badge Baking (services/baking/)

Embeds OB3 credentials into PNG and SVG images. Pure image manipulation — no server dependencies.

- PNG baking via iTXt chunks (keyword: "openbadges")
- SVG baking via `<openbadges:credential>` element
- Format auto-detection
- Bake (embed) and unbake (extract)
- **Dependencies:** `png-chunks-extract`, `png-chunks-encode`, `@xmldom/xmldom`

### Cryptographic Operations (utils/crypto/)

Signing, verification, and proof creation. Uses `jose` and Node.js `crypto`.

- Key pair generation (Ed25519, RSA)
- Data signing and signature verification
- DataIntegrityProof creation (eddsa-rdfc-2022 cryptosuite)
- JWT proof generation and verification (JwtProof2020)
- Multiple proof support per credential
- **Dependencies:** `jose`, Node.js `crypto`

### Badge Serialization (utils/version/ + domains/assertion/)

Converts between internal representation and OB2/OB3 formats.

- OB3 serializer (Verifiable Credential structure, @context ordering, credentialSubject)
- OB2 serializer (backward compatibility)
- Version detection and conversion
- JSON-LD formatting
- **Dependencies:** `openbadges-types`

### Verification Logic (core/verification.service.ts + services/verification/)

Pure verification algorithms, separated from key storage.

- Signature verification (DataIntegrity and JWT proofs)
- Expiration checking
- Proof type detection
- Cryptosuite validation
- **Dependencies:** `jose`, crypto utilities

### Bitstring Utilities (utils/bitstring/)

Status list operations for credential revocation/suspension.

- Bitstring creation and manipulation
- GZIP compression/decompression
- Base64url encoding
- **Dependencies:** Node.js `zlib`

### Type Utilities (utils/types/)

Pure TypeScript utilities.

- IRI validation
- Type guards
- Common types
- **Dependencies:** None

---

## What Stays in the Server

| Module | Why it stays |
|--------|-------------|
| `api/` (controllers, routes) | Hono-specific HTTP handling |
| `infrastructure/database/` | Drizzle ORM, PostgreSQL/SQLite adapters |
| `core/key.service.ts` | File system-based key storage |
| `core/status-list.service.ts` | Requires database access |
| `core/credential-status.service.ts` | Requires database access |
| `infrastructure/assets/` | File/S3 storage |
| `auth/` | Server authentication |
| `infrastructure/cache/` | Server-side caching |

---

## Abstraction Needed: KeyProvider

The biggest coupling point is key management. The server stores keys on the file system. The native app will store keys in Expo SecureStore. The core package needs an interface that both can implement.

```typescript
interface KeyProvider {
  getPublicKey(keyId: string): Promise<JsonWebKey>;
  getPrivateKey(keyId: string): Promise<JsonWebKey>;
  generateKeyPair(algorithm: 'Ed25519' | 'RSA'): Promise<{
    publicKey: JsonWebKey;
    privateKey: JsonWebKey;
    keyId: string;
  }>;
  listKeys(): Promise<KeyMetadata[]>;
}
```

**Server implements:** `FileSystemKeyProvider` (reads from `keys/` directory)
**Native app implements:** `SecureStoreKeyProvider` (reads from Expo SecureStore)
**Tests use:** `InMemoryKeyProvider`

---

## React Native Compatibility Concerns

Some server dependencies don't exist in React Native:

| Dependency | Server | React Native | Solution |
|-----------|--------|-------------|----------|
| Node.js `crypto` | Built-in | Not available | `expo-crypto` or `react-native-quick-crypto` |
| Node.js `zlib` | Built-in | Not available | `pako` (pure JS gzip) or `react-native-compressor` |
| `jose` | Works | Works (pure JS) | No change needed |
| `png-chunks-*` | Works | Needs testing | May need Buffer polyfill |
| `@xmldom/xmldom` | Works | Works (pure JS) | No change needed |
| File system | `fs` | Not available | KeyProvider abstraction handles this |

The core package should:
- Avoid direct Node.js built-in imports
- Accept crypto and compression implementations via dependency injection or conditional imports
- Provide a `Platform` configuration that consumers set at initialization

```typescript
// Consumer initializes with platform-specific implementations
import { configure } from '@rollercoaster-dev/openbadges-core';

configure({
  crypto: expoCryptoAdapter,    // or nodeCryptoAdapter
  compression: pakoAdapter,     // or zlibAdapter
  keyProvider: secureStoreKeys, // or fileSystemKeys
});
```

---

## Proposed Package Structure

```
packages/openbadges-core/
├── src/
│   ├── baking/
│   │   ├── baking.service.ts      # Unified bake/unbake facade
│   │   ├── png-baking.service.ts  # PNG iTXt embedding
│   │   ├── png-chunk-utils.ts     # PNG chunk manipulation
│   │   ├── svg-baking.service.ts  # SVG element embedding
│   │   ├── svg-utils.ts           # SVG DOM utilities
│   │   └── index.ts
│   ├── crypto/
│   │   ├── signature.ts           # Sign/verify operations
│   │   ├── jwt-proof.ts           # JWT proof create/verify
│   │   ├── key-provider.ts        # KeyProvider interface
│   │   ├── platform.ts            # Platform crypto abstraction
│   │   └── index.ts
│   ├── credentials/
│   │   ├── credential-builder.ts  # Build OB3 Verifiable Credentials
│   │   ├── serializer.ts          # OB2/OB3 serialization
│   │   ├── version.ts             # Version detection/conversion
│   │   └── index.ts
│   ├── verification/
│   │   ├── verifier.ts            # Signature verification
│   │   ├── proof-verifier.ts      # Proof type detection/validation
│   │   ├── expiration.ts          # Expiration checks
│   │   └── index.ts
│   ├── bitstring/
│   │   ├── bitstring.ts           # Bitstring manipulation
│   │   ├── compression.ts         # Platform-agnostic compression
│   │   └── index.ts
│   ├── types/
│   │   ├── iri.ts                 # IRI validation
│   │   ├── guards.ts              # Type guards
│   │   └── index.ts
│   ├── platform.ts                # Platform configuration
│   └── index.ts                   # Public API
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

---

## Public API Surface

What consumers import:

```typescript
import {
  // Configuration
  configure,

  // Badge baking
  bakeBadge,        // Embed credential in PNG/SVG
  unbakeBadge,      // Extract credential from PNG/SVG

  // Credentials
  buildCredential,  // Create an OB3 Verifiable Credential
  signCredential,   // Sign a credential with a private key
  serializeOB2,     // Convert to OB2 format
  serializeOB3,     // Convert to OB3 format

  // Verification
  verifyCredential, // Full verification (signature + expiration)
  verifySignature,  // Signature-only verification

  // Crypto
  generateKeyPair,  // Generate Ed25519 or RSA keys

  // Types
  KeyProvider,       // Interface for key storage
} from '@rollercoaster-dev/openbadges-core';
```

---

## What the Native App Needs for Iteration A

Not everything needs to be extracted at once. For iteration A (quiet victory), the native app needs:

1. **`buildCredential`** — construct an OB3 Verifiable Credential from goal + evidence data
2. **`signCredential`** — self-sign with the user's local Ed25519 key
3. **`generateKeyPair`** — create the user's signing key on first launch
4. **`bakeBadge`** — embed the credential in a badge image (PNG)
5. **`KeyProvider` interface** — implemented with Expo SecureStore

Verification, OB2 serialization, bitstring utilities, and SVG baking can come later.

### Minimum Viable Extraction

| Module | Needed for Iteration A | Can defer |
|--------|----------------------|-----------|
| Credential building | Yes | |
| Ed25519 signing | Yes | |
| Key pair generation | Yes | |
| PNG baking | Yes | |
| KeyProvider interface | Yes | |
| Platform configuration | Yes | |
| Verification | | Yes (iteration D) |
| JWT proofs | | Yes |
| SVG baking | | Yes |
| OB2 serialization | | Yes |
| Bitstring utilities | | Yes |

---

## Extraction Strategy

### Phase 1: Minimum for Iteration A
1. Create `packages/openbadges-core` in the monorepo
2. Extract credential building + OB3 serialization
3. Extract Ed25519 signing with KeyProvider interface
4. Extract PNG baking
5. Add platform configuration for React Native crypto compatibility
6. Write tests with InMemoryKeyProvider
7. Publish to npm as `@rollercoaster-dev/openbadges-core`

### Phase 2: Server Migration
8. Refactor `openbadges-modular-server` to import from `openbadges-core`
9. Implement `FileSystemKeyProvider`
10. Remove duplicated code from server
11. Verify all server tests still pass

### Phase 3: Remaining Modules
12. Extract verification logic (needed for iteration D)
13. Extract JWT proof handling
14. Extract SVG baking
15. Extract bitstring utilities
16. Extract OB2 serialization

---

## Impact on the Monorepo

This extraction is a refactor of the monorepo, not just a native app concern:

- New package: `packages/openbadges-core`
- Modified: `apps/openbadges-modular-server` (imports from core instead of local)
- Published: `@rollercoaster-dev/openbadges-core` on npm (alongside existing `openbadges-types`)
- Turborepo: new package in the build graph
- Tests: core gets its own test suite; server tests verify integration

The monorepo's modular architecture was designed for this kind of extraction. The domain-driven design means most of the boundaries already exist.

---

## Open Questions

1. **Package name** — `@rollercoaster-dev/openbadges-core` or `openbadges-core` (unscoped, like `openbadges-types`)?
2. **React Native crypto testing** — need to verify that `expo-crypto` can do Ed25519 signing or if we need `react-native-quick-crypto`
3. **Image handling on RN** — PNG chunk manipulation needs Buffer. Does React Native's JS engine support Buffer natively, or do we need a polyfill?
4. **Badge image generation** — the server creates badge images (not just baking). Does the native app need to generate badge images too, or can it use templates?
5. **Incremental extraction** — should Phase 1 and Phase 2 happen in the same PR, or separately?

---

## Related Documents

- [ADR-0001: Iteration Strategy](../decisions/ADR-0001-iteration-strategy.md) — what the native app needs from core
- [Data Model](./data-model.md) — how badges relate to goals and evidence
- [Product Vision](../vision/product-vision.md) — shared foundations between monorepo and native app
- [Monorepo Server Architecture](https://github.com/rollercoaster-dev/monorepo/blob/main/apps/openbadges-modular-server/docs/architecture/overview.md)

---

_Draft created 2026-02-02. The server's modular architecture makes this extraction natural — most boundaries already exist._
