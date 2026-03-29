import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../__tests__/test-utils";
import { ShapeSelector } from "../ShapeSelector";
import { BadgeShape } from "../types";

// Mock react-native-svg — shapes render as views
jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View {...props} />,
    Svg: (props: Record<string, unknown>) => <View {...props} />,
    Path: (props: Record<string, unknown>) => <View {...props} />,
    G: (props: Record<string, unknown>) => <View {...props} />,
  };
});

const ALL_SHAPES = Object.values(BadgeShape) as BadgeShape[];

const SHAPE_LABELS: Record<BadgeShape, string> = {
  circle: "Circle",
  shield: "Shield",
  hexagon: "Hexagon",
  roundedRect: "Rounded Rect",
  star: "Star",
  diamond: "Diamond",
};

describe("ShapeSelector", () => {
  const onSelectShape = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all 6 shape options", () => {
    renderWithProviders(
      <ShapeSelector
        selectedShape={BadgeShape.circle}
        onSelectShape={onSelectShape}
      />,
    );

    for (const shape of ALL_SHAPES) {
      expect(
        screen.getByLabelText(`${SHAPE_LABELS[shape]} shape`),
      ).toBeOnTheScreen();
    }
  });

  it("has radiogroup accessibility on container", () => {
    renderWithProviders(
      <ShapeSelector
        selectedShape={BadgeShape.circle}
        onSelectShape={onSelectShape}
      />,
    );

    expect(screen.getByLabelText("Badge shape")).toBeOnTheScreen();
    expect(screen.getByLabelText("Badge shape").props.accessibilityRole).toBe(
      "radiogroup",
    );
  });

  test.each(ALL_SHAPES)("marks %s as checked when selected", (shape) => {
    renderWithProviders(
      <ShapeSelector selectedShape={shape} onSelectShape={onSelectShape} />,
    );

    const radio = screen.getByLabelText(`${SHAPE_LABELS[shape]} shape`);
    expect(radio.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
  });

  it("marks non-selected shapes as unchecked", () => {
    renderWithProviders(
      <ShapeSelector
        selectedShape={BadgeShape.circle}
        onSelectShape={onSelectShape}
      />,
    );

    const shieldRadio = screen.getByLabelText("Shield shape");
    expect(shieldRadio.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false }),
    );
  });

  it("calls onSelectShape when a shape is pressed", () => {
    renderWithProviders(
      <ShapeSelector
        selectedShape={BadgeShape.circle}
        onSelectShape={onSelectShape}
      />,
    );

    fireEvent.press(screen.getByLabelText("Hexagon shape"));
    expect(onSelectShape).toHaveBeenCalledWith(BadgeShape.hexagon);
  });
});
