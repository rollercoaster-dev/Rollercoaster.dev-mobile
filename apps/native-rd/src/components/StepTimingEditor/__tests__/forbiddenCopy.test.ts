import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * The words this surface may never use, in copy or in a11y labels.
 *
 * "blocked" is the load-bearing one (ADR-0010/0012, settled in #384): nothing
 * here is blocked. The complete action stays live on a step whose dependency is
 * still open, and for an external wait, completing it *is* "the event
 * happened". Borrowing a gate word for something we deliberately refuse to gate
 * would make the label lie.
 *
 * The rest come from ADR-0012's no-auto-judgment rule — no "overdue"/"late"
 * framing on a passed date, and no "missing"/"needed" framing on an unset one.
 */
const FORBIDDEN = [
  "blocked",
  "overdue",
  "missing",
  "needed",
  "deadline",
  "late",
];

/**
 * The two sanctioned appearances, both inside the intent sub-line — which is
 * the copy that *disclaims* those readings: "Your intent, not a deadline. A
 * passed date never reads as “late.”"
 */
const SANCTIONED = ["not a deadline", "reads as “late.”"];

const isSanctioned = (text: string) =>
  SANCTIONED.some((ok) => text.includes(ok));

/**
 * Whole words only. `EditGoalView` is a 24-file directory whose drag and
 * geometry code is nowhere near this copy, and a substring match would read
 * `late` out of `translate` and fail a test whose name says "forbidden copy".
 * The ban is on the framing these words carry, which a word they are merely
 * spelled inside of does not.
 */
const usesForbiddenWord = (text: string, word: string) =>
  new RegExp(`\\b${word}\\b`, "i").test(text);

/**
 * Every component directory that carries B/C planning copy (#577).
 *
 * The two authoring surfaces — the in-row `StepTimingEditor` and its
 * `StepDayGrid` — were the original scope. `EditGoalView` (the row chip tier,
 * `EditGoalTimingLine`/`EditGoalRowTiming`) and the shared `TimingMarkIcon`
 * carry the same copy on the read side and had no forbidden-word guard of
 * their own: `TimelineStep` checks itself inline, these two checked nothing.
 */
const COMPONENT_DIRS = [
  "StepTimingEditor",
  "StepDayGrid",
  "EditGoalView",
  "TimingMarkIcon",
];

/**
 * String literals that can reach a user, per source file. Comments are stripped
 * first: doc comments are where the ban is *explained*, and a rule that bans
 * its own explanation would be undocumentable.
 */
function userFacingLiterals(dir: string): string[] {
  const base = join(__dirname, "..", "..", dir);
  const files = readdirSync(base)
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes(".stories."))
    .map((f) => join(base, f));

  expect(files.length).toBeGreaterThan(0);

  return files.flatMap((file) => {
    const source = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    return source.match(/"[^"\n]*"|'[^'\n]*'|`[^`\n]*`/g) ?? [];
  });
}

describe.each(COMPONENT_DIRS)("%s forbidden copy", (dir) => {
  // Read and strip once per directory, not once per forbidden word.
  const literals = userFacingLiterals(dir).filter((l) => !isSanctioned(l));

  test.each(FORBIDDEN)(
    "never ships the word %p in a string literal",
    (word) => {
      const offenders = literals.filter((l) => usesForbiddenWord(l, word));
      expect(offenders).toEqual([]);
    },
  );
});

/**
 * The half of this guard that survives #576.
 *
 * These components deliberately carry English copy defaults today (the D7
 * convention), but #576 moves that copy into the i18n resources — at which
 * point a scan of component sources alone would protect nothing and would pass
 * silently forever. So scan the resources the copy is headed for too.
 *
 * Scoped to the namespaces that carry step-planning copy — the surfaces
 * ADR-0010/0012 actually govern — and deliberately **not** every namespace. The
 * ban is on planning *framing*, not on the English words: `evidenceViewer`
 * legitimately says a photo file "is missing" (it is), and `permissions` says
 * "Camera Access Needed" (it is). Policing those would be a false positive that
 * teaches people to weaken the guard.
 *
 * Widening this to every component and screen, in `src/__tests__/structure/`,
 * is tracked as a follow-up.
 */
const PLANNING_NAMESPACES = ["editGoal", "timelineJourney", "focusMode"];

describe("planning-copy i18n resources", () => {
  const enDir = join(__dirname, "..", "..", "..", "i18n", "resources", "en");

  /** Every string value in a namespace bundle, flattened depth-first. */
  function stringValues(node: unknown): string[] {
    if (typeof node === "string") return [node];
    if (node && typeof node === "object") {
      return Object.values(node).flatMap(stringValues);
    }
    return [];
  }

  const copy = PLANNING_NAMESPACES.flatMap((namespace) => {
    const bundle = JSON.parse(
      readFileSync(join(enDir, `${namespace}.json`), "utf8"),
    );
    return stringValues(bundle)
      .filter((value) => !isSanctioned(value))
      .map((value) => ({ namespace, value }));
  });

  it("has planning copy to check", () => {
    expect(copy.length).toBeGreaterThan(0);
  });

  test.each(FORBIDDEN)("no planning copy ships the word %p", (word) => {
    const offenders = copy.filter((entry) =>
      usesForbiddenWord(entry.value, word),
    );
    expect(offenders).toEqual([]);
  });
});
