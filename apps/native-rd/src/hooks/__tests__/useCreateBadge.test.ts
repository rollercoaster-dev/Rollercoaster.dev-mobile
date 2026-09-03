/**
 * Tests for useCreateBadge hook
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useQuery } from "@evolu/react";
import { useCreateBadge } from "../useCreateBadge";
import { completeGoal, createBadge, updateBadge, GoalStatus } from "../../db";
import type { GoalId } from "../../db";
import { i18n } from "../../i18n";
import { capturedLoggerFor } from "../../__tests__/logger-helpers";

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
    getPublicKey: jest.fn().mockResolvedValue({
      kty: "EC",
      crv: "P-256",
      x: "fyNYMN0976ci7xqiSdag3buk-ZCwgXU4kz9XNkBlNUI",
      y: "hW2ojTNfH7Jbi8--CJUo3OCbH3y5n91g-IMA9MLMbTU",
    }),
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
  buildDid: jest.fn(
    () => "did:key:zDnaerDaTF5BXEavCrfRZEk316dpbLsfPDZ3WJ5hRTPFU2169",
  ),
  // Not stubbed: the JWS is the artifact this hook now produces, so the tests
  // below decode a real one rather than trusting a fake string.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  signCredentialAsVcJwt: require("../../badges/vcJwt").signCredentialAsVcJwt,
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

/** Three dot-separated base64url segments — the compact JWS the hook now emits. */
const JWS_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function decodeJwsSegment(jws: string, index: number): Record<string, unknown> {
  return JSON.parse(
    Buffer.from(jws.split(".")[index]!, "base64url").toString("utf8"),
  ) as Record<string, unknown>;
}

function decodeJwsPayload(jws: string): Record<string, unknown> {
  return decodeJwsSegment(jws, 1);
}

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

const {
  breadcrumb: mockBreadcrumb,
  reportError: mockReportError,
} = require("../../services/sentry-report");
// Must be captured at module scope, before beforeEach's clearAllMocks — see the
// helper's own note on why.
const mockLogger = capturedLoggerFor("useCreateBadge");

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
  // Evolu mutations return a Result — default them to ok so the success paths
  // reach setStatus("done"). Individual tests override with an ok:false Result
  // or a thrown error to exercise the failure branches.
  mockCreateBadge.mockReturnValue({ ok: true, value: { id: "badge-new" } });
  mockUpdateBadge.mockReturnValue({ ok: true, value: {} });
  mockCompleteGoal.mockReturnValue({ ok: true, value: {} });
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

/**
 * #599: the string baked into the PNG must be the very string persisted as
 * badge.credential — that is what exportJSON ships, so PNG and JSON exports
 * carry the same signed credential.
 */
function bakedCredentialArg(): string {
  return mockBadges.bakePNG.mock.calls[0][1] as string;
}

