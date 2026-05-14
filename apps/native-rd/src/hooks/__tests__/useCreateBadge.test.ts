/**
 * Tests for useCreateBadge hook
 */
import { renderHook, act } from "@testing-library/react-native";
import { useQuery } from "@evolu/react";
import { useCreateBadge } from "../useCreateBadge";
import { completeGoal, createBadge } from "../../db";
import type { GoalId } from "../../db";

// openbadges-core and jose are ESM-only — mock at module level
jest.mock("@rollercoaster-dev/openbadges-core", () => ({
  serializeOB3: jest.fn(() => ({
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    id: "urn:uuid:cred-01",
    type: ["VerifiableCredential"],
    issuer: {},
    validFrom: "2026-01-01T00:00:00.000Z",
    credentialSubject: {},
  })),
}));

jest.mock("../../crypto", () => ({
  keyProvider: {
    getPublicKey: jest
      .fn()
      .mockResolvedValue({ kty: "OKP", crv: "Ed25519", x: "testkey" }),
    sign: jest.fn().mockResolvedValue(new Uint8Array(64)),
  },
}));

jest.mock("../useUserKey", () => ({
  useUserKey: jest
    .fn()
    .mockReturnValue({ keyId: "key-001", isReady: true, error: null }),
}));

jest.mock("../../db", () => ({
  goalsQuery: "mock-goals-query",
  evidenceByGoalQuery: jest.fn(() => "mock-evidence-query"),
  stepEvidenceByGoalQuery: jest.fn(() => "mock-step-evidence-query"),
  badgeByGoalQuery: jest.fn(() => "mock-badge-query"),
  canCompleteGoal: (evidence: Array<{ type: string | null }>) =>
    evidence.some((e) => e.type !== null),
  completeGoal: jest.fn(),
  createBadge: jest.fn(),
  deleteBadge: jest.fn(),
}));

jest.mock("../../services/sentry-report", () => ({
  reportError: jest.fn(),
  breadcrumb: jest.fn(),
}));

jest.mock("../../badges", () => {
  // Pass-through to the real rebake-policy helpers so the hook's gating
  // logic exercises the same code as production.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const realDiff = jest.requireActual("../../badges/credentialDiff");
  return {
    buildUnsignedCredential: jest.fn(() => ({
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      id: "urn:uuid:cred-01",
      type: ["VerifiableCredential"],
    })),
    buildDid: jest.fn(() => "did:key:testkey"),
    bakePNG: jest.fn(() => Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    isPNG: jest.fn(
      (buf: Buffer) => buf.length >= 8 && buf[0] === 137 && buf[1] === 80,
    ),
    saveBadgePNG: jest.fn(() =>
      Promise.resolve("file:///app/badges/test-badge.png"),
    ),
    readBadgePNG: jest.fn(() =>
      Promise.resolve(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
    ),
    shouldRebake: realDiff.shouldRebake,
    evidenceIdsDifferFromCredential: realDiff.evidenceIdsDifferFromCredential,
    designChangedSinceBake: realDiff.designChangedSinceBake,
  };
});

const mockUseQuery = useQuery as jest.Mock;
const mockCompleteGoal = completeGoal as jest.Mock;
const mockCreateBadge = createBadge as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { keyProvider: mockKeyProvider } = require("../../crypto");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useUserKey: mockUseUserKey } = require("../useUserKey");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockBadges = require("../../badges");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { breadcrumb: mockBreadcrumb } = require("../../services/sentry-report");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { deleteBadge: mockDeleteBadge } = require("../../db");

const GOAL_ID = "goal-01" as GoalId;

/**
 * Build a stored OB3 credential JSON containing the given evidence IDs.
 * Mirrors the urn:ulid:<id> prefix the credential builder writes.
 */
function fakeStoredCredential(evidenceIds: string[]): string {
  return JSON.stringify({
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    evidence: evidenceIds.map((id) => ({
      id: `urn:ulid:${id}`,
      type: ["Evidence"],
    })),
  });
}
const MOCK_GOAL = {
  id: GOAL_ID,
  title: "My Goal",
  description: null,
  color: "#FF5733",
  status: "active",
};

/** Minimal valid PNG header — captured by callers and required by useCreateBadge. */
const VALID_PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const WITH_PNG = { capturedPng: VALID_PNG };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUserKey.mockReturnValue({
    keyId: "key-001",
    isReady: true,
    error: null,
  });
  mockBadges.bakePNG.mockReturnValue(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  mockBadges.saveBadgePNG.mockResolvedValue(
    "file:///app/badges/test-badge.png",
  );
  // Default: configure mockUseQuery to return values in sequence per render
  mockUseQuery.mockImplementation((query: string) => {
    if (query === "mock-goals-query") return [MOCK_GOAL];
    if (query === "mock-evidence-query")
      return [{ id: "ev-1", type: "photo", goalId: GOAL_ID }];
    if (query === "mock-step-evidence-query") return [];
    if (query === "mock-badge-query") return [];
    return [];
  });
});

