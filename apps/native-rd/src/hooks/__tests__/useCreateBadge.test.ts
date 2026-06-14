/**
 * Tests for useCreateBadge hook
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useQuery } from "@evolu/react";
import { useCreateBadge } from "../useCreateBadge";
import { completeGoal, createBadge, updateBadge, GoalStatus } from "../../db";
import type { GoalId } from "../../db";
import { i18n } from "../../i18n";

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
  canCompleteGoal: (evidence: { type: string | null }[]) =>
    evidence.some((e) => e.type !== null),
  completeGoal: jest.fn(),
  createBadge: jest.fn(),
  updateBadge: jest.fn(),
  GoalStatus: { active: "active", completed: "completed" },
}));

jest.mock("../../services/sentry-report", () => ({
  reportError: jest.fn(),
  breadcrumb: jest.fn(),
}));

jest.mock("../../badges", () => ({
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
    Promise.resolve(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  ),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockCompleteGoal = completeGoal as jest.Mock;
const mockCreateBadge = createBadge as jest.Mock;
const mockUpdateBadge = updateBadge as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { keyProvider: mockKeyProvider } = require("../../crypto");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useUserKey: mockUseUserKey } = require("../useUserKey");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockBadges = require("../../badges");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { breadcrumb: mockBreadcrumb } = require("../../services/sentry-report");

const GOAL_ID = "goal-01" as GoalId;
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

  describe("when badge already exists AND goal is completed", () => {
    it("returns status: done without creating or updating a badge (idempotent)", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-goals-query")
          return [{ ...MOCK_GOAL, status: GoalStatus.completed }];
        if (query === "mock-badge-query")
          return [
            { id: "badge-01", goalId: GOAL_ID, imageUri: "file:///old.png" },
          ];
        return [];
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(result.current.status).toBe("done");
      expect(mockCreateBadge).not.toHaveBeenCalled();
      expect(mockUpdateBadge).not.toHaveBeenCalled();
    });
  });

  describe("when badge already exists AND goal is active (re-completion)", () => {
    const EXISTING_IMAGE_URI = "file:///app/badges/old-badge.png";

    it("re-bakes via updateBadge (not createBadge) using freshCapturedPng when provided", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-goals-query") return [MOCK_GOAL]; // active
        if (query === "mock-evidence-query")
          return [{ id: "ev-1", type: "photo", goalId: GOAL_ID }];
        if (query === "mock-badge-query")
          return [
            {
              id: "badge-01",
              goalId: GOAL_ID,
              imageUri: EXISTING_IMAGE_URI,
            },
          ];
        return [];
      });

      const FRESH = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 99, 99]);
      const { result } = renderHook(() =>
        useCreateBadge(GOAL_ID, { freshCapturedPng: FRESH }),
      );
      await act(async () => {});

      expect(result.current.status).toBe("done");
      expect(mockUpdateBadge).toHaveBeenCalledWith(
        "badge-01",
        expect.objectContaining({
          credential: expect.stringContaining("VerifiableCredential"),
          imageUri: "file:///app/badges/test-badge.png",
        }),
      );
      expect(mockCreateBadge).not.toHaveBeenCalled();
      expect(mockCompleteGoal).toHaveBeenCalled();
      // freshCapturedPng wins — readBadgePNG must NOT be called.
      expect(mockBadges.readBadgePNG).not.toHaveBeenCalled();
      // bakePNG seeds from the fresh buffer
      expect(mockBadges.bakePNG).toHaveBeenCalledWith(
        FRESH,
        expect.any(String),
      );
    });

    it("re-bakes using readBadgePNG of the existing imageUri when no freshCapturedPng is provided", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-goals-query") return [MOCK_GOAL]; // active
        if (query === "mock-evidence-query")
          return [{ id: "ev-1", type: "photo", goalId: GOAL_ID }];
        if (query === "mock-badge-query")
          return [
            {
              id: "badge-01",
              goalId: GOAL_ID,
              imageUri: EXISTING_IMAGE_URI,
            },
          ];
        return [];
      });

      const EXISTING_BYTES = Buffer.from([
        137, 80, 78, 71, 13, 10, 26, 10, 7, 7, 7,
      ]);
      mockBadges.readBadgePNG.mockResolvedValueOnce(EXISTING_BYTES);

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(result.current.status).toBe("done");
      expect(mockBadges.readBadgePNG).toHaveBeenCalledWith(EXISTING_IMAGE_URI);
      expect(mockBadges.bakePNG).toHaveBeenCalledWith(
        EXISTING_BYTES,
        expect.any(String),
      );
      expect(mockUpdateBadge).toHaveBeenCalled();
      expect(mockCreateBadge).not.toHaveBeenCalled();
    });

    it("fails loud when readBadgePNG throws on re-completion (does not silently fall back)", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-goals-query") return [MOCK_GOAL]; // active
        if (query === "mock-evidence-query")
          return [{ id: "ev-1", type: "photo", goalId: GOAL_ID }];
        if (query === "mock-badge-query")
          return [
            {
              id: "badge-01",
              goalId: GOAL_ID,
              imageUri: EXISTING_IMAGE_URI,
            },
          ];
        return [];
      });
      mockBadges.readBadgePNG.mockRejectedValueOnce(new Error("File missing"));

      const FALLBACK = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 1]);
      const { result } = renderHook(() =>
        useCreateBadge(GOAL_ID, { capturedPng: FALLBACK }),
      );
      await act(async () => {});

      expect(result.current.status).toBe("error");
      expect(result.current.error).toContain("File missing");
      // The URI must be in the surfaced error so the user-visible badgeError
      // points at the missing file, not a context-free FileSystem message.
      expect(result.current.error).toContain(EXISTING_IMAGE_URI);
      expect(mockBadges.bakePNG).not.toHaveBeenCalled();
      expect(mockUpdateBadge).not.toHaveBeenCalled();
      expect(mockCreateBadge).not.toHaveBeenCalled();
    });

    it("fails loud when readBadgePNG returns non-PNG bytes on re-completion", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-goals-query") return [MOCK_GOAL]; // active
        if (query === "mock-evidence-query")
          return [{ id: "ev-1", type: "photo", goalId: GOAL_ID }];
        if (query === "mock-badge-query")
          return [
            {
              id: "badge-01",
              goalId: GOAL_ID,
              imageUri: EXISTING_IMAGE_URI,
            },
          ];
        return [];
      });
      mockBadges.readBadgePNG.mockResolvedValueOnce(
        Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
      );

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(result.current.status).toBe("error");
      expect(result.current.error).toContain("is not a valid PNG");
      expect(mockBadges.bakePNG).not.toHaveBeenCalled();
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
        evidence: Record<string, unknown>[];
      };
      const goalEvidence = callArg.evidence.find((e) => e.id === "ev-1");
      expect(goalEvidence).not.toHaveProperty("stepTitle");
    });
  });

  // The criteria narrative is localized to the active UI language and composed
  // here (not in the pure credentialBuilder) so it can reach i18next. Assert
  // against i18n.t(key) rather than hardcoded English: the contract is "the
  // hook used this key with this count/title", which survives copy edits and
  // proves localization is wired (a reverted hardcoded literal would diverge
  // under any non-en language).
  describe("criteria narrative localization", () => {
    const narrativeArg = () =>
      (
        mockBadges.buildUnsignedCredential.mock.calls[0][0] as {
          narrative: string;
        }
      ).narrative;

    it("composes the plural narrative with evidence count and goal title", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-goals-query") return [MOCK_GOAL];
        if (query === "mock-evidence-query")
          return [
            { id: "ev-1", type: "photo", goalId: GOAL_ID },
            { id: "ev-2", type: "photo", goalId: GOAL_ID },
            { id: "ev-3", type: "text", goalId: GOAL_ID },
          ];
        if (query === "mock-step-evidence-query") return [];
        if (query === "mock-badge-query") return [];
        return [];
      });

      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(narrativeArg()).toBe(
        i18n.t("badges:credential.narrative", {
          count: 3,
          title: "My Goal",
        }),
      );
    });

    it("uses the singular form for a single evidence item", async () => {
      // Default mock returns exactly one goal-evidence row.
      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(narrativeArg()).toBe(
        i18n.t("badges:credential.narrative", { count: 1, title: "My Goal" }),
      );
      expect(narrativeArg()).not.toContain("1 items");
    });

    it("uses the no-evidence narrative (no evidence clause) when there is none", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-goals-query") return [MOCK_GOAL];
        if (query === "mock-evidence-query") return [];
        if (query === "mock-step-evidence-query") return [];
        if (query === "mock-badge-query") return [];
        return [];
      });

      // No evidence → the bake later throws at the canCompleteGoal gate, but
      // buildUnsignedCredential is called first, so the narrative arg is still
      // captured.
      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(narrativeArg()).toBe(
        i18n.t("badges:credential.narrativeNoEvidence", { title: "My Goal" }),
      );
      expect(narrativeArg()).not.toContain("Evidence");
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

  describe("retryBake (recovery from terminal error)", () => {
    it("exposes a retryBake function on the result", async () => {
      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      expect(typeof result.current.retryBake).toBe("function");
      // Flush the on-mount bake pipeline so its async setState calls settle
      // inside act rather than after the test body returns.
      await act(async () => {});
    });

    it("resets status to idle and clears error after a bake failure", async () => {
      mockBadges.bakePNG.mockImplementationOnce(() => {
        throw new Error("corrupt PNG chunk");
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      // Precondition: the pipeline reached the terminal error state.
      expect(result.current.status).toBe("error");
      expect(result.current.error).toContain("corrupt PNG chunk");

      act(() => {
        result.current.retryBake();
      });

      // The guard is cleared and the user-visible error is gone. With the
      // default stable query mock the effect does not re-fire, so the hook
      // rests at idle rather than immediately re-baking — isolating the reset.
      expect(result.current.status).toBe("idle");
      expect(result.current.error).toBeNull();
    });

    it("is inert when called outside the error state (does not reset a done bake)", async () => {
      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      // Precondition: the bake succeeded and the hook is at the terminal "done".
      expect(result.current.status).toBe("done");
      expect(mockCreateBadge).toHaveBeenCalledTimes(1);

      // Calling retryBake from "done" must be a no-op — the gate returns early,
      // so the guard isn't re-armed and the pipeline doesn't run a second time.
      act(() => {
        result.current.retryBake();
      });

      expect(result.current.status).toBe("done");
      expect(mockCreateBadge).toHaveBeenCalledTimes(1);
    });

    it("re-runs the bake pipeline after retry when the host re-renders", async () => {
      // Mirror Evolu's fresh-ref-per-render behaviour (see hook comments): a new
      // goal object each render means the guarded effect re-evaluates on every
      // render, so clearing hasTriggered via retryBake lets the next render
      // re-enter the pipeline — exactly the production recovery path.
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-goals-query") return [{ ...MOCK_GOAL }];
        if (query === "mock-evidence-query")
          return [
            { id: "ev-1", type: "photo", uri: "file://x", goalId: GOAL_ID },
          ];
        if (query === "mock-step-evidence-query") return [];
        if (query === "mock-badge-query") return [];
        return [];
      });
      // First attempt fails at bake; the retry attempt then succeeds.
      mockBadges.bakePNG.mockImplementationOnce(() => {
        throw new Error("transient bake failure");
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(result.current.status).toBe("error");
      expect(mockCreateBadge).not.toHaveBeenCalled();

      act(() => {
        result.current.retryBake();
      });

      // The pipeline ran again and completed: the badge was created and the
      // hook reached done without the user leaving the screen. waitFor wraps the
      // re-entered pipeline's trailing async setState calls in act as they land.
      await waitFor(() => expect(result.current.status).toBe("done"));
      expect(mockCreateBadge).toHaveBeenCalledTimes(1);
    });
  });
});
