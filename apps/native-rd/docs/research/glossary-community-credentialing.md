# Glossary — Community Credentialing Research

Shared by the 2026-10-26 research set: [pilot](./2026-10-26-bike-mechanic-ob3-pilot.md) · [funding](./2026-10-26-bike-pilot-funding.md) · [criteria authoring](./2026-10-26-bike-badge-criteria-authoring.md) · [key compromise](./2026-10-26-credential-key-compromise-recovery.md).

## Evidence labels

- **[verified]** — read in the primary source.
- **[verified in code]** — read in this repo or in a tool's source.
- **[verified, index]** — the source's own page as shown by a search index; direct fetch was blocked.
- **[secondary]** — only in press, vendor or third-party coverage.
- **[unverified]** — not found, or the source was unreachable.
- **[inference]** — the author's reasoning, not a source claim.

## Bike trade and vocational education

- **ECI** — European Cycling Industries, the trade association formed when CONEBI and CIE merged (Dec 2025). Publisher of the NextGen Mechanics Report.
- **ESEG** — Education and Skills Expert Group, the ECI group being set up to follow the report.
- **NGM** — NextGen Mechanics, the Shimano Europe initiative the report grew out of.
- **VET** — vocational education and training.
- **EQF** — European Qualifications Framework, levels 1–8. National frameworks map onto it.
- **DQR / NLQF** — the German and Dutch national qualifications frameworks.
- **MBO / crebo / SBB** — Dutch vocational education; crebo is a qualification code; SBB is the body that maintains qualification files.
- **BIBB** — Germany's federal institute for vocational training.
- **RNCP / CQP / France compétences** — the French national register of professional certifications; CQP is a sector-issued certificate; France compétences runs the register.
- **ANFA** — French automotive-services training body; certifier of the Mécanicien cycles title.
- **ST0622 / EPA / EPAO / KSB** — the English bicycle-mechanic apprenticeship standard; its end-point assessment, the organisation that runs it, and the knowledge, skills and behaviours it lists.
- **Cytech / ACT** — the UK cycle industry's training scheme and the Association of Cycle Traders that owns it.
- **OOMT / Innovam / Cyclehub** — Dutch mobility-sector training fund and providers.
- **VAE / RPL** — recognition of prior learning (French and English terms).
- **AZAV** — German certification that lets a course be paid for with a public training voucher.
- **OGL** — the UK Open Government Licence.
- **UDL** — Universal Design for Learning (CAST guidelines).

## Credentials and standards

- **OB3** — Open Badges 3.0, the 1EdTech credential format this app issues.
- **CLR** — Comprehensive Learner Record, OB3's sibling spec for linking achievements.
- **VC / VC-JWT** — W3C Verifiable Credential; the JSON Web Token signing form OB3 allows.
- **JWS / JWK / `kid`** — JSON Web Signature; JSON Web Key; the header field naming which key signed.
- **DID** — Decentralized Identifier. Methods used here: `did:key` (one key, no rotation), `did:web` (a document at a domain), `did:webvh` (did:web with a hash-chained history), `did:plc` (Bluesky's method).
- **CID** — W3C Controlled Identifiers spec, which defines `revoked` and `expires` dates on keys.
- **KERI** — Key Event Receipt Infrastructure, a key-history protocol with pre-rotation.
- **ESCO** — the EU's occupations and skills classification, with stable URIs a badge can align to.
- **EDC / ELM / Europass** — European Digital Credentials for Learning, their data model, and the EU platform that issues them.
- **eIDAS / eSeal** — EU electronic identification regulation; an organisational electronic seal.
- **Endorsement** — an OB3 `EndorsementCredential`: a signed statement by someone else about a credential, an achievement definition, or an issuer.
- **Vouching** — this project's term for a space endorsing a reviewer's profile.
- **Space** — this project's generic term for a community organisation that runs a badge set (a repair hub, a makerspace).

## Trusted time and keys

- **TSA / RFC 3161** — a timestamp authority and the protocol it uses to attest that a hash existed at a time.
- **OpenTimestamps** — timestamp proofs anchored in Bitcoin, with hours of settling delay.
- **Transparency log / Rekor / CT** — append-only public logs (Sigstore's Rekor; Certificate Transparency).
- **PRF** — the WebAuthn extension that derives a secret from a passkey.
- **Secure Enclave / StrongBox** — Apple's and Android's hardware key stores for non-extractable keys.
- **M-of-N** — a threshold: any M signatures out of N authorised keys.
- **X** — in the key-compromise doc, the time from which a key is treated as compromised.
