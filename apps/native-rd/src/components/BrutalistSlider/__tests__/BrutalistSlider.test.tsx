import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import {
  BrutalistSlider,
  clampAndSnap,
  positionToValue,
  valueToPosition,
} from "../BrutalistSlider";
import { fireGesture } from "../../../__tests__/mocks/gesture-handler";

describe("BrutalistSlider", () => {
  it("clamps and snaps values", () => {
    expect(clampAndSnap(0.14, 0.2, 1, 0.1)).toBe(0.2);
    expect(clampAndSnap(0.64, 0.2, 1, 0.1)).toBe(0.6);
    expect(clampAndSnap(1.1, 0.2, 1, 0.1)).toBe(1);
    expect(clampAndSnap(0.7, 0.2, 1, 0.1)).toBe(0.7);
  });

  it("returns a finite fallback for invalid numeric configuration", () => {
    expect(clampAndSnap(Number.NaN, 0.2, 1, 0.1)).toBe(0.2);
    expect(clampAndSnap(0.6, 0.2, 1, 0)).toBe(0.2);
    expect(positionToValue(20, 0.2, 1, 0, 0.1, false)).toBe(0.2);
  });

  it("maps values and positions in RTL", () => {
    expect(valueToPosition(0.2, 0.2, 1, 100, true)).toBe(100);
    expect(positionToValue(0, 0.2, 1, 100, 0.1, true)).toBe(1);
  });

  it("exposes raw rounded accessibility state by default", () => {
    const { getByLabelText } = render(
      <BrutalistSlider
        value={42}
        minimumValue={0}
        maximumValue={100}
        step={1}
        onValueChange={jest.fn()}
        accessibilityLabel="Volume"
      />,
    );
    expect(getByLabelText("Volume")).toHaveAccessibilityValue({
      min: 0,
      max: 100,
      now: 42,
      text: "42",
    });
  });

  it("applies formatA11yValue and follows prop updates", () => {
    const formatA11yValue = ({
      value,
      minimumValue,
      maximumValue,
    }: {
      value: number;
      minimumValue: number;
      maximumValue: number;
    }) => ({
      min: Math.round(minimumValue * 100),
      max: Math.round(maximumValue * 100),
      now: Math.round(value * 100),
      text: `${Math.round(value * 100)}%`,
    });
    const props = {
      minimumValue: 0.2,
      maximumValue: 1,
      step: 0.1,
      onValueChange: jest.fn(),
      accessibilityLabel: "Fill opacity",
      formatA11yValue,
    };
    const { getByLabelText, rerender } = render(
      <BrutalistSlider {...props} value={0.2} />,
    );
    expect(getByLabelText("Fill opacity")).toHaveAccessibilityValue({
      min: 20,
      max: 100,
      now: 20,
      text: "20%",
    });
    rerender(<BrutalistSlider {...props} value={1} />);
    expect(getByLabelText("Fill opacity")).toHaveAccessibilityValue({
      min: 20,
      max: 100,
      now: 100,
      text: "100%",
    });
  });

  it("ignores accessibility actions other than increment/decrement", () => {
    const onValueChange = jest.fn();
    const { getByLabelText } = render(
      <BrutalistSlider
        value={0.5}
        minimumValue={0.2}
        maximumValue={1}
        step={0.1}
        onValueChange={onValueChange}
        accessibilityLabel="Fill opacity"
      />,
    );
    fireEvent(getByLabelText("Fill opacity"), "accessibilityAction", {
      nativeEvent: { actionName: "activate" },
    });
    fireEvent(getByLabelText("Fill opacity"), "accessibilityAction", {
      nativeEvent: { actionName: "magicTap" },
    });
    expect(onValueChange).not.toHaveBeenCalled();

    fireEvent(getByLabelText("Fill opacity"), "accessibilityAction", {
      nativeEvent: { actionName: "decrement" },
    });
    expect(onValueChange).toHaveBeenLastCalledWith(0.4);
  });

  it("increments and decrements through the snapped range", () => {
    const onValueChange = jest.fn();
    const { getByLabelText, rerender } = render(
      <BrutalistSlider
        value={0.2}
        minimumValue={0.2}
        maximumValue={1}
        step={0.1}
        onValueChange={onValueChange}
        accessibilityLabel="Fill opacity"
      />,
    );
    fireEvent(getByLabelText("Fill opacity"), "accessibilityAction", {
      nativeEvent: { actionName: "increment" },
    });
    expect(onValueChange).toHaveBeenLastCalledWith(0.3);
    rerender(
      <BrutalistSlider
        value={1}
        minimumValue={0.2}
        maximumValue={1}
        step={0.1}
        onValueChange={onValueChange}
        accessibilityLabel="Fill opacity"
      />,
    );
    fireEvent(getByLabelText("Fill opacity"), "accessibilityAction", {
      nativeEvent: { actionName: "increment" },
    });
    expect(onValueChange).toHaveBeenLastCalledWith(1);
  });

  it("updates from pan gestures after layout", () => {
    const onValueChange = jest.fn();
    const { getByTestId } = render(
      <BrutalistSlider
        testID="opacity"
        value={0.2}
        minimumValue={0.2}
        maximumValue={1}
        step={0.1}
        onValueChange={onValueChange}
        accessibilityLabel="Fill opacity"
      />,
    );
    fireEvent(getByTestId("opacity-track"), "layout", {
      nativeEvent: { layout: { width: 100, height: 12, x: 0, y: 0 } },
    });
    fireGesture("update", { x: 62 });
    expect(onValueChange).toHaveBeenCalledWith(0.6);

    fireGesture("begin", { x: 12 });
    expect(onValueChange).toHaveBeenLastCalledWith(0.2);

    fireGesture("update", { x: 112 });
    expect(onValueChange).toHaveBeenLastCalledWith(1);
  });
});
