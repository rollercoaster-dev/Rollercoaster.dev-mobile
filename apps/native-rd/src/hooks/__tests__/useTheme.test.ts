import { renderHook } from "@testing-library/react-native";
import { UnistylesRuntime } from "react-native-unistyles";

import { themeOptions, useTheme } from "../useTheme";
import { themeNames, themes } from "../../themes/compose";

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
  it("keeps UI theme options aligned with the runtime registry", () => {
    expect(themeOptions.map((option) => option.id)).toEqual(themeNames);
  });

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

  it("throws when the outer-provider setTheme stub is invoked", () => {
    const { result } = renderHook(() => useTheme());

    expect(() => result.current.setTheme("dark-default")).toThrow(
      /outer-provider stub/i,
    );
  });
});
