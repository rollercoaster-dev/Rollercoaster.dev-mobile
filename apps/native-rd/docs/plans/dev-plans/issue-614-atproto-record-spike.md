# Development Plan: Issue #614

## Issue Summary

**Title**: [Spike] Write and resolve an atproto record — evidence we can build milestone 4
**Type**: research / spike (evidence artefact for the Prototype Fund application)
**Complexity**: SMALL
**Estimated Lines**: ~320 lines (≈180 TS, ≈90 README/docs prose, ≈30 lexicon JSON, ≈20 config)

## Intent Verification

- [ ] `apps/native-rd/prototypes/atproto-spike/` contains a script that, run against a real hosted PDS, writes one record and reads it back, printing the resulting `at://` URI and CID to the console
- [ ] The README states, in its own words, what the PLC operation actually required (email token, rotation-key custody) — not a citation of ADR-0015
- [ ] The README states firehose propagation and Bluesky-feed non-appearance as **verified**, with the evidence (a jetstream/firehose observation, or an explicit "not verified, here's why"), not as an assertion carried over from ADR-0015
- [ ] The README answers, explicitly yes or no: can a `did:key`-issued credential be hosted in an atproto repo without the record's own DID (`did:plc`) being the credential issuer — with the rotation/recovery cost stated
- [ ] The commit trail is reproducible: a reader with their own PDS test account can run the script and get the same class of result
- [ ] The README states plainly what is stubbed and what milestone 4 (public badges to the user's own atproto repo, ADR-0015) still has to build on top of this

## Dependencies

| Issue | Title                                                                                 | Status  | Type                                                                                       |
| ----- | ------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| #606  | Publish the funded increment: merge #594, create funded-scope milestone, PRIOR-ART.md | 🔴 Open | Unrelated — mentioned in #614's Context for framing only, not a code/sequencing dependency |
| #601  | Epic: Prototype Fund readiness (milestone parent)                                     | 🔴 Open | Parent epic, not a blocker                                                                 |

No `Blocked by`, `Depends on`, `After`, or checkbox dependency markers appear in #614's body. Labels confirm this: `dep:independent`, `order:1`.

**Status**: ✅ All dependencies met — issue is independent and first in its wave.

## Objective

Produce a public, reproducible spike proving the app's author can write and resolve a record on a real atproto PDS, and answer ADR-0015's open `did:key`-vs-`did:plc` question with evidence rather than assertion — landing as a curated, CI-exempt `prototypes/` bundle per existing repo convention, with no app integration.

## Decisions

| ID  | Decision                                                                                                                                                                                    | Alternatives Considered                                                                                                                                       | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Land at `apps/native-rd/prototypes/atproto-spike/`, not a top-level `prototypes/`                                                                                                           | Repo-root `prototypes/` (issue says only "prototypes/", ambiguous)                                                                                            | `.github/workflows/ci-native-rd.yml:9` already excludes `!apps/native-rd/prototypes/**`; `.prettierignore` excludes the same tree with a comment "Design-exploration prototype bundles... Preserved as reference, not maintained source, so keep Prettier off the whole tree"; `apps/native-rd/eslint.config.js:43` globally ignores `**/prototypes/**`; `docs/architecture/ci-contract.md:104` documents `prototypes/` as "curated dirs whose contents never affect build/test." The exclusion already exists and is unused — this spike is exactly what it was built for. A root-level `prototypes/` would need brand-new CI wiring the issue doesn't ask for.               |
| D2  | No CI changes required                                                                                                                                                                      | Add a dedicated `ci-prototypes` workflow                                                                                                                      | D1's location is already excluded from lint/type-check/format/test by three independent mechanisms (ESLint global ignore, Prettier ignore, ci-native-rd path filter). `dco.yml` still applies (paths include `apps/native-rd/**` with no prototype exclusion) — DCO sign-off is still required per repo-wide policy. `ci-docs.yml` triggers on the README (`**/*.md`) but its only check, `format:check`, also respects `.prettierignore`, so the README passes trivially.                                                                                                                                                                                                     |
| D3  | Not a Bun workspace member; own standalone `package.json` + `bun.lock` inside `atproto-spike/`, installed via `cd .../atproto-spike && bun install`                                         | Add `apps/native-rd/prototypes/*` to root `workspaces` in `package.json:7-9`                                                                                  | Root workspace globs are `["packages/*", "apps/*"]` — one level deep; a nested dir two levels under `apps/` was never reachable anyway. Making it a member would pull the spike into `bun install` hoisting and `tsc --composite` project references, contradicting D1/D2's "never affects build/test" invariant. `packages/openbadges-core` is the existing precedent for a scoped package.json; a script-only precedent is root `scripts/check-install.ts` (executed directly via `bun scripts/x.ts`, no package.json) — this spike needs its own `package.json` because it needs a dependency (`@atproto/api`) nothing else in the repo has, which `scripts/` doesn't need. |
| D4  | Reuse `packages/openbadges-core/src/crypto/{did-key,signature,key-provider,jwt-proof}.ts` via **relative source import**, not the built `dist/` package                                     | (a) depend on `@rollercoaster-dev/openbadges-core` as a package import relying on root `node_modules` hoisting; (b) reimplement did:key encoding from scratch | `packages/openbadges-core/src/crypto/index.ts:1-5` states the module is "Platform-agnostic — works in Node.js, Bun, and React Native" — it was built for exactly this reuse. `did-key.ts`'s own header says it is "Dependency-free by design," and `signature.ts`/`key-provider.ts`/`node-crypto.adapter.ts` import only `jose` and `openbadges-types` (checked — no `expo-secure-store`/`react-native` imports anywhere in the crypto module). A relative import needs no build step (`dist/` may not exist in a fresh clone) and no workspace-hoisting assumption; option (b) would duplicate ~150 lines of already-reviewed, spec-cited P-256 code for no reason.           |
| D5  | Spike lexicon NSID: `dev.rollercoaster.badge.spike`                                                                                                                                         | Reuse the future real NSID `dev.rollercoaster.badge.credential` from `atproto-evaluation.md`                                                                  | `atproto-evaluation.md` (§"Sketch: what publishing would look like") already establishes the domain convention: `dev.rollercoaster.badge.credential` / `dev.rollercoaster.badge.endorsement`, reverse-DNS under `rollercoaster.dev`, no PDS partnership needed since "the PDS accepts arbitrary third-party collections." Using the real future NSID for throwaway spike data would leave test records indistinguishable from milestone-4 production records on the same collection if the spike PDS/account is ever reused; a distinct `.spike` leaf avoids that ambiguity while following the same reverse-DNS authority.                                                    |
| D6  | Hosted PDS: `bsky.social` (the reference implementation) with a **dedicated test account**, not the author's personal identity                                                              | Self-hosted local PDS via Docker; author's existing Bluesky account if any                                                                                    | ADR-0015 and `atproto-evaluation.md` discuss "a hosted PDS" generically and specifically call out `bsky.social`-style hosted accounts as the case that gates the PLC operation behind email — task 1 asks to "record what the PLC operation actually required," which only a real hosted signup demonstrates. `atproto-evaluation.md` Risk 1 states public records may not be fully erasable even after unpublishing — a dedicated test identity keeps that consequence off any personal/production account, consistent with the issue's own scope-discipline note (no key-management hardening, no production identity).                                                      |
| D7  | ES256 signing via `jose` (same version pin, `6.2.3`, as `packages/openbadges-core/package.json:75`) plus `@atproto/api` for PDS calls, both declared only in the spike's own `package.json` | Add `@atproto/api` to `apps/native-rd/package.json` or root `package.json`                                                                                    | The issue's Notes explicitly rule out app integration. Adding an atproto client to the app's or root's dependency graph would affect Metro bundling / `bun install` at the workspace level even though nothing imports it — D3 already isolates the spike from workspace tooling, so its dependencies stay isolated too.                                                                                                                                                                                                                                                                                                                                                       |
| D8  | Record payload is synthetic fixture badge data, not a real earned badge                                                                                                                     | Publish an actual user badge                                                                                                                                  | Issue scope is "minimal NSID + lexicon for a published badge record" and explicit no-PII discipline elsewhere in the repo (`personal-data-verification.md`); a spike proving mechanics doesn't need real data, and publishing real data to a permanent public record this early is an unforced, irreversible risk the ADR itself flags (Risk 1).                                                                                                                                                                                                                                                                                                                               |
| D9  | No automated tests                                                                                                                                                                          | Add Jest/`bun test` coverage for the script                                                                                                                   | D1/D2 place this entirely outside the CI-covered surface by design (curated, unmaintained-source convention). The issue's acceptance criteria ask for a reproducible commit trail and a documented answer, not test coverage; "size:m" (4-8h) budget and the issue's own scope-discipline note ("if it takes more than a couple of sittings, the finding is the result") argue against spending budget on test scaffolding for throwaway code.                                                                                                                                                                                                                                 |

## Affected Areas

- `apps/native-rd/prototypes/atproto-spike/package.json` (new): standalone package, deps `@atproto/api`, `jose@6.2.3`; scripts `spike` (write+resolve) and `didkey` (did:key-as-issuer experiment)
- `apps/native-rd/prototypes/atproto-spike/.env.example` (new): `PDS_URL`, `PDS_HANDLE`, `PDS_APP_PASSWORD` placeholders — mirrors `apps/native-rd/.env.local.example`'s "copy me, never commit the real file" convention; `.env` at any depth is already covered by root `.gitignore:18` (`.env` pattern, no leading slash, matches anywhere)
- `apps/native-rd/prototypes/atproto-spike/lexicon/dev.rollercoaster.badge.spike.json` (new): minimal record lexicon
- `apps/native-rd/prototypes/atproto-spike/src/writeAndResolve.ts` (new): authenticates (app password), `com.atproto.repo.createRecord`, then `com.atproto.repo.getRecord` back by `at://` URI, logs URI + CID
- `apps/native-rd/prototypes/atproto-spike/src/didKeyIssuer.ts` (new): builds an ES256 keypair + `did:key` via the relative `packages/openbadges-core` imports (D4), signs a minimal VC-JWT credential with that `did:key` as `issuer`, embeds it as the record's payload — proving the record's owning `did:plc` and the credential's `issuer` can differ
- `apps/native-rd/prototypes/atproto-spike/README.md` (new): what works / what's stubbed / did:key answer / what milestone 4 still needs, per issue's Land-it task
- No changes to `apps/native-rd/src/**`, `packages/openbadges-core/src/**`, or any CI workflow — reused only, never modified

## Implementation Plan

### Step 1: Scaffold the isolated spike package

**Files**: `apps/native-rd/prototypes/atproto-spike/package.json`, `.env.example`, `.gitignore` (local, if needed beyond root patterns), `tsconfig.json`
**Commit**: `docs(native-rd): scaffold atproto spike prototype package`
**Changes**:

- [ ] `package.json`: `private: true`, `type: module`, deps `@atproto/api` (latest) + `jose@6.2.3`, scripts `"spike"` and `"didkey"`
- [ ] `.env.example` documenting `PDS_URL` (default `https://bsky.social`), `PDS_HANDLE`, `PDS_APP_PASSWORD` — comment stating these are for a dedicated test identity, never a personal account (D6)
- [ ] Minimal `tsconfig.json` (not referenced from root `tsconfig.json:5`'s `references` array — stays outside the composite project graph per D3)

### Step 2: Define the spike lexicon

**Files**: `apps/native-rd/prototypes/atproto-spike/lexicon/dev.rollercoaster.badge.spike.json`
**Commit**: `docs(native-rd): define minimal dev.rollercoaster.badge.spike lexicon`
**Changes**:

- [ ] Lexicon JSON (`lexicon: 1`, `id: "dev.rollercoaster.badge.spike"`, `defs.main` as a `record` type) carrying: `credential` (the VC-JWT string), `createdAt`, `note`
- [ ] Short comment block in the file (or adjacent README section) explaining this is a spike-only collection distinct from the future `dev.rollercoaster.badge.credential` (D5)

### Step 3: Write-and-resolve script

**Files**: `apps/native-rd/prototypes/atproto-spike/src/writeAndResolve.ts`
**Commit**: `feat(native-rd): write and resolve one atproto record from the spike`
**Changes**:

- [ ] Authenticate against `PDS_URL` with `@atproto/api`'s `AtpAgent` using an app password (documents what a hosted PDS/PLC signup required, per task 1 — this is the point where the email-token step is observed manually before the script can run)
- [ ] `com.atproto.repo.createRecord` into `dev.rollercoaster.badge.spike` with a fixture payload (D8)
- [ ] `com.atproto.repo.getRecord` (or public XRPC read) back by the returned `at://` URI, assert the returned CID matches
- [ ] Print `at://` URI and CID to stdout — this is the artefact the README and reviewers point at

### Step 4: did:key-as-issuer experiment

**Files**: `apps/native-rd/prototypes/atproto-spike/src/didKeyIssuer.ts`
**Commit**: `feat(native-rd): answer ADR-0015's did:key-as-issuer question with a working record`
**Changes**:

- [ ] Generate a P-256 keypair via `packages/openbadges-core`'s `InMemoryKeyProvider`/`NodeCryptoAdapter` (relative import, D4)
- [ ] Derive `did:key` via `encodeP256DidKey` (relative import)
- [ ] Build and sign a minimal VC-JWT credential (`generateJWTProof`, relative import) with `issuer` = the `did:key` — **not** the PDS account's `did:plc`
- [ ] Write that credential as the record payload via the Step 3 script's write path, confirm it still resolves
- [ ] Log the explicit finding: record's repo DID is `did:plc:...`, credential's `issuer` is `did:key:...`, no PLC operation or email token was needed to mint the `did:key` itself — only to host the record

### Step 5: Firehose / feed-visibility check

**Files**: `apps/native-rd/prototypes/atproto-spike/README.md` (findings section), possibly a short `src/observeFirehose.ts` if a live check is feasible within scope
**Commit**: `docs(native-rd): verify firehose propagation and Bluesky-feed absence`
**Changes**:

- [ ] Subscribe briefly to jetstream (or firehose) filtered to the test account/collection after Step 3's write, confirm the commit event appears
- [ ] Confirm (or document the check performed) that the record does not surface in any `app.bsky.*`-indexed Bluesky feed for the test account
- [ ] If a live jetstream check proves out of scope for the time-box, say so plainly in the README per the issue's own scope-discipline note, rather than re-asserting ADR-0015's claim unverified

### Step 6: README — evidence artefact

**Files**: `apps/native-rd/prototypes/atproto-spike/README.md`
**Commit**: `docs(native-rd): write atproto spike README — what works, what's stubbed, what remains`
**Changes**:

- [ ] What works: identity creation cost (email token, rotation-key custody — task 1's actual finding), record write/read round-trip with `at://`/CID, firehose result, feed-absence result
- [ ] What's stubbed: no app integration, no key-management hardening, fixture data only, dedicated test account not tied to a real user
- [ ] Explicit yes/no answer to the `did:key`-as-issuer question with the rotation/recovery cost stated (Acceptance criteria)
- [ ] What milestone 4 (ADR-0015) still has to build: opt-in UX, disclosure review screen integration, real key/DID binding decision, unpublish flow, resolver page
- [ ] Reproduction steps: copy `.env.example`, create a PDS test account, `bun install`, `bun run spike`, `bun run didkey`

## Testing Strategy

- [ ] No automated test suite (D9) — this tree is outside CI's covered surface by design (D1/D2), consistent with existing `apps/native-rd/prototypes/` contents
- [ ] Manual testing: run both scripts against a real hosted PDS test account; the printed `at://` URI + CID _is_ the evidence artefact the README and PR description point reviewers at
- [ ] Manual testing: independently re-run from a second machine/account to confirm reproducibility (Acceptance criteria: "reproducible by a reader")

## Not in Scope

| Item                                                                        | Reason                                                                                                                                                                                | Follow-up                                                                                |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| App integration (UI, disclosure review screen, opt-in flow)                 | Issue Notes explicitly exclude it; that's milestone 4 proper                                                                                                                          | ADR-0015 milestone 4 (tracked separately, e.g. future issue off #601)                    |
| Key-management hardening (rotation, recovery, custody policy)               | Issue Notes explicitly exclude it                                                                                                                                                     | Deferred to milestone 4 design                                                           |
| Custom handle (`*.rollercoaster.dev` via DNS TXT)                           | Adds DNS/domain operational work beyond a write-and-resolve spike; `atproto-evaluation.md` calls a handle service "nice, but scope"                                                   | None — milestone 4 can revisit if a human-meaningful handle matters for launch           |
| Self-hosted PDS                                                             | D6 defaults to `bsky.social` as the reference hosted case the issue asks about                                                                                                        | None planned                                                                             |
| Own AppView / discovery index                                               | ADR-0015 explicitly parks this until after the grant                                                                                                                                  | None — tracked in ADR-0015 itself                                                        |
| Formal lexicon publication via DNS TXT (`_lexicon.badge.rollercoaster.dev`) | Not required to write/read unknown-collection records on a PDS (`atproto-evaluation.md`: "We do not need permission or a partnership to publish `dev.rollercoaster.badge.*` records") | Needed only if the collection becomes a real, externally-consumed lexicon at milestone 4 |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-09-03 11:50] CID check strengthened beyond the plan: `@atproto/lex-cbor`'s `cidForLex` recomputes the record CID locally (DAG-CBOR + sha2-256), so "resolves by CID" is a content-hash check, not a string compare. Verified against `bsky.app`'s public profile record — local CID matches the PDS's.
- [2026-09-03 11:50] Added `src/resolve.ts`, a pure-fetch reader path (handle → DID → PLC doc → PDS → getRecord) with no account and no atproto library. Not in the plan, but it is what "reproducible by a reader" and the milestone-4 verifier page both need.
- [2026-09-03 11:55] Live PDS runs (`spike`, `didkey` step 5, `observe`) blocked on a throwaway bsky.social test account, which only the user can create (email verification). Offline halves verified; README Status table marks the rest "not yet run".
- [2026-09-03 11:55] One `bun test` file (`atUri.test.ts`) added despite D9 — a pure-function seam, runs only inside the spike dir, never in CI.
