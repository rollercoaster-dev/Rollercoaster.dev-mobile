import { renderHook } from "@testing-library/react-native";
import { useFlashOnIncrease } from "../useFlashOnIncrease";

jest.mock("../useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: "full",
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  }),
}));

jest.mock("react-native-reanimated", () => {
  let sharedVal = { value: 0 };
  return {
    useSharedValue: (initial: number) => {
      sharedVal = { value: initial };
      return sharedVal;
    },
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withTiming: (val: number) => val,
  };
});

describe("useFlashOnIncrease", () => {
  it("returns an animated style object", () => {
    const { result } = renderHook(() => useFlashOnIncrease(0));
    expect(result.current).toHaveProperty("opacity");
  });

  it("starts with zero opacity", () => {
    const { result } = renderHook(() => useFlashOnIncrease(0));
    expect(result.current.opacity).toBe(0);
  });
});
