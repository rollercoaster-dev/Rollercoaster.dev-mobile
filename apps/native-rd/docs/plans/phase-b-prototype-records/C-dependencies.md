# Prototype Record — C: Dependencies (merges C-order + C-waiting)

Feature shape: [phase-b-feature-shapes.md §C](../phase-b-feature-shapes.md#c-dependencies-merges-c-order--c-waiting)
Conventions: [phase-b-stage-0-deliverables.md](../phase-b-stage-0-deliverables.md)

## Prototype: C — marker treatments × task-view fork (2026-06-16)

**Concept.** A step can say "after ⟨step⟩" (internal ordering) or "waiting on
⟨person/event⟩ · expected ⟨date⟩" (external). The marker informs only — never
blocks, hides, dims, disables, or refuses anything. Never "blocked by."

**What was built.** `apps/native-rd/prototypes/C-dependencies.html` — a
phone-viewport HTML page in the app's token language, toggling 3 marker
treatments (inline sub-line, chip, connector-with-tie-line) × 5 step surfaces ×
3 scenarios (Tomás internal, Ava all-external, Combined) × 2 task-view
behaviors (name-and-stay vs route-around). Run: `open
apps/native-rd/prototypes/C-dependencies.html`.

**Evidence:** analytical self-testing only (Claude reading rendered
screenshots, 2026-06-17) — the weakest tier, weaker than Joe's own lived use.
Caps the outcome at revise / more prototyping; a schema/relationship ADR needs
a real ND-user session.

### Finding

- **Wording holds everywhere.** "after ⟨step⟩" reads as ordering; a satisfied
  internal dep flips green and reads as quiet history. "waiting on … expected
  ⟨date⟩" names the world's actor and timing. Nothing produced "blocked by" or a
  "you're late" register, on any surface, in any treatment. **Wording is
  settled; treatment is not.**
- **No treatment wins.** Inline is calmest and defect-free. Chip overflows the
  360px card and clips the external date (Journey + Edit). Connector is the only
  one that _draws_ the relation (a tie-line to the prerequisite) but that
  tie-line is exactly the "constraint graph" feel the guardrail warns about, and
  its ⤧ glyph reads as opaque next to inline/chip's clear ⏳.
- **Both task-view variants render honestly** and both keep exactly one featured
  thing per goal — including Ava's all-waiting case (route-around shows the
  honest "everything here is waiting on other people — that's the system, not
  you" panel; name-and-stay features the chronological next and names its wait).
  Neither reads as a verdict. The fork is **not** decidable by reading — whether
  name-and-stay's repeatedly-featured powerless step re-creates a self-blame
  loop, or route-around feels like the app hiding the real next, is a lived/ND
  question.
- **One structure, two registers** (Q4): internal and external share the marker
  shape and differ by verb ("after" / "waiting on") and palette (purple/green
  vs amber + mono date). They cohere when stacked on one step — not two
  languages, not one flattened one.
- **Expected date (Q10) observed, not resolved:** it names the world's timing,
  distinct from B's user-intended deadline; the two would co-exist where a
  waiting step also carries a B date. Recorded for B + C integration.

### Guardrails

All pass. Notable: Ava's "expected Jun 12" sits in the _past_ relative to the
walkthrough (2026-06-17) and still reads "waiting · expected Jun 12" — not
"overdue," not auto-met (no-auto-judgment, [ADR-0012](../decisions/ADR-0012-no-auto-judgment.md)).
Nothing was blocked/hidden/dimmed in any treatment; the complete action stayed
live on every waiting step. Route-around names a specific step ("Also waiting:
Book city inspector"), never a count. N/A: G opt-in, calendar repetition, H —
not exercised.

### Decision — Revise / more prototyping

Per Joe (2026-06-17), **eliminate nothing**: both task-view variants and all
three treatments carry to the next rung; the ND gate decides.

- Both task-view variants stay live — the read can't distinguish them.
- All three treatments stay open, but fix two defects before the next rung so
  the comparison stays clean: (a) chip external-marker overflow on the 360px
  card; (b) connector's opaque ⤧ glyph and graph-feel tie-line.
- Q10 (expected date C vs B) stays open for B + C integration.

### Open questions

- **The fork (ND gate):** self-blame loop (name-and-stay) vs hiding-the-real-next
  (route-around)? Only lived use separates them.
- **Chip overflow:** salvageable on a 360px card (wrap / truncate / date on a
  second line), or fatal for external markers?
- **Connector graph-feel:** can the relation be drawn without reading as a
  constraint graph, or is that tension inherent?
- **Passed-date wording:** a passed expected date shows plain "expected Jun 12"
  with no staleness cue. Is a neutral past-tense ("was expected Jun 12")
  warranted, or does any past-tense lean toward "you're late"?

### Follow-up

- Carry both variants + all three treatments (defects fixed) to a throwaway
  dev-flag screen for: tap-count to set/clear a dependency, Ava's cold-return
  read, and the fork's lived feel.
- Update the **Dependency display** and **C + task view** rows of the
  [Open Questions Register](../phase-b-step-model-prototypes.md#open-questions-register)
  — both left open.
