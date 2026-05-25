# Web Privacy and Local-First Feasibility

**Date:** 2026-05-25  
**Status:** Research complete, decision pending  
**Owner:** Joe  
**Scope:** Feasibility of a web version of `native-rd` with privacy comparable to the mobile app

---

## Summary

A web version is feasible for the core app, including offline use, local-first storage, end-to-end encrypted sync, and no accounts. The strongest path is an installable PWA built from the existing Expo / React Native Web codebase, with web-specific adapters for Evolu, badge key storage, media evidence storage, capture, sharing, and crash reporting.

The important caveat: web privacy can be very strong, but it is not identical to native privacy. Mobile has Expo SecureStore backed by iOS Keychain / Android Keystore. The browser has origin-isolated storage, IndexedDB, OPFS, Web Crypto, and non-extractable `CryptoKey`s, but browser site data can be cleared or evicted, private browsing sessions are temporary, and any script served from the same origin can access decrypted app state while the app runs. That means we can offer the same product promise - local-first, no account, no analytics, optional E2EE sync - but we should not claim the same key-storage strength as native.

Recommendation:

1. Build a web prototype as an Expo Web / React Native Web PWA.
2. Keep the web app fully client-side. Do not introduce server rendering, accounts, analytics, or a hosted app database.
3. Use Evolu's web SDK for local-first encrypted data and optional WebSocket relay sync.
4. Store evidence files and baked badge images in OPFS where available, with IndexedDB fallback only for smaller blobs.
5. Implement a `WebKeyProvider` using Web Crypto and IndexedDB, ideally with non-extractable private keys.
6. Treat crash reporting on web as out of scope until the same privacy verification discipline exists for browser events.

---

## Current Mobile Privacy Bar

The mobile app's privacy posture is stronger than "private by policy." It is enforced by architecture:

- No accounts or registration.
- No analytics, advertising identifiers, usage tracking, session replay, screenshots, or performance monitoring.
- Goals, steps, evidence, badges, and preferences are local app data.
- App content is stored locally through Evolu and SQLite.
- Badge signing keys are stored through `SecureStoreKeyProvider`, backed by Expo SecureStore.
- User-created app content is not intentionally sent to Sentry.
- Sentry is limited to crash/error diagnostics and has explicit filters for user fields, extras, request data, breadcrumbs, console logs, navigation params, storage breadcrumbs, request URLs, and email/path-shaped strings.
- Sync is not currently shipped. Future sync is documented as opt-in and end-to-end encrypted.

Relevant local docs:

- `docs/launch/privacy-policy.md`
- `docs/launch/privacy-verification.md`
- `docs/decisions/ADR-0003-sync-layer-decision.md`
- `docs/decisions/ADR-0004-data-model-storage.md`
- `docs/architecture/personal-data-verification.md`
- `docs/research/evolu-prototype-findings.md`

Current app stack from `apps/native-rd/package.json`:

- Expo SDK 55
- React Native 0.83
- React 19
- React Native Web 0.21
- Evolu packages for native storage
- `expo-sqlite`, `expo-secure-store`, `expo-file-system`, `expo-image-picker`, `expo-camera`, `expo-audio`, `expo-video`
- `@rollercoaster-dev/openbadges-core`

There is already a `web` script:

```json
"web": "expo start --web"
```

That is a useful starting point, but the app is not currently web-ready because several runtime modules are native-only or native-oriented.

---

## Can Web Match the Mobile Privacy Promise?

Mostly yes, if the promise is framed correctly.

