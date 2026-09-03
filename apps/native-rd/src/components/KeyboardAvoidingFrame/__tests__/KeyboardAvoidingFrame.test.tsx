import React from "react";
import { Text } from "react-native";
import { act, render, screen } from "@testing-library/react-native";
import { KeyboardControllerNative } from "react-native-keyboard-controller";
import { KeyboardAvoidingFrame } from "../KeyboardAvoidingFrame";

const viewPositionInWindow =
  KeyboardControllerNative.viewPositionInWindow as jest.Mock;

describe("KeyboardAvoidingFrame", () => {
  it("renders its children inside the frame", () => {
    render(
      <KeyboardAvoidingFrame testID="frame">
        <Text>footer</Text>
      </KeyboardAvoidingFrame>,
    );
    expect(screen.getByTestId("frame")).toBeTruthy();
    expect(screen.getByText("footer")).toBeTruthy();
  });

  it("forwards the caller's onLayout", () => {
    const onLayout = jest.fn();
    render(<KeyboardAvoidingFrame testID="frame" onLayout={onLayout} />);
    screen.getByTestId("frame").props.onLayout({
      nativeEvent: { layout: { x: 0, y: 78, width: 402, height: 668 } },
    });
    expect(onLayout).toHaveBeenCalledTimes(1);
  });

  it("offsets the KAV by the native window position minus the layout y", async () => {
    // A native-stack modal sheet: the layout tree says y=100, UIKit says 162.
    viewPositionInWindow.mockResolvedValueOnce({
      x: 0,
      y: 162,
      width: 402,
      height: 712,
    });
    render(<KeyboardAvoidingFrame testID="frame" />);
    await act(async () => {
      screen.getByTestId("frame").props.onLayout({
        nativeEvent: { layout: { x: 0, y: 100, width: 402, height: 712 } },
      });
    });
    expect(screen.getByTestId("frame").props.keyboardVerticalOffset).toBe(62);
  });
});
