/**
 * Substructure invariant guardrails (#288 epic / #294).
 *
 * The exhaustive per-scenario resolver cases live in `queries.step.test.ts`;
 * this file locks the three sub-step invariants the epic must never regress as
 * named contracts, and adds the cross-screen parity check the unit suite does
 * not state outright. All pure — no Evolu.
 *
 * Parity note: GoalCard (`GoalsScreen.buildCockpitGoal`) and FocusMode
 * (`FocusModeScreen.findFirstPendingLeafIndex`) both derive "the next step" from
 * `resolveNextActionableStep(...).index`, each mapping `none` → null / -1. A
 * single resolver result therefore drives both surfaces — they cannot disagree
 * by construction; the parity test below pins that shared mapping.
 */
import {
  resolveNextActionableStep,
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

  test("goal card + focus mode resolve to one next step when several are pending", () => {
    const rows = [
      step("p", null, "pending"), //      0 parent
      step("c1", "p", "completed"), //    1
      step("c2", "p", "pending"), //      2 first actionable leaf
      step("flat", null, "pending"), //   3 later pending — must be ignored
    ];
    const result = resolveNextActionableStep(rows);

    // The exact derivations both screens apply over the single resolver result.
    const focusModeIndex = result.kind === "none" ? -1 : result.index;
    const goalCardNextRowId =
      result.kind === "none" ? null : rows[result.index].id;

    expect(focusModeIndex).toBe(2);
    expect(goalCardNextRowId).toBe("c2");
  });
});
