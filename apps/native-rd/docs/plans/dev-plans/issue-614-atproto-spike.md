# Development Plan: Issue #614

## Issue Summary

**Title**: [Spike] Write and resolve an atproto record — evidence we can build milestone 4
**Type**: research (spike, code + evidence artefact)
**Complexity**: MEDIUM
**Estimated Lines**: ~500-600 lines total, heavily documentation-weighted (README/evidence prose is most of it; the scripts themselves are ~350 lines of TypeScript)

## Intent Verification

- [ ] `spikes/atproto-badge/README.md` documents an atproto identity created against a hosted PDS, including what the PLC operation actually required (email token, rotation key custody) — as prose, not a checkbox
- [ ] Running `bun run publish` in `spikes/atproto-badge/` writes a `dev.rollercoaster.badge.credential` record to the PDS and prints its `at://` URI and CID; running `bun run resolve <at-uri>` reads the same record back and the returned CID matches
- [ ] The README states, with evidence (a firehose/jetstream capture or equivalent log excerpt), whether the record propagated to the firehose, and separately confirms via the public Bluesky AppView API that the record does **not** appear in any feed
- [ ] The README answers, explicitly yes or no, whether a correctly encoded `did:key` can remain the credential issuer while atproto only hosts the record (no PLC verificationMethod operation, no email token, no custodial rotation key) — with the cost (no rotation, no recovery) stated in the same paragraph, not deferred to a caveat
- [ ] `spikes/atproto-badge/README.md` has a "What works / what is stubbed / what milestone 4 still has to build" section naming concrete gaps (OAuth vs. app-password auth, PLC-vs-did:key issuer choice, blob upload for the baked PNG, no UI)
- [ ] `bun install` and `bun run type-check` at the repo root are unaffected by the spike directory's presence (no new workspace member, no root `bun.lock` diff beyond this plan's own doc edits)
- [ ] No secret (PDS password, email, session token) is committed; only public identifiers (handle, DID, AT-URI, CID) appear in the repo

## Dependencies

| Issue    | Title                                                              | Status                      | Type                                                                            |
| -------- | ------------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------- |
| #606     | (funded milestone 4: public badges to the user's own atproto repo) | 🟢 Open                     | Informational — this spike is explicitly _not_ that deliverable, it de-risks it |
| ADR-0015 | Funded scope — pull verification and sharing forward               | Proposed (not yet Accepted) | Informational — this spike answers one of its open questions                    |

**Status**: ✅ All dependencies met. No `Blocked by` / `Depends on` / `After` markers in the issue body — only "Relates to" links to ADR-0015 and the jury-fit analysis, both informational context, not task prerequisites. `has_blockers = false`.

## Objective

Produce a small, isolated, public code artefact that writes one signed badge-shaped record to a real atproto PDS, reads it back and confirms resolution by AT-URI and CID, checks firehose propagation and Bluesky-feed absence, and answers ADR-0015's open `did:key`-vs-`did:plc` question with evidence — landed in a location that cannot be mistaken for `apps/native-rd/prototypes/` (design exploration) and cannot be swept into the app's typecheck/lint/test/build.

