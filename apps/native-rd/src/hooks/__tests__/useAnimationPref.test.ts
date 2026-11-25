import { renderHook, act } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { UnistylesRuntime } from "react-native-unistyles";

import { useAnimationPref } from "../useAnimationPref";

const mockUseQuery = jest.fn();
jest.mock("@evolu/react", () => {
  const actual = jest.requireActual("@evolu/react");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
  };
});

const mockUpdateUserSettings = jest.fn();
jest.mock("../../db", () => ({
  userSettingsQuery: { __brand: "userSettingsQuery" },
  updateUserSettings: (...args: unknown[]) => mockUpdateUserSettings(...args),
}));

const mockReportError = jest.fn();
jest.mock("../../services/sentry-report", () => ({
  ...jest.requireActual("../../services/sentry-report"),
  reportError: (...args: unknown[]) => mockReportError(...args),
}));

const mockRuntime = UnistylesRuntime as unknown as { themeName: string };

let reduceMotionListener: ((enabled: boolean) => void) | null = null;

function settingsRow(animationPref: string | null) {
  return [{ id: "settings-1", animationPref }];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRuntime.themeName = "light-default";
  mockUseQuery.mockReturnValue(settingsRow(null));
  mockUpdateUserSettings.mockReturnValue({ ok: true, value: {} });
  reduceMotionListener = null;
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((
    _event: string,
    cb: (enabled: boolean) => void,
  ) => {
    reduceMotionListener = cb;
    return { remove: jest.fn() };
  }) as unknown as typeof AccessibilityInfo.addEventListener);
});

describe("useAnimationPref", () => {
  it.each(["full", "reduced", "none"] as const)(
    "uses the saved %s choice when nothing overrides it",
    (pref) => {
      mockUseQuery.mockReturnValue(settingsRow(pref));
      const { result } = renderHook(() => useAnimationPref());
      expect(result.current.animationPref).toBe(pref);
      expect(result.current.userPref).toBe(pref);
      expect(result.current.override).toBeNull();
    },
  );

  it("treats an unknown saved value as full", () => {
    mockUseQuery.mockReturnValue(settingsRow("sparkly"));
    const { result } = renderHook(() => useAnimationPref());
    expect(result.current.userPref).toBe("full");
  });

  it("lets Still Water keep motion off while reporting the saved choice", () => {
    mockUseQuery.mockReturnValue(settingsRow("full"));
    mockRuntime.themeName = "light-autismFriendly";
    const { result } = renderHook(() => useAnimationPref());
    expect(result.current.animationPref).toBe("none");
    expect(result.current.userPref).toBe("full");
    expect(result.current.override).toBe("theme");
  });

  it("lets the device's Reduce Motion keep motion off", () => {
    mockUseQuery.mockReturnValue(settingsRow("reduced"));
    const { result } = renderHook(() => useAnimationPref());

    act(() => reduceMotionListener?.(true));
    expect(result.current.animationPref).toBe("none");
    expect(result.current.userPref).toBe("reduced");
    expect(result.current.override).toBe("os");

    act(() => reduceMotionListener?.(false));
    expect(result.current.animationPref).toBe("reduced");
    expect(result.current.override).toBeNull();
  });

  it("persists a new choice and reports success", () => {
    const { result } = renderHook(() => useAnimationPref());
    let ok: boolean | undefined;
    act(() => {
      ok = result.current.setAnimationPref("reduced");
    });
    expect(ok).toBe(true);
    expect(mockUpdateUserSettings).toHaveBeenCalledWith("settings-1", {
      animationPref: "reduced",
    });
  });

  it("returns false and reports the error when the write fails", () => {
    const error = new Error("write failed");
    mockUpdateUserSettings.mockReturnValue({ ok: false, error });
    const { result } = renderHook(() => useAnimationPref());
    let ok: boolean | undefined;
    act(() => {
      ok = result.current.setAnimationPref("none");
    });
    expect(ok).toBe(false);
    expect(mockReportError).toHaveBeenCalledWith(expect.anything(), {
      area: "settings.motion",
    });
  });
});
