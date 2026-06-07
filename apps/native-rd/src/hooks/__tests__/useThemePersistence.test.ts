import { renderHook, act } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { UnistylesRuntime } from "react-native-unistyles";

type ChangeListener = (status: AppStateStatus) => void;

let appStateListeners: ChangeListener[] = [];
let appStateSpy: jest.SpyInstance | undefined;

function setAppState(status: AppStateStatus) {
  if (appStateSpy) appStateSpy.mockRestore();
  appStateSpy = jest
    .spyOn(AppState, "currentState", "get")
    .mockReturnValue(status);
}

function emitAppState(status: AppStateStatus) {
  setAppState(status);
  for (const fn of [...appStateListeners]) fn(status);
}

const mockUseQuery = jest.fn();
jest.mock("@evolu/react", () => {
  const actual = jest.requireActual("@evolu/react");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
  };
});

const mockUpdateUserSettings = jest.fn();
const mockCreateUserSettings = jest.fn();

jest.mock("../../db", () => ({
  userSettingsQuery: { __brand: "userSettingsQuery" },
  createUserSettings: (...args: unknown[]) => mockCreateUserSettings(...args),
  updateUserSettings: (...args: unknown[]) => mockUpdateUserSettings(...args),
}));

import { useThemePersistence } from "../useThemePersistence";
import { themeOptions } from "../useTheme";
import { __resetUserSettingsRowInitForTests } from "../useUserSettingsRow";

const setThemeSpy = jest.spyOn(UnistylesRuntime, "setTheme");

beforeEach(() => {
  jest.clearAllMocks();
  setThemeSpy.mockClear();
  mockUseQuery.mockReturnValue([]);
  __resetUserSettingsRowInitForTests();

  appStateListeners = [];
  setAppState("active");
  jest.spyOn(AppState, "addEventListener").mockImplementation(((
    _: string,
    cb: ChangeListener,
  ) => {
    appStateListeners.push(cb);
    return {
      remove: () => {
        appStateListeners = appStateListeners.filter((l) => l !== cb);
      },
    };
  }) as unknown as typeof AppState.addEventListener);
});

afterEach(() => {
  if (appStateSpy) appStateSpy.mockRestore();
  appStateSpy = undefined;
});

const makeSettings = (overrides: Record<string, unknown> = {}) => ({
  id: "settings-1",
  theme: null,
  density: null,
  animationPref: null,
  fontScale: null,
  keyId: null,
  hasSeenWelcome: null,
  focusTimelineHidden: null,
  ...overrides,
});