This is evidence for the Prototype Fund application's Realisierbarkeit criterion (jury members Robert and Marx specifically), not a step toward shipping milestone 4. Scope discipline per the issue: no app integration, no UI, no key-management hardening. If it runs long, the README says so honestly.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Alternatives Considered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Spike lands at repo-root `spikes/atproto-badge/`, not `apps/native-rd/prototypes/` and not a bare root `prototypes/`                                                                                                                                                                                                                                                                                                                                                                                                       | (a) `apps/native-rd/prototypes/` — that path is 95 files of design `.dc.html` explorations, documented as design provenance by issue #611; a code spike there reads as clutter or gets deleted in a design cleanup. (b) bare root `prototypes/` (issue's literal wording) — collides in meaning with the existing app-level `prototypes/` folder even though the paths differ; a jury reader or future contributor sees two "prototypes" dirs with unrelated contents. (c) `packages/atproto-spike` as a real workspace package — rejected, see D2. | `spikes/` at repo root is immediately visible from the repo root (README lists it), unambiguous next to `apps/` and `packages/`, and matches this repo's existing vocabulary of "spike" for throwaway research (`evolu-step-model-feasibility-spike.md`, `hermes-intl-spike-66-findings.md` under `apps/native-rd/docs/research/`) without colliding with the design-prototypes name                                                                                                                                                                                                                                                                                                                                                                                           |
| D2  | `spikes/atproto-badge/` is **not** added to root `package.json` `workspaces` (`["packages/*", "apps/*"]`, `package.json:8-9`) and gets its own `package.json` + isolated `bun.lock`, installed independently (`cd spikes/atproto-badge && bun install`)                                                                                                                                                                                                                                                                    | Making it a real workspace member under `packages/atproto-spike`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | A `packages/*` member is swept by `ci-packages.yml`'s `paths: ["packages/**", ...]` trigger (`.github/workflows/ci-packages.yml:5-14`) and by `bun run turbo lint/type-check/test` at the root, which the issue explicitly says the spike must avoid (constraint a). A directory outside both `apps/*` and `packages/*` globs is invisible to bun's workspace resolution, to `turbo` (which only discovers declared workspace members, `turbo.json`), and to `scripts/check-install.ts` / `scripts/check-patches.ts`, both of which only walk `apps/` and `packages/` (`scripts/check-install.ts:28`, `scripts/check-patches.ts:39`). Root `bun install --frozen-lockfile` therefore never touches it and the isolated `@atproto/api` dependency never reaches root `bun.lock` |
| D3  | CI path filters need **no changes** for isolation                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Adding an explicit exclusion to `ci-native-rd.yml` / `ci-packages.yml`                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Neither workflow's `paths` trigger matches `spikes/**` today (`ci-native-rd.yml:6-16` lists `apps/native-rd/**`, `packages/design-tokens/**`, `packages/openbadges-core/**`, plus root config files; `ci-packages.yml:5-14` lists `packages/**`); a new top-level dir is simply outside both. No CI job runs against the spike at all — validation is the manual steps the README documents, matching "evidence artefact first" scope                                                                                                                                                                                                                                                                                                                                          |
| D4  | Root `format:check` (`bunx prettier --check "**/*.{ts,tsx,js,jsx,json,md}"`, `package.json:19`) **does** sweep the spike's `.ts`/`.json`/`.md` files, since it is a repo-wide glob and the spike is tracked (not gitignored). Handle by keeping spike source Prettier-clean rather than adding a `.prettierignore` entry                                                                                                                                                                                                   | Add `spikes/atproto-badge/` to `.prettierignore`, mirroring the `apps/native-rd/prototypes/` entry                                                                                                                                                                                                                                                                                                                                                                                                                                                  | The prototypes entry is excluded because it is generated/as-received handoff material never meant to be edited (`.prettierignore:16-20`). This spike's code and README are original, reviewed content and are the evidence artefact — keeping them Prettier-clean is cheap (small file count) and keeps them legible rather than quietly opted out of the docs format gate. The isolated `bun.lock` needs no entry: its extension isn't in the checked glob, and `node_modules/` is already globally gitignored (`.gitignore:2`)                                                                                                                                                                                                                                               |
| D5  | Auth to the PDS from the scripts uses an **app password** via `AtpAgent.login({identifier, password})`, not the OAuth flow ADR-0015 describes for the shipped app                                                                                                                                                                                                                                                                                                                                                          | Implement the RN OAuth client (`@aquareum/atproto-oauth-client-react-native`) referenced in `atproto-evaluation.md`                                                                                                                                                                                                                                                                                                                                                                                                                                 | App passwords are the standard atproto pattern for scripts/bots (not end-user apps) and are the minimum needed to answer this spike's questions. OAuth client integration is real app work, explicitly out of scope ("no app integration, no UI") and already deferred to milestone 4 proper                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D6  | Reuse `@rollercoaster-dev/openbadges-core`'s crypto module (`signData`, `createDataIntegrityProof`, `KeyType`, `Cryptosuite` — `packages/openbadges-core/src/crypto/index.ts`) for signing, via a `file:../../packages/openbadges-core` dependency against its **built** `dist/` (package `exports` map points at `dist/index.js`/`dist/index.cjs`, `packages/openbadges-core/package.json:9-24`). Do **not** reuse `credentialBuilder.ts`'s `buildCredential`/`serializeOB3` pipeline or its `did:key` construction as-is | (a) Stub all signing locally with no reuse. (b) Reuse the full credential-builder pipeline unmodified                                                                                                                                                                                                                                                                                                                                                                                                                                               | `credentialBuilder.ts:51-56` is exactly gap #7 in `ob3-compliance-status.md` — its `did:key` uses raw base64url, not multibase+multicodec, and does not resolve. That fix belongs to the OB3 punch-list PR (ADR-0015 milestone 1), not this spike. The spike writes its own small, correctly-encoded `did:key` helper (documented as adapted from the gap #7 write-up) so the `did:key`-only question (see below) can be answered honestly, while still reusing the real Ed25519 signing/proof code rather than faking it                                                                                                                                                                                                                                                      |
| D7  | License the spike directory **Apache-2.0**, stated in its own README, not inherited silently from the AGPL app                                                                                                                                                                                                                                                                                                                                                                                                             | Leave unlicensed / assume AGPL like `apps/native-rd`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `LICENSING.md`'s table licenses `packages/openbadges-core` (the code this spike reuses) as Apache-2.0 "standards-implementation code, permissive" (`LICENSING.md:8`); the spike is the same category of code (protocol/standards exercise, not the differentiated product), and root `package.json` itself is explicitly unlicensed private meta-package (`LICENSING.md:15`) so nothing is inherited by default — it must be stated                                                                                                                                                                                                                                                                                                                                            |
| D8  | Commit scope for these commits is `(spike)`, not `(native-rd)`                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Use `(native-rd)` scope like most recent commits                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | The spike touches no `apps/native-rd` code; recent history's scope convention tracks the touched area (`native-rd`, `main`, `e2e`), and `(spike)` is the honest area name here                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## Affected Areas