| Privacy property                              | Mobile today            | Web feasibility | Notes                                                               |
| --------------------------------------------- | ----------------------- | --------------- | ------------------------------------------------------------------- |
| Works without account                         | Yes                     | Yes             | A static PWA can run without auth.                                  |
| Core data local-first                         | Yes                     | Yes             | Evolu has React Web support.                                        |
| Offline use                                   | Yes                     | Yes             | Needs service worker/app-shell caching.                             |
| No analytics                                  | Yes                     | Yes             | Do not add analytics.                                               |
| Crash diagnostics scrubbed                    | Yes                     | Possible        | Prefer no web crash reporting until verified.                       |
| Optional E2EE sync                            | Planned                 | Yes             | Evolu web supports WebSocket transports and encrypted sync.         |
| Server cannot read synced data                | Planned                 | Yes             | Evolu encrypts data before it leaves the device.                    |
| Hardware-backed key storage                   | Yes-ish via SecureStore | No              | Browser cannot honestly match SecureStore/Keychain/Keystore.        |
| Local evidence files                          | Yes                     | Yes             | Use OPFS for copied app-private files.                              |
| Private browsing durability                   | Not relevant            | No              | Browser private/incognito data is cleared at session end.           |
| Protection from same-origin script compromise | App-store update model  | Weaker          | CSP, no third-party scripts, and supply-chain controls matter more. |

The web version can preserve the user-facing privacy model:

> Your data lives on this device/browser unless you export, share, or explicitly enable encrypted sync.

But it should include browser-specific caveats:

- Clearing site data deletes local app data.
- Private browsing/incognito is not durable storage.
- Browser storage can be evicted under storage pressure unless persistence is granted.
- Web key storage is origin-scoped, not a native secure enclave/keystore equivalent.

---

## Recommended Tech Stack

### App Shell

Use the existing Expo / React Native Web path first.

Why:

- The app already depends on `react-native-web`.
- UI components, navigation concepts, screens, themes, i18n, and tests can be reused.
- This avoids creating a second product surface in React/Vite before proving privacy and storage.
- The codebase already has clear local-first boundaries in `src/db`, `src/crypto`, badges, and capture flows.

Avoid Next.js for the first version. Server rendering does not help the local-first app loop and introduces more privacy review surface.

### Data Layer

Use Evolu web dependencies:

```ts
import { createEvolu, SimpleName } from "@evolu/common";
import { createUseEvolu, EvoluProvider } from "@evolu/react";
import { evoluReactWebDeps } from "@evolu/react-web";

const evolu = createEvolu(evoluReactWebDeps)(Schema, {
  name: SimpleName.orThrow("rollercoaster-dev"),
  transports: [], // local-only by default
});
```

Native should keep:

```ts
import { evoluReactNativeDeps } from "@evolu/react-native/expo-sqlite";
```

Likely implementation:

- Rename current `src/db/evolu.ts` into platform-specific files:
  - `src/db/evolu.native.ts`
  - `src/db/evolu.web.ts`
- Keep `src/db/schema.ts` and `src/db/queries.ts` shared.
- Add `@evolu/react-web` as a dependency.
- Configure web sync transport only when the user explicitly enables sync.

### Local File Storage

Use the browser's Origin Private File System for app-private media and baked badge images.

OPFS is the closest web equivalent to app-private file storage:

- It is private to the origin.
- It is not visible as normal user files.
- It is optimized for file-like operations.
- It is suitable for SQLite/WASM and media-style blobs.

Recommended web storage split:

| Data                               | Storage                                              |
| ---------------------------------- | ---------------------------------------------------- |
| Goals, steps, settings, badge rows | Evolu web local database                             |
| Evidence text                      | Evolu row, same as native text evidence              |
| Evidence metadata                  | Evolu row                                            |
| Photos, videos, voice memos, files | OPFS, referenced by app-private URI/id               |
| Baked badge PNGs                   | OPFS                                                 |
| Crypto keys                        | IndexedDB `CryptoKey` records or encrypted JWK blobs |
| App shell assets                   | Service Worker Cache Storage                         |

Do not store large evidence files in `localStorage`. It is too small and synchronous. Avoid relying on user-visible File System Access handles for core app storage; that API is useful for import/export, not private app storage.

### Badge Key Storage

Mobile uses `SecureStoreKeyProvider`, which exports an Ed25519 private JWK at creation time, stores it in SecureStore, then imports it as non-extractable when signing.

For web, add a `WebKeyProvider` behind the existing `KeyProvider` interface:

```ts
export interface KeyProvider {
  isAvailable(): Promise<boolean>;
  generateKeyPair(): Promise<{ keyId: string; publicKeyJwk: JsonWebKey }>;
  getPublicKey(keyId: string): Promise<JsonWebKey>;
  sign(keyId: string, data: Uint8Array): Promise<Uint8Array>;
}
```

Recommended browser approach for v1:

1. Generate the Ed25519 keypair with Web Crypto.
2. Store the private key as a non-extractable `CryptoKey` in IndexedDB.
3. Export and store only the public JWK.
4. Implement `sign()` by loading the `CryptoKey` and calling `crypto.subtle.sign`.
5. If Ed25519 is unavailable in a target browser, block badge signing with a clear compatibility message or use a reviewed library fallback.

This gives better browser key hygiene than storing raw private JWK in IndexedDB. It does mean a browser-data wipe loses the badge signing key unless a backup/export design is added.

Alternative for recovery:

- Store an encrypted private JWK in IndexedDB, wrapped by a key derived from a user passphrase or mnemonic.
- This makes recovery possible but weakens the "private key never appears as serialized key material" property.
- Do this only after a crypto design review.

### Badge Baking and Export

`@rollercoaster-dev/openbadges-core` already notes that browser support is close but incomplete:

- Credentials and crypto can work in browsers through Web Crypto.
- Browser `KeyProvider` is not implemented yet.
- PNG baking currently depends on `Buffer` and needs a `Uint8Array` path for browser support.

Web work needed:

- Refactor PNG baking to avoid Node `Buffer` assumptions.
- Keep baked image generation deterministic across native and web.
- Implement web download/share:
  - `URL.createObjectURL(blob)` for download.
  - Web Share API where available.
  - File System Access API as optional "save as" enhancement.

### Capture and Evidence

Native capture flows need web equivalents:

| Native feature                            | Web equivalent                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| Photo capture via Expo ImagePicker/Camera | `<input type="file" accept="image/*" capture>` or MediaDevices camera flow |
| Pick photo/video/file                     | `<input type="file">`                                                      |
| Voice memo                                | MediaRecorder API                                                          |
| Video recording                           | MediaRecorder API with `getUserMedia`                                      |
| App-private copy                          | OPFS write                                                                 |
| Share/export                              | Web Share API or downloaded Blob                                           |

For a first web release, reduce scope:

- Include text evidence, link evidence, file/photo upload, and badge export.
- Defer in-browser camera, voice memo, and video recording unless web is intended to be a full mobile peer immediately.

---

## Local-First and Sync Mechanics

### Local-only Mode

Default web behavior should be local-only:

1. App shell loads over HTTPS.
2. Service worker caches static JS/CSS/assets.
3. Evolu creates local encrypted storage in the browser.
4. User creates goals, steps, evidence, and badges without network.
5. Media files are copied into OPFS.
6. Export/share is explicit.

No account is needed.

### Optional Sync

When sync is enabled:

1. User reviews a sync explanation and backup responsibility.
2. User stores or enters the Evolu mnemonic.
3. Evolu uses a WebSocket relay transport.
4. Data is encrypted before leaving the browser.
5. Relay receives encrypted/padded messages and metadata, not plaintext user content.
6. A second device restores with the mnemonic.

Evolu's current docs describe:

- React Web support via `@evolu/react-web`.
- Offline-first storage with sync through self-hosted or cloud relays.
- End-to-end encryption by default.
- A stateless relay that can be self-hosted and can be combined with other relays.

Privacy limitation: the relay can still see owner id, timestamps/activity timing, encrypted blobs, and IP addresses. That is consistent with the existing sync research and should be included in web sync copy.

### Sync Defaults

Use this default posture:

- No sync transport configured until the user opts in.
- Self-hosted relay URL supported.
- Rollercoaster.dev-hosted relay can be offered later as convenience, not a requirement.
- Free Evolu relay should be for development/testing only unless product/legal/privacy docs explicitly accept it.

---

## Privacy Hardening Required for Web

A web app needs a stricter deploy discipline than the mobile app because code is fetched at runtime from the origin.

Minimum controls:

