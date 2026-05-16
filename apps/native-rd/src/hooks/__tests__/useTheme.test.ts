import { renderHook } from "@testing-library/react-native";
import { UnistylesRuntime } from "react-native-unistyles";

import { useTheme } from "../useTheme";
import { themes } from "../../themes/compose";

const mockRuntime = UnistylesRuntime as unknown as {
  themeName: string;
};

function setMockRuntimeThemeName(themeName: string) {
  mockRuntime.themeName = themeName;
}

beforeEach(() => {
  setMockRuntimeThemeName("light-default");
});

describe("useTheme", () => {
  it("reads the current runtime theme from Unistyles rt", () => {
    setMockRuntimeThemeName("dark-default");

    const { result } = renderHook(() => useTheme());

    expect(result.current.themeName).toBe("dark-default");
    expect(result.current.theme).toBe(themes["dark-default"]);
    expect(result.current.isDark).toBe(true);
    expect(result.current.variant).toBe("default");
  });

  it("falls back when the runtime theme name is unsupported", () => {
    setMockRuntimeThemeName("dark-dyslexia");

    const { result } = renderHook(() => useTheme());

    expect(result.current.themeName).toBe("light-default");
    expect(result.current.theme).toBe(themes["light-default"]);
  });
});
