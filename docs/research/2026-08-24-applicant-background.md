# Applicant background — the second competence exhibit

Written 2026-08-24. Companion to
[Prototype Fund eligibility](./2026-08-23-prototype-fund-eligibility.md) and
[jury fit](./2026-08-24-jury-fit-analysis.md). Those two ask what we would build and who
scores it. This one asks **what evidence exists that the applicant can do it**, and
separates the part that is documented from the part that is assertion.

## Why this doc exists

The application checklist states the repo link's purpose outright — "So kann die Jury ggf.
verstehen, dass ich für die Umsetzung kompetent bin." Until now the repo was treated as the
only competence exhibit, and the jury-fit doc reduced the applicant profile to one line:
mid-level TypeScript/React Native, three years in edtech, no prior atproto, no shipped
cryptography or standards work.

That line understates the record. There is a second exhibit, it is public, it is published
by an international NGO, and it names the applicant. It carries the half of the application
the repo cannot: the problem, the users, field delivery, and sustainability.

Keeping the two exhibits in their own lanes is the whole discipline here:

| Exhibit                         | Carries                                                          | Does not carry                               |
| ------------------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| Repo + shipped OB3 verification | technical capability, standards work, code authorship            | why the project should exist                 |
| Save the Children programme     | problem, target-group access, delivery, evaluation, Verstetigung | cryptography, standards, systems engineering |

Under Innovation the security jurors test technical claims against the repo, not against a
flyer. Pushing the NGO record into the technical section is the one way it backfires.

## The programme

Save the Children Deutschland e. V., _Media Literacy for Refugee Children and Youth in
Germany_ — media education and internet safety for refugee children in reception centres
and shelters, run out of the organisation's Child Friendly Spaces.

|                  |                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Period           | Pilot April 2017 – March 2018; second phase April 2018 – September 2018                                                                            |
| Sites            | Three, in Berlin and Eisenhüttenstadt                                                                                                              |
| Reach            | **170 children directly, 900 children and adults indirectly**                                                                                      |
| Audience         | Children aged 6–18, plus parents and shelter staff                                                                                                 |
| Applicant's role | Concept, setup and organisation of the programme; taught the courses to both children and caregivers                                               |
| Structure        | Four learning modules over 12 visits of 60–90 minutes                                                                                              |
| Curriculum       | Internet ABC (safe use, personal-data protection); Khan Academy; introduction to computer science via code.org; HTML/CSS on Raspberry Pi           |
| Infrastructure   | Raspberry Pi based "educational server" giving on- and offline access to course material independently of the course; a 10-machine Pi lab per site |
| Evaluation       | Each course closed with a test; content and methods were revised against feedback from children, parents and teachers                              |
| Handover         | Equipment left on site and local staff trained so the courses continue without the original teacher                                                |

**Source.** Save the Children Deutschland e. V., _Media Literacy for Refugee Children and
Youth in Germany_ (project flyer, English, undated — content places it in the 2018
fundraising cycle), published at:

<https://www.savethechildren.de/fileadmin/user_upload/Bilder/Unterstützen/Fuer_Unternehmen/Ihre_Hilfe/Laufendes_Projekt_untestuetzen/Medienprojekt_Flyer_english.pdf>

Fetched 2026-08-24. Checksum and full provenance in
[`sources/README.md`](./sources/README.md). The file itself is deliberately **not** stored in
this repository — it shows and names five children in a refugee context, and this repo is
public. Cite the URL above; the register records a SHA-256 so a retrieved copy can be
verified byte-identical.

## Three findings that change how this is framed

### 1. The flyer names the applicant

> "In Syria we did not have a computer. The computer-class **with Joe** is fun and in terms
> of grades, I can keep up with my classmates."
> — participant quotation, Save the Children project flyer, p. 5

A learner quotation in material published by the funding NGO. Most applicants have nothing
citable for their non-code claims; this is a checkable third-party attribution rather than
a CV line.

Attributions are given without the speakers' names, ages or countries of origin. The
children quoted in the flyer are minors in a refugee context; the verbatim identifiers stay
in the retained source, which reproduces its publisher's own wording, and are not repeated
in our prose. Nothing in the argument depends on them. Do not restore them.

### 2. The "surfing license" is the project's origin story

> "I already got the ›surfing license‹ and I really want to continue the course. We have
> learned internet rules, e. g. that one should not send photos or his address to
> strangers."
> — participant quotation, ibid., p. 4

A micro-credential for a real skill, issued informally at small scale to a learner no
institution was going to certify, and it visibly motivated continuation. That is this
project's thesis, observed in the field eight years before the application, with a quotable
participant response. It belongs in the motivation section and it outperforms any abstract
argument about credential sovereignty.

### 3. Offline-first infrastructure, not only pedagogy

The Pi educational server serves course material **on- and offline, independently of the
course**, and Module 4 has children stand up their own web server and publish without a
network. Local-first, no platform dependency, sovereign for the end user.

That is the architectural thesis of this project, already delivered in the field for a
group with no institutional backing — which is why the NGO record is not purely a soft
credential under a Software-Infrastruktur framing. The 2026-06-25 Änderungsbekanntmachung
widened the Richtlinie to include "souveräne Software für Endnutzer\*innen"; this is prior
work in exactly that shape.

