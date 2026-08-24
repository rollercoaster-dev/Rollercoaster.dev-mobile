# Prototype Fund jury — who reads this and where it breaks

Researched 2026-08-24 against the live jury and application pages. Companion to
[Prototype Fund eligibility](./2026-08-23-prototype-fund-eligibility.md) and
[ADR-0015](../../apps/native-rd/docs/decisions/ADR-0015-funded-scope-prototype-fund.md):
that pair settles _what we would build_, this one asks _who scores it and what they
will push on_. The applicant-side evidence is in
[applicant background](./2026-08-24-applicant-background.md), added 2026-08-24 — it
revises the profile line and the milestone-6 row below.

**Two caveats up front.** The jury listed below is the sitting jury (Jahrgang 02
selection). Jahrgang 03's may differ — but the composition tilt has been stable for
years, so the shape of the risk holds even if names change. And `/bewerbung` currently
carries the banner "Diese Seite wird zur Zeit umgebaut" and names only two
Förderschwerpunkte (Datensicherheit, Software-Infrastruktur); the three-line structure
from the 08-23 research is newer than that page. Re-check both before submitting.

## The criteria, verbatim

The jury scores against five published criteria. Two matter disproportionately here:

- **Realisierbarkeit** — "Habt ihr die nötigen Fähigkeiten und ist die Idee innerhalb des
  Förderzeitraums umsetzbar? Sind die technische Umsetzung und der Projektplan
  ('Meilensteine') nachvollziehbar beschrieben?"
- **Reichweite und gesellschaftlicher Nutzen** — "Wie viele Menschen profitieren vom
  Projekt?"

Plus Innovationsgrad, fit to the Förderschwerpunkte, Erfolgsaussichten (they explicitly
say success is not revenue, but you must know the market), and no Doppelförderung.

The application checklist states the repo link's purpose outright: "So kann die Jury ggf.
verstehen, dass ich für die Umsetzung kompetent bin." The repo is the competence exhibit,
not a footnote.

**Process detail that changes tactics:** after the deadline the PTF team and Projektträger
pre-sort submissions, and each juror receives **up to 25 sketches in their area of
expertise** with roughly three weeks to assess. These are shallow, fast, pattern-matching
reads by domain specialists — not a committee reading everything together.

## Who is on it

Nine members. **Five are security, crypto or infrastructure people.** Two are the natural
allies. That ratio is the finding.

| Juror                           | Background                                                                                                                                                                                                  | What they push on                                                                                                                                                                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Raphael Robert**              | Co-author of the MLS protocol, IETF (MIMI), ex-Head of Security at Wire, founder of Phoenix R&D                                                                                                             | The dangerous one. A self-signed VC proves key custody, not the truth of the claim. Expect: what is the trust model; where does the Ed25519 key live on the device; what happens on device loss; `did:key` vs. PLC rotation — i.e. precisely ADR-0015's own open question |
| **Matthias Marx** ("Kantorkel") | Security Research Labs, active CCC member, Hamburg Freifunk, board of Artikel 10 e. V. (Tor relays)                                                                                                         | Why route through a US company's PDS? Irrevocable public records for ND users publishing goal histories. Why not a self-hostable transport                                                                                                                                |
| **Markus Drenger**              | IT-security consultant at HI Solutions, ex-netzpolitik staffer for the Greens, CCC, worked on beA and ePA risk analysis                                                                                     | Same privacy axis, plus he is exactly the reader who spots store copy promising "No accounts. No signup. No email needed." against a milestone that needs an email                                                                                                        |
| **Leah Oswald**                 | Operations Team Lead at uberspace, runs chaos.social, MRMCD organiser                                                                                                                                       | Credits "no server to fund after the grant". Then asks who operates the firehose-walking index job, what it costs, and what happens when it stops. Reads the parked AppView as "there is no discovery story"                                                              |
| **Lydia Pintscher**             | Portfolio Lead for Wikidata at WMDE, deputy board chair of KDE e. V., ran large mentoring programmes, CS at Karlsruhe                                                                                       | Zero stars, zero external contributors, solo. Governance and contribution story. AGPL + trademark reservation + dual-license intent reads CLA-adjacent to a KDE person. Also: she has reviewed a great deal of junior and mentee code                                     |
| **Dr. Irmhild Rogalla**         | Leitungsteam, Institut für Digitale Teilhabe (HS Bremen); Institut für praktische Interdisziplinarität; "Digitalisierung und Arbeit", digitale Barrierefreiheit; long-time FOSS user, LibreOffice community | Best ally, and the strictest on one point: Teilhabe means _with_, not _for_. Which ND users tested this? Which organisations? Is there accessibility evidence beyond a self-declared ND-first design system?                                                              |
| **Philipp Gawlik**              | Computational linguist, AI & Automation Lab at Bayerischer Rundfunk; co-organiser of Cultivation Space (gemeinwohl-oriented workspace, Berlin)                                                              | Mild ally. Pulls toward "is this a building block others build on" — the `openbadges-core` framing ADR-0015 rejected                                                                                                                                                      |
| **Prof. Dr. Tobias Heer**       | Professor of IT-Security and Dean, HS Esslingen; associate professor Tübingen; industrial network and critical infrastructure security; Jugend-forscht juror                                                | Generalist for us. "Does this fit Datensicherheit or Software-Infrastruktur at all, or is it a habit tracker with a badge feature?" As a competition juror, practised at judging whether the applicant actually built the thing                                           |
| **Jana Kludas**                 | Lead Data Scientist at msg systems, consulting on data science in the public sector; formerly ML/neural network research                                                                                    | Generalist for us. Milestone plausibility and hour arithmetic                                                                                                                                                                                                             |