- HTTPS only.
- Strict Content Security Policy:
  - no third-party scripts
  - no inline scripts unless unavoidable and hashed
  - restrict `connect-src` to the configured relay and optional diagnostics endpoint
  - restrict image/media/font sources
- No analytics SDKs.
- No tag managers.
- No third-party embeds.
- No remote fonts at runtime. Bundle fonts locally.
- No Sentry web integration until privacy verification exists.
- Dependency pinning and lockfile review for web release.
- Static hosting with immutable asset filenames.
- Clear browser-data deletion/export guidance in the privacy policy.
- Privacy verification using browser DevTools/proxy capture before release.

If web Sentry is later enabled, it needs its own verification doc, not a copy-paste of the native plan. Browser events have different leak paths: URLs, route state, console breadcrumbs, unhandled rejection values, component stacks, network breadcrumbs, localStorage/sessionStorage breadcrumbs, and browser/device metadata.

---

## Scope Estimate

These are planning ranges, not commitments.

| Phase                        | Scope                                                                                     | Rough effort |
| ---------------------------- | ----------------------------------------------------------------------------------------- | ------------ |
| 0. Feasibility spike         | Make app boot on web, prove Evolu web local CRUD, identify native-only compile blockers   | 2-4 days     |
| 1. Core web app              | Platform-specific Evolu adapter, fix imports, core goal/step/settings flows, PWA shell    | 1-2 weeks    |
| 2. Badge web support         | WebKeyProvider, badge signing, PNG baking Uint8Array path, download/export                | 1-2 weeks    |
| 3. Evidence web support      | Text/link/file/photo upload, OPFS storage, thumbnails/previews                            | 1-3 weeks    |
| 4. Optional sync             | Opt-in UI, mnemonic restore, custom relay URL, relay tests                                | 1-2 weeks    |
| 5. Privacy/release hardening | CSP, no third-party runtime calls, web privacy policy, proxy verification, browser matrix | 1-2 weeks    |

Minimal useful web release:

- Goals
- Steps
- Text/link evidence
- Badge creation/export
- Local-only PWA
- No Sentry
- No sync
- No camera/audio/video capture

Full parity web release:

- Everything above
- File/photo/video/voice evidence
- Optional E2EE sync
- Badge sharing/download
- Browser compatibility and storage persistence UX
- Verified web diagnostics if enabled

---

## Main Implementation Tasks

1. Add web Evolu adapter
   - Add `@evolu/react-web`.
   - Split `src/db/evolu.ts` into native/web implementations.
   - Keep schema and queries shared.

2. Add platform key providers
   - Keep `SecureStoreKeyProvider` native-only.
   - Add `WebKeyProvider`.
   - Split `src/crypto/index.ts` by platform.

3. Audit native-only imports
   - `expo-secure-store`
   - `expo-file-system`
   - `expo-sharing`
   - `expo-image-picker`
   - `expo-camera`
   - `expo-audio`
   - `expo-video`
   - `expo-application`
   - `@sentry/react-native`
   - `react-native-view-shot`

4. Add web storage abstraction
   - `EvidenceFileStore.native.ts`
   - `EvidenceFileStore.web.ts`
   - Native uses Expo FileSystem.
   - Web uses OPFS with fallback.

5. Refactor badge baking
   - Remove `Buffer` requirement from browser path.
   - Use `Uint8Array` as the shared binary primitive.

6. Add PWA/offline support
   - Static app shell caching.
   - Offline smoke tests.
   - Storage persistence prompt or settings check using `navigator.storage.persist()`.

7. Add privacy verification
   - Confirm no network calls during local-only use after first app load.
   - Confirm no user content in diagnostics if diagnostics are enabled.
   - Confirm sync relay only receives encrypted Evolu messages.
   - Confirm exported badges contain only expected credential/evidence fields.

---

## Risks and Mitigations

### Browser storage loss

Risk: Users clear site data, use private browsing, hit quota pressure, or switch browsers.

Mitigations:

- Request persistent storage where supported.
- Provide local export/import.
- Make sync opt-in backup clear and explicit.
- Detect private browsing/ephemeral storage when possible and warn.

### Key loss

