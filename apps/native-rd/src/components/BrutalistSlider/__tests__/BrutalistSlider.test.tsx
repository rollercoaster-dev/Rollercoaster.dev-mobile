import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import {
  BrutalistSlider,
  clampAndSnap,
  positionToValue,
  valueToPosition,
} from "../BrutalistSlider";

describe("BrutalistSlider", () => {
  it("clamps and snaps values", () => {
    expect(clampAndSnap(0.14, 0.2, 1, 0.1)).toBe(0.2);
    expect(clampAndSnap(0.64, 0.2, 1, 0.1)).toBe(0.6);
    expect(clampAndSnap(1.1, 0.2, 1, 0.1)).toBe(1);
  });

  it("maps values and positions in RTL", () => {
    expect(valueToPosition(0.2, 0.2, 1, 100, true)).toBe(100);
    expect(positionToValue(0, 0.2, 1, 100, 0.1, true)).toBe(1);
  });

  it("exposes percentage accessibility state and follows prop updates", () => {
    const props = {
      minimumValue: 0.2,
      maximumValue: 1,
      step: 0.1,
      onValueChange: jest.fn(),
      accessibilityLabel: "Fill opacity",
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
});
