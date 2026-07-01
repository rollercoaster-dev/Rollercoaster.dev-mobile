# Pear (Holepunch P2P Runtime) — Evaluation for native-rd

**Date:** 2026-07-01
**Status:** Draft — research, not a decision
**Owner:** Joe

**Scope reference:** [ADR-0001 §Iteration D](../decisions/ADR-0001-iteration-strategy.md#iteration-d--community), [ADR-0003 Sync Layer](../decisions/ADR-0003-sync-layer-decision.md)

---

## TL;DR

**Pear is a peer-to-peer _transport / storage / discovery_ runtime. It is not a credential format and not a verification scheme.**

That single distinction decides most of this evaluation:

- It **cannot** make badges "OB3-verifiable." OB3 verification is a cryptographic check over the Verifiable Credential's Data Integrity proof and a resolvable issuer DID — identical whether the bytes arrived by email, QR, HTTPS, or Hypercore. That work is the existing Iteration D punch-list ([ob3-compliance-status.md](../architecture/ob3-compliance-status.md)) and is independent of transport.
- It **collides** with a decision already shipped: Evolu is the sync layer ([ADR-0003](../decisions/ADR-0003-sync-layer-decision.md)) and the entire data model is built on Evolu-native types ([ADR-0004](../decisions/ADR-0004-data-model-storage.md)). Pear/Autobase would _replace_ that substrate, not extend it, and buys nothing new for the single-user multi-device case.
- It is a **genuine candidate for exactly one thing**: Iteration D's stated goal of _"share and verify a badge between two phones, no server, no internet"_ — a **device-to-device mentor/peer-endorsement channel**. Evolu does not do this (it syncs one user's own devices through a relay), and today there is no import path or multi-user code at all, so that channel is fully greenfield.

**Recommendation:** leave the sync layer alone; keep the OB3 crypto work on its own track; treat Pear as a _spike-and-compare_ candidate for the Iteration D peer channel only — weighed against QR hand-off and a thin relay — and not before Iteration D.

---

## What Pear actually is

`pears.com` is the marketing shell; the substance lives at `docs.pears.com`. Pear is **Holepunch's** P2P runtime, built on the Hypercore stack.

### Primitives

| Building block            | What it is                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hypercore**             | Append-only log, **Ed25519-signed**. The public key _is_ the log's identity/address; integrity is a Merkle tree. Only the keyholder can append; any peer can verify an entry is authentic and untampered. |
| **Hyperbee / Hyperdrive** | B-tree key-value store / filesystem, layered on Hypercore.                                                                                                                                                |
| **Autobase**              | Linearizes _multiple writers'_ cores into one shared view (multi-writer collaboration).                                                                                                                   |
| **Hyperswarm / HyperDHT** | Serverless peer discovery + NOISE-encrypted direct connections.                                                                                                                                           |
| **Corestore**             | Manages many cores locally.                                                                                                                                                                               |
| **Bare**                  | The runtime itself — a Node-alternative that supports UDP and low-level networking (Hermes does not).                                                                                                     |

The interesting overlap: Hypercore's identity primitive is **the same Ed25519 signing** native-rd already uses for badges. But see [§Full OB3](#will-this-work-for-full-ob3-badges) — that overlap is a trap, not a shortcut.

### Mobile integration

P2P code runs on mobile via **`react-native-bare-kit`**:

- Your P2P code runs in a **Worklet** — a separate JS thread on the **Bare** runtime, _not_ Hermes (Hermes lacks the UDP / low-level control P2P needs).
- It talks to the React Native UI over an **IPC/RPC** stream (`bare-rpc`).
- The backend bundle is built with `bare-pack` from the `bare-expo` template.
- Requires a **native build** with the full NDK / Gradle / Java toolchain. Logging is awkward (logcat on Android, Console.app on iOS).

native-rd is already a dev-client app (`npx expo run:ios`, not Expo Go), so a native module is _feasible_ — but this adds a **second JS runtime** beside Hermes and a heavier toolchain, and the mobile docs read as **early / experimental**.

---

## How it lands against decisions already made

### Evolu is the sync layer — and it isn't even wired yet

[ADR-0003](../decisions/ADR-0003-sync-layer-decision.md) chose Evolu for: local-first, built-in E2EE (key derived from a mnemonic), CRDT conflict resolution, a stateless self-hostable MIT relay. [ADR-0004](../decisions/ADR-0004-data-model-storage.md) then built the whole schema on Evolu-native branded types, ULIDs, and CRDT soft-deletes.

Two facts sharpen the picture:

