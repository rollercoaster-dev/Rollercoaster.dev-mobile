import { renderHook } from "@testing-library/react-native";
import { useTypeScale } from "../useTypeScale";
import { composeTheme } from "../../themes/compose";
import { mockFontScale } from "../../__tests__/fontScale";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const unistylesMock = require("react-native-unistyles");

describe("useTypeScale", () => {
  afterEach(() => {
    unistylesMock.useUnistyles.mockReturnValue({
      theme: unistylesMock.mockTheme,
      rt: unistylesMock.UnistylesRuntime,
    });
  });

  it("reports the pinned test font scale on the default theme", () => {
    const { result } = renderHook(() => useTypeScale());
    expect(result.current).toMatchObject({
      fontScale: 1,
      themeScale: 1,
      isLargeType: false,
      isAccessibilitySize: false,
    });
  });

  it.each([
    [1.29, false, false],
    [1.3, true, false],
    [1.59, true, false],
    [1.6, true, true],
    [3.1, true, true],
  ])(
    "fontScale %s → isLargeType %s, isAccessibilitySize %s",
    (fontScale, isLargeType, isAccessibilitySize) => {
      mockFontScale(fontScale);
      const { result } = renderHook(() => useTypeScale());
      expect(result.current.isLargeType).toBe(isLargeType);
      expect(result.current.isAccessibilitySize).toBe(isAccessibilitySize);
    },
  );

  it("treats Low Vision as large type at OS 100%", () => {
    unistylesMock.useUnistyles.mockReturnValue({
      theme: composeTheme("light", "lowVision"),
    });
    const { result } = renderHook(() => useTypeScale());
    expect(result.current.themeScale).toBe(1.25);
    expect(result.current.isLargeType).toBe(true);
  });

  it.each([0, -1, Number.NaN])(
    "falls back to fontScale 1 when the platform reports %s",
    (fontScale) => {
      mockFontScale(fontScale);
      const { result } = renderHook(() => useTypeScale());
      expect(result.current.fontScale).toBe(1);
      expect(result.current.scaleFor("body")).toBe(1);
    },
  );

  it("re-renders when the OS font scale changes", () => {
    const { result } = renderHook(() => useTypeScale());
    mockFontScale(2.35);
    expect(result.current.fontScale).toBe(2.35);
  });

  describe("scaleFor", () => {
    it("follows the OS scale below the cap", () => {
      mockFontScale(1.2);
      const { result } = renderHook(() => useTypeScale());
      expect(result.current.scaleFor("body")).toBe(1.2);
      expect(result.current.scaleFor("headline")).toBe(1.2);
    });

    it("stops at each role's cap", () => {
      mockFontScale(3.1);
      const { result } = renderHook(() => useTypeScale());
      expect(result.current.scaleFor("body")).toBe(2);
      expect(result.current.scaleFor("headline")).toBe(1.5);
      expect(result.current.scaleFor("chrome")).toBe(1.3);
    });

    it("composes with Low Vision's theme scale", () => {
      unistylesMock.useUnistyles.mockReturnValue({
        theme: composeTheme("light", "lowVision"),
      });
      mockFontScale(3.1);
      const { result } = renderHook(() => useTypeScale());
      expect(result.current.scaleFor("body") * 1.25).toBeCloseTo(2);
      expect(result.current.scaleFor("headline") * 1.25).toBeCloseTo(1.5);
    });
  });
});
