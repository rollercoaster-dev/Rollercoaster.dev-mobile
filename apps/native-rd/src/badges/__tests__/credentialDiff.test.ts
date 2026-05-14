/**
 * Tests for hasChangesSinceBake — pure-logic diff between a baked OB3
 * credential's snapshot and the current goal + evidence state.
 */
import { hasChangesSinceBake } from "../credentialDiff";
import type { GoalData, EvidenceRow } from "../credentialBuilder";

const baseGoal: GoalData = {
  id: "goal-1",
  title: "Run a 5k",
  description: "Train weekly and run one continuous 5k",
};

const baseEvidence: EvidenceRow[] = [
  { id: "ev-1", type: "note", uri: "", description: "Week 1 run done" },
  { id: "ev-2", type: "photo", uri: "file://photo.png", description: null },
];

/**
 * Minimal serialized credential matching the shape produced by
 * packages/openbadges-core/src/credentials/serializer.ts:
 *   - top-level `evidence` array
 *   - `credentialSubject.achievement.name` + `.description`
 */
function makeCredentialJson(
  overrides: {
    title?: string;
    description?: string;
    evidenceCount?: number;
  } = {},
): string {
  const title = overrides.title ?? baseGoal.title;
  const description =
    overrides.description ?? baseGoal.description ?? `Achievement: ${title}`;
  const evidenceCount = overrides.evidenceCount ?? baseEvidence.length;
  return JSON.stringify({
    credentialSubject: {
      achievement: {
        name: title,
        description,
      },
    },
    evidence: Array.from({ length: evidenceCount }, (_, i) => ({
      id: `urn:ulid:ev-${i}`,
    })),
  });
}

describe("hasChangesSinceBake", () => {
  it("returns false when goal + evidence match the credential snapshot", () => {
    const credential = makeCredentialJson();
    expect(hasChangesSinceBake(credential, baseGoal, baseEvidence)).toBe(false);
  });

  it("returns true when evidence has been added since the bake", () => {
    const credential = makeCredentialJson();
    const expanded = [
      ...baseEvidence,
      { id: "ev-3", type: "audio", uri: "file://audio.m4a", description: null },
    ];
    expect(hasChangesSinceBake(credential, baseGoal, expanded)).toBe(true);
  });

  it("returns true when the goal title was edited after the bake", () => {
    const credential = makeCredentialJson();
    const renamed: GoalData = { ...baseGoal, title: "Run a 10k" };
    expect(hasChangesSinceBake(credential, renamed, baseEvidence)).toBe(true);
  });

  it("returns true when the goal description was edited after the bake", () => {
    const credential = makeCredentialJson();
    const edited: GoalData = { ...baseGoal, description: "New training plan" };
    expect(hasChangesSinceBake(credential, edited, baseEvidence)).toBe(true);
  });

  it("treats the same fallback description as unchanged when goal had no description", () => {
    const titleOnlyGoal: GoalData = {
      id: "g",
      title: "Read 12 books",
      description: null,
    };
    // Builder records `Achievement: <title>` when goal.description is null.
    const credential = makeCredentialJson({
      title: titleOnlyGoal.title,
      description: `Achievement: ${titleOnlyGoal.title}`,
      evidenceCount: 0,
    });
    expect(hasChangesSinceBake(credential, titleOnlyGoal, [])).toBe(false);
  });

  it("returns true on malformed JSON (fail-open to offer rebake)", () => {
    expect(hasChangesSinceBake("{not-json", baseGoal, baseEvidence)).toBe(true);
  });

  it("returns true when the credential is missing the achievement subtree", () => {
    const broken = JSON.stringify({ evidence: [] });
    expect(hasChangesSinceBake(broken, baseGoal, baseEvidence)).toBe(true);
  });

  it("returns true on null / empty credential payload", () => {
    expect(hasChangesSinceBake(null, baseGoal, baseEvidence)).toBe(true);
    expect(hasChangesSinceBake("", baseGoal, baseEvidence)).toBe(true);
  });
});