- **Sync is not live.** `src/db/evolu.ts` creates a local-only instance; the app makes zero network calls today. So the risk isn't disrupting a running sync — it's that the _decision_ and the _Evolu-native schema_ are load-bearing.
- **Evolu already meets the sync requirement.** For the single-user, multi-device case, Pear/Autobase would be a straight substitution that delivers nothing Evolu doesn't. **Don't touch sync.**

But note the seam Evolu leaves open: it syncs **one user's own devices through a relay**. Iteration D wants **two _different_ users' phones to exchange a badge + endorsement directly, ideally offline**. Evolu does not do that. That gap is the only place Pear earns a look. See [sync-and-backend-architecture.md](./sync-and-backend-architecture.md) for the relay/hosted-verification story Pear would be an alternative to.

### OB3 correctness is orthogonal to transport

[ob3-compliance-status.md](../architecture/ob3-compliance-status.md) records that badges today **fail external verification** — 6 validator errors plus a non-resolvable `did:key`. The cryptosuite is `eddsa-raw-json-iteration-a` (`useCreateBadge.ts`): a signature over raw `JSON.stringify(credential)`, `proofValue` as bare base64url, `did:key` built from raw base64url instead of multibase/multicodec.

**Pear does nothing for any of this.** Closing those gaps (RDFC-1.0 canonicalization, `eddsa-rdfc-2022`, multibase encoding, resolvable DID, `proof` as array, top-level `name`/`issuanceDate`, `creator` as a Profile object) is required regardless of how a badge is delivered. The signing layer (`packages/openbadges-core`, `src/crypto/SecureStoreKeyProvider.ts`, `src/badges/credentialBuilder.ts`, `src/hooks/useCreateBadge.ts`) is cleanly orthogonal to whatever transport is chosen — which is good news: a transport can be added later without re-architecting credentials.

---

## The specific questions

### Badge verification

Verification is cryptographic and transport-agnostic; Pear can neither add nor replace it. What Pear _can_ solve is the **OB2-era hosted-verification URL-rot problem** — a badge whose hosted JSON 404s when the issuer's server dies. A Hypercore is a replicated, content-addressed, always-available home for the credential JSON **and** for a `BitstringStatusList` revocation list (censorship-resistant, no server bill).