## Mapped to the jury

| Criterion or juror                                                                                                                           | What the record answers                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Realisierbarkeit**                                                                                                                         | A completed programme delivered end to end by one person — concept, infrastructure, teaching, evaluation — with an external funder, documented reach, and a second phase. Evidence of finishing, not only of starting |
| **Reichweite und gesellschaftlicher Nutzen**                                                                                                 | 170 direct, 900 indirect, named sites, published by the NGO. The reach story stops being a projection                                                                                                                 |
| **Dr. Irmhild Rogalla** (Institut für Digitale Teilhabe) — "Teilhabe means _with_, not _for_. Which users tested this? Which organisations?" | Digitale Teilhabe run _with_ a vulnerable group inside an organisation, including the caregivers around them, with evaluation cycles feeding back into content                                                        |
| **Lydia Pintscher** — mentoring, contribution and governance                                                                                 | Ran structured teaching for a mixed-age cohort and trained local staff to take the programme over. Handover is the same instinct she scores in a project                                                              |
| **Philipp Gawlik** — gemeinwohl orientation                                                                                                  | The record is NGO work for refugee children. Nothing needs framing here                                                                                                                                               |
| **Sustainability / Verstetigung** (PTF interviews grantees ~1 year on)                                                                       | Equipment left in place and staff trained to continue; the programme ran a further phase. Handover-to-continuation already done once, with evidence                                                                   |
| **Milestone 6** (ND user testing, community, docs — rated _Partly_)                                                                          | Curriculum design, delivery to a vulnerable group, structured evaluation loops, caregiver-facing work. Same methodology, different group                                                                              |

### The routing question this reopens

The jury-fit doc recommends framing primarily as digital participation, because sketches
are pre-sorted by juror expertise and that framing routes to Rogalla, Pintscher and Gawlik.
An Innovation-line application pulls the other way, toward Datensicherheit and
Software-Infrastruktur.

This record is the bridge rather than a reason to choose. The Pi educational server is
simultaneously Teilhabe and Software-Infrastruktur, so the sketch can lead with
participation and still satisfy an infrastructure Förderschwerpunkt without the crypto
framing that routes straight to Robert. Line choice and framing are separate levers and
should stay separate.

## What it does not evidence

Stated plainly so it does not get stretched:

- **It is eight years old** (2017–2018).
- **It is media-education infrastructure** — Raspberry Pi, code.org, Khan Academy, HTML/CSS
  — not systems engineering, cryptography, or standards implementation. It says nothing
  about milestones 1, 4 or 5.
- **It is not current community anchoring.** It evidences the _capability_ to run
  target-group work; it does not supply a partner who has agreed to test the app. Item 4 of
  "what closes the gap" is still open at zero.
- **The flyer is fundraising material, not a project report.** It cites the applicant in a
  participant quotation, not as author or staff. The correct citation is "documented in
  Save the Children's project material", not a publication credit.

## Berlitz Kids

English instruction for children at Berlitz. Direct teaching contact with young learners,
which supports target-group understanding — but it is commercial language instruction for
children, while this project's users are neurodivergent adults. Worth at most a clause
about direct teaching experience. As a job-title bullet it reads as padding, and jurors
receive up to 25 sketches each on a three-week clock.

## Current role

Describe it by function and sector — software developer at an edtech company in Hamburg,
shipping React Native in production — rather than by employer profile. It carries two
things worth carrying: production mobile experience, and a professional development role as
the plainest available answer to the vibe-coding question the jury-fit doc flags. The
technical claim itself rides on the repo.

## Open before 30 Nov 2026

1. **Exact role title and dates** for the competence field. The flyer credits "qualified
   media consultants and media educators from Save the Children" and spans April 2017 –
   September 2018; the application needs the precise engagement.
2. **Ask Save the Children for a one-paragraph confirmation of role and period.** Not
   required by PTF, but the programme ran eight years ago and institutional memory decays.
   Cheap now, unavailable under deadline pressure.
3. **Find the concept document**, if it survives. A curriculum concept authored in 2017 is
   direct evidence of the ability to write a Vorhabenbeschreibung — which is the next
   document that has to be written regardless.
4. **Archive the flyer URL** and add the archive link to `sources/README.md`.
5. **Draft the arc as one paragraph** — concept → Pi infrastructure → children and
   caregivers → surfing license → handover → second phase → the same problem for a
   different group, now with the engineering to build it as software.

Sources: Save the Children Deutschland e. V., _Media Literacy for Refugee Children and
Youth in Germany_, https://www.savethechildren.de/fileadmin/user_upload/Bilder/Unterstützen/Fuer_Unternehmen/Ihre_Hilfe/Laufendes_Projekt_untestuetzen/Medienprojekt_Flyer_english.pdf
(fetched 2026-08-24; not stored in-tree — publisher, checksum and citation rules in
[`sources/README.md`](./sources/README.md)); applicant
statement of role, 2026-08-24, pending the written confirmation in item 2.
