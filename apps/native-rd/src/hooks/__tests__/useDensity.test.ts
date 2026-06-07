import { renderHook, act } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { UnistylesRuntime } from "react-native-unistyles";

import { useDensity } from "../useDensity";
import { themeNames } from "../../themes/compose";
import { __resetUserSettingsRowInitForTests } from "../useUserSettingsRow";

type ChangeListener = (status: AppStateStatus) => void;
type MutableAppState = { currentState: AppStateStatus | unknown };

let appStateListeners: ChangeListener[] = [];
const originalAppStateCurrent = (AppState as unknown as MutableAppState)
  .currentState;

function setAppState(status: AppStateStatus) {
  (AppState as unknown as MutableAppState).currentState = status;
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

const updateThemeSpy = jest.spyOn(UnistylesRuntime, "updateTheme");

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

beforeEach(() => {
  jest.clearAllMocks();
  updateThemeSpy.mockClear();
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
  (AppState as unknown as MutableAppState).currentState =
    originalAppStateCurrent;
});

describe("useDensity", () => {
  describe("apply path (active)", () => {
    it("does not call updateTheme when the saved density matches the default", () => {
      mockUseQuery.mockReturnValue([makeSettings({ density: "default" })]);
      renderHook(() => useDensity());
      expect(updateThemeSpy).not.toHaveBeenCalled();
    });

    it("applies a non-default density across every theme", () => {
      mockUseQuery.mockReturnValue([makeSettings({ density: "comfortable" })]);
      renderHook(() => useDensity());
      expect(updateThemeSpy).toHaveBeenCalledTimes(themeNames.length);
      for (const name of themeNames) {
        expect(updateThemeSpy).toHaveBeenCalledWith(name, expect.any(Function));
      }
    });
  });

  describe("write path — setDensity()", () => {
    it("persists the new level via updateUserSettings", () => {
      mockUseQuery.mockReturnValue([makeSettings({ density: "default" })]);
      const { result } = renderHook(() => useDensity());
      act(() => result.current.setDensity("compact"));
      expect(mockUpdateUserSettings).toHaveBeenCalledWith("settings-1", {
        density: "compact",
      });
    });
  });

  describe("AppState guard (NATIVE-RD-4 workaround)", () => {
    it("does not touch updateTheme while backgrounded", () => {
      setAppState("background");
      mockUseQuery.mockReturnValue([makeSettings({ density: "comfortable" })]);
      renderHook(() => useDensity());
      expect(updateThemeSpy).not.toHaveBeenCalled();
    });

    it("flushes the density update on transition to active", () => {
      setAppState("background");
      mockUseQuery.mockReturnValue([makeSettings({ density: "comfortable" })]);
      renderHook(() => useDensity());
      expect(updateThemeSpy).not.toHaveBeenCalled();

      act(() => emitAppState("active"));
      expect(updateThemeSpy).toHaveBeenCalledTimes(themeNames.length);
      for (const name of themeNames) {
        expect(updateThemeSpy).toHaveBeenCalledWith(name, expect.any(Function));
      }
    });
  });
});