describe("useThemePersistence", () => {
  describe("read path", () => {
    it("does not call UnistylesRuntime.setTheme when settings is still loading", () => {
      mockUseQuery.mockReturnValue([]);
      renderHook(() => useThemePersistence());
      expect(setThemeSpy).not.toHaveBeenCalled();
    });

    it("does not call setTheme when saved theme is null", () => {
      mockUseQuery.mockReturnValue([makeSettings({ theme: null })]);
      renderHook(() => useThemePersistence());
      expect(setThemeSpy).not.toHaveBeenCalled();
    });

    it.each(themeOptions.map((o) => o.id))(
      "applies saved theme '%s' via UnistylesRuntime.setTheme",
      (themeId) => {
        mockUseQuery.mockReturnValue([makeSettings({ theme: themeId })]);
        renderHook(() => useThemePersistence());
        expect(setThemeSpy).toHaveBeenCalledWith(themeId);
      },
    );

    it("does not re-apply the same theme on re-render", () => {
      mockUseQuery.mockReturnValue([makeSettings({ theme: "dark-default" })]);
      const { rerender } = renderHook(() => useThemePersistence());
      rerender({});
      rerender({});
      expect(setThemeSpy).toHaveBeenCalledTimes(1);
      expect(setThemeSpy).toHaveBeenCalledWith("dark-default");
    });

    it("falls back to light-default when saved value is an unsupported legacy theme", () => {
      mockUseQuery.mockReturnValue([makeSettings({ theme: "dark-dyslexia" })]);
      renderHook(() => useThemePersistence());
      expect(setThemeSpy).toHaveBeenCalledWith("light-default");
    });

    it("does not auto-write the fallback back to Evolu", () => {
      mockUseQuery.mockReturnValue([makeSettings({ theme: "dark-dyslexia" })]);
      renderHook(() => useThemePersistence());
      expect(mockUpdateUserSettings).not.toHaveBeenCalled();
    });

    it("falls back when saved value is a non-string garbage value", () => {
      mockUseQuery.mockReturnValue([makeSettings({ theme: 42 as unknown })]);
      renderHook(() => useThemePersistence());
      expect(setThemeSpy).toHaveBeenCalledWith("light-default");
    });
  });

  describe("write path — setTheme()", () => {
    it("calls UnistylesRuntime.setTheme and updateUserSettings with the same value", () => {
      mockUseQuery.mockReturnValue([makeSettings({ theme: null })]);
      const { result } = renderHook(() => useThemePersistence());
      act(() => result.current.setTheme("dark-default"));
      expect(setThemeSpy).toHaveBeenCalledWith("dark-default");
      expect(mockUpdateUserSettings).toHaveBeenCalledWith("settings-1", {
        theme: "dark-default",
      });
    });

    it("is a no-op on the Evolu side when settings has not loaded yet", () => {
      mockUseQuery.mockReturnValue([]);
      const { result } = renderHook(() => useThemePersistence());
      act(() => result.current.setTheme("dark-default"));
      // Unistyles still gets the optimistic update so the UI responds...
      expect(setThemeSpy).toHaveBeenCalledWith("dark-default");
      // ...but we can't write to Evolu without a settings.id.
      expect(mockUpdateUserSettings).not.toHaveBeenCalled();
    });

    it("refuses to apply an unsupported theme name", () => {
      mockUseQuery.mockReturnValue([makeSettings({ theme: null })]);
      const { result } = renderHook(() => useThemePersistence());
      act(() =>
        result.current.setTheme(
          "dark-dyslexia" as Parameters<typeof result.current.setTheme>[0],
        ),
      );
      expect(setThemeSpy).not.toHaveBeenCalled();
      expect(mockUpdateUserSettings).not.toHaveBeenCalled();
    });

    it("swallows updateUserSettings errors so the UI still updates", () => {
      mockUseQuery.mockReturnValue([makeSettings({ theme: null })]);
      mockUpdateUserSettings.mockImplementation(() => {
        throw new Error("simulated Evolu failure");
      });
      const { result } = renderHook(() => useThemePersistence());
      expect(() =>
        act(() => result.current.setTheme("dark-default")),
      ).not.toThrow();
      expect(setThemeSpy).toHaveBeenCalledWith("dark-default");
    });
  });

  describe("reactive sync (cross-device)", () => {
    it("re-applies when settings.theme changes from outside this device", () => {
      mockUseQuery.mockReturnValue([makeSettings({ theme: "light-default" })]);
      const { rerender } = renderHook(() => useThemePersistence());
      expect(setThemeSpy).toHaveBeenLastCalledWith("light-default");

      mockUseQuery.mockReturnValue([makeSettings({ theme: "dark-default" })]);
      rerender({});
      expect(setThemeSpy).toHaveBeenLastCalledWith("dark-default");
      expect(setThemeSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("AppState guard (NATIVE-RD-4 workaround)", () => {
    it("does not call setTheme while backgrounded; flushes on resume", () => {
      setAppState("background");
      mockUseQuery.mockReturnValue([makeSettings({ theme: "dark-default" })]);
      renderHook(() => useThemePersistence());
      expect(setThemeSpy).not.toHaveBeenCalled();

      act(() => emitAppState("active"));
      expect(setThemeSpy).toHaveBeenCalledWith("dark-default");
      expect(setThemeSpy).toHaveBeenCalledTimes(1);
    });

    it("defers a user-initiated setTheme() while backgrounded", () => {
      setAppState("background");
      mockUseQuery.mockReturnValue([makeSettings({ theme: null })]);
      const { result } = renderHook(() => useThemePersistence());

      act(() => result.current.setTheme("dark-default"));
      // Evolu write happens immediately (preserves intent across restart)…
      expect(mockUpdateUserSettings).toHaveBeenCalledWith("settings-1", {
        theme: "dark-default",
      });
      // …but the Unistyles call is deferred to avoid the shadow-tree crash.
      expect(setThemeSpy).not.toHaveBeenCalled();

      act(() => emitAppState("active"));
      expect(setThemeSpy).toHaveBeenCalledWith("dark-default");
    });

    it("dedupes a re-emitted same theme while a deferred call is pending", () => {
      setAppState("background");
      mockUseQuery.mockReturnValue([makeSettings({ theme: "dark-default" })]);
      const { rerender } = renderHook(() => useThemePersistence());
      // Same value re-emitted (e.g. Evolu sync echo).
      rerender({});
      rerender({});

      act(() => emitAppState("active"));
      // Only one flushed call, despite two re-renders while paused.
      expect(setThemeSpy).toHaveBeenCalledTimes(1);
      expect(setThemeSpy).toHaveBeenCalledWith("dark-default");
    });

    it("defers the invalid-theme fallback while backgrounded", () => {
      setAppState("background");
      mockUseQuery.mockReturnValue([makeSettings({ theme: "dark-dyslexia" })]);
      renderHook(() => useThemePersistence());
      expect(setThemeSpy).not.toHaveBeenCalled();

      act(() => emitAppState("active"));
      expect(setThemeSpy).toHaveBeenCalledWith("light-default");
    });
  });
});
