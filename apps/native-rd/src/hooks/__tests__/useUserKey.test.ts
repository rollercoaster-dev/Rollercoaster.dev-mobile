/**
 * Tests for useUserKey hook
 *
 * Verifies the first-launch key generation lifecycle:
 * - generates keypair when UserSettings has no keyId
 * - does NOT regenerate when keyId already exists
 * - surfaces error when SecureStore is unavailable
 */
import { renderHook, act } from "@testing-library/react-native";
import { useQuery } from "@evolu/react";
import { useUserKey } from "../useUserKey";
import {
  updateUserSettingsKey,
  clearUserSettingsKey,
  createUserSettings,
} from "../../db";

// Mock crypto module to isolate from real SecureStore
jest.mock("../../crypto", () => ({
  keyProvider: {
    isAvailable: jest.fn().mockResolvedValue(true),
    generateKeyPair: jest
      .fn()
      .mockResolvedValue({ keyId: "generated-key-id", publicKeyJwk: {} }),
    getPublicKey: jest
      .fn()
      .mockResolvedValue({ kty: "OKP", crv: "Ed25519", x: "pubkey" }),
  },
}));

jest.mock("../../db", () => ({
  userSettingsQuery: "mock-query",
  createUserSettings: jest.fn(),
  updateUserSettingsKey: jest.fn(),
  clearUserSettingsKey: jest.fn(),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockCreateUserSettings = createUserSettings as jest.Mock;
const mockUpdateUserSettingsKey = updateUserSettingsKey as jest.Mock;
const mockClearUserSettingsKey = clearUserSettingsKey as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { keyProvider: mockKeyProvider } = require("../../crypto");

const MOCK_SETTINGS_ID = "settings-id-001" as Parameters<
  typeof updateUserSettingsKey
>[0];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useUserKey", () => {
  describe("when no UserSettings row exists yet", () => {
    it("calls createUserSettings to initialise the singleton", () => {
      mockUseQuery.mockReturnValue([]);
      renderHook(() => useUserKey());
      expect(mockCreateUserSettings).toHaveBeenCalledTimes(1);
    });

    it("returns isReady: false while settings are missing", () => {
      mockUseQuery.mockReturnValue([]);
      const { result } = renderHook(() => useUserKey());
      expect(result.current.isReady).toBe(false);
      expect(result.current.keyId).toBeNull();
    });
  });

  describe("when UserSettings exists but keyId is null", () => {
    it("generates a keypair and stores the keyId", async () => {
      mockUseQuery.mockReturnValue([{ id: MOCK_SETTINGS_ID, keyId: null }]);

      renderHook(() => useUserKey());
      await act(async () => {});

      expect(mockKeyProvider.isAvailable).toHaveBeenCalled();
      expect(mockKeyProvider.generateKeyPair).toHaveBeenCalled();
      expect(mockUpdateUserSettingsKey).toHaveBeenCalledWith(
        MOCK_SETTINGS_ID,
        "generated-key-id",
      );
    });

    it("does not generate a second keypair on re-render", async () => {
      mockUseQuery.mockReturnValue([{ id: MOCK_SETTINGS_ID, keyId: null }]);

      const { rerender } = renderHook(() => useUserKey());
      await act(async () => {});

      rerender(() => useUserKey());
      await act(async () => {});

      expect(mockKeyProvider.generateKeyPair).toHaveBeenCalledTimes(1);
    });
  });

  describe("when UserSettings already has a keyId", () => {
    it("does not generate a new keypair", async () => {
      mockUseQuery.mockReturnValue([
        { id: MOCK_SETTINGS_ID, keyId: "existing-key-id" },
      ]);

      renderHook(() => useUserKey());
      await act(async () => {});

      expect(mockKeyProvider.generateKeyPair).not.toHaveBeenCalled();
    });

    it("returns isReady: true and the existing keyId after verification succeeds", async () => {
      mockUseQuery.mockReturnValue([
        { id: MOCK_SETTINGS_ID, keyId: "existing-key-id" },
      ]);

      const { result } = renderHook(() => useUserKey());
      await act(async () => {});

      expect(mockKeyProvider.getPublicKey).toHaveBeenCalledWith(
        "existing-key-id",
      );
      expect(result.current.isReady).toBe(true);
      expect(result.current.keyId).toBe("existing-key-id");
      expect(result.current.error).toBeNull();
    });

    it("isReady is false until verification resolves (gates downstream consumers)", async () => {
      mockUseQuery.mockReturnValue([
        { id: MOCK_SETTINGS_ID, keyId: "existing-key-id" },
      ]);

      const { result } = renderHook(() => useUserKey());

      // Before microtasks flush, getPublicKey hasn't resolved.
      expect(result.current.isReady).toBe(false);

      // Flush pending effects so the post-test state update is wrapped in act.
      await act(async () => {});
    });
  });

  describe("when stored keyId is orphaned in SecureStore (regression: badge creation 'Public key not found')", () => {
    it("clears the orphan keyId so the generation effect can produce a fresh keypair", async () => {
      mockUseQuery.mockReturnValue([
        { id: MOCK_SETTINGS_ID, keyId: "orphan-key-id" },
      ]);
      mockKeyProvider.getPublicKey.mockRejectedValueOnce(
        new Error("Public key not found for keyId: orphan-key-id"),
      );

      renderHook(() => useUserKey());
      await act(async () => {});

      expect(mockKeyProvider.getPublicKey).toHaveBeenCalledWith(
        "orphan-key-id",
      );
      expect(mockClearUserSettingsKey).toHaveBeenCalledWith(MOCK_SETTINGS_ID);
    });

    it("does NOT clear the keyId on transient SecureStore errors (only on 'not found')", async () => {
      mockUseQuery.mockReturnValue([
        { id: MOCK_SETTINGS_ID, keyId: "valid-key-id" },
      ]);
      mockKeyProvider.getPublicKey.mockRejectedValueOnce(
        new Error("SecureStore IO error"),
      );

      const { result } = renderHook(() => useUserKey());
      await act(async () => {});

      expect(mockClearUserSettingsKey).not.toHaveBeenCalled();
      expect(result.current.error).toContain("Key verification failed");
    });

    it("isReady stays false while keyId is orphaned (no badge attempts during self-heal)", async () => {
      mockUseQuery.mockReturnValue([
        { id: MOCK_SETTINGS_ID, keyId: "orphan-key-id" },
      ]);
      mockKeyProvider.getPublicKey.mockRejectedValueOnce(
        new Error("Public key not found for keyId: orphan-key-id"),
      );

      const { result } = renderHook(() => useUserKey());
      await act(async () => {});

      expect(result.current.isReady).toBe(false);
    });

    it("does not re-verify the same keyId on re-render", async () => {
      mockUseQuery.mockReturnValue([
        { id: MOCK_SETTINGS_ID, keyId: "existing-key-id" },
      ]);

      const { rerender } = renderHook(() => useUserKey());
      await act(async () => {});

      rerender(() => useUserKey());
      await act(async () => {});

      expect(mockKeyProvider.getPublicKey).toHaveBeenCalledTimes(1);
    });

    it("ignores a late resolution from a previous keyId (race: settings.keyId changes mid-verification)", async () => {
      // First probe (for keyId-A) hangs; we'll resolve it manually after the
      // settings.keyId has flipped to keyId-B so the late result is stale.
      let resolveFirstProbe: (jwk: JsonWebKey) => void = () => {};
      mockKeyProvider.getPublicKey.mockImplementationOnce(
        () =>
          new Promise<JsonWebKey>((resolve) => {
            resolveFirstProbe = resolve;
          }),
      );
      // Second probe (for keyId-B) resolves immediately.
      mockKeyProvider.getPublicKey.mockResolvedValueOnce({
        kty: "OKP",
        crv: "Ed25519",
        x: "B",
      });

      mockUseQuery.mockReturnValue([{ id: MOCK_SETTINGS_ID, keyId: "key-A" }]);

      const { result, rerender } = renderHook(() => useUserKey());
      await act(async () => {}); // first probe is now in-flight

      // Settings updates: keyId rotates to "key-B" before the first probe
      // resolves. Re-render with new settings reference.
      mockUseQuery.mockReturnValue([{ id: MOCK_SETTINGS_ID, keyId: "key-B" }]);
      rerender(() => useUserKey());
      await act(async () => {}); // second probe resolves, isReady -> true for key-B

      expect(result.current.keyId).toBe("key-B");
      expect(result.current.isReady).toBe(true);

      // Now the stale first probe resolves with key-A's data.
      await act(async () => {
        resolveFirstProbe({ kty: "OKP", crv: "Ed25519", x: "A" });
      });

      // The late result must NOT clobber the verified key-B state.
      expect(result.current.keyId).toBe("key-B");
      expect(result.current.isReady).toBe(true);
      expect(mockClearUserSettingsKey).not.toHaveBeenCalled();
    });
  });

  describe("when SecureStore is unavailable", () => {
    it("surfaces an error without crashing", async () => {
      mockUseQuery.mockReturnValue([{ id: MOCK_SETTINGS_ID, keyId: null }]);
      mockKeyProvider.isAvailable.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useUserKey());
      await act(async () => {});

      expect(result.current.error).toContain("Secure storage is unavailable");
      expect(mockKeyProvider.generateKeyPair).not.toHaveBeenCalled();
    });

    it("does not call updateUserSettingsKey when unavailable", async () => {
      mockUseQuery.mockReturnValue([{ id: MOCK_SETTINGS_ID, keyId: null }]);
      mockKeyProvider.isAvailable.mockResolvedValueOnce(false);

      renderHook(() => useUserKey());
      await act(async () => {});

      expect(mockUpdateUserSettingsKey).not.toHaveBeenCalled();
    });
  });

  describe("when key generation throws", () => {
    it("surfaces an error message", async () => {
      mockUseQuery.mockReturnValue([{ id: MOCK_SETTINGS_ID, keyId: null }]);
      mockKeyProvider.generateKeyPair.mockRejectedValueOnce(
        new Error("crypto unavailable"),
      );

      const { result } = renderHook(() => useUserKey());
      await act(async () => {});

      expect(result.current.error).toContain("crypto unavailable");
    });
  });
});