- `spikes/atproto-badge/package.json`, `bun.lock`, `.env.example`, `tsconfig.json`: new, isolated package (not a workspace member)
- `spikes/atproto-badge/lexicons/dev.rollercoaster.badge.credential.json`: new minimal NSID lexicon
- `spikes/atproto-badge/src/did-key.ts`: new — correct multibase (`z…`) + multicodec (`0xed01`) Ed25519 `did:key` encoder
- `spikes/atproto-badge/src/build-credential.ts`: new — minimal OB3-shaped credential using `openbadges-core` crypto + the local `did:key` fix
- `spikes/atproto-badge/src/publish.ts`: new — `com.atproto.repo.putRecord` script
- `spikes/atproto-badge/src/resolve.ts`: new — `com.atproto.repo.getRecord` by AT-URI, CID confirmation
- `spikes/atproto-badge/src/check-propagation.ts`: new — jetstream/firehose subscription check + Bluesky AppView absence check
- `spikes/atproto-badge/src/did-key-only-experiment.ts`: new — publishes a credential whose issuer is `did:key` without ever adding it as a PLC verificationMethod; verifies it still resolves/verifies standalone
- `spikes/atproto-badge/evidence/*.json`: new — captured, redacted sample outputs (uri/cid/record, resolve confirmation, propagation log excerpt)
- `spikes/atproto-badge/README.md`: new — the evidence write-up (this is the actual jury-facing deliverable)
- `README.md` (repo root): add one row to the "Layout" table pointing at `spikes/`
- `apps/native-rd/docs/decisions/ADR-0015-funded-scope-prototype-fund.md`: answer the open `did:key`-only question under "Identity and email" with a link to the spike's finding
- `apps/native-rd/docs/research/atproto-evaluation.md`: mark the corresponding "Open questions" bullet resolved, link to the spike

