/**
 * Substructure invariant guardrails (#288 epic / #294).
 *
 * The exhaustive per-scenario resolver cases live in `queries.step.test.ts`;
 * this file locks the three sub-step invariants the epic must never regress as
 * named contracts, and adds the cross-screen parity check the unit suite does
 * not state outright. All pure — no Evolu.
 *
 * Parity note: the Goals cockpit, Focus Mode and the Timeline journey accent all
 * derive "the next step" by passing one `resolveNextActionableStep` result
 * through the shared `resolveActionableIndex` (#536), then indexing the same
 * rows array. Deliberately named by the exported functions rather than by the
 * private helper each screen wraps them in: those wrapper names have already
 * been renamed out from under comments that referenced them.
 *
 * Be precise about what the test below can and cannot show. That the two
 * screens call the *same* collapse is enforced by the type checker and by them
 * importing one function — not by any assertion here, and their own suites
 * replace the module with a stub, so no screen test would catch a divergence
 * either. What this file pins is the collapse's own mapping across every kind:
 * if `resolveActionableIndex` ever mis-maps one, both screens break together
 * and these fail. Re-deriving "the next row" for each surface, as this test
 * once did, proves less — a hand-copied mapping can agree with itself while
 * disagreeing with production.
 */
import {
  resolveNextActionableStep,
  resolveActionableIndex,
  type NextActionableStepInput,
} from "../queries";

const step = (
  id: string,
  parentStepId: string | null,
  status: string,
): NextActionableStepInput => ({ id, parentStepId, status });

describe("substructure guardrails (#294)", () => {
  test("parent completion is manual-only: all children done leaves the parent as the next action (invite), never none", () => {
    const rows = [
      step("p", null, "pending"),
      step("c1", "p", "completed"),
      step("c2", "p", "completed"),
    ];
    // Completing every child does NOT auto-complete or skip the parent — it is
    // surfaced (kind "invite", index = the parent) for explicit manual completion.
    expect(resolveNextActionableStep(rows)).toEqual({
      kind: "invite",
      index: 0,
      childCount: 2,
    });
  });

  test("nothing is blocked: a pending leaf under a completed parent still wins", () => {
    const rows = [step("p", null, "completed"), step("c1", "p", "pending")];
    expect(resolveNextActionableStep(rows)).toEqual({
      kind: "leaf",
      index: 1,
      parentIndex: 0,
    });
  });

  test("nothing is blocked: an orphaned pending child (parent absent) stays reachable", () => {
    // A child whose parent row is gone is promoted to top level, not hidden.
    const rows = [step("orphan", "ghost", "pending")];
    expect(resolveNextActionableStep(rows)).toEqual({ kind: "flat", index: 0 });
  });

  // Every kind the resolver can emit, run through the shared collapse the way
  // both screens run it: resolve → resolveActionableIndex → index the same rows
  // array. `parked` is the one most likely to drift once #537 renders it
  // differently, so it is pinned here alongside the rest rather than only in
  // the unit suite.
  test.each([
    [
      "leaf — earlier pending child wins over a later pending root",
      [
        step("p", null, "pending"), //      0 parent
        step("c1", "p", "completed"), //    1
        step("c2", "p", "pending"), //      2 first actionable leaf
        step("flat", null, "pending"), //   3 later pending — must be ignored
      ],
      2,
      "c2",
    ],
    [
      "invite — parent with every child done",
      [
        step("p", null, "pending"),
        step("c1", "p", "completed"),
        step("c2", "p", "completed"),
      ],
      0,
      "p",
    ],
    [
      "parked — parent whose remaining children are set aside",
      [
        step("p", null, "pending"),
        step("c1", "p", "completed"),
        step("c2", "p", "paused"),
      ],
      0,
      "p",
    ],
    ["flat — pending childless root", [step("f", null, "pending")], 0, "f"],
    ["none — nothing pending", [step("f", null, "completed")], null, null],
  ] as const)(
    "goal card + focus mode collapse to one next step: %s",
    (_label, rows, expectedIndex, expectedRowId) => {
      const nextIndex = resolveActionableIndex(
        resolveNextActionableStep(rows as readonly NextActionableStepInput[]),
      );
      const nextRowId = nextIndex === null ? null : rows[nextIndex].id;

      expect(nextIndex).toBe(expectedIndex);
      expect(nextRowId).toBe(expectedRowId);
    },
  );
});
