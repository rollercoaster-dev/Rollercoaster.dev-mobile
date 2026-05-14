## ADR-0005: Licensing & Trademark Strategy

**Date:** 2026-05-14
**Status:** Accepted
**Owner:** Joe

---

## Context

The repo currently has no LICENSE file and `package.json` declares `private: true`. By default that means **all rights reserved** — nobody but the copyright holder may legally use, modify, or redistribute the code. Before the App Store launch (`docs/launch/app-store-launch-plan.md`), and before any public OSS announcement, a deliberate licensing posture is needed.

The project has **two distinct surfaces** with different strategic value:

1. **Shared foundations** — `packages/openbadges-core`, `packages/design-tokens`. Standards-implementation code (OB3, Ed25519 signing) and design tokens. Wide adoption increases the credibility and reach of Open Badges 3.0 and the design system. Low monetization conflict.
2. **The differentiated product** — `apps/native-rd` and (future) sync server. This is where the moat lives: ND-first design choices, lived experience baked into UX, neo-brutalist visual language, 6 accessibility variants. Direct monetization paths run through here (freemium sync, institutional licensing, consulting — see `docs/launch/app-store-launch-plan.md`).

The stated product vision (`docs/vision/product-vision.md`) commits to _"Open standards, open source. Built on Open Badges 3.0 and W3C Verifiable Credentials. The core libraries are published for anyone to use."_ — but doesn't dictate that the _app_ itself must be permissively licensed.

Strategic constraints (declared by the owner):

- OSI-approved "real open source" status matters as a value, not a marketing point.
- Commercial leverage must be preserved (freemium sync, institutional licensing, consulting all kept open).
- All future paths should remain reachable — no door slammed shut for short-term ideology or short-term protection.

Threats to defend against, in order of likelihood:

1. **App Store impersonators** — repo cloned, slight modifications, shipped under the rollercoaster.dev name to confuse ND users. _Highest probability concrete risk._
2. **Commercial SaaS clone** — a vendor running a paid sync service for rollercoaster.dev users without sharing improvements back.
3. **Monetization erosion** — anyone freely hosting a competing tier, eliminating the freemium-sync revenue path before it can establish.

Threats that are _not_ meaningfully addressable by license choice:

- A different-name competitor building a similar ND-first tracker (no IP protection covers product concepts).
- A solo dev forking for personal use (any OSS license permits this; that's the point).
- Big-co "embrace, extend, extinguish" (only patents or scale can defend against this).

## Decision

Adopt a **per-package licensing posture plus brand trademark**, not a single repo-wide license:

| Component                                       | License                                          | OSI-approved?         | Why                                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/openbadges-core`                      | **Apache-2.0**                                   | Yes (permissive)      | Standards-implementation code. Maximize adoption. Apache (not MIT) for the explicit patent grant — safer for a crypto-adjacent codebase.          |
| `packages/design-tokens`                        | **MIT**                                          | Yes (permissive)      | Design systems travel further when fully permissive.                                                                                              |
| `apps/native-rd`                                | **AGPL-3.0-only**                                | Yes (strong copyleft) | The differentiated product. Forces any commercial clone or competing SaaS to also open-source — preserves leverage without slamming the OSS door. |
| (Future) sync server                            | **AGPL-3.0-only**                                | Yes (strong copyleft) | Specifically defeats the "competitor runs paid sync as proprietary SaaS" scenario.                                                                |
| **Brand** ("Rollercoaster.dev", logo, app name) | **Registered trademark** (EUIPO, classes 9 + 42) | n/a                   | Defends against App Store impersonators _regardless_ of code license.                                                                             |

Operational discipline required to keep "all paths open":

- **Sole-copyright invariant** until further notice. All code in AGPL components must be authored by the owner or accepted under a Contributor License Agreement (CLA) or Developer Certificate of Origin (DCO) sign-off that grants the project the right to relicense. Without this, AGPL is permanent and a future dual-license / commercial-license offering becomes legally impossible.

## Comparison

The realistic candidates for the app component:

| Criterion                                    | MIT / Apache           | **AGPL-3.0**                            | FSL / BSL                          | All-rights-reserved   |
| -------------------------------------------- | ---------------------- | --------------------------------------- | ---------------------------------- | --------------------- |
| OSI-approved "real OSS"                      | ✅                     | ✅                                      | ❌ Source-available                | ❌                    |
| Stops a commercial SaaS clone                | ❌                     | ✅ (forces them to open up)             | ✅ (for 2–4 years)                 | ✅                    |
| Stops an App Store impersonator              | ❌ (trademark needed)  | ❌ (trademark needed)                   | ❌ (trademark needed)              | ❌ (trademark needed) |
| Preserves freemium-sync revenue path         | ⚠️ Anyone can host     | ✅ Hosting fork must open-source        | ✅ Hosting clone is barred         | ✅                    |
| Preserves institutional-license revenue path | ⚠️ Already free        | ✅ Via dual licensing                   | ✅ Via separate commercial license | ✅                    |
| Allows future relicensing to proprietary     | ✅ (if sole copyright) | ✅ (if sole copyright + CLA discipline) | ✅ (if sole copyright)             | ✅                    |
| Community / contributor friendliness         | High                   | Moderate (some corps avoid AGPL)        | Lower (purist pushback)            | None                  |
| Honors the published "open source" vision    | ✅                     | ✅                                      | ⚠️ Technically no                  | ❌                    |

## Rationale

1. **AGPL is the only choice that satisfies all three declared constraints.** It is OSI-approved real open source, it gives meaningful commercial leverage by forcing any competing SaaS to share back, and it keeps every future path open _provided_ the sole-copyright invariant is maintained.

2. **Per-package licensing is normal and correct.** It's the same pattern Sentry, GitLab, and many indie-but-commercial projects use. There's no reason to license a standards-implementation library the same way you license your differentiated product.

3. **Apache-2.0 over MIT for `openbadges-core`.** Both are permissive and OSI-approved. Apache adds an explicit patent grant — meaningfully safer for a crypto/credentials codebase that may touch patentable territory (signing schemes, baking formats).

4. **Trademark is the actual defense against impersonators.** No license choice prevents App Store impersonators; only trademark complaints get them removed. The protection comes from trademark + license, not license alone.

5. **AGPL's reputational cost is overstated for indie consumer apps.** AGPL avoidance is mostly a Big-Tech corporate policy concern. The audience for rollercoaster.dev is ND individuals and institutions — neither cohort meaningfully objects to AGPL.

6. **The 2-year FSL "decay to MIT" feature is genuinely appealing but disqualified.** FSL is source-available, not OSS. Given the explicit "OSI-approved matters" constraint, it's off the table — even though for some indie makers it would be the right answer.

## Consequences

**Positive:**

- Honest alignment with the published product vision ("open standards, open source").
- Trademark + AGPL closes both the impersonator path and the commercial-clone path.
- Foundational packages (`openbadges-core`, `design-tokens`) remain maximally adoptable.
- All declared monetization paths (freemium sync, institutional licensing, consulting) remain available.
- Future dual-licensing for institutions remains possible if the sole-copyright invariant is held.

**Negative / Risks:**

- Some companies forbid AGPL deps in internal policy — limits enterprise adoption of the _app_ code itself (acceptable; the _app_ isn't trying to be a library).
- AGPL is sometimes met with mild community skepticism vs. MIT/Apache, especially from contributors used to permissive licensing.
- Operating under a CLA introduces friction for first-time contributors and is sometimes perceived as corporate.
- Trademark registration costs cash (~€290 DPMA national or ~€850 EUIPO EU-wide) and takes 3–6 months.
- Two licenses in one repo requires care: clear LICENSE files per package and clear top-level explanation.

**Mitigations:**

- Use **DCO sign-off** (`Signed-off-by:` in commits, like Linux kernel) instead of a full CLA. Lower friction, achieves the same legal goal of grant-of-rights.
- Add a top-level `LICENSING.md` that explains the per-package model in plain language, so contributors aren't confused.
- Use **™** immediately on first use of the name (no registration required); register **®** with EUIPO before any meaningful App Store presence — pre-launch if cash allows, post-launch otherwise.
- Run a DPMA + EUIPO prior-art search before filing (free; ~1 hour).

## Implementation Notes

Concrete artifacts required before App Store submission:

1. `LICENSE-APACHE-2.0` in `packages/openbadges-core/` with copyright header.
2. `LICENSE-MIT` in `packages/design-tokens/` with copyright header.
3. `LICENSE-AGPL-3.0` in `apps/native-rd/` with copyright header.
4. Per-package `package.json` `license` field updated:
   - `packages/openbadges-core`: `"license": "Apache-2.0"`
   - `packages/design-tokens`: `"license": "MIT"`
   - `apps/native-rd`: `"license": "AGPL-3.0-only"`
5. Root `package.json` `license` field set to `"SEE LICENSE IN ./LICENSING.md"`. Keep `"private": true` for the root meta-package (it's never published).
6. Top-level `LICENSING.md` explaining the per-package model and the CLA/DCO posture.
7. SPDX headers on source files (optional but recommended; tools like `reuse` automate this).
8. **DCO enforcement** via a GitHub Action that requires `Signed-off-by:` lines on all PRs (or a CLA bot if a full CLA is preferred later).

Pre-trademark steps (before filing):

- DPMA database search: https://register.dpma.de/DPMAregister/marke/ — free, query "Rollercoaster" and adjacent variants in classes 9 and 42.
- EUIPO eSearch: https://www.tmdn.org/tmview/ — same query across EU.
- Decide DPMA-national (~€290, Germany-only) vs. EUIPO-EU (~€850, EU-wide). Recommend EUIPO for any project with App Store distribution.

Trademark filing window:

- Immediate: switch to using **™** on the name and logo in README, marketing, and screenshots. No registration needed for ™ use.
- Pre-launch (if cash allows): file EUIPO application — protection backdates to filing date even if registration completes after launch.
- Hard deadline: file _before_ any organic press, social momentum, or App Store top-list appearance, since trademark squatters monitor those.

## Open Questions

- **Should `openbadges-types` (registry dep, not workspace package) also be Apache-2.0?** Out of scope of this ADR but should be revisited in its own repo.
- **Should the (future) sync server be a separately licensed package, or embedded in `apps/native-rd`?** Defer until the sync server actually exists.
- **gUG / dual structure for donations** — orthogonal to licensing. Tracked in `docs/launch/app-store-launch-plan.md`.

## Related Documents

- [Product Vision](../vision/product-vision.md) — declares "open standards, open source" principle
- [App Store Launch Plan](../launch/app-store-launch-plan.md) — declares monetization options
- [ADR-0003: Sync Layer Decision](./ADR-0003-sync-layer-decision.md) — Evolu is MIT, no license conflict with downstream AGPL
- DPMA: https://www.dpma.de
- EUIPO: https://euipo.europa.eu
- AGPLv3 text: https://www.gnu.org/licenses/agpl-3.0.en.html
- Apache-2.0 text: https://www.apache.org/licenses/LICENSE-2.0
- DCO: https://developercertificate.org/

---

_Accepted 2026-05-14. Open where openness compounds; protective where leverage lives; trademarked where confusion would hurt the people we're building for._