## Implementation Plan

### Step 1: Scaffold the isolated spike workspace

**Files**: `spikes/atproto-badge/package.json`, `spikes/atproto-badge/tsconfig.json`, `spikes/atproto-badge/.env.example`, `spikes/atproto-badge/README.md` (skeleton only), `README.md` (root, Layout table row)
**Commit**: `docs(spike): scaffold isolated atproto spike workspace at spikes/atproto-badge`
**Changes**:

- [x] `package.json`: `"private": true`, `@atproto/api` dependency, `file:../../packages/openbadges-core` dependency, scripts (`publish`, `resolve`, `check-propagation`, `did-key-only`)
- [x] `.env.example` with placeholders (`PDS_URL`, `HANDLE`, `APP_PASSWORD`) and a comment that real values are never committed (`.env` already globally gitignored, `.gitignore:14`)
- [x] README skeleton with section headings only (filled in Step 5)
- [x] Root `README.md` Layout table: one line, `spikes/  Throwaway research code — not a workspace member, not built/linted/tested by CI (see spikes/atproto-badge/README.md)`
- [x] Run `cd packages/openbadges-core && bun run build` once, confirm `dist/` exists, then `cd spikes/atproto-badge && bun install`, confirm root `bun.lock` has no diff

### Step 2: Correct `did:key` encoding + minimal lexicon + credential builder

**Files**: `spikes/atproto-badge/lexicons/dev.rollercoaster.badge.credential.json`, `spikes/atproto-badge/src/did-key.ts`, `spikes/atproto-badge/src/build-credential.ts`
**Commit**: `feat(spike): correct did:key encoding + minimal badge credential lexicon`
**Changes**:

- [x] `dev.rollercoaster.badge.credential` lexicon per the sketch in `atproto-evaluation.md` (`credential` VC blob + PNG blob ref)
- [x] `did-key.ts`: multibase `z…` + multicodec `0xed01` Ed25519 encoding, with a comment citing `ob3-compliance-status.md` gap #7 as the bug this corrects
- [x] `build-credential.ts`: minimal OB3-shaped VC using `signData`/`createDataIntegrityProof` from `@rollercoaster-dev/openbadges-core`, issuer set via the local `did-key.ts`, not `credentialBuilder.ts`

### Step 3: Publish and resolve scripts

**Files**: `spikes/atproto-badge/src/publish.ts`, `spikes/atproto-badge/src/resolve.ts`, `spikes/atproto-badge/evidence/publish-output.json`, `spikes/atproto-badge/evidence/resolve-output.json`
**Commit**: `feat(spike): publish and resolve a badge record via a hosted PDS`
**Changes**:

- [x] `publish.ts`: `AtpAgent.login` (app password), `com.atproto.repo.putRecord` with the credential from Step 2, print AT-URI + CID
- [x] `resolve.ts`: `com.atproto.repo.getRecord` given an AT-URI, print + diff the returned CID against the one from publish
- [ ] Run both against a real PDS (manual, one-time identity creation happens here — see Step 5 note); capture redacted JSON output as evidence

### Step 4: Firehose/jetstream propagation + did:key-only experiment

**Files**: `spikes/atproto-badge/src/check-propagation.ts`, `spikes/atproto-badge/src/did-key-only-experiment.ts`, `spikes/atproto-badge/evidence/propagation-log-excerpt.json`
**Commit**: `feat(spike): verify firehose propagation, Bluesky-feed absence, and the did:key-only path`
**Changes**:

- [ ] `check-propagation.ts`: subscribe to jetstream (or the relay firehose) filtered to the test DID, confirm the commit for our NSID appears; separately query the public Bluesky AppView API for the same DID's feed and confirm the record is absent
- [ ] `did-key-only-experiment.ts`: publish a second record whose credential issuer is the `did:key` from Step 2, **without** ever calling `com.atproto.identity.signPlcOperation` to add it as a verificationMethod; independently verify the credential's signature by resolving the bare `did:key` (no network), confirming atproto's role here is transport-only
- [ ] Record findings for both in evidence files

