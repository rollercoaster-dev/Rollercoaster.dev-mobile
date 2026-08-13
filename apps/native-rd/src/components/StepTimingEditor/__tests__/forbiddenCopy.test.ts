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
 * framing on a passed date, and no "missing"/"needed"/"required" framing on an
 * unset one.
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

const COMPONENT_DIRS = ["StepTimingEditor", "StepDayGrid"];

function sourceFiles(dir: string): string[] {
  const base = join(__dirname, "..", "..", dir);
  return readdirSync(base)
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes(".stories."))
    .map((f) => join(base, f));
}

describe.each(COMPONENT_DIRS)("%s forbidden copy", (dir) => {
  const files = sourceFiles(dir);

  it("has source files to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test.each(FORBIDDEN)(
    "never ships the word %p in a string literal",
    (word) => {
      for (const file of files) {
        // Strip comments first: prose in doc comments is where we explain *why*
        // these words are banned, and a rule that bans its own explanation would
        // be undocumentable. Only what can reach a user is checked.
        const source = readFileSync(file, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/[^\n]*/g, "");

        const literals = source.match(/"[^"\n]*"|'[^'\n]*'|`[^`\n]*`/g) ?? [];

        for (const literal of literals) {
          if (SANCTIONED.some((ok) => literal.includes(ok))) continue;
          expect(literal.toLowerCase()).not.toContain(word);
        }
      }
    },
  );
});
