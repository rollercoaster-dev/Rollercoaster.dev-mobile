# @rollercoaster-dev/openbadges-core

Shared core library for Open Badges functionality across Rollercoaster.dev applications.

## Purpose

This package provides shared utilities and core functionality for working with Open Badges across both the modular server and the system app. It eliminates code duplication by centralizing:

- **Badge baking utilities** - PNG metadata embedding for badge images
- **Cryptographic operations** - Signing, verification, and key management
- **Credential generation** - Badge creation and validation logic
- **Platform detection** - Runtime environment detection for Node.js and Bun

## Installation

This package is part of the monorepo workspace and used internally by other packages:

```json
{
  "dependencies": {
    "@rollercoaster-dev/openbadges-core": "workspace:*"
  }
}
```

## Usage

```typescript
import {
  detectPlatform,
  isBun,
  isNode,
} from "@rollercoaster-dev/openbadges-core";

// Detect runtime platform
const platform = detectPlatform(); // "node" | "bun" | "unknown"

// Check specific platforms
if (isBun()) {
  // Use Bun-specific APIs
}

if (isNode()) {
  // Use Node.js-specific APIs
}
```

## API Overview (Planned Structure)

### Platform Detection (✅ Implemented)

- `detectPlatform()` - Detect current runtime environment
- `isBun()` - Check if running in Bun
- `isNode()` - Check if running in Node.js

### Badge Baking (🚧 Coming Soon)

- PNG metadata embedding
- Baked badge extraction
- Image validation

### Crypto Utilities (🚧 Coming Soon)

- RSA key pair generation
- JWT signing and verification
- JWKS endpoint support
- Key management

### Credential Generation (🚧 Coming Soon)

- Open Badges 2.0 assertion generation
- Open Badges 3.0 credential generation
- Validation and verification

## Development

```bash
# Build the package
bun run build

# Run type checking
bun run type-check

# Run linting
bun run lint

# Run tests
bun test

# Watch mode
bun test --watch
```

## Platform Configuration

### Node.js / Bun (zero config)

No setup needed. The package auto-initializes with `NodeCryptoAdapter` and `InMemoryKeyProvider`:

```typescript
import { signData } from "@rollercoaster-dev/openbadges-core";

// Just works — no configure() call required
const jws = await signData(data, privateKey);
```

### React Native

Call `configure()` at app startup before any crypto operations:

```typescript
import { configure } from "@rollercoaster-dev/openbadges-core";
import { ExpoCryptoAdapter } from "./adapters/expo-crypto";
import { SecureStoreKeyProvider } from "./adapters/secure-store";

configure({
  crypto: new ExpoCryptoAdapter(),
  keyProvider: new SecureStoreKeyProvider(),
});
```

### Custom Providers

Implement the `CryptoProvider` interface for your platform:

```typescript
import type { CryptoProvider } from "@rollercoaster-dev/openbadges-core";

class MyCryptoAdapter implements CryptoProvider {
  async sign(
    data: string,
    privateKey: JWK,
    algorithm: string,
  ): Promise<string> {
    /* ... */
  }
  async verify(
    data: string,
    signature: string,
    publicKey: JWK,
    algorithm: string,
  ): Promise<boolean> {
    /* ... */
  }
  async generateKeyPair(
    algorithm: "Ed25519" | "RSA",
  ): Promise<{ publicKey: JWK; privateKey: JWK }> {
    /* ... */
  }
}
```

## Platform Support

| Module                         | Node.js/Bun                     | React Native                             | Browser                       |
| ------------------------------ | ------------------------------- | ---------------------------------------- | ----------------------------- |
| Credentials                    | Yes                             | Yes                                      | Yes                           |
| Crypto (signing, verification) | Yes                             | Yes (via `configure()`)                  | Yes (via `jose` / Web Crypto) |
| KeyProvider                    | `InMemoryKeyProvider` (default) | `SecureStoreKeyProvider` (user-provided) | Not yet                       |
| PNG Baking                     | Yes                             | No (`Buffer` required)                   | No (`Buffer` required)        |

**Browser/Vue future possibility:** The crypto and credentials modules already work in browsers since they're built on `jose` (which uses Web Crypto API). Full browser support would require refactoring the baking module from `Buffer` to `Uint8Array` and adding a browser `KeyProvider` (e.g. IndexedDB). The same `configure()` pattern would cover this.

## Architecture

This package follows a modular structure:

```text
src/
├── baking/        # Badge baking utilities (PNG metadata)
├── crypto/        # Cryptographic operations
├── credentials/   # Credential generation and validation
├── types/         # Shared type definitions
└── platform.ts    # Runtime platform detection
```

## Dependencies

- `openbadges-types` - Open Badges type definitions
- `@rollercoaster-dev/rd-logger` - Structured logging

## License

MIT

## Links

- [Monorepo Documentation](../../docs/)
- [Open Badges Specification](https://www.imsglobal.org/spec/ob/v3p0/)