Caveat: standard verifiers ([verifybadge.org](https://verifybadge.org), an employer's tool) expect an **HTTPS** URL. Pear would sit _behind_ the standard URL as a durability layer, not replace it. The planned `badges.rollercoaster.dev/v/<id>` hosted link ([badge-export.md](./badge-export.md), [sync-and-backend-architecture.md](./sync-and-backend-architecture.md)) remains the interop-facing surface.

### Mentor updates from earners

**Strongest fit.** This maps cleanly onto the Iteration D flow already sketched in [personal-data-verification.md](../architecture/personal-data-verification.md): holder sends a verification request device-to-device → mentor reviews evidence → mentor **signs an endorsement recording what they reviewed** → endorsement embedded or returned as a companion credential.

A Hyperswarm channel (or Autobase for an ongoing shared thread) between earner and mentor is exactly what that wants: **E2EE, serverless, real-time, no account.** Two guardrails from the project's own ADRs constrain the design:

- **[ADR-0012 (no-auto-judgment)](../decisions/ADR-0012-no-auto-judgment.md):** a mentor is an _endorser_, never a grader. The channel carries a signed "I reviewed this evidence," not a score or verdict.
- **[personal-data-verification.md](../architecture/personal-data-verification.md):** default to **DID-only, no identity disclosure**. The mentor endorses a DID's achievement, not a legal identity, unless the earner explicitly opts into a disclosure mode.

### Badge publishing & final signing

Signing is unchanged by Pear: the VC is signed on-device with the SecureStore-held Ed25519 private key (`SecureStoreKeyProvider.ts`, `useCreateBadge.ts`), producing spec-compliant `eddsa-rdfc-2022` bytes once the Iteration D crypto gaps close. Pear's only contribution to "publishing" is **distribution** — pushing the finished, signed credential onto a Hypercore for durable/serverless availability, and carrying a mentor's **counter-signature (endorsement)** back over a direct channel. The signing itself stays in `openbadges-core`.

### Will this work for full OB3 badges?

**Yes — but Pear is neither the reason nor the obstacle.** Full OB3 is the existing Iteration D punch-list, independent of transport.

A tempting shortcut fails: _"Hypercore keys are Ed25519, reuse them as the badge DID."_ An OB3 `did:key` must be multibase-encoded (`z…`) with the `0xed01` multicodec prefix and must resolve; a raw Hypercore public key is neither. You _can_ bridge them, but you don't need Pear to have DIDs, and coupling credential identity to a transport key would leak the transport into the identity model — the opposite of what OB3 portability wants.

### General Open Badges considerations

- **Interop is the whole point of OB3.** The failure mode is letting a Pear-only path become the _only_ way to verify — a walled garden that defeats the standard. Keep standard VC verification as the source of truth; make Pear an _optional_ transport/durability layer.
- **The industry-standard delivery answer already exists on the roadmap:** a hosted verifiable link (`badges.rollercoaster.dev/v/<id>`), which is what Credly / Canvas Credentials / Accredible do. Pear is orthogonal to that, not a replacement — verifiers click HTTPS links.
- **Governance / values flag.** Holepunch's Pear sits in a crypto-adjacent, single-vendor ecosystem (Keet, Tether-funded, "QVAC" framing). Given how deliberately values-driven this project is (privacy, ND-first, no dark patterns), a foundational dependency there warrants a conscious look — not disqualifying, but not free. Note the parallel to the single-maintainer risk already flagged for Evolu in [ADR-0003](../decisions/ADR-0003-sync-layer-decision.md); Pear's _mobile_ support is at a similar or earlier maturity.

---

## Mobile reality check

`react-native-bare-kit` runs a **second JS runtime** (Bare) in a worklet beside Hermes, bundled separately (`bare-pack`, `bare-expo` template), needing the full NDK / Gradle / Java native toolchain. The dev-client setup makes it possible; the maturity and toolchain weight make it a heavy foundational bet for one feature, in a pre-production app with a small team.

---

## Recommendation

1. **Sync layer:** leave Evolu alone. Pear does not beat it for multi-device sync and would discard shipped schema work.
2. **OB3 correctness:** proceed with the Iteration D crypto punch-list regardless of Pear. Pear is not on that critical path.
3. **The one worthwhile spike — Iteration D only, not now:** the device-to-device, serverless **mentor-endorsement / peer-verification channel**. Before betting on Pear, weigh it against simpler options for "two phones, offline": **QR-code hand-off**, **local-network transfer**, or a **thin relay** (which the [sync-and-backend-architecture.md](./sync-and-backend-architecture.md) plan already implies). Pear's edge is true DHT discovery + E2EE transport + optional durable persistence; its cost is the Bare runtime and toolchain.
4. **If the spike happens:** time-box a `bare-expo` prototype that exchanges **one signed endorsement between two devices offline**. That single flow reveals whether the RN integration and the offline story hold up before anything foundational is committed.

**Net:** Pear is a well-built answer to a question this architecture has _mostly already answered_ (Evolu for sync, VC crypto for verification). It becomes interesting only at the Iteration D "serverless peer verification" frontier — and even there it is spike-and-compare, not a foregone conclusion.

---

## Open questions

- For the Iteration D peer channel, does true serverless DHT discovery (Pear) beat a self-hosted relay + QR pairing enough to justify the Bare runtime dependency?
- Could a Hypercore-hosted `BitstringStatusList` (fronted by an HTTPS gateway) improve revocation durability over an S3-served list — and is that worth the moving parts?
- Does the Bare worklet coexist cleanly with the current Expo/Hermes dev-client build, or does it force config-plugin/prebuild changes that ripple into the release pipeline?

---

## Related documents

- [ADR-0001: Iteration Strategy](../decisions/ADR-0001-iteration-strategy.md) — Iteration D scope
- [ADR-0003: Sync Layer Decision](../decisions/ADR-0003-sync-layer-decision.md) — Evolu rationale
- [ADR-0004: Data Model & Storage](../decisions/ADR-0004-data-model-storage.md) — Evolu-native schema
- [ADR-0012: No-auto-judgment](../decisions/ADR-0012-no-auto-judgment.md) — mentor is an endorser, not a grader
- [OB3 Compliance Status](../architecture/ob3-compliance-status.md) — the crypto punch-list Pear does not touch
- [Personal Data and Badge Verification](../architecture/personal-data-verification.md) — Iteration D endorsement flow
- [Sync and Backend Architecture](./sync-and-backend-architecture.md) — the relay/hosted-verification story Pear is an alternative to
- [Local-First Sync Comparison](./local-first-sync-comparison.md) — the sync evaluation that chose Evolu

## Sources

- [Bare runtime](https://bare.pears.com/)
- [Pear by Holepunch — docs](https://docs.pears.com/)
- [Making a Bare Mobile Application](https://docs.pears.com/guides/making-a-bare-mobile-app) ([source](https://github.com/holepunchto/pear-docs/blob/main/guide/making-a-bare-mobile-app.md))
- [Pear Runtime: Zero-Infrastructure, P2P High-Scale Applications — David Mark Clements](https://gitnation.com/contents/pear-runtime-zero-infrastructure-high-scale-applications)