### Step 5: Write up findings — the actual deliverable

**Files**: `spikes/atproto-badge/README.md` (finalize), `apps/native-rd/docs/decisions/ADR-0015-funded-scope-prototype-fund.md`, `apps/native-rd/docs/research/atproto-evaluation.md`
**Commit**: `docs(spike): write up atproto spike findings — what works, what's stubbed, what milestone 4 still needs`
**Changes**:

- [ ] README: identity creation walkthrough (manual step — which PDS, what the PLC operation asked for, email token, rotation key custody as experienced, not just cited)
- [ ] README: "What works / what is stubbed / what milestone 4 still has to build" section
- [ ] README: explicit yes/no answer to the `did:key`-only question, with the rotation/recovery cost stated plainly
- [ ] README: license line (Apache-2.0, per D7)
- [ ] ADR-0015: under "Identity and email", replace "Decide before milestone 4" with the answer + link to `spikes/atproto-badge/README.md`
- [ ] `atproto-evaluation.md`: mark the `did:key`-only open question resolved, link to the spike

## Testing Strategy

- [ ] Not applicable in the Jest sense — this is a spike, not app code, and is deliberately outside `turbo test`
- [ ] Manual verification: `bun run publish` then `bun run resolve <at-uri>` against the real PDS produces matching CIDs; `bun run check-propagation` shows the commit on jetstream and confirms absence from the AppView feed
- [ ] Manual verification: `bun install` at repo root produces no diff to root `bun.lock`; `bun run type-check` / `bun run lint` / `bun run test` at repo root are unaffected (confirms D2/D3)
- [ ] Manual verification: `bun run format:check` at repo root passes with the new files included (confirms D4)
- [ ] Manual review: no secret values appear in any committed file (`.env.example` only, evidence JSON redacted)

## Not in Scope

| Item                                                                          | Reason                                                                                                                                    | Follow-up                           |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| App integration (wiring publish into the real app, UI, SecureStore key reuse) | Explicit scope discipline in the issue; this is milestone 4, not this spike                                                               | #606                                |
| RN OAuth client integration                                                   | Real app work; app-password auth is sufficient to answer the spike's questions (D5)                                                       | #606                                |
| Key-management hardening (rotation keys, recovery flows)                      | Explicit scope discipline in the issue                                                                                                    | #606                                |
| Fixing OB3 gap #7 in `credentialBuilder.ts` itself                            | Belongs to the OB3 punch-list PR (ADR-0015 milestone 1); this spike only needs a local, documented-as-such fix to answer its own question | milestones 1/#595-#600              |
| Running our own AppView / discovery index                                     | Parked in ADR-0015 until after the grant                                                                                                  | none (ADR-0015 already defers this) |
| Handle service (`<name>.rollercoaster.dev`)                                   | Speculative, noted as "nice, but scope" in `atproto-evaluation.md`                                                                        | none                                |

## Open Questions

Resolved by the user 2026-08-25. Recorded here as decisions; nothing outstanding.

| ID  | Question                                                                         | Answer                                                                                                                                         | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D9  | Which hosted PDS, under whose account?                                           | A **burner account on `bsky.social`**, created for this spike only. Not a `rollercoaster.dev`-owned handle.                                    | A project-owned handle means DNS handle verification plus a long-lived public identity to maintain, for what the issue explicitly calls a throwaway spike. A burner costs nothing if it becomes permanently public, and still exercises the hosted-PDS path (PLC operation, email token, custodial rotation key) that Risk 4 in [`atproto-evaluation.md`](../../research/atproto-evaluation.md) is about. The handle service is already out of scope above. |
| D10 | Must the spike identity be separate from any personal Bluesky account?           | **Yes, entirely separate.** No reuse of, and no link to, any personal account.                                                                 | Risk 2 (correlation) in [`atproto-evaluation.md`](../../research/atproto-evaluation.md) is the reason the shipped product would keep publishing identity separate from a personal account. Doing it here demonstrates the mitigation rather than citing it, and costs nothing.                                                                                                                                                                              |
| D11 | Do real identifiers (DID, handle, AT-URI, CID) get committed to the public repo? | **Yes, real and unredacted** — in `README.md` and the `evidence/*.json` captures. Secrets (app password, email) never do; `.env.example` only. | The acceptance criterion is "reproducible by a reader" — a redacted AT-URI cannot be resolved and guts the evidence. Risk 1 (records are not reliably un-publishable) applies, which is precisely why D9/D10 put a burner behind it. The README states plainly that these identifiers are permanent and that this was a deliberate choice.                                                                                                                  |

