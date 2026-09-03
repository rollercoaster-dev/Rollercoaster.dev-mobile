import React from "react";
import { View } from "react-native";
import { act, render, screen } from "@testing-library/react-native";
import { KeyboardControllerNative } from "react-native-keyboard-controller";
import { KeyboardAvoidingFrame } from "../KeyboardAvoidingFrame";

const viewPositionInWindow =
  KeyboardControllerNative.viewPositionInWindow as jest.Mock;

describe("KeyboardAvoidingFrame", () => {
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

  it("falls back to measureInWindow when the native call rejects", async () => {
    viewPositionInWindow.mockRejectedValueOnce(new Error("E_VIEW_NOT_FOUND"));
    render(<KeyboardAvoidingFrame testID="frame" />);
    // The frame's ref is the mocked View class instance, whose native methods
    // are jest.fn stubs. Report the frame 40pt below where the layout tree
    // puts it.
    const view = screen.UNSAFE_getByType(View).instance as View;
    const measureInWindow = view.measureInWindow as jest.Mock;
    measureInWindow.mockImplementationOnce(
      (cb: (x: number, y: number) => void) => cb(0, 118),
    );
    await act(async () => {
      screen.getByTestId("frame").props.onLayout({
        nativeEvent: { layout: { x: 0, y: 78, width: 402, height: 668 } },
      });
    });
    expect(measureInWindow).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("frame").props.keyboardVerticalOffset).toBe(40);
  });
});
