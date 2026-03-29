import { renderHook, act } from "@testing-library/react-native";

const mockUseQuery = jest.fn();
jest.mock("@evolu/react", () => {
  const actual = jest.requireActual("@evolu/react");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
  };
});

const mockCreateUserSettings = jest.fn();
const mockMarkWelcomeSeen = jest.fn();

jest.mock("../../db", () => ({
  userSettingsQuery: { __brand: "userSettingsQuery" },
  createUserSettings: (...args: unknown[]) => mockCreateUserSettings(...args),
  markWelcomeSeen: (...args: unknown[]) => mockMarkWelcomeSeen(...args),
}));

import { useFirstLaunch } from "../useFirstLaunch";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseQuery.mockReturnValue([]);
});

const makeSettings = (overrides: Record<string, unknown> = {}) => ({
  id: "settings-1",
  theme: null,
  density: null,
  animationPref: null,
  fontScale: null,
  keyId: null,
  hasSeenWelcome: null,
  ...overrides,
});

describe("useFirstLaunch", () => {
  describe("loading state", () => {
    it("returns isFirstLaunch: null when useQuery returns empty array", () => {
      mockUseQuery.mockReturnValue([]);
      const { result } = renderHook(() => useFirstLaunch());
      expect(result.current.isFirstLaunch).toBeNull();
    });
  });

  describe("first launch", () => {
    it("returns isFirstLaunch: true when hasSeenWelcome is null", () => {
      mockUseQuery.mockReturnValue([makeSettings({ hasSeenWelcome: null })]);
      const { result } = renderHook(() => useFirstLaunch());
      expect(result.current.isFirstLaunch).toBe(true);
    });

    it("returns isFirstLaunch: true when hasSeenWelcome is 0", () => {
      mockUseQuery.mockReturnValue([makeSettings({ hasSeenWelcome: 0 })]);
      const { result } = renderHook(() => useFirstLaunch());
      expect(result.current.isFirstLaunch).toBe(true);
    });

    it("calls createUserSettings when no settings row exists", () => {
      mockUseQuery.mockReturnValue([]);
      renderHook(() => useFirstLaunch());
      expect(mockCreateUserSettings).toHaveBeenCalledTimes(1);
    });

    it("does not call createUserSettings a second time on re-render", () => {
      mockUseQuery.mockReturnValue([]);
      const { rerender } = renderHook(() => useFirstLaunch());
      rerender({});
      expect(mockCreateUserSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe("returning user", () => {
    it("returns isFirstLaunch: false when hasSeenWelcome is 1", () => {
      mockUseQuery.mockReturnValue([makeSettings({ hasSeenWelcome: 1 })]);
      const { result } = renderHook(() => useFirstLaunch());
      expect(result.current.isFirstLaunch).toBe(false);
    });
  });

  describe("state transitions", () => {
    it("transitions from null to true when query resolves with no hasSeenWelcome", () => {
      mockUseQuery.mockReturnValue([]);
      const { result, rerender } = renderHook(() => useFirstLaunch());
      expect(result.current.isFirstLaunch).toBeNull();

      mockUseQuery.mockReturnValue([makeSettings({ hasSeenWelcome: null })]);
      rerender({});
      expect(result.current.isFirstLaunch).toBe(true);
    });

    it("transitions from null to false when query resolves with hasSeenWelcome: 1", () => {
      mockUseQuery.mockReturnValue([]);
      const { result, rerender } = renderHook(() => useFirstLaunch());
      expect(result.current.isFirstLaunch).toBeNull();

      mockUseQuery.mockReturnValue([makeSettings({ hasSeenWelcome: 1 })]);
      rerender({});
      expect(result.current.isFirstLaunch).toBe(false);
    });

    it("transitions from true to false after markSeen and Evolu re-emits", () => {
      mockUseQuery.mockReturnValue([makeSettings({ hasSeenWelcome: null })]);
      const { result, rerender } = renderHook(() => useFirstLaunch());
      expect(result.current.isFirstLaunch).toBe(true);

      act(() => result.current.markSeen());

      // Simulate Evolu reactive update
      mockUseQuery.mockReturnValue([makeSettings({ hasSeenWelcome: 1 })]);
      rerender({});
      expect(result.current.isFirstLaunch).toBe(false);
    });
  });

  describe("markSeen()", () => {
    it("calls markWelcomeSeen with the settings id when settings is loaded", () => {
      mockUseQuery.mockReturnValue([makeSettings()]);
      const { result } = renderHook(() => useFirstLaunch());
      act(() => result.current.markSeen());
      expect(mockMarkWelcomeSeen).toHaveBeenCalledWith("settings-1");
    });

    it("is a no-op when settings is null (still loading)", () => {
      mockUseQuery.mockReturnValue([]);
      const { result } = renderHook(() => useFirstLaunch());
      act(() => result.current.markSeen());
      expect(mockMarkWelcomeSeen).not.toHaveBeenCalled();
    });
  });
});