## Where the skills question bites

Applicant profile: strong mid-level TypeScript/React Native, three years in edtech, no
prior atproto work, no shipped cryptography or standards work. Plus a documented
non-code record the first version of this doc missed — concept, offline-first Raspberry Pi
infrastructure and delivery for a Save the Children media-literacy programme, 170 children
and their caregivers across three sites, handed over to local staff. See
[applicant background](./2026-08-24-applicant-background.md). It moves Realisierbarkeit,
Reichweite and milestone 6; it moves nothing on milestones 1, 4 and 5.

Against ADR-0015's six milestones:

| Milestone                                                                 | Domain                                                               | Demonstrated?                                                                                                                                                          |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. OB3 external verification (6 validator errors, unresolvable `did:key`) | VC standards + cryptosuites                                          | No                                                                                                                                                                     |
| 2. Export carries the signed credential                                   | app work on top of M1                                                | Yes                                                                                                                                                                    |
| 3. Import Badge Opportunity                                               | app work, already researched                                         | Yes                                                                                                                                                                    |
| 4. Public badges to the user's own atproto repo                           | atproto, PDS, DID/PLC                                                | No                                                                                                                                                                     |
| 5. Goal templates                                                         | undesigned — ADR-0015 says format, provenance and abuse are all open | No                                                                                                                                                                     |
| 6. ND user testing, community, docs                                       | non-code, ~50% of hours                                              | **Yes** — see [applicant background](./2026-08-24-applicant-background.md): curriculum design, delivery to a vulnerable group, evaluation loops, caregiver-facing work |

**Three of six milestones sit outside the demonstrated skillset, and the jury contains
three people who have shipped exactly those things.** All three are technical (M1, M4, M5),
which is the sharper way to state it — the non-code half of the plan is now the evidenced
half, and the code half is the exposed one. No one has to dig to see it: M1's
defect list and M5's "undesigned" are in our own public docs.

Second-order risk: the commit history is heavily agent-assisted, against a rule that
outsourcing implementation "to machines" is inadmissible and a mandatory git-account field
whose stated purpose is competence assessment. Pintscher and Heer are the likeliest to
read for that signal.

## What closes the gap before 30 Nov 2026

Ranked by score bought per hour spent.

1. **Ship milestones 1 and 2 unfunded, before applying.** verifybadge.org passing is the
   strongest available Realisierbarkeit exhibit: it proves the crypto/standards half is
   within reach, it removes the blocking defect from the funded scope, it makes 950 h at
   ~50 % non-code arithmetically credible, and it answers Robert before he asks.
   ADR-0015 already says these two are worth shipping either way.
2. **Spike atproto now, in public.** A record written to a PDS and resolved, in the repo,
   with a commit trail. Converts "never worked with atproto" into "here is the working
   prototype and here is what remains". Same for the template-format spike ADR-0015
   already promises.
3. **Write the trust-model position, not a caveat.** The signature proves authorship and
   integrity over time, not third-party accreditation; OB 3.0 explicitly sanctions
   self-assertion; the value is provenance and narrative for learning no institution will
   certify. A hand-wave here loses Robert, and probably Marx and Drenger with him.
4. **Name two partners.** Any ND organisation, Verein, VHS, school or education contact
   who has agreed to test. Rogalla and Pintscher both score this, and the Resilienz line
   makes community anchoring a hard bar we currently fail at zero. The Save the Children
   record does **not** close this one: it evidences the capability to run target-group work,
   not a partner who has agreed to test this app.
5. **Put the Save the Children programme in the motivation section**, with the flyer linked.
   Cheapest score on this list — the document already exists. Detail and the citation
   discipline are in [applicant background](./2026-08-24-applicant-background.md).
6. **Surface the ADRs.** They are the best counter-exhibit to the vibe-coding question:
   authored reasoning about tradeoffs is what a machine-outsourced project does not have.
   Link them from the README, not only the docs tree.
7. **Rescope the store copy** (`launch/store-listing-copy.md:109`) before anyone compares
   it to milestone 4.

## The routing lever

Because sketches are pre-sorted and distributed **by area of expertise**, the framing
chooses the reviewers.

- Lead with credentials, cryptography, self-sovereignty → routes to Robert, Marx, Drenger,
  Heer. Competes against VPN and messaging tooling, where an end-user app reads soft.
- Lead with Teilhabe, Barrierefreiheit, informal and self-directed learning → routes to
  Rogalla, Pintscher, Gawlik. Competes against accessibility projects, where ND-first
  credentialing is genuinely unoccupied ground.

**Recommendation:** frame primarily as digital participation, with a cryptography section
hard enough to survive Robert if it lands on his pile anyway.

## Two structural problems the framing cannot fix

- **Neither funding line fits cleanly today.** Resilienz demands community anchoring (we
  have none) and a mandatory Second Stage. Innovation demands ~80 % code, while ADR-0015
  plans ~50 %. Worth noting that Innovation's code-heavy bar matches the actual skillset
  better than the plan we have written — the line choice and the milestone mix should be
  decided together, not in sequence.
- **The employment gate still governs everything.** Self-employed, or partially freigestellt
  by the employer for the project period. Per the PTF timeline the legally binding
  Zuwendungsbescheid can arrive as late as funding start, so any Freistellung conversation
  has to be structured to survive that uncertainty rather than assume a March answer.

Sources (fetched 2026-08-24): prototypefund.de/bewerbung/jury, /bewerbung,
/blog/hinter-den-kulissen. The site rejects plain HTTP clients; browser-like headers are
needed to read it.
