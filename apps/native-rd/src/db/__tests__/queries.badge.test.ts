/**
 * Badge CRUD operation tests
 *
 * Tests validation and error handling for OB3 credential storage
 */

import {
  createBadge,
  updateBadge,
  deleteBadge,
  badgeVersionsByGoalQuery,
} from "../queries";
import type { GoalId, BadgeId } from "../schema";

const mockGoalId = "goal_test_123" as GoalId;
const mockBadgeId = "badge_test_456" as BadgeId;

describe("Badge CRUD Operations", () => {
  test("should throw when credential is empty", () => {
    expect(() =>
      createBadge({
        goalId: mockGoalId,
        credential: "",
        imageUri: "file://badge.png",
      }),
    ).toThrow("Badge credential must not be empty");
  });

  test("should accept large OB3 credential (>1000 chars)", () => {
    const largeCredential = JSON.stringify({
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiableCredential", "OpenBadgeCredential"],
      credentialSubject: { achievement: { name: "a".repeat(2000) } },
    });
    expect(() =>
      createBadge({
        goalId: mockGoalId,
        credential: largeCredential,
        imageUri: "file://badge.png",
      }),
    ).not.toThrow();
  });

  test.each([
    ["empty imageUri", "", true],
    [">1000 char imageUri", "file://" + "a".repeat(1001), true],
    ["valid imageUri", "file://badge.png", false],
  ])("createBadge with %s", (_label, imageUri, shouldThrow) => {
    if (shouldThrow) {
      expect(() =>
        createBadge({
          goalId: mockGoalId,
          credential: '{"valid": "json"}',
          imageUri,
        }),
      ).toThrow("Badge imageUri must be 1-1000 characters");
    } else {
      expect(() =>
        createBadge({
          goalId: mockGoalId,
          credential: '{"valid": "json"}',
          imageUri,
        }),
      ).not.toThrow();
    }
  });

  test.each([
    ["empty credential", { credential: "" }, true],
    ["valid credential", { credential: '{"updated": true}' }, false],
    ["large credential", { credential: "a".repeat(5000) }, false],
    ["empty imageUri", { imageUri: "" }, true],
    [">1000 char imageUri", { imageUri: "file://" + "a".repeat(1001) }, true],
    ["valid imageUri", { imageUri: "file://new-badge.png" }, false],
    [
      "both fields",
      { credential: '{"rebaked": true}', imageUri: "file://rebaked.png" },
      false,
    ],
  ])("updateBadge with %s", (_label, fields, shouldThrow) => {
    if (shouldThrow) {
      expect(() => updateBadge(mockBadgeId, fields)).toThrow();
    } else {
      expect(() => updateBadge(mockBadgeId, fields)).not.toThrow();
    }
  });

  test("deleteBadge should succeed", () => {
    expect(() => deleteBadge(mockBadgeId)).not.toThrow();
  });

  // Design field tests
  test("createBadge accepts optional design JSON", () => {
    const design = JSON.stringify({
      shape: "circle",
      frame: "none",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Test Badge",
    });
    expect(() =>
      createBadge({
        goalId: mockGoalId,
        credential: '{"valid": "json"}',
        imageUri: "file://badge.png",
        design,
      }),
    ).not.toThrow();
  });

  test("createBadge accepts any non-empty string as design (no JSON validation)", () => {
    expect(() =>
      createBadge({
        goalId: mockGoalId,
        credential: '{"valid": "json"}',
        imageUri: "file://badge.png",
        design: "not-json",
      }),
    ).not.toThrow();
  });

  test("createBadge works without design (backward compat)", () => {
    expect(() =>
      createBadge({
        goalId: mockGoalId,
        credential: '{"valid": "json"}',
        imageUri: "file://badge.png",
      }),
    ).not.toThrow();
  });

  test.each([
    ["valid design JSON", { design: '{"shape":"circle"}' }, false],
    ["null design (clear)", { design: null }, false],
    ["empty design string", { design: "" }, true],
  ])("updateBadge design field: %s", (_label, fields, shouldThrow) => {
    if (shouldThrow) {
      expect(() => updateBadge(mockBadgeId, fields)).toThrow(
        "Badge design must not be empty",
      );
    } else {
      expect(() => updateBadge(mockBadgeId, fields)).not.toThrow();
    }
  });
});

describe("badgeVersionsByGoalQuery", () => {
  // Records the Kysely builder chain so we can assert the query shape without
  // a real database. Each chainable returns `this` and pushes the call.
  type Call = { method: string; args: unknown[] };

  function makeRecordingDb() {
    const calls: Call[] = [];
    const builder: Record<string, (...args: unknown[]) => unknown> = {};
    const chain =
      (method: string) =>
      (...args: unknown[]) => {
        calls.push({ method, args });
        return builder;
      };
    for (const method of [
      "selectFrom",
      "selectAll",
      "where",
      "orderBy",
      "limit",
    ]) {
      builder[method] = chain(method);
    }
    return { db: builder, calls };
  }

  it("selects from the badge table without filtering out soft-deleted rows", () => {
    const { db, calls } = makeRecordingDb();
    const query = badgeVersionsByGoalQuery("goal_history_1" as GoalId);
    // Mocked createQuery stashes the builder fn on the returned object.
    // Cast through unknown — the real Query<Row> type intentionally hides
    // its builder fn; the test mock attaches it for assertion purposes only.
    const fn = (query as unknown as { fn: (db: unknown) => unknown }).fn;
    fn(db);

    expect(calls).toContainEqual({ method: "selectFrom", args: ["badge"] });
    // The whole point of this query: no isDeleted filter, so soft-deleted
    // prior versions remain visible to the history surface.
    const whereCalls = calls.filter((c) => c.method === "where");
    const hasIsDeletedFilter = whereCalls.some(
      (c) => c.args[0] === "isDeleted",
    );
    expect(hasIsDeletedFilter).toBe(false);
  });

  it("filters by goalId and orders newest-first", () => {
    const { db, calls } = makeRecordingDb();
    const query = badgeVersionsByGoalQuery("goal_history_2" as GoalId);
    // Cast through unknown — the real Query<Row> type intentionally hides
    // its builder fn; the test mock attaches it for assertion purposes only.
    const fn = (query as unknown as { fn: (db: unknown) => unknown }).fn;
    fn(db);

    expect(calls).toContainEqual({
      method: "where",
      args: ["goalId", "=", "goal_history_2"],
    });
    expect(calls).toContainEqual({
      method: "orderBy",
      args: ["createdAt", "desc"],
    });
  });
});