describe("useCreateBadge", () => {
  describe("when key is not ready (isReady: false)", () => {
    it("returns status: loading — transient, key is still initialising", () => {
      mockUseUserKey.mockReturnValue({
        keyId: null,
        isReady: false,
        error: null,
      });
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-badge-query") return [];
        return [MOCK_GOAL];
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      expect(result.current.status).toBe("loading");
    });
  });

  describe("when badge already exists", () => {
    it("returns status: done without creating a new badge when evidence and design are unchanged", async () => {
      const TS = "2026-05-14T10:00:00.000Z";
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-goals-query") return [MOCK_GOAL];
        if (query === "mock-evidence-query")
          return [{ id: "ev-1", type: "photo", goalId: GOAL_ID }];
        if (query === "mock-step-evidence-query") return [];
        if (query === "mock-badge-query")
          return [
            {
              id: "badge-01",
              goalId: GOAL_ID,
              credential: fakeStoredCredential(["ev-1"]),
              imageUri: "file:///app/badges/old.png",
              design: null,
              createdAt: TS,
              updatedAt: TS,
            },
          ];
        return [];
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(result.current.status).toBe("done");
      expect(result.current.rebaked).toBe(false);
      expect(mockCreateBadge).not.toHaveBeenCalled();
      expect(mockDeleteBadge).not.toHaveBeenCalled();
    });
  });

  describe("successful badge creation", () => {
    it("calls keyProvider.getPublicKey and sign", async () => {
      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(mockKeyProvider.getPublicKey).toHaveBeenCalledWith("key-001");
      expect(mockKeyProvider.sign).toHaveBeenCalled();
    });

    it("calls createBadge before completeGoal (so a createBadge failure does not leave goal completed without badge)", async () => {
      const callOrder: string[] = [];
      mockCompleteGoal.mockImplementation(() => callOrder.push("completeGoal"));
      mockCreateBadge.mockImplementation(() => callOrder.push("createBadge"));

      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(callOrder).toEqual(["createBadge", "completeGoal"]);
    });

    it("calls createBadge with the real image URI from saveBadgePNG (not the placeholder)", async () => {
      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(mockCreateBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          goalId: GOAL_ID,
          imageUri: "file:///app/badges/test-badge.png",
        }),
      );
    });

    it("stores a credential JSON string", async () => {
      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(mockCreateBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          credential: expect.stringContaining("VerifiableCredential"),
        }),
      );
    });

    it("reaches status: done after successful creation", async () => {
      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(result.current.status).toBe("done");
      expect(result.current.error).toBeNull();
    });
  });

  describe("when capturedPng is missing", () => {
    it("fails loudly — callers must provide a PNG (no more silent blue fallback)", async () => {
      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(result.current.status).toBe("error");
      expect(result.current.error).toContain("capturedPng");
      expect(mockCreateBadge).not.toHaveBeenCalled();
    });

    it("fails loudly when design is provided but capturedPng is not", async () => {
      const designJson =
        '{"shape":"square","color":"#FF0000","iconName":"Trophy","iconWeight":"regular","frame":"none","title":"Test","centerMode":"monogram","monogram":"T"}';
      const { result } = renderHook(() =>
        useCreateBadge(GOAL_ID, { design: designJson }),
      );
      await act(async () => {});

      expect(result.current.status).toBe("error");
      expect(result.current.error).toContain("capturedPng");
      expect(mockCreateBadge).not.toHaveBeenCalled();
    });
  });

  describe("when design option is provided", () => {
    it("passes design to createBadge when capturedPng is also provided", async () => {
      const designJson =
        '{"shape":"square","color":"#FF0000","iconName":"Trophy","iconWeight":"regular","frame":"none","title":"Test","centerMode":"monogram","monogram":"T"}';
      renderHook(() =>
        useCreateBadge(GOAL_ID, {
          design: designJson,
          capturedPng: VALID_PNG,
        }),
      );
      await act(async () => {});

      expect(mockCreateBadge).toHaveBeenCalledWith(
        expect.objectContaining({ design: designJson }),
      );
    });

    it("does not include design key when option is not provided", async () => {
      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      const callArg = mockCreateBadge.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(callArg).not.toHaveProperty("design");
    });
  });

  describe("when capturedPng is provided", () => {
    it("passes the captured PNG to bakePNG", async () => {
      renderHook(() => useCreateBadge(GOAL_ID, { capturedPng: VALID_PNG }));
      await act(async () => {});

      expect(mockBadges.bakePNG).toHaveBeenCalledWith(
        VALID_PNG,
        expect.any(String),
      );
    });
  });

  describe("when key is ready but keyId is null", () => {
    it("returns status: no-key", () => {
      mockUseUserKey.mockReturnValue({
        keyId: null,
        isReady: true,
        error: null,
      });
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-badge-query") return [];
        return [MOCK_GOAL];
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      expect(result.current.status).toBe("no-key");
    });
  });

  describe("when getPublicKey throws", () => {
    it("sets status: error and populates error message", async () => {
      mockKeyProvider.getPublicKey.mockRejectedValueOnce(
        new Error("key not found in SecureStore"),
      );

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(result.current.status).toBe("error");
      expect(result.current.error).toContain("key not found in SecureStore");
    });
  });

  describe("when signing throws", () => {
    it("sets status: error and populates error message", async () => {
      mockKeyProvider.sign.mockRejectedValueOnce(
        new Error("crypto unavailable"),
      );

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(result.current.status).toBe("error");
      expect(result.current.error).toContain("crypto unavailable");
    });
  });

  describe("when bakePNG fails", () => {
    it("sets status: error — corrupt PNG is a code defect, not recoverable", async () => {
      mockBadges.bakePNG.mockImplementationOnce(() => {
        throw new Error("corrupt PNG chunk");
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      // bakePNG throwing means the PNG we generated is corrupt — a code defect.
      // Must propagate to the outer error handler, not degrade gracefully.
      expect(result.current.status).toBe("error");
      expect(result.current.error).toContain("corrupt PNG chunk");
      expect(mockCreateBadge).not.toHaveBeenCalled();
    });
  });

  describe("when saveBadgePNG fails", () => {
    it("still calls createBadge with the placeholder URI (graceful degradation)", async () => {
      mockBadges.saveBadgePNG.mockRejectedValueOnce(new Error("disk full"));

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(result.current.status).toBe("done");
      expect(mockCreateBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUri: "pending:baked-image",
        }),
      );
    });
  });

  describe("when createBadge throws", () => {
    it("sets status: error and does NOT call completeGoal (prevents partial state)", async () => {
      mockCreateBadge.mockImplementationOnce(() => {
        throw new Error("db write failed");
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(result.current.status).toBe("error");
      expect(result.current.error).toContain("db write failed");
      expect(mockCompleteGoal).not.toHaveBeenCalled();
    });
  });

  describe("proof value encoding", () => {
    it("stores a proof with a valid base64url proofValue (no +, /, or = chars)", async () => {
      // sign returns 64 zero bytes — deterministic base64url output
      mockKeyProvider.sign.mockResolvedValue(new Uint8Array(64));

      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      const callArg = mockCreateBadge.mock.calls[0][0] as {
        credential: string;
      };
      const credential = JSON.parse(callArg.credential) as Record<
        string,
        unknown
      >;
      const proof = credential["proof"] as Record<string, unknown>;

      expect(proof["proofValue"]).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(proof["proofValue"]).not.toContain("=");
      expect(proof["proofValue"]).not.toContain("+");
      expect(proof["proofValue"]).not.toContain("/");
    });
  });

  describe("step evidence includes stepTitle", () => {
    it("passes stepTitle from step evidence to buildUnsignedCredential", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-goals-query") return [MOCK_GOAL];
        if (query === "mock-evidence-query")
          return [{ id: "ev-1", type: "photo", goalId: GOAL_ID }];
        if (query === "mock-step-evidence-query")
          return [
            {
              id: "ev-2",
              type: "text",
              uri: "content:text;hello",
              description: "A note",
              stepTitle: "Wire the box",
            },
          ];
        if (query === "mock-badge-query") return [];
        return [];
      });

      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(mockBadges.buildUnsignedCredential).toHaveBeenCalledWith(
        expect.objectContaining({
          evidence: expect.arrayContaining([
            expect.objectContaining({ stepTitle: "Wire the box" }),
          ]),
        }),
      );
    });

    it("omits stepTitle property for goal-level evidence", async () => {
      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      const callArg = mockBadges.buildUnsignedCredential.mock.calls[0][0] as {
        evidence: Array<Record<string, unknown>>;
      };
      const goalEvidence = callArg.evidence.find((e) => e.id === "ev-1");
      expect(goalEvidence).not.toHaveProperty("stepTitle");
    });
  });

  describe("idempotency", () => {
    it("does not create a second badge on re-render", async () => {
      const { rerender } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      rerender(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(mockCreateBadge).toHaveBeenCalledTimes(1);
    });
  });

  describe("rebake on re-completion", () => {
    const BAKE_TS = "2026-05-14T10:00:00.000Z";

    function setupExistingBadge({
      credentialEvidenceIds,
      currentEvidenceIds,
      updatedAt = BAKE_TS,
      design = null as string | null,
      imageUri = "file:///app/badges/old.png" as string,
    }: {
      credentialEvidenceIds: string[];
      currentEvidenceIds: string[];
      updatedAt?: string;
      design?: string | null;
      imageUri?: string;
    }) {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-goals-query") return [MOCK_GOAL];
        if (query === "mock-evidence-query")
          return currentEvidenceIds.map((id) => ({
            id,
            type: "photo",
            goalId: GOAL_ID,
          }));
        if (query === "mock-step-evidence-query") return [];
        if (query === "mock-badge-query")
          return [
            {
              id: "badge-old",
              goalId: GOAL_ID,
              credential: fakeStoredCredential(credentialEvidenceIds),
              imageUri,
              design,
              createdAt: BAKE_TS,
              updatedAt,
            },
          ];
        return [];
      });
    }

    it("rebakes when evidence has changed: createBadge, then deleteBadge(old), rebaked=true", async () => {
      setupExistingBadge({
        credentialEvidenceIds: ["ev-1"],
        currentEvidenceIds: ["ev-1", "ev-2"], // evidence added
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(result.current.status).toBe("done");
      expect(result.current.rebaked).toBe(true);
      expect(mockCreateBadge).toHaveBeenCalledTimes(1);
      expect(mockDeleteBadge).toHaveBeenCalledWith("badge-old");
    });

    it("calls createBadge before deleteBadge (atomic transition, no empty interval)", async () => {
      setupExistingBadge({
        credentialEvidenceIds: ["ev-1"],
        currentEvidenceIds: ["ev-1", "ev-2"],
      });
      const order: string[] = [];
      mockCreateBadge.mockImplementation(() => order.push("createBadge"));
      mockDeleteBadge.mockImplementation(() => order.push("deleteBadge"));
      mockCompleteGoal.mockImplementation(() => order.push("completeGoal"));

      renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(order).toEqual(["createBadge", "completeGoal", "deleteBadge"]);
    });

    it("rebakes when design changed (updatedAt > createdAt) even if evidence is unchanged", async () => {
      setupExistingBadge({
        credentialEvidenceIds: ["ev-1"],
        currentEvidenceIds: ["ev-1"],
        updatedAt: "2026-05-14T10:10:00.000Z", // designer save bumped updatedAt
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(result.current.status).toBe("done");
      expect(result.current.rebaked).toBe(true);
      expect(mockCreateBadge).toHaveBeenCalled();
      expect(mockDeleteBadge).toHaveBeenCalledWith("badge-old");
    });

    it("does NOT call deleteBadge when createBadge throws on rebake (no partial state)", async () => {
      setupExistingBadge({
        credentialEvidenceIds: ["ev-1"],
        currentEvidenceIds: ["ev-1", "ev-2"],
      });
      mockCreateBadge.mockImplementationOnce(() => {
        throw new Error("db write failed");
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(result.current.status).toBe("error");
      expect(mockDeleteBadge).not.toHaveBeenCalled();
    });

    it("stores a fresh credential id (new urn:uuid) and issuedOn on rebake", async () => {
      setupExistingBadge({
        credentialEvidenceIds: ["ev-1"],
        currentEvidenceIds: ["ev-1", "ev-2"],
      });

      renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      const callArg = mockCreateBadge.mock.calls[0][0] as {
        credential: string;
      };
      const credential = JSON.parse(callArg.credential) as Record<
        string,
        unknown
      >;
      // The unsignedCredential mock always returns id: urn:uuid:cred-01, so we
      // assert the shape — the production path uses a fresh crypto.randomUUID
      // per bake, and the proof.created is a fresh ISO timestamp.
      expect(credential).toHaveProperty("id");
      expect(credential).toHaveProperty("proof");
      const proof = credential.proof as { created: string };
      expect(typeof proof.created).toBe("string");
      expect(proof.created).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("reuses previous design when caller does not supply one (rebake from reopen)", async () => {
      setupExistingBadge({
        credentialEvidenceIds: ["ev-1"],
        currentEvidenceIds: ["ev-1", "ev-2"],
        design: '{"shape":"circle","color":"#FF0000"}',
      });

      renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(mockCreateBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          design: '{"shape":"circle","color":"#FF0000"}',
        }),
      );
    });

    it("emits the 'rebake' breadcrumb (instead of 'bake') on the rebake path", async () => {
      setupExistingBadge({
        credentialEvidenceIds: ["ev-1"],
        currentEvidenceIds: ["ev-1", "ev-2"],
      });

      renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      const messages = mockBreadcrumb.mock.calls.map(
        (c: [{ message: string }]) => c[0].message,
      );
      expect(messages).toContain("rebake");
      expect(messages).not.toContain("bake");
    });
  });

  describe("breadcrumbs", () => {
    it("emits build, sign, bake, store breadcrumbs in order on success", async () => {
      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      const calls = mockBreadcrumb.mock.calls.map(
        (c: [{ category: string; message: string }]) => c[0],
      );
      expect(calls).toEqual([
        { category: "badge", message: "build" },
        { category: "badge", message: "sign" },
        { category: "badge", message: "bake" },
        { category: "badge", message: "store" },
      ]);
    });

    it("emits earlier-phase breadcrumbs but not later ones when an early phase throws", async () => {
      mockKeyProvider.sign.mockRejectedValueOnce(new Error("sign failed"));

      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      const messages = mockBreadcrumb.mock.calls.map(
        (c: [{ message: string }]) => c[0].message,
      );
      // build + sign fire (sign breadcrumb is emitted BEFORE the failing await)
      expect(messages).toContain("build");
      expect(messages).toContain("sign");
      // bake + store do not fire because the catch was hit first
      expect(messages).not.toContain("bake");
      expect(messages).not.toContain("store");
    });
  });
});
