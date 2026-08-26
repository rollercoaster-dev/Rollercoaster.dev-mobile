# Prototype Fund — requirements & our fit

Researched 2026-08-23 against prototypefund.de (Jahrgang 03 pages, live). FAQ page is
partly stale vs. the new three-line structure; the Förderlinien comparison page wins.

## Program shape (Jahrgang 03)

- Application window **01.10.2026 – 30.11.2026**. Selection Dec–Feb, formal BMFTR
  application end of Feb 2027, funding **01.06.2027 – 30.11.2027**, Second Stage
  01.12.2027 – 31.03.2028. Applications only in that window, DE or EN.
- Money: **€47,500 solo / €95,000 team** for 6 months (= 950 h resp. 1900 h @ €50/h).
  Second Stage adds **€31,667 / €63,333** (4 months, €50/h hard cap).
  Higher hourly rate only if past freelance invoices prove it, with fewer hours.
- Grant ≤ **95 %** of project budget; ≥5 % own contribution = your unpaid time, proven
  via other income or a bank statement.
- Payout quarterly in arrears. Overheads: flat 5 % of personnel costs.
- Three funding lines, same money/dates:
  | | Innovation | Up and Coming | Resilienz |
  |---|---|---|---|
  | Focus | Datensicherheit + Software-Infrastruktur | same | decentralised/FOSS alternatives to Big Tech |
  | Must be innovative | yes | yes | not necessarily |
  | Dev share of hours | ~80 % | ~80 % | ~50 % |
  | Second Stage application | optional | optional | **mandatory** |
  | Extra bar | — | ≤25 y/o at 01.06 or in CS study/training | must be anchored in a community |
  | Slots/year | up to 30 | — | up to 10 |

## Hard formal requirements

- Natural person(s), 18+. **No companies, e. V., institutions, universities.** Team ≤ 4
  people → must found a **GbR** (only that legal form) after selection.
- Solo applicant: **residence in Germany**, **self-employed/freelance, taxed in Germany** —
  _or_ (partially) released by your employer for the project period, i.e. you may stay
  part-time employed. (Resilienz line page states residency only; FAQ still states the
  self-employed/Freistellung rule — treat it as binding.)
- FOSS license mandatory, code in a public repo; proprietary license disqualifies.
- **Vibe coding is not fundable.** Outsourcing implementation to third parties _or to
  machines_ is inadmissible. From Jahrgang 03 a **GitHub/GitLab/Codeberg account is a
  mandatory application field** — the jury inspects it as proof you can build the thing.
  AI tools during the funding period are allowed; you own the quality of the output.
- No double funding: the core idea must not already be funded elsewhere, and a similar
  open-source product must not already exist.
- Existing projects are allowed **if** the funded work is a clearly delimited,
  self-contained increment (e.g. a new module).
- Mandatory dates in Berlin (travel reimbursed): kick-off ~01.06.2027, Demo Day
  ~30.11.2027, Second Stage final workshop ~30.03.2028. Plus digital check-ins,
  a public final report, and a sustainability interview ~1 year later.
- On selection: Vorhabenbeschreibung, **De-minimis declaration**, bank statement showing
  at least the own-contribution balance; teams add GbR contract, tax number, addresses,
  possibly SCHUFA.
- Legal basis is the BMBF/BMFTR **Richtlinie "Software Sprint"** of 7 Nov 2024 (§§ 23, 44 BHO;
  AZA/AZK). It funds as a **Zuschuss auf Kostenbasis (AZK)** — a grant, not a loan. The
  **Änderungsbekanntmachung of 25 Jun 2026** widened the subject matter to three areas —
  Datensicherheit, Softwarebausteine für Innovationen, and **souveräne Software für
  Endnutzer\*innen** — made the calls themenoffen, set submission dates of 30 Nov through
  2029, and extended the Geltungsdauer to 30 Jun 2031. The Richtlinie also states applicants
  are **"ausschließlich selbstständige Programmierinnen und Programmierer"**, so
  self-employment sits in the legal basis, not only in the FAQ.
- Application is a form: title, description, societal problem, technical approach, prior
  state + planned new work, similar approaches & differentiation, target group + how you
  reach it, milestones, team, past software projects + repo links, total hours, Second
  Stage yes/no (irreversible).

## Where Rollercoaster.dev stands

