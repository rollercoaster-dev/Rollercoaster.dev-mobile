# openbadges-core Context

Package-specific context for Claude Code when working in `packages/openbadges-core/`.

**npm**: `@rollercoaster-dev/openbadges-core`

## Purpose

Shared core library for Open Badges functionality. This package eliminates code duplication between `openbadges-modular-server` and `openbadges-system` by providing:

- Badge baking utilities (PNG metadata embedding)
- Crypto operations (signing, verification, key management)
- Credential generation logic
- Platform-agnostic implementations

## Key Patterns

### Platform Detection

Use platform detection to support both Node.js and Bun runtimes:

```typescript
import { detectPlatform, isBun, isNode } from "./platform.js";

if (isBun()) {
  // Use Bun.file() or other Bun-specific APIs
}

if (isNode()) {
  // Use fs module or other Node.js-specific APIs
}
```

### Module Structure

Each functional area has its own subdirectory:

- `baking/` - Badge baking utilities (image metadata)
- `crypto/` - Cryptographic operations (signing, keys)
- `credentials/` - Badge generation logic
- `types/` - Shared type definitions (internal to core)

### Logging

Use `@rollercoaster-dev/rd-logger` for structured logging:

```typescript
import { Logger } from "@rollercoaster-dev/rd-logger";

const logger = new Logger({ level: "info" });
logger.info("Operation completed", { context: "value" });
```

### Type Definitions

Import Open Badges types from `openbadges-types`:

```typescript
import { OB2, OB3 } from "openbadges-types";

function generateBadge(assertion: OB2.Assertion | OB3.VerifiableCredential) {
  // Implementation
}
```

## Testing

Tests are colocated in `tests/` directory. Use Bun test runner:

```bash
bun test                # Run all tests
bun test --watch        # Watch mode
bun test --coverage     # Coverage report
```

Test file naming: `*.test.ts`

## Conventions

- **Minimal implementation** - Only what's explicitly needed
- **Platform agnostic** - Support both Node.js and Bun
- **No framework dependencies** - Core logic should be framework-independent
- **Comprehensive JSDoc** - Document public APIs with JSDoc comments

## Build Configuration

- **Builder**: tsup (fast, dual ESM/CJS output)
- **TypeScript**: Strict mode, composite enabled
- **Output**: `dist/` with source maps and declarations

## Dependencies

**Runtime**:

- `openbadges-types` - Type definitions for OB 2.0/3.0
- `@rollercoaster-dev/rd-logger` - Logging utilities

**Dev**:

- `@rollercoaster-dev/shared-config` - Shared tooling configs
- `tsup` - Build tool

## Current Status

**Phase 1: Scaffold Complete** (✅)

- Package structure created
- Build configuration set up
- Platform detection implemented

**Next Steps**:

- Issue #684: Extract credential generation logic
- Issue #685: Extract crypto utilities
- Issue #686: Extract baking utilities
- Issue #687: Migrate modular server
- Issue #688: Migrate system app
