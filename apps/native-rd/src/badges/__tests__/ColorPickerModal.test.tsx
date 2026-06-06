/**
 * Tests for ColorPickerModal — the full-screen custom color picker.
 *
 * `reanimated-color-picker` is mocked as an inert wrapper that exposes its
 * `onChangeJS` callback via a press surface, so we can drive the live-hex
 * state machine deterministically without depending on Reanimated worklets
 * or pan gestures.
 */

import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../__tests__/test-utils";
import { ColorPickerModal } from "../ColorPickerModal";

// Modal mock is registered globally in src/__tests__/setup-modal-mock.ts.

// Mock phosphor-react-native for the close-button X icon.
jest.mock("phosphor-react-native", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  const Stub = (name: string) => {
    const C: React.FC<{ size?: number; color?: string; weight?: string }> = ({
      size,
      color,
    }) => (
      <View accessibilityLabel={`${name} icon`}>
        <Text>{`${name} ${size ?? ""} ${color ?? ""}`}</Text>
      </View>
    );
    C.displayName = name;
    return C;
  };
  return new Proxy(
    { IconContext: React.createContext({}) },
    {
      get: (target: Record<string, unknown>, prop: string) => {
        if (prop in target) return target[prop];
        return Stub(prop);
      },
    },
  );
});

// Mock reanimated-color-picker so tests don't depend on the native worklet
// runtime. The mock exposes the `onChangeJS` callback through two Pressables:
// one emits a valid hex, the other emits a malformed string so the modal's
// validation guard can be driven deterministically.
jest.mock("reanimated-color-picker", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");

  const ColorPicker = (props: {
    value?: string;
    onChangeJS?: (color: { hex: string }) => void;
    children?: React.ReactNode;
  }) => {
    const { children, onChangeJS } = props;
    return (
      <View testID="reanimated-color-picker">
        <Pressable
          testID="reanimated-color-picker-change"
          onPress={() => onChangeJS && onChangeJS({ hex: "#abcdef" })}
        />
        <Pressable
          testID="reanimated-color-picker-change-invalid"
          onPress={() => onChangeJS && onChangeJS({ hex: "not-a-hex" })}
        />
        {children}
      </View>
    );
  };

  const Inert = () => null;

  return {
    __esModule: true,
    default: ColorPicker,
    Panel1: Inert,
    HueSlider: Inert,
    Preview: Inert,
  };
});

describe("ColorPickerModal", () => {
  const baseProps = {
    initialColor: "#a78bfa",
    onConfirm: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders no modal body when visible=false", () => {
    renderWithProviders(<ColorPickerModal {...baseProps} visible={false} />);
    expect(screen.queryByTestId("reanimated-color-picker")).toBeNull();
  });

  it("renders the modal body when visible=true", () => {
    renderWithProviders(<ColorPickerModal {...baseProps} visible={true} />);
    expect(screen.getByTestId("reanimated-color-picker")).toBeOnTheScreen();
    expect(screen.getByTestId("color-picker-modal")).toBeOnTheScreen();
  });

  it("calls onClose when Cancel is pressed", () => {
    const onClose = jest.fn();
    renderWithProviders(
      <ColorPickerModal {...baseProps} visible={true} onClose={onClose} />,
    );
    fireEvent.press(screen.getByTestId("color-picker-modal-cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the header close (X) button is pressed", () => {
    const onClose = jest.fn();
    renderWithProviders(
      <ColorPickerModal {...baseProps} visible={true} onClose={onClose} />,
    );
    fireEvent.press(screen.getByLabelText("Close color picker"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm with the initial color when Confirm is pressed before any change", () => {
    const onConfirm = jest.fn();
    renderWithProviders(
      <ColorPickerModal
        {...baseProps}
        visible={true}
        initialColor="#a78bfa"
        onConfirm={onConfirm}
      />,
    );
    fireEvent.press(screen.getByTestId("color-picker-modal-confirm"));
    expect(onConfirm).toHaveBeenCalledWith("#a78bfa");
  });

  it("calls onConfirm with the latest color after onChangeJS fires", () => {
    const onConfirm = jest.fn();
    renderWithProviders(
      <ColorPickerModal {...baseProps} visible={true} onConfirm={onConfirm} />,
    );
    // Simulate the picker emitting a color change to #abcdef.
    fireEvent.press(screen.getByTestId("reanimated-color-picker-change"));
    fireEvent.press(screen.getByTestId("color-picker-modal-confirm"));
    expect(onConfirm).toHaveBeenCalledWith("#abcdef");
  });

  it("renders the default title from i18n", () => {
    renderWithProviders(<ColorPickerModal {...baseProps} visible={true} />);
    expect(screen.getByText("Choose Color")).toBeOnTheScreen();
  });

  it("uses an explicit title prop when provided", () => {
    renderWithProviders(
      <ColorPickerModal
        {...baseProps}
        visible={true}
        title="Pick Border Color"
      />,
    );
    expect(screen.getByText("Pick Border Color")).toBeOnTheScreen();
  });

  it("ignores a malformed hex from the picker (keeps initial color)", () => {
    const onConfirm = jest.fn();
    renderWithProviders(
      <ColorPickerModal
        {...baseProps}
        visible={true}
        initialColor="#a78bfa"
        onConfirm={onConfirm}
      />,
    );
    // Drive a tick that emits an invalid hex; Confirm must still send the
    // initial value, not the bogus payload.
    fireEvent.press(
      screen.getByTestId("reanimated-color-picker-change-invalid"),
    );
    fireEvent.press(screen.getByTestId("color-picker-modal-confirm"));
    expect(onConfirm).toHaveBeenCalledWith("#a78bfa");
  });
});