## Discovery Log

- [2026-08-25] **D6 file reference in the plan was wrong.** The plan cited
  `packages/openbadges-core/src/credentials/credentialBuilder.ts:51-56` as the source of
  OB3 gap #7. There is no `did:key` construction in `openbadges-core` at all
  (`grep -rn "did:key" packages/openbadges-core/src` → no matches). The actual gap-#7 code
  is `apps/native-rd/src/badges/credentialBuilder.ts:52-64` (`buildDid`, returns
  `did:key:${publicKeyJwk.x}`). D6 is otherwise unchanged: the spike still reuses
  `openbadges-core`'s crypto module and still writes its own corrected encoder.
- [2026-08-25] **Existing precedent found for the corrected encoding's shape.**
  `apps/native-rd/scripts/verify-badge.ts:62-75` already distinguishes the Iteration-A form
  from a spec-compliant `did:key:z…`, and `:241-252` asserts gap #7 against it. The spike's
  encoder should produce something that script's `gap7.didKeyMultibase` check passes.
- [2026-08-25] `@atproto/api` pinned to `^0.20.41`, not the `^0.13.35` bun first resolved —
  a spike used as current evidence should be on the current client.
- [2026-08-25] D2 isolation verified empirically: `bun install` at the repo root after
  scaffolding reports "no changes" and leaves `bun.lock` with an empty `git status`.

- [2026-08-25] `did-key.ts` verified against the did:key method spec's own Ed25519 test
  vector (`did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK`) — decode/encode
  round-trips to the identical string. Also round-trips freshly generated keys and
  satisfies the `did:key:z` assertion in `apps/native-rd/scripts/verify-badge.ts:245`.
- [2026-08-25] **New decision D12: the spike's proof is labelled
  `eddsa-raw-json-iteration-a`, not `eddsa-rdfc-2022`.** The plan did not specify. Real
  `eddsa-rdfc-2022` needs RDFC-1.0 canonicalization, which is gap #5 and belongs to #598.
  `apps/native-rd/src/hooks/useCreateBadge.ts:264` already sets this precedent of naming
  the non-standard suite honestly rather than claiming compliance. None of the spike's
  four questions depend on the cryptosuite being final, and overclaiming would weaken
  the evidence.
- [2026-08-25] **Question 4 is already answerable offline, before any PDS involvement.**
  A credential signed with a spec-compliant `did:key` issuer verifies using only the
  public key recovered from the DID string — no network, no PLC directory. Confirmed by
  round-tripping through `decodeDidKey` into `verifySignature`. What remains is to show
  the record still resolves when atproto hosts it without a PLC verificationMethod.

- [2026-08-25] Step 3 split: the **scripts** are written, type-check, and their guard
  paths are smoke-tested (missing env, missing/malformed AT-URI all fail with a usable
  message). **Running them is blocked** on a burner bsky.social account — creating one
  needs email verification and a CAPTCHA, which is a human step. Evidence files
  (`evidence/publish-output.json`, `evidence/resolve-output.json`) land once it exists.
- [2026-08-25] Added `src/session.ts`, not in the plan's file list: `readEnv`, `login`
  and `writeEvidence` are needed by all four scripts and duplicating them four times
  would be worse. Small and unexported outside the spike.

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