| Requirement                                   | Status                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Software project, public repo                 | ✅ `rollercoaster-dev/Rollercoaster.dev-mobile` is public                                                                                                                                                                                                                                                           |
| FOSS license                                  | ✅ AGPL-3.0 (app), Apache-2.0 (openbadges-core), MIT (design-tokens); trademark reservation and DCO/dual-license intent are compatible — code stays open                                                                                                                                                            |
| Natural person, 18+, sole copyright           | ✅ (apply personally, never as a Rollercoaster.dev entity)                                                                                                                                                                                                                                                          |
| Residence + tax in Germany                    | ⚠️ assumed yes — confirm                                                                                                                                                                                                                                                                                            |
| Self-employed / freelance / employer release  | ❌ **biggest blocker.** 950 h in 6 months ≈ full time; you'd need partial Freistellung from the current employer for Jun–Nov 2027, or freelance status. Arbeitsschutz caps hours if you stay part-time employed                                                                                                     |
| Fits a funding focus                          | ⚠️ **improved as of 25 Jun 2026.** The Richtlinie amendment added "souveräne Software für Endnutzer\*innen" as an explicit subject and made calls themenoffen, so an end-user app is no longer outside the legal basis. The Resilienz line is the vehicle. Innovation's two focus areas still read developer-facing |
| Delimited new increment                       | ⚠️ 595 commits of prior work; needs a carved-out module for the funding period                                                                                                                                                                                                                                      |
| Not a duplicate of existing OSS               | ⚠️ must survey badge tooling (Badgr/Open Badge Factory, openbadges-ui) and habit/goal trackers — and address your own predecessor repos (`openbadges-monorepo`, `openbadges-system`, `openbadges-modular-server`), which read as "similar OSS already exists" unless framed as prior art you're extending           |
| Community anchoring / users                   | ❌ 0 stars, solo, no user base or community evidence — fatal for Resilienz, weak for reach/impact scoring anywhere                                                                                                                                                                                                  |
| Dev competence evidence                       | ✅ repo history, but note the vibe-coding rule: a repo full of agent-authored commits invites the question. Be ready to own the architecture in the interview/application                                                                                                                                           |
| 5 % own contribution (~€2.5k liquidity proof) | ⚠️ trivial but needs a bank statement                                                                                                                                                                                                                                                                               |

## Two plausible framings

1. **Innovation — `openbadges-core` as software infrastructure.** A reusable JS/RN
   library for Open Badges 3.0 / W3C Verifiable Credentials: issuing, Ed25519 signing,
   PNG baking, offline verification, on-device key management. Aimed at developers, hits
   Software-Infrastruktur and touches Datensicherheit. Strongest formal fit; the mobile
   app becomes the reference consumer, not the deliverable.
2. **Resilienz — self-owned credentials without a platform.** Local-first, data-minimal
   alternative to centralised credential platforms (Credly, Badgr-as-a-service, LinkedIn
   skills, Google Classroom badges). Innovation bar is low, but it demands community
   anchoring plus ~50 % non-dev work (user tests, outreach) and a **mandatory** Second
   Stage concept. Currently blocked on having no community.

## What's missing before 30 Nov 2026

1. Decide employment path (Freistellung agreement vs. freelance registration) — this
   gates everything else.
2. Pick the line and carve the deliverable: a module spec with milestones sized to 950 h.
3. ~~Competitive survey of existing OSS badge/credential tooling~~ — done, see
   "Point 5 in full" below; still needs the Learner Credential Wallet re-check.
4. Target-group + reach story: who uses it, how you reach them; for Resilienz, real
   community ties (ND orgs, education/FOSS communities) started _now_.
5. Public-facing project pitch a non-expert can read (the current README is dev-facing).
6. GitHub account as the competence exhibit; confirm no proprietary component sits in the
   funded scope. Second exhibit added 2026-08-24 — the Save the Children media-literacy
   programme covers problem, users, delivery and Verstetigung, with a published flyer that
   names the applicant. See [applicant background](./2026-08-24-applicant-background.md).
   Keep the two in their lanes: the repo carries every technical claim.
7. Draft, then have an outsider read it (their own checklist item).

Sources: prototypefund.de/bewerbung, /foerderung, /foerderlinien, /resilienz, /faq,
/blog/ptf-3-0, /blog/ki-beim-prototype-fund.

---

## Point 5 in full: prior art and delta

Survey done 2026-08-23; re-check before submitting, the wallet field moves fast.

### The survey (what already exists, open source)

