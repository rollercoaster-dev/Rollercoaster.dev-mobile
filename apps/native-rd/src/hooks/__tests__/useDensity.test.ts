import { renderHook, act } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { UnistylesRuntime } from "react-native-unistyles";

import { useDensity } from "../useDensity";
import { themeNames } from "../../themes/compose";
import { __resetUserSettingsRowInitForTests } from "../useUserSettingsRow";

// Replace the global rd-logger mock for this file so we can look up Logger
// instances by scope regardless of when they're constructed (module load
// vs. inside the hook body). The registry survives jest.clearAllMocks() —
// only each instance's child mocks get reset, the entries themselves stay.
//
// `var` (not `const`) is deliberate: jest.mock is hoisted above all other
// code AND `import { useDensity }` is also hoisted as a require, which
// fires `new Logger("useDensity")` BEFORE any const body code runs. `var`
// hoists the binding (as undefined) so the factory can lazy-init it; a
// const would hit TDZ.
type ScopedMockLogger = {
  error: jest.Mock;
  warn: jest.Mock;
  info: jest.Mock;
  debug: jest.Mock;
};
// eslint-disable-next-line no-var
var mockLoggersByScope: Map<string, ScopedMockLogger> | undefined;

jest.mock("../../shims/rd-logger", () => ({
  Logger: jest.fn().mockImplementation((scope: string) => {
    mockLoggersByScope ??= new Map<string, ScopedMockLogger>();
    let logger = mockLoggersByScope.get(scope);
    if (!logger) {
      logger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      };
      mockLoggersByScope.set(scope, logger);
    }
    return logger;
  }),
}));

function getLoggerForScope(scope: string): ScopedMockLogger {
  const logger = mockLoggersByScope?.get(scope);
  if (!logger) {
    throw new Error(
      `No Logger constructed with scope "${scope}" yet. Did renderHook fail, or has the scope been renamed?`,
    );
  }
  return logger;
}

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

  describe("unknown DB value fallback", () => {
    it("falls back to 'default' when density is an unrecognised string and logs an Error", () => {
      mockUseQuery.mockReturnValue([makeSettings({ density: "cozy" })]);
      const { result } = renderHook(() => useDensity());
      expect(result.current.densityLevel).toBe("default");
      expect(getLoggerForScope("useDensity").error).toHaveBeenCalledTimes(1);
      const firstArg = getLoggerForScope("useDensity").error.mock.calls[0][0];
      expect(firstArg).toBeInstanceOf(Error);
      expect((firstArg as Error).message).toContain("cozy");
    });

    it("preserves the raw shape in the Error message for non-string corruption", () => {
      // The rd-logger shim drops meta args at the Sentry boundary — the
      // raw shape has to live in the Error message itself or it's lost.
      // String(obj) would produce "[object Object]"; JSON.stringify keeps
      // the shape recognisable.
      mockUseQuery.mockReturnValue([
        makeSettings({ density: { broken: true } }),
      ]);
      renderHook(() => useDensity());
      const firstArg = getLoggerForScope("useDensity").error.mock.calls[0][0];
      expect((firstArg as Error).message).toContain('{"broken":true}');
    });

    it("does not log when density is null", () => {
      mockUseQuery.mockReturnValue([makeSettings({ density: null })]);
      const { result } = renderHook(() => useDensity());
      expect(result.current.densityLevel).toBe("default");
      expect(getLoggerForScope("useDensity").error).not.toHaveBeenCalled();
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
