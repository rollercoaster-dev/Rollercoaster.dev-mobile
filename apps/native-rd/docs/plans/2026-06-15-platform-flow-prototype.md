# Platform-Flow Prototype — Import → Earn → Share → Validate

**Status:** Draft
**Date:** 2026-06-15
**Owner:** Joe
**Goal:** A thin horizontal slice through the whole platform — import an external badge opportunity, earn a local badge from it, share it as a link, and have an outside person validate the badge + evidence in a browser. A learning spike to de-risk the two scariest unknowns before deciding whether to keep deepening Iteration B.

---

## Why this, why now

Iteration A is ~90% done and Iteration B planning has started, but the open question is whether B (vertical: step model, sync, multi-goal) is the right next layer — or whether the platform's end-to-end value (badges that come from the outside world and get validated by the outside world) should be proven first.

This prototype answers two unknowns that no amount of vertical B work touches:

1. **Does real-world import work?** Can we pull badge opportunities from badges in the wild and turn them into local goals?
2. **Does external validation work?** Can someone who does _not_ have the app open a link, see the evidence + badge, and get a verification result that means something to them?

It is **explicitly a horizontal spike, not an Iteration B deliverable.** It deliberately crosses iteration boundaries (import is pre-D research, hosted link is B, the verifier is D-flavored). The ADR model — each iteration ships as a complete product ([ADR-0001](../decisions/ADR-0001-iteration-strategy.md), [ADR-0006](../decisions/ADR-0006-iteration-b-scope-amendment.md)) — still holds; this slice is a throwaway-grade learning artifact that runs alongside it, not a release.

---

## The crux: in-app vs. web

- **Import + earn are fully in-app.** No backend of ours involved — import is just an HTTP fetch + parser.
- **Share + validate need a web surface**, because the validator is — by definition — someone _not running the app_. A mentor/librarian/employer opens a link in a desktop browser. That can't live inside React Native.

Decision (2026-06-15): the prototype validator is an **outside person via web**. So the prototype includes a minimal web platform — the prototype-grade ancestor of the `badges.rollercoaster.dev/v/<id>` service already specced in [sync-and-backend-architecture.md](../research/sync-and-backend-architecture.md).

---

## Scope

### In the app (React Native)

1. **Import Badge Opportunity** — paste a Badgr `.json` / OB2 `BadgeClass` URL → one adapter normalizes it → preview → seed a goal draft with source attribution.
   - v1 supports **OB2 `BadgeClass` + Badgr `.json` fallback only** (highest viability, least work per [openbadges-external-earning-research.md](../research/openbadges-external-earning-research.md)). Credly scraping and OB3 `Achievement` input are out of scope for the spike.
   - New schema: `importedBadgeOpportunity` record + `goal.importedOpportunityId`.
   - Trust language rule: "created from / aligned to / inspired by" — never "issuer X awarded this."
2. **Earn** — existing core loop; issue the local OB3 badge carrying a `sourceOpportunityId` back-reference. (Only new work here is the back-ref field.)
3. **Share** — new action: POST the signed credential + evidence summaries to the web service, receive a token link, surface it in the share sheet.

### The web platform (new, deliberately tiny)

- One upload endpoint → object storage (R2/S3).
- One token-gated fetch route at `/v/<id>`.
- One static verifier page: renders badge image + evidence + a result line (**Signature verified / Self-signed**), running the OB3 check in-browser against the `eddsa-raw-json-iteration-a` proof.

Could be a single small worker/serverless function + a static page. **No Evolu sync, no E2E encryption, no accounts** for the spike — plaintext credential behind an unguessable token, test data only, URL not promoted.

---

## New work vs. reused

| Piece        | New                                                                       | Reused                                  |
| ------------ | ------------------------------------------------------------------------- | --------------------------------------- |
| Import       | 1 OB2/Badgr adapter, normalize, preview, goal-draft seed, 2 schema fields | Goal creation, badge designer           |
| Earn         | `sourceOpportunityId` back-ref only                                       | Entire core loop                        |
| Share        | Upload call + link UI                                                     | Credential building, signing            |
| Web verifier | Endpoint + storage + 1 page + in-browser OB3 check                        | Proof format, `png-baking` unbake logic |

---

## Caveats (do not paper over)

- **Signing gap.** Standard OB3 validators will _reject_ `eddsa-raw-json-iteration-a`. Only _our_ verifier page accepts the proof until the `eddsa-rdfc-2022` upgrade lands (deferred to Iteration D; 6 gaps in [ob3-compliance-status.md](../architecture/ob3-compliance-status.md)). Don't claim "verifiable by any OB3 tool."
- **Throwaway privacy.** The real model is local-first + E2E encrypted + revocable token links. The spike skips all of it. Test data only.
- **Iteration boundary.** This is a spike, not B. Findings feed the B-vs-platform-flow decision; they don't become the B release as-is.

---

## Open questions / follow-ups

- Where does imported opportunity data live — on the goal, a separate table, or both? (Research leans separate table + FK.)
- Imported badge images: copy locally, hotlink, or convert to a design seed?
- Token model for the shared link — URL token vs. server allowlist (matches an open question in the backend research).
- What's the smallest deployable for the web piece (Cloudflare Worker + R2? serverless fn + S3?) — pick before building stage 3–4.

---

_Draft 2026-06-15. Horizontal spike — prove the platform loop end-to-end before deepening B vertically._