**Badge/credential side.** The reference implementation is **Badgr Server** (Concentric
Sky, Django, OSS since 2015; commercially Canvas Credentials) — server-first issuing with
accounts and hosting, plus a long fork lineage (SURF `edubadges`, others). The one to name
explicitly is **Open Educational Badges** (matrix gGmbH, mycelia gGmbH, openSenseLab gGmbH
with Deutsche Telekom Stiftung, **funded by BMBF and EU NextGenerationEU**, wired into
"Mein Bildungsraum") — a German, publicly funded, open-source badge platform, i.e. exactly
the mirror the jury will hold up. On the holder side, **Learner Credential Wallet** is the
closest twin to our mobile app: MIT-licensed React Native iOS/Android wallet for W3C VCs
including Open Badges 3.0, built by the MIT-led Digital Credentials Consortium with US
Dept. of Education grant money, stewardship moved to the OpenWallet Foundation in Jan 2025.
Adjacent OSS wallets and plumbing: **Bifold** (OpenWallet Foundation, RN), **Procivis One**
(open wallet + offline BLE verification), **Sphereon rn-vc-js**, and the
`digitalcredentials` / `digitalbazaar` JS libraries for VC signing and verification.
Note that OB 3.0 (final standard since June 2024) already sanctions individual issuers and
self-assertion — the spec is not the gap, implementations are.

**Tracker side.** **Leantime** is the prominent open-source project explicitly designed for
ADHD/autistic users (goal boards, dopamine-oriented flow), but it is web project management
with no credential layer. Habitica and Loop Habit Tracker cover gamified habit tracking,
also without credentials. The strongest ND-first products — Tiimo, Goblin Tools, Finch,
Brite — are proprietary, so they compete for users but do not trip the duplicate-OSS test.

**Our own prior art — and why the design looks like this.** Don't file the old repos as
"consolidated". They are the argument. `rollercoaster.dev-platform`, `bun-badges`,
`openbadges-modular-server`, `openbadges-system`, `openbadges-ui`, `rd-landing` and the
monorepo were an issuer-side badge platform: a server that issues credentials to learners,
built across 2025 at roughly 2,200 commits. Building it is how we learned that ground is
occupied — Badgr has held it since 2015, and Open Educational Badges now holds the German,
BMBF-funded version of it. So the project pivoted to the side nobody serves: the learner
issuing to themselves, on their own device, with no platform in between. The pivot was
front-loaded. Since 2026-02 the thesis has not moved, and the last re-homing (2026-05-14)
was a `git filter-repo` extraction with history preserved, not a rewrite.

That answers two application questions with one story. "What similar approaches exist" — we
built one of them and abandoned it for cause. "Have you worked on the idea already" — yes,
and the current design is the conclusion of that work, not a restart of it.

### The delta (what the funded six months buys)

Nothing above puts issuance on the learner's device. Badgr and Open Educational Badges
issue from a server, institution to learner, with accounts; Learner Credential Wallet and
Bifold _hold_ credentials somebody else issued. The gap is **learner-as-issuer,
local-first**: Ed25519 keys generated and kept on the phone, the credential signed on
device, PNG-baked into a file the person owns, verifiable offline without contacting any
issuer — no account, no server, no cloud. Second, the loop is one app rather than a
platform plus a wallet: goal → steps → captured evidence → signed credential, so the
credential is a by-product of tracking instead of a separate administrative act. Third,
ND-first interaction design is applied to credentialing, not just to task lists — Leantime
brings the ND lens without credentials, the badge platforms bring credentials without the
ND lens. Fourth, this serves informal and self-directed learning, which the
institution-shaped platforms structurally cannot: there is no issuer willing to certify
"I finally understood monad transformers".

Be honest about what is _not_ new: the VC crypto plumbing exists and we reuse it. The
funded work is the React Native integration (no Node crypto on device), the self-issuance
model, offline verification, and the ND UX — not a new signing library.

**To verify before submitting:** whether Learner Credential Wallet has shipped self-issuance
since Jan 2025. If it has, the delta narrows to the tracking loop plus ND design, and the
application needs to lead with those instead.

---

## Can it fail, and can it be clawed back?

It is a Zuschuss, not a loan, and payment runs quarterly in arrears against hours actually
worked. So the normal failure mode is income not arriving, not debt appearing: work fewer
hours than planned and the sum shrinks, with a Schlussbescheid fixing the final figure.
Not reaching the technical goal is not a repayment trigger — the duty is to run the project
as described, report honestly, and publish the code and a final report.

Repayment arises only if the Zuwendungsbescheid is revoked or withdrawn (§§ 48, 49 VwVfG),
and then §49a VwVfG applies: repay plus interest at 5 percentage points over base rate,
with the interest waivable if you were not at fault and pay on time. Realistic triggers:
funds used for another purpose; Verwendungsnachweis missing or rejected; breach of the duty
to report changed circumstances; hours claimed that were not worked; de-minimis ceiling
exceeded. BMFTR Bescheide also designate facts as _subventionserheblich_ under § 264 StGB —
hours are self-reported, so keep a contemporaneous time log rather than reconstructing one.

Illness or a stalled project is a notification duty, not a default. The grant gets reduced
or the period adjusted by Änderungsbescheid; unworked hours are simply unpaid. The exact
rules live in the Nebenbestimmungen attached to the Bescheid (AZK) — read them on arrival.
