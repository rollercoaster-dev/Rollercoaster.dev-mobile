import React from "react";
import { render } from "@testing-library/react-native";
import { Confetti } from "../Confetti";

jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: jest.fn(() => ({
    animationPref: "full",
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  })),
}));

const { useAnimationPref } = jest.requireMock(
  "../../../hooks/useAnimationPref",
);

describe("Confetti", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useAnimationPref.mockReturnValue({
      animationPref: "full",
      shouldAnimate: true,
      shouldReduceMotion: false,
      setAnimationPref: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders nothing when not visible", () => {
    const { toJSON } = render(<Confetti visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when shouldAnimate is false", () => {
    useAnimationPref.mockReturnValue({
      animationPref: "none",
      shouldAnimate: false,
      shouldReduceMotion: true,
      setAnimationPref: jest.fn(),
    });

    const { toJSON } = render(<Confetti visible={true} />);
    expect(toJSON()).toBeNull();
  });

  it("renders confetti pieces when visible and animations enabled", () => {
    const { toJSON } = render(<Confetti visible={true} />);
    const tree = toJSON();
    expect(tree).not.toBeNull();
    // Container should have children (confetti pieces)
    expect(tree?.type).toBe("View");
    expect(tree?.children).not.toBeNull();
    expect(tree?.children?.length).toBe(60);
  });

  it("calls onComplete after cleanup timeout", () => {
    const onComplete = jest.fn();
    render(<Confetti visible={true} onComplete={onComplete} />);

    expect(onComplete).not.toHaveBeenCalled();
    jest.advanceTimersByTime(3000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("calls onComplete exactly once even after extended time", () => {
    const onComplete = jest.fn();
    render(<Confetti visible={true} onComplete={onComplete} />);

    jest.advanceTimersByTime(3000);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Advancing further should not trigger again
    jest.advanceTimersByTime(6000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("marks confetti as hidden from accessibility", () => {
    const { toJSON } = render(<Confetti visible={true} />);
    expect(toJSON()?.props.accessibilityElementsHidden).toBe(true);
    expect(toJSON()?.props.importantForAccessibility).toBe(
      "no-hide-descendants",
    );
  });
});