Risk: Web badge signing key is lost when site data is deleted.

Mitigations:

- Store keys as non-extractable CryptoKeys for v1 and explain local-only nature.
- Add encrypted key backup/export later.
- Consider whether badge signing identity should be device-local or mnemonic-restorable before shipping sync.

### Same-origin script compromise

Risk: A malicious deployed bundle or third-party script can access decrypted state.

Mitigations:

- Static hosting.
- Strict CSP.
- No third-party scripts.
- Build provenance and lockfile review.
- Keep hosted sync relay separate from app runtime code.

### Browser compatibility

Risk: OPFS, MediaRecorder, Web Share, and Ed25519 support vary by browser/version.

Mitigations:

- Define supported browsers for v1.
- Feature-detect at runtime.
- Degrade gracefully:
  - no badge signing if Ed25519 unavailable
  - upload-only evidence if MediaRecorder unavailable
  - download fallback if Web Share unavailable

### Privacy copy overclaim

Risk: Saying "same as mobile" overstates browser guarantees.

Mitigation:

- Use "same local-first privacy model" rather than "same secure storage."
- Document browser-specific limits in the privacy policy.

---

## Open Questions

1. Is the web app a full peer to mobile, or a companion for reviewing/exporting badges?
2. Should web v1 include optional sync, or should it launch local-only first?
3. Should web crash reporting be disabled entirely for v1?
4. Should badge signing identity be device/browser-local, or recoverable from the Evolu mnemonic?
5. Are camera, voice memo, and video evidence required for web v1, or can upload/text/link evidence carry the first release?
6. Should hosted web live at `app.rollercoaster.dev`, or should self-hosted/static distribution be a first-class option?

None of these block a spike. They do affect the release promise.

---

## Recommended Next Step

Run a short prototype with three acceptance checks:

1. `native-rd` boots on Expo Web with a web Evolu adapter and can create/read goals offline.
2. A browser `WebKeyProvider` can generate an Ed25519 key, sign a badge payload, reload the page, and sign again.
3. A photo/file can be copied into OPFS, referenced from Evolu metadata, reloaded, previewed, and exported.

If those pass, the web version is an engineering project, not a research question.

---

## Sources

Local project sources:

- `apps/native-rd/package.json`
- `apps/native-rd/src/db/schema.ts`
- `apps/native-rd/src/db/evolu.ts`
- `apps/native-rd/src/crypto/KeyProvider.ts`
- `apps/native-rd/src/crypto/SecureStoreKeyProvider.ts`
- `apps/native-rd/docs/launch/privacy-policy.md`
- `apps/native-rd/docs/launch/privacy-verification.md`
- `apps/native-rd/docs/decisions/ADR-0003-sync-layer-decision.md`
- `apps/native-rd/docs/decisions/ADR-0004-data-model-storage.md`
- `apps/native-rd/docs/research/evolu-prototype-findings.md`
- `apps/native-rd/docs/architecture/personal-data-verification.md`
- `packages/openbadges-core/README.md`

External sources:

- Evolu docs, local-first web setup: https://www.evolu.dev/docs/local-first
- Evolu docs, privacy: https://www.evolu.dev/docs/privacy
- Evolu docs, relay: https://www.evolu.dev/docs/relay
- MDN, Origin Private File System: https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system
- MDN, IndexedDB terminology and limitations: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology
- MDN, Web Storage private browsing behavior: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- MDN, Web Crypto `SubtleCrypto`: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
- MDN, `CryptoKey.extractable`: https://developer.mozilla.org/en-US/docs/Web/API/CryptoKey/extractable
- MDN, `SubtleCrypto.generateKey`: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey
- web.dev, Storage for the web: https://web.dev/articles/storage-for-the-web
- SQLite WASM persistent storage options: https://sqlite.org/wasm/doc/tip/persistence.md
- W3C Verifiable Credentials Data Model v2.0 privacy considerations: https://www.w3.org/TR/vc-data-model-2.0/#privacy-considerations
- 1EdTech Open Badges 3.0 implementation guide: https://www.imsglobal.org/spec/ob/v3p0/impl/