/** Credential field of the record handed to updateBadge (re-bake paths). */
function updatedCredentialArg(): string {
  return mockUpdateBadge.mock.calls[0][1].credential as string;
}

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
          credential: expect.stringMatching(JWS_PATTERN),
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
      // #599: the re-baked PNG carries the same credential updateBadge persists
      expect(updatedCredentialArg()).toBe(bakedCredentialArg());
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
      expect(updatedCredentialArg()).toBe(bakedCredentialArg());
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
      mockCompleteGoal.mockImplementation(() => {
        callOrder.push("completeGoal");
        return { ok: true, value: {} };
      });
      mockCreateBadge.mockImplementation(() => {
        callOrder.push("createBadge");
        return { ok: true, value: { id: "badge-new" } };
      });

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

    it("stores the credential as a compact JWS, not a JSON envelope", async () => {
      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(mockCreateBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          credential: expect.stringMatching(JWS_PATTERN),
        }),
      );
      const { credential } = mockCreateBadge.mock.calls[0][0] as {
        credential: string;
      };
      expect(decodeJwsPayload(credential)["vc"]).toMatchObject({
        type: ["VerifiableCredential"],
      });
    });

    it("bakes the exact credential string it persists (PNG and JSON exports agree, #599)", async () => {
      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      const { credential } = mockCreateBadge.mock.calls[0][0] as {
        credential: string;
      };
      // Guards the toBe below against a vacuous undefined === undefined.
      expect(credential).toMatch(JWS_PATTERN);
      expect(bakedCredentialArg()).toBe(credential);
    });

    it("saves the baked bytes, not the raw capture (#599 bug shape)", async () => {
      // Distinguishable from the input so "saved the raw capture" cannot pass.
      const BAKED = Buffer.concat([VALID_PNG, Buffer.from("iTXt")]);
      mockBadges.bakePNG.mockReturnValueOnce(BAKED);

      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(mockBadges.saveBadgePNG).toHaveBeenCalledWith(
        BAKED,
        expect.any(String),
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

  describe("when useUserKey reports an error (#566)", () => {
    // `isReady` implies a non-null keyId, so `{ keyId: null, isReady: true }`
    // is a state useUserKey cannot produce. The real permanent-failure shape
    // is `error` set with `isReady: false` — which must NOT read as "loading".
    it("returns status: no-key and surfaces the key error, not an unbounded loading", () => {
      mockUseUserKey.mockReturnValue({
        keyId: null,
        isReady: false,
        error: "Secure storage is unavailable on this device",
      });
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-badge-query") return [];
        return [MOCK_GOAL];
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      expect(result.current.status).toBe("no-key");
      expect(result.current.error).toBe(
        "Secure storage is unavailable on this device",
      );
      expect(mockCreateBadge).not.toHaveBeenCalled();
    });

    it("prefers no-key over the idempotent done only when no badge exists yet", () => {
      mockUseUserKey.mockReturnValue({
        keyId: "key-001",
        isReady: false,
        error: "Key verification failed: boom",
      });
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
      expect(result.current.status).toBe("done");
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

  describe("when a persistence mutation returns { ok: false } (no throw)", () => {
    it("createBadge ok:false → status error, does NOT reach done or completeGoal", async () => {
      mockCreateBadge.mockReturnValueOnce({
        ok: false,
        error: { type: "WriteError" },
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(result.current.status).toBe("error");
      expect(result.current.error).toContain("Failed to create badge record");
      expect(mockCompleteGoal).not.toHaveBeenCalled();
    });

    it("updateBadge ok:false on re-bake → status error, does NOT reach done or completeGoal", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-goals-query") return [MOCK_GOAL]; // active
        if (query === "mock-evidence-query")
          return [{ id: "ev-1", type: "photo", goalId: GOAL_ID }];
        if (query === "mock-badge-query")
          return [
            {
              id: "badge-01",
              goalId: GOAL_ID,
              imageUri: "file:///app/badges/old-badge.png",
            },
          ];
        return [];
      });
      mockUpdateBadge.mockReturnValueOnce({
        ok: false,
        error: { type: "WriteError" },
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID));
      await act(async () => {});

      expect(result.current.status).toBe("error");
      expect(result.current.error).toContain("Failed to update badge record");
      expect(mockCompleteGoal).not.toHaveBeenCalled();
    });

    it("completeGoal ok:false → status error even though the badge row was written (accepted partial state)", async () => {
      mockCompleteGoal.mockReturnValueOnce({
        ok: false,
        error: { type: "WriteError" },
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(result.current.status).toBe("error");
      expect(result.current.error).toContain("Failed to complete goal");
      // The badge row was already written — we accept badge-exists/goal-active
      // partial state rather than reporting a completed goal with no badge.
      expect(mockCreateBadge).toHaveBeenCalledTimes(1);
    });
  });

  describe("ES256 VC-JWT proof", () => {
    it("bakes the same JWS string it stores on the badge row", async () => {
      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      const { credential } = mockCreateBadge.mock.calls[0][0] as {
        credential: string;
      };
      // A divergence here means the PNG carries a different credential from
      // the DB — the export would verify against something the app can't show.
      expect(mockBadges.bakePNG).toHaveBeenCalledWith(
        expect.anything(),
        credential,
      );
    });

    it("declares alg ES256 with an inline P-256 jwk in the protected header", async () => {
      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      const { credential } = mockCreateBadge.mock.calls[0][0] as {
        credential: string;
      };
      const header = decodeJwsSegment(credential, 0);
      expect(header["alg"]).toBe("ES256");
      expect(header["jwk"]).toMatchObject({ kty: "EC", crv: "P-256" });
    });

    it("wraps the unsigned credential under `vc` and issues from the did:key", async () => {
      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      const { credential } = mockCreateBadge.mock.calls[0][0] as {
        credential: string;
      };
      const payload = decodeJwsPayload(credential);
      expect(payload["iss"]).toBe(
        "did:key:zDnaerDaTF5BXEavCrfRZEk316dpbLsfPDZ3WJ5hRTPFU2169",
      );
      expect(payload["vc"]).toBeDefined();
    });

    it("signs the header.payload bytes with the user's key", async () => {
      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      const { credential } = mockCreateBadge.mock.calls[0][0] as {
        credential: string;
      };
      const [header, payload] = credential.split(".");
      expect(mockKeyProvider.sign).toHaveBeenCalledWith(
        "key-001",
        new TextEncoder().encode(`${header}.${payload}`),
      );
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

  // #449 D13: the redesigned finishing flow drops the mandatory evidence-prompt
  // phase, so a step-driven ride reaches the gate with zero goal-scoped rows.
  // The gate must count both scopes or that ride is unbakeable — and Retry
  // can't clear it, since nothing between attempts changes the evidence count.
  describe("completion gate counts step-scoped evidence (#449)", () => {
    const stepOnlyQueries = (query: string) => {
      if (query === "mock-goals-query") return [MOCK_GOAL];
      if (query === "mock-evidence-query") return []; // no goal-scoped rows
      if (query === "mock-step-evidence-query")
        return [
          {
            id: "ev-step-1",
            type: "photo",
            uri: "file:///proof.jpg",
            description: null,
            stepTitle: "Wire the box",
          },
        ];
      if (query === "mock-badge-query") return [];
      return [];
    };

    it("bakes to done when the only evidence is step-scoped", async () => {
      mockUseQuery.mockImplementation(stepOnlyQueries);

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(result.current.error).toBeNull();
      expect(result.current.status).toBe("done");
      expect(mockCreateBadge).toHaveBeenCalled();
    });

    // Asserted on the argument, not just the resulting status: the db mock's
    // canCompleteGoal is a local mirror of the real predicate, so a status
    // assertion alone would still pass if the hook kept feeding goal-scoped
    // rows only and the mirror drifted. This pins the widened array itself.
    it("passes the combined goal+step array to completeGoal", async () => {
      mockUseQuery.mockImplementation(stepOnlyQueries);

      renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      expect(mockCompleteGoal).toHaveBeenCalledWith(GOAL_ID, [
        { type: "photo" },
      ]);
    });

    it("still throws when neither scope has a typed row", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-goals-query") return [MOCK_GOAL];
        if (query === "mock-badge-query") return [];
        return [];
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await waitFor(() => expect(result.current.status).toBe("error"));

      expect(result.current.error).toContain("no evidence attached");
      expect(mockCreateBadge).not.toHaveBeenCalled();
    });

    // #636: LogBox patches console.error, and its native overlay is invisible
    // to Maestro — it swallowed the next tap and turned bake-recovery red. The
    // no-evidence gate is an expected, user-recoverable rejection with its own
    // error UI, so it must not reach console.error or Sentry.
    it("does not log an error or report to Sentry for the expected gate rejection", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "mock-goals-query") return [MOCK_GOAL];
        if (query === "mock-badge-query") return [];
        return [];
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await waitFor(() => expect(result.current.status).toBe("error"));

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockReportError).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Badge bake blocked: evidence gate not satisfied",
        { goalId: GOAL_ID },
      );
    });

    // Guard for the other half of the narrowing: a genuine fault still has to
    // reach both LogBox and Sentry.
    it("still logs an error and reports a genuine persistence failure", async () => {
      mockCreateBadge.mockReturnValueOnce({
        ok: false,
        error: { type: "WriteError" },
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await waitFor(() => expect(result.current.status).toBe("error"));

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to create badge credential",
        expect.objectContaining({ goalId: GOAL_ID }),
      );
      expect(mockReportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ area: "badge.create" }),
      );
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

    it("clears the error and re-runs the pipeline against a STABLE goal ref", async () => {
      // #502 regression, found by the bake-recovery E2E. The default query mock
      // returns the same goal object on every render, which is what Evolu does
      // between reactive ticks. Nothing else retryBake() touches is in the
      // effect's dep array, so before the retry nonce the effect never re-fired
      // here: Retry left the UI on an unbounded "Baking your badge…" spinner
      // with no alert and no way out. The only test that had claimed to cover
      // recovery passed because its mock minted a new goal object per render.
      mockBadges.bakePNG.mockImplementationOnce(() => {
        throw new Error("corrupt PNG chunk");
      });

      const { result } = renderHook(() => useCreateBadge(GOAL_ID, WITH_PNG));
      await act(async () => {});

      // Precondition: the pipeline reached the terminal error state.
      expect(result.current.status).toBe("error");
      expect(result.current.error).toContain("corrupt PNG chunk");
      expect(mockCreateBadge).not.toHaveBeenCalled();

      act(() => {
        result.current.retryBake();
      });

      await waitFor(() => expect(result.current.status).toBe("done"));
      expect(result.current.error).toBeNull();
      expect(mockCreateBadge).toHaveBeenCalledTimes(1);
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

    it("re-runs the bake pipeline after retry when the goal ref also churns", async () => {
      // Companion to the stable-ref test above, with a new goal object per
      // render and evidence present. Recovery must not depend on which of the
      // two the host happens to produce. Note this fresh-ref mock is NOT what
      // Evolu does between reactive ticks — believing it was is what let the
      // broken retry ship (#502).
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
