# Architecture Decision Records

**The mutability rule.** ADR **bodies** are immutable once accepted — to change
a decision, write a new ADR that supersedes it. ADR **headers** (the Status
line and supersession pointers) are the one mutable surface: update them when a
later ADR touches the decision. When a topic accumulates ~3 partial
supersessions, write a consolidating ADR that restates the net position (see
ADR-0013). Every PR that adds, accepts, or supersedes an ADR must update both
the Current positions section and the Ledger below in the same PR.

**Reading rule (agents especially).** Read Current positions first; open
individual ADRs only for rationale, history, or detail. Never reconstruct
current scope by diffing a supersession chain.

## Current positions

| Topic                            | Current position                                                                                                                                                                                                                                         | Governing ADR                                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Iteration strategy               | Four iterations A→B→C→D, each a complete shippable product. A is ~complete; B is current.                                                                                                                                                                | [ADR-0001](./ADR-0001-iteration-strategy.md)                                                                                                |
| UI styling                       | react-native-unistyles v3; theme tokens, never raw colors.                                                                                                                                                                                               | [ADR-0002](./ADR-0002-ui-styling-library.md)                                                                                                |
| Sync layer                       | Evolu (SQLite + CRDT), local-first; sync ships in B.                                                                                                                                                                                                     | [ADR-0003](./ADR-0003-sync-layer-decision.md)                                                                                               |
| Data model                       | Evolu-native schema, ULIDs everywhere, soft deletes, grow-never-replace.                                                                                                                                                                                 | [ADR-0004](./ADR-0004-data-model-storage.md)                                                                                                |
| Licensing / trademark            | Per-package Apache/MIT/AGPL; EUIPO trademark; DCO on every commit.                                                                                                                                                                                       | [ADR-0005](./ADR-0005-licensing-and-trademark.md)                                                                                           |
| i18n                             | OpenRouter + Vercel AI SDK gateway; non-reasoning model pool; three-layer voice enforcement (register + intent sidecar + glossary).                                                                                                                      | [ADR-0007](./ADR-0007-i18n-gateway.md), [ADR-0008](./ADR-0008-i18n-bakeoff-model-pool.md), [ADR-0009](./ADR-0009-i18n-voice-enforcement.md) |
| **Phase B (scope + step model)** | Seven features (Substeps, Planning, Dependencies, Scratchpad, Step states, Review, Learnings) under the **no-auto-judgment** guardrail: auto-judgment forbidden, auto-bookkeeping allowed, every state hand-editable. Full net position in one document. | [ADR-0013](./ADR-0013-phase-b-consolidated-position.md) (proposed)                                                                          |

## Ledger

Decision bodies below are immutable; status lines point forward.

| ADR                                                     | Decision                                                                    | Status                                                                                        | Last Verified |
| ------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------- |
| [ADR-0001](./ADR-0001-iteration-strategy.md)            | Iteration A -> B -> C -> D shipping strategy                                | Accepted                                                                                      | 2026-02-24    |
| [ADR-0002](./ADR-0002-ui-styling-library.md)            | react-native-unistyles v3 for styling                                       | Accepted                                                                                      | 2026-02-24    |
| [ADR-0003](./ADR-0003-sync-layer-decision.md)           | Evolu for local-first sync                                                  | Accepted                                                                                      | 2026-02-24    |
| [ADR-0004](./ADR-0004-data-model-storage.md)            | Evolu-native data model with SQLite                                         | Accepted                                                                                      | 2026-02-24    |
| [ADR-0005](./ADR-0005-licensing-and-trademark.md)       | Per-package licensing (Apache/MIT/AGPL) + EUIPO trademark                   | Accepted                                                                                      | 2026-05-14    |
| [ADR-0006](./ADR-0006-iteration-b-scope-amendment.md)   | Iteration B scope amendment — drop three orphans, add step-model enrichment | Accepted, superseded by [ADR-0010](./ADR-0010-phase-b-step-model-crosswalk.md)                | 2026-05-23    |
| [ADR-0007](./ADR-0007-i18n-gateway.md)                  | i18n LLM gateway — OpenRouter + Vercel AI SDK                               | Accepted                                                                                      | 2026-05-24    |
| [ADR-0008](./ADR-0008-i18n-bakeoff-model-pool.md)       | i18n bake-off model pool - drop reasoning-tuned candidates                  | Accepted                                                                                      | 2026-05-25    |
| [ADR-0009](./ADR-0009-i18n-voice-enforcement.md)        | i18n voice enforcement — three-layer register + intent sidecar + glossary   | Accepted                                                                                      | 2026-05-25    |
| [ADR-0010](./ADR-0010-phase-b-step-model-crosswalk.md)  | Phase B step-model crosswalk                                                | Accepted — consolidated in [ADR-0013](./ADR-0013-phase-b-consolidated-position.md) (proposed) | 2026-06-08    |
| [ADR-0011](./ADR-0011-step-model-names.md)              | Step-model names and letter consolidation — ten rows become seven features  | Proposed, restated in [ADR-0013](./ADR-0013-phase-b-consolidated-position.md)                 | 2026-06-12    |
| [ADR-0012](./ADR-0012-no-auto-judgment.md)              | No-auto-judgment — reframe no-auto-state; allow auto-bookkeeping            | Proposed, restated in [ADR-0013](./ADR-0013-phase-b-consolidated-position.md)                 | 2026-06-14    |
| [ADR-0013](./ADR-0013-phase-b-consolidated-position.md) | Phase B consolidated position — scope, step model, guardrails               | Proposed                                                                                      | 2026-07-25    |
